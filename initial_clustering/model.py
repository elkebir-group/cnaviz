#!/usr/bin/env python3

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from hmmlearn.hmm import GMMHMM
import sklearn.metrics
import json
import time
from pprint import pprint
from multiprocessing import Pool, RLock, freeze_support
import argparse
from pandas.api.types import is_numeric_dtype
from timeit import default_timer as timer
from datetime import timedelta
import os
from tqdm import tqdm
import contextlib
import sys
import math


plt.rcParams["figure.figsize"] = (16,16)


# default constants
NUM_CLUSTERS_MIN = 1
NUM_CLUSTERS_MAX = 24
NUM_CLUSTERS_STEP = 2
NUM_RESTARTS = 3
NUM_PROCESSES = 1
OUTPUT_FOLDER = "CNAVIZ_PREPROCESSING"
SEED = 1

debug = False

        
def main():
    # gather function arguments, set constants
    parser = argparse.ArgumentParser(description='Run GMMHMM for multiple cluster numbers and score using silhouette and likelihood to get a simple clustering.')
    parser.add_argument('--input_file', '-f', nargs='?',
                        type=argparse.FileType('r', encoding='UTF-8'),
                        help='The filename for the tab-separated file containing the required columns.', required=True)
    parser.add_argument('--output_folder', '-o', nargs='?', default=OUTPUT_FOLDER, type=str,
                        help=f'Folder to output all results to (default: {OUTPUT_FOLDER})')
    parser.add_argument('--num_restarts', '-r', nargs='?', default=3, type=int,
                        help='Number of restarts to use (default: 3)')
    parser.add_argument('--num_clusters_min', '-c', nargs='?', default=NUM_CLUSTERS_MIN, type=int,
                        help=f'Number of clusters to start at (default: {NUM_CLUSTERS_MIN} in the case of no CNAs)')
    parser.add_argument('--num_clusters_max', '-C', nargs='?', default=NUM_CLUSTERS_MAX, type=int,
                        help=f'Number of clusters to end at (default: {NUM_CLUSTERS_MAX})')
    parser.add_argument('--num_clusters_step', '-S', nargs='?', default=NUM_CLUSTERS_STEP, type=int,
                        help=f'Number of clusters to step by (default: {NUM_CLUSTERS_STEP})')
    parser.add_argument('--num_processes', '-p', nargs='?', default=NUM_PROCESSES, type=int,
                        help=f'Number of processes to use in process pool for running model (default: {NUM_PROCESSES})')
    parser.add_argument('--verbose', '-v', action="store_true",
                        help=f'Print out intermediate messages (False -> tqdm, True -> messages) (default: False)')
    parser.add_argument('--seed', '-s', type=int, nargs='?', default=SEED,
                        help=f'np.random.seed input set at the beginning of the script (default: {SEED})')
    args = parser.parse_args()

    
    # get arguments from command line
    input_file = args.input_file
    num_clusters_min = args.num_clusters_min
    num_clusters_max = args.num_clusters_max
    num_clusters_step = args.num_clusters_step
    num_restarts = args.num_restarts
    num_processes = args.num_processes
    output_folder = os.path.abspath(args.output_folder)
    debug = args.verbose
    
    np.random.seed(args.seed)
    
    
    # preprocessing
    df_raw = pd.read_csv(input_file, sep="\t")
    df = preprocessing(df_raw)
    
    input_file.close()
    
    print("Successfully read input file.")
    
    if not os.path.isdir(output_folder):
        print(f"Creating folder {output_folder} to store results")
        os.makedirs(output_folder)

    
    clusters_range = range(num_clusters_min, num_clusters_max + 1, num_clusters_step)
    restarts_range = range(num_restarts)
    
    # set up results_dict
    results_dict = {}
    results_dict["score"] = {}
    results_dict["score"]["silhouette"] = {}
    results_dict["score"]["likelihood"] = {}
    results_dict["labels"] = {}
    for cluster_num in clusters_range:
        results_dict["score"]["silhouette"][f"{cluster_num}"] = [np.nan for _ in restarts_range]
        results_dict["score"]["likelihood"][f"{cluster_num}"] = [np.nan for _ in restarts_range]
        results_dict["labels"][f"{cluster_num}"] = \
            [[] for _ in restarts_range]

    # run the pipeline in a multithreaded manner
    # create the process pool and start the processes
#     with std_out_err_redirect_tqdm() as orig_stdout:
    with Pool(num_processes) as pool:
        results = list(tqdm(
            pool.imap(proxy,
                      data_stream(clusters_range, restarts_range,
                                  df, df_raw, output_folder, debug)),
            desc="Models ran",
            bar_format="{l_bar}{bar}{n_fmt}/{total_fmt}",
            total=math.ceil((num_clusters_max - num_clusters_min + 1) / num_clusters_step) * num_restarts,
            disable=debug))

    # put results into results_dict
    for ((i, j), ((num_clusters, restart_num), (silhouette_score, likelihood_score, labels))) in results:
        results_dict["score"]["silhouette"][f"{num_clusters}"][restart_num] = silhouette_score
        results_dict["score"]["likelihood"][f"{num_clusters}"][restart_num] = likelihood_score
        results_dict["labels"][f"{num_clusters}"][restart_num] = labels
    
    # output results
    with open(os.path.join(output_folder, "results.json"), "w") as f:
        json.dump(results_dict, f)
    plot_diagnostic(results_dict["score"], num_restarts, output_folder)
    print(f"Each individual result has been written to a file in {output_folder} for input into CNAViz.")


def runner(num_clusters, restart_num, df, df_raw, output_folder, debug):
    """
    runner function for multiprocessing
    
    input: num_clusters, restart_num (unused)
    output: ((num_clusters, restart_num), (silhouette_score, likelihood_score, labels))
    """
    df_fit = df[["RD", "BA", "actual_start"]].copy()
    
    if debug:
        print(f"Starting to generate labels for {num_clusters} clusters (restart number {restart_num + 1})")
        start = timer()
    
    results = generate_labels(df_fit, num_clusters)
    df_output = df_raw.copy()
    df_output["CLUSTER"] = results[2]
    df_output.to_csv(os.path.join(output_folder, f"c{num_clusters}_r{restart_num + 1}.tsv"), sep="\t", index=False)
    
    if debug:
        end = timer()
        print(f"Finished generating labels for {num_clusters} clusters (restart number {restart_num + 1}) in {timedelta(seconds=end - start)}")
    
    return ((num_clusters, restart_num), results)


def data_stream(clusters, restarts, df, df_raw, output_folder, debug):
    """
    from https://stackoverflow.com/a/13673061
    make the two-argument data available for runner function
    """
    for i, cluster in enumerate(clusters):
        for j, restart in enumerate(restarts):
            yield (i, j), (cluster, restart, df, df_raw, output_folder, debug)

            
def proxy(args):
    """
    from https://stackoverflow.com/a/13673061
    wrapper for actual runner function to return both the index and the function output
    """
    return args[0], runner(*args[1])


def preprocessing(df):
    """
    preprocess the data so it has necessary columns
    """
    # ensure df has necessary columns
    if "RD" not in df.columns:
        sys.exit("Please provide a file with a `RD`, `BAF`, `#CHR`, `START`, and `END` columns (`RD` missing)")
        
    if "BA" not in df.columns:
        if "BAF" not in df.columns:
            sys.exit("Please provide a file with a `RD`, `BAF`, `#CHR`, `START`, and `END` columns (`BAF` missing)")
        
        df["BA"] = 0.5 - df["BAF"]
        
    if "actual_start" not in df.columns:
        if "START" not in df.columns:
            sys.exit("Please provide a file with a `RD`, `BAF`, `#CHR`, `START`, and `END` columns (`START` missing)")
            
        if "END" not in df.columns:
            sys.exit("Please provide a file with a `RD`, `BAF`, `#CHR`, `START`, and `END` columns (`END` missing)")
        
        if "#CHR" not in df.columns:
            sys.exit("Please provide a file with a `RD`, `BAF`, `#CHR`, `START`, and `END` columns (`#CHR` missing)")

        # assumption: will start at "chr1" and go until "chr__"
        # assumption: df has a column names `#CHR` for the chromosome name
        # assumption: df will have column `START` and `END` for chromosome start and end
        # assumption: all samples will have the same `END` for each chromosome
        
        if is_numeric_dtype(df["#CHR"]):
            df["#CHR"] = "chr" + df["#CHR"].astype(str)

        new_chrom_coords = df["START"].copy()
        chrom_ends = df.groupby("#CHR").max()["END"]

        num_chroms_total = len(df["#CHR"].unique()) + 1
        for chrom_num in range(2, num_chroms_total):
            chrom_str = f"chr{chrom_num}"
            mask = df["#CHR"] == chrom_str
            chrom_rows = df[mask]
            chrom_end = chrom_ends[f"chr{chrom_num - 1}"]
            new_chrom_coords.loc[mask] = chrom_rows["START"] + chrom_end
            chrom_ends[f"chr{chrom_num}"] = new_chrom_coords.loc[mask].max()
        
        df["actual_start"] = new_chrom_coords

    return df


def generate_labels(df, num_clusters):
    """
    returns (silhouette_score, likelihood_score, labels)
    """    
    hmm = GMMHMM(n_components = num_clusters,
                 n_mix = num_clusters,
                 algorithm = "viterbi")

    # create a transition matrix
    #     alpha = np.diag(np.ones(num_model_states)*weight) + np.ones((num_model_states, num_model_states))
    #     transmat = np.array([dirichlet.rvs(row, random_state=seed)[0] for row in alpha])
    #     hmm.transmat_ = transmat

    hmm.fit(df)
    labels = hmm.predict(df)
    likelihood_score = hmm.score(df)
    if num_clusters >= 2:
        silhouette_score = sklearn.metrics.silhouette_score(df, labels)
    else:
        silhouette_score = np.nan
    
    return (silhouette_score, likelihood_score, labels.tolist())


def plot_diagnostic(results_scores, num_repeats, output_folder):
    t = list(results_scores["silhouette"].keys())
    data1 = list(results_scores["likelihood"].values())
    data2 = list(results_scores["silhouette"].values())
    
    fig, ax1 = plt.subplots()

    color = 'tab:red'
    ax1.set_xlabel('clusters')
    ax1.set_ylabel('likelihood', color=color)
    ax1.scatter(np.array(t).repeat(num_repeats),
                np.array(data1).ravel(), color=color)
    ax1.plot(np.array(t), np.nanmean(np.array(data1), axis=1), color=color)
    ax1.tick_params(axis='y', colors=color)

#     ax1.vlines(best_cluster_num, np.nanmin(data1), np.nanmax(data1), color="tab:green")

    ax2 = ax1.twinx()  # instantiate a second axes that shares the same x-axis

    color = 'tab:blue'
    ax2.set_ylabel('silhouette', color=color)  # we already handled the x-label with ax1
    ax1.scatter(np.array(t).repeat(num_repeats),
                np.array(data2).ravel(), color=color)
    ax1.plot(np.array(t), np.nanmean(np.array(data2), axis=1), color=color)
    ax2.tick_params(axis='y', colors=color)

    fig.tight_layout()  # otherwise the right y-label is slightly clipped
#     plt.suptitle("Patient: A17")
#     plt.title("(Green line indicates the best ranking of both scores)", y=-0.25)
    plt.title("Maximum silhouette and likelihood is the best clustering", y=-0.25)
    plt.show()
    
    output_filename = os.path.join(output_folder, "diagnostic_plot.png")
    fig.savefig(output_filename, dpi=fig.dpi, bbox_inches='tight')
    print(f"Figure saved in {output_filename}")
    

# def output_to_json(models, labels, scores, outfile):
#     out_data = {
#         "models" : models,
#         "labels" : labels,
#         "scores" : scores
#     }

#     try:
#         with open(outfile, "w") as out_f:
#             json.dump(out_data, out_f)
#     except:
#         return 1
#     return 0

# def plot(df_full, labels, sample):
#     df_copy = df_full.copy()
#     df_copy["labels"] = labels
#     df = df_copy[df_copy["SAMPLE"] == sample][["RD", "BA", "actual_start", "labels"]]
    
#     fig, ax = plt.subplots(3)
#     ax[0].scatter(x = df["BA"], y = df["RD"], c = df["labels"],
#                   s = 1, alpha = 0.2)
#     ax[0].set_ylabel("RDR")
#     ax[0].set_xlabel("0.5 - BAF")

#     ax[1].scatter(y = df["BA"], x = df["actual_start"], c=df["labels"], s=1, alpha=0.5)
#     ax[1].set_ylabel("0.5 - BAF")
#     ax[1].set_xlabel("Genomic coordinate")
#     ax[2].scatter(y = df["RD"], x = df["actual_start"], c=df["labels"], s=1, alpha=0.5)
#     ax[2].set_ylabel("RDR")
#     ax[2].set_xlabel("Genomic coordinate")
#     fig.suptitle(f"GMMHMM with partially randomized transition matrix")
#     fig.tight_layout()
#     plt.show()
    
    


if __name__ == "__main__":
    main()