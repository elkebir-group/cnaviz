## Data Pipelines
CNAViz can be run in *de novo* mode, i.e. starting from an empty clustering, or in refinement mode, i.e. starting with a given initial clustering. Following user-guided refinement using CNAViz, the resulting clustering file can be provided to any method of the user's choice for CNA calling. We provide details on how to provide the CNAViz output clustering to HATCHet for CNA calling.

To get the initial CNAViz inputs, we use HATCHet to get RDR and BAF values (example .ini file [here](docs/hatchet_rdrbaf.ini)). We summarize the details of what is happening in this script in the next section.

*de novo* mode:
1. Use CNAViz.
2. Perform CNA calling using HATCHet (example .ini file [here](docs/hatchet_post.ini)).

Refinement mode (HATCHet): 
1. HATCHet clustering (example.ini file [here](docs/hatchet_pre.ini)).
2. Use CNAViz to refine the existing clustering.
3. Perform CNA calling using HATCHet (example .ini file [here](docs/hatchet_post.ini)).

Refinement mode (ASCAT): 
1. ASCAT clustering.
2. Use CNAViz to refine the existing clustering.
3. Perform CNA calling using HATCHet (example .ini file [here](docs/hatchet_post.ini)).

Refinement mode (GMMHMM):
1. Run GMMHMM.py to get an initial clustering (use [model.py](initial_clustering/model.py)).
2. Use CNAViz.
3. Perform CNA calling using HATCHet (example .ini file [here](docs/hatchet_post.ini)).

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
3. Splits the human reference genome into candidate bins according to germline SNP positions. Also counts the number of total readsaligned to each region in each tumor sample and in teh matched normal sample. 
4. Constructs genomic bins with variable sizes and combines the read counts and the allele counts for the user-specified germline SNPs. The script then uses these to compute the read-depth ratio (RDR) and B-allele frequency (BAF) of every genomic bin. 

***

This tutorial summarizes main relevant steps from a more extended tutorial, which can be found in the HATCHet documentation [here](http://compbio.cs.brown.edu/hatchet/doc_fullpipeline.html#demos). 
