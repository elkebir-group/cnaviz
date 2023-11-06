#!/bin/bash

#CNAviz input from ASCAT output rounded .segments.txt and _LogR files and ASCAT input _BAF file. Example for sample named wgsX

# Use ASCAT default output .BAF.PCFed.txt to identify the informative SNP pos that ASCAT used, and select only those pos from _BAF and _LogR files.
# if included in ASCAT run parameters, use GC content and replication timing corrected LogR values: add line below to end of ASCAT Rscript 
# write.table(cbind(ascat.bc$SNPpos$chrs, ascat.bc$SNPpos$pos, ascat.bc$Tumor_LogR[[1]]), sep ="\t", file = "wgsX_GC_RT_Tumor_LogR.txt")

# select informative SNP pos based on column 1 in contig_pos notation (e.g. 1_806106) 
# note ASCAT uses row name matching of SNP IDs in contig_pos notation to match pos with their GC and RT correction files.
# if other SNP IDs are used, match on SNP ID field.

# remove R formatting of quotes around strings if needed and change M$ newline (dos) to unix $ newline if needed
sed -i 's/"//g' wgsX.BAF.PCFed.txt ; dos2unix wgsX.BAF.PCFed.txt
sed -i 's/"//g' wgsX_GC_RT_Tumor_LogR.txt ; dos2unix wgsX_GC_RT_Tumor_LogR.txt

#pull out informative SNP pos from .BAF.PCFed.txt ASCAT standard output file and write to file for grep filter
awk -F'\t' -vOFS='\t' '{print $1}' wgsX.BAF.PCFed.txt > hetSNPpos.txt

#convert wgsX_GC_RT_Tumor_LogR.txt to headerless file with contig_pos in column 1
awk -F'\t' -vOFS='\t' 'NR > 1 {print $2"_"$3, $2, $3, $4}' wgsX_GC_RT_Tumor_LogR.txt > wgsX_allLogR.txt 

# use grep to pull out informative snps from corrected LogR file
grep -wf hetSNPpos.txt wgsX_allLogR.txt > wgsX_infLogR.txt

# use grep to pull out informative snps from ASCAT input BAF file
awk -F'\t' -vOFS='\t' 'NR > 1 {print $0}' Tumor_BAF.txt > wgsX_allBAF.txt
grep -wf hetSNPpos.txt wgsX_allBAF.txt > wgsX_infBAF.txt

# create a bedfile using a mapfile to assign CNAviz cluster number to allele-specific copy number states
# assign a single cluster number to all segments > 5n (tumor-specific, but a reasonable compromise of cluster numbers for many tumors)
# e.g nMajor=3, mMinor=2 becomes cn32. mapfile.txt chose the cluster number to assign to cn32
awk -F'\t' -vOFS='\t' 'NR > 1 {print $2, $3, $4, $5$6}' wgsX.segments.txt | awk -F'\t' -vOFS='\t' '{if ($4 > 50) print $1, $2, $3, "cnAMP"; else print $1, $2, $3, "cn"$4}' | awk -F'\t' -vOFS='\t' 'NR==FNR { map[$1]=$2; next } { for (key in map) gsub(key,map[key]); print }' mapfile.txt - > wgsX.segments.bed

# convert logR to read depth ratio (RDR = CNAviz RD column) and alt allele fraction to one-sided (loss-sided) BAF for CNAviz input 
# note CNAviz does the 0.5 - BAF calculation 
paste <(awk -F'\t' -vOFS='\t' '{print $2, $3, $3, 2^$4}' wgsX_infLogR.txt) <(awk -F'\t' -vOFS='\t' 'function baf(x){return (x > 0.5) ? 1-x : x;} {print baf($4)}' wgsX_infBAF.txt) > wgsX_RDBAF.bed

# one-liner to create CNAviz input file from .segments.bed and _RDBAF.bed. 50kb windows in this example.
bedtools makewindows -b wgsX.segments.bed -w 50000 -i src | bedtools map -a - -b wgsX_RDBAF.bed -c 4,5 -o mean -null NaN | awk -vOFS='\t' '$5!="NaN" {print "chr"$1, $2, $3, "wgsX", $5, $6, $4}' > headless.tsv ; echo -e "#CHR\tSTART\tEND\tSAMPLE\tRD\tBAF\tCLUSTER" | cat - headless.tsv > wgsX_CNAviz.tsv

# remove leftover intermediate files. Keep .segments.bed and _RDBAF.bed if you want to explore different window sizes with one-liner above.  
rm hetSNPpos.txt wgsX_allLogR.txt wgsX_infLogR.txt wgsX_allBAF.txt wgsX_infBAF.txt headless.tsv







