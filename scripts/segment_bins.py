import pandas as pd
from packaging import version
import hatchet
if version.parse(hatchet.__version__) >= version.parse('1.0.1'):
    from hatchet.utils.cluster_bins_gmm import *
else:
    from hatchet.utils.cluster_bins import *
import argparse

parser = argparse.ArgumentParser(description='Segmentation')
parser.add_argument('bbc', type=str, help='bbc file')
args = parser.parse_args()

data = pd.read_csv(args.bbc, sep='\t')

keys = {(rec['#CHR'], rec['START'], rec['END']) for rec in data.to_dict('records')}
combo = {key : [] for key in keys}
for rec in data.to_dict('records'):
    combo[(rec['#CHR'], rec['START'], rec['END'])].append((rec['SAMPLE'], rec['RD'], rec['#SNPS'], rec['COV'], rec['ALPHA'], rec['BETA'], rec['BAF'], rec['CLUSTER']))
clusters = {cluster : set(key for key in combo if int(combo[key][0][-1]) == int(cluster)) for cluster in data['CLUSTER'].unique()}
samples = set(data['SAMPLE'].unique())

segments = segmentBins(bb=combo, clusters=clusters, samples=samples)
segments = scaleBAF(segments=segments, samples=samples, diploidbaf=0.1) # or .12 #diploidbaf=0.08)
print("#ID\tSAMPLE\t#BINS\tRD\t#SNPS\tCOV\tALPHA\tBETA\tBAF")
for key in sorted(segments):
    for sample in sorted(segments[key]):
        record = segments[key][sample]
        print("{}\t{}\t{}\t{}\t{}\t{}\t{}\t{}\t{}".format(key, sample, record[0], record[1], record[2], record[3], record[4], record[5], record[6]))
