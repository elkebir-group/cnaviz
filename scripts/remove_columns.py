import pandas as pd
import sys

data = pd.read_csv("../data/testData3.tsv",sep='\t')
cols_to_del = ["cn_normal",	"u_normal",	"cn_clone1", "u_clone1", "cn_clone2", "u_clone2", "cn_clone3", "u_clone3", "cn_clone4", "#SNPS", "COV", "ALPHA", "BETA"]

for col in cols_to_del:
    del data[col]


data.to_csv("../data/testData3.tsv", sep='\t', index=False)

