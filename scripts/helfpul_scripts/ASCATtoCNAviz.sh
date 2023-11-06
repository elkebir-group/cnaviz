#!/bin/bash

#######CNAviz input from ASCAT output rounded .segments.txt and input tumor _BAF and _LogR files##########
# assumes _BAF and _LogR files are row matched as in standard SNP array.
# if not row matched use ASCAT output .BAF.PCFed.txt to identify the "informative" SNPpos that ASCAT used and match to _BAF and _LogR files.
# if included in ASCAT run parameters it would be ideal to use the GC and Replication timing corrected LogR values
# if data is from NGS and a .bam file is available, a "cleaner" RD profile for each CNAviz segment can be obtained from all the counts in the window. 

# assign unique cluster number to each ASCAT allele specific copy segments nMajornMinor up to 5n 
# assign a single cluster number all segments > 5n 
# e.g nMajor=3 and mMinor=2 becomes cn32. mapfile.txt chose the cluster to assign to cn32
# column 4 of the output .bed contains CNAviz CLUSTER number. 
# column 4 will be used for the -i feature in bedtools makewindows (-i src refers to column 4 from source file)

awk -F'\t' -vOFS='\t' 'NR > 1 {print $2, $3, $4, $5$6}' PT647.segments.txt | awk -F'\t' -vOFS='\t' '{if ($4 > 50) print $1, $2, $3, "cnAMP"; else print $1, $2, $3, "cn"$4}' | awk -F'\t' -vOFS='\t' 'NR==FNR { map[$1]=$2; next } { for (key in map) gsub(key,map[key]); print }' mapfile.txt - > PT647.segments.bed

# convert logR to read depth ratio (RDR = CNAviz RD column)
# convert alt allele fraction to one-sided (loss-sided) BAF for CNAviz input 
# note CNAviz does the 0.5 - BAF calculation from the input BAF value for the plots

awk -vOFS='\t' 'NR > 1 {print}' PT647_Tumor_BAF.txt | paste <(awk -vOFS='\t' 'NR > 1 {print $2, $3, $3, 2^$4}' PT647_Tumor_LogR.txt) <(awk -vOFS='\t' 'function baf(x){return (x > 0.5) ? 1-x : x;} {print baf($4)}' -) > PT647_RDBAF.bed

# use bedtools makewindows and bedtools map to map BAF and RDR values to windows of the .segments.bed, and bin values by mean
# in this example 250 kb windows are used.
# remove rows that do not contain any snps: specified -null NaN 
# add specific header for CNAviz 
# note "chr" notation is required to match the CGC Drivers file.
# note SAMPLE column is required to load an exported CNAviz clustering file back into CNAviz
 
bedtools makewindows -b PT647.segments.bed -w 250000 -i src | bedtools map -a - -b PT647_RDBAF.bed -c 4,5 -o mean -null NaN | awk -vOFS='\t' '$5!="NaN" {print "chr"$1, $2, $3, "PTXXX", $5, $6, $4}' > headless.tsv
echo -e "#CHR\tSTART\tEND\tSAMPLE\tRD\tBAF\tCLUSTER" | cat - headless.tsv > PTXXX_CNAviz.tsv