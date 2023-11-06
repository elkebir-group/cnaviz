## Data Pipelines
CNAViz can be run in *de novo* mode, i.e. starting from an empty clustering, or in refinement mode, i.e. starting with a given initial clustering. Following user-guided refinement using CNAViz, the resulting clustering file can be provided to any method of the user's choice for CNA calling. We provide details on how to provide the CNAViz output clustering to HATCHet for CNA calling.

To get the initial CNAViz inputs, we use HATCHet to get RDR and BAF values (example .ini file [here](https://github.com/elkebir-group/cnaviz/blob/master/docs/hatchet_rdrbaf.ini)). We summarize the details of what is happening in this script in the next section. For all the following pipelines, we provide the a12 dataset to use as an example [here](https://github.com/elkebir-group/cnaviz/blob/master/data/demo/a12.tsv).

*de novo* mode:
1. Use CNAViz.
2. Perform CNA calling using HATCHet (example .ini file [here](https://github.com/elkebir-group/cnaviz/blob/master/docs/hatchet_post.ini)).

Refinement mode (HATCHet): 
1. HATCHet clustering (example.ini file [here](https://github.com/elkebir-group/cnaviz/blob/master/docs/hatchet_pre.ini)).
2. Use CNAViz to refine the existing clustering.
3. Perform CNA calling using HATCHet (example .ini file [here](https://github.com/elkebir-group/cnaviz/blob/master/docs/hatchet_post.ini)).

Refinement mode (ASCAT): 
1. ASCAT clustering.
2. Use CNAViz to refine the existing clustering.
3. Perform CNA calling using HATCHet (example .ini file [here](https://github.com/elkebir-group/cnaviz/blob/master/docs/hatchet_post.ini)).

Initial clustering mode:
Refinement mode (GMMHMM):
1. Run GMMHMM.py to get an initial clustering (use [model.py](initial_clustering/model.py)).
2. Use CNAViz.
3. Perform CNA calling using HATCHet (example .ini file [here](https://github.com/elkebir-group/cnaviz/blob/master/docs/hatchet_post.ini)).

***

## Data preparation
Below we detail how the pipeline we provide takes sequencing data and produces the CNAViz inputs. Namely, to run CNAViz we need to calculate the RDR and BAF of every genomic bin. 

We provide the user with scripts to run the necessary modular steps from the HATCHet package, which you can install with bioconda. As input, we need to set the following within the [input parameter file](docs/hatchet_rdrbaf.ini):

> reference = "/path/to/reference.fa" // reference genome

> normal = "/path/to/normal.bam" // BAM files containing normal sample

> bams = "/path/to/tumor1.bam /path/to/tumor2.bam" // space delimited list of BAM files containing tumor samples

> samples = "A32A A32C" // sample names

> output = "/path/to/output" // output path directory

Additionally, in order to select the list of known germline SNPs, we must provide reference panels. If none is specified, then all positions will be genotyped with bcftools. 
> ref_panel = "1000GP_Phase3"

> ref_panel_dir = "/path/to/refpanel"

> reference_version = "hg19"

> chr_notation = False // whether the reference names chromosomes with the 'chr' prefix

Then, the following steps take place: 
1. Calls heterozygous germline SNPs from the matched-normal sample.
2. Counts the number of reads covering both the alleles of each identified heterozygous SNP in every tumor sample. 
3. Splits the human reference genome into candidate bins according to germline SNP positions. Also counts the number of total readsaligned to each region in each tumor sample and in the matched normal sample. 
4. Constructs genomic bins with variable sizes and combines the read counts and the allele counts for the user-specified germline SNPs. The script then uses these to compute the read-depth ratio (RDR) and B-allele frequency (BAF) of every genomic bin. 

After running these steps with the input file provided [here](https://github.com/elkebir-group/cnaviz/blob/master/docs/hatchet_rdrbaf.ini), the final step will output a tab-separated file to use as input to CNAViz. The tab separated field will contain the following fields: 

| Column      | Description |
| ----------- | ----------- |
| CHR	        | Name of a chromosome |
| START	        | Starting genomic position of a genomic bin in CHR |
| END	        | Ending genomic position of a genomic bin in CHR |
| SAMPLE	        | Name of a tumor sample |
| RD	        | RDR of the bin in SAMPLE (corrected by the total reads in SAMPLE vs. the total reads in the matched normal sample) |
| #SNPS	        | Number of SNPs present in the bin in SAMPLE |
| COV	        | Average coverage in the bin in SAMPLE |
| ALPHA	        | Alpha parameter related to the binomial model of BAF for the bin in SAMPLE, typically total number of reads from A allele |
| BETA	        | Beta parameter related to the binomial model of BAF for the bin in SAMPLE, typically total number of reads from B allele |
| BAF	        | BAF of the bin in SAMPLE |
| TOTAL_READS	        | Total number of reads in the bin in SAMPLE |
| NORMAL_READS	        | Total number of reads in the bin in the matched normal sample |
| CORRECTED_READS	        | Total number of reads in the bin in SAMPLE, corrected by the total reads in SAMPLE vs. the total reads in matched normal. |

This file will be named `bulk.bbc` and can be found in the `bbc/` folder of the user-specified output directory. 

Notes:
1. The ploidy value in CNAViz is the average ploidy of the combined tumor and normal fractions.
2. "chr" notation is not required in the input file, but is required to load the CGC drivers.
3. Tumor sample names are required to load a file with CLUSTER column values. 

To prepare data without HATCHet (e.g. given existing ASCAT segments), we can suggest the following pipeline that has worked for others:
1. assign a cluster number to each ASCAT integer allele-specific copy number state
2. split each ASCAT segment into fixed width windows, mapping mean RD and BAF to each window

Thank you to Dr. Alan R. Penheiter at the Mayo Clinic for providing two helpful scripts ([here](https://github.com/elkebir-group/cnaviz/blob/master/scripts/helpful_scripts)) to convert the ASCAT output into a CNAViz input file, with different assumptions. 

***

## Running HATCHet

We provide an example script for how the user can run HATCHet to generate an initial clustering [here](https://github.com/elkebir-group/cnaviz/blob/master/docs/hatchet_pre.ini).

***

## Running ASCAT

We provide an example script on how to perform the ASCAT clustering in R [here](https://github.com/elkebir-group/cnaviz/blob/master/data/ascat/ASCAT_casasent.R). After running ASCAT, to save the relevant files to produce an input file for CNAViz, we use the following R commands on the `ascat.output` object:
```
write.csv(ascat.output$segments)
write.csv(ascat.bc$SNPpos)
```
To reformat these files into CNAViz input format, we provide the user with a script [here](https://github.com/elkebir-group/cnaviz/blob/master/data/ascat/ascat_outputs/ascat2cnaviz_input.py).

***

## Generating an Initial Clustering with GMMHMM

To install, please run `pip install -r requirements.txt` from the `initial_clustering/` folder. 


We used the following command to run the GMM and HMM on the A12 demo dataset. This will produce a plot called `diagnostic_plot.png` which shows the user the number of clusters on the x-axis and the likelihood and silhouette scores on either y-axis. The user can evaluate this figure to determine which of the solution tsv's they would like to use as input to CNAViz. 

```
python model.py --input_file a12.tsv
--num_restarts 2 --num_clusters_min 2
--num_clusters_max 22 --num_clusters_step 1
--num_processes 6 --output_folder a12_gc
```
***

### Downstream Analyses: Performing Copy Number Calling with HATCHet

To perform copy number calling with HATCHet, we provide the following example scripts.

First, the user should generate the preparatory file structure using the script [here](https://github.com/elkebir-group/cnaviz/blob/master/docs/hatchet_pre.ini).

Next, the user should replace the files in `bbc/` with the CNAViz output tsv file `cnaviz_output.txt`. The user should also delete the `.seg` file in the same `bbc/` folder, and run the `segment_bins.py` script (found [here](https://github.com/elkebir-group/cnaviz/blob/master/scripts/segment_bins.py)) on the `cnaviz_output.txt` (set the file inside this script). Thus, we can generate a `.seg` file and a `.tsv` file to be in this folder. 

Finally, we provide the user with the script [here](https://github.com/elkebir-group/cnaviz/blob/master/docs/hatchet_post.ini) to calculate the final CNAViz copy number calls. 

***

This tutorial summarizes main relevant steps from a more extended tutorial, which can be found in the HATCHet documentation [here](http://compbio.cs.brown.edu/hatchet/doc_fullpipeline.html#demos). 
