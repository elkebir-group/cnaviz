import pandas as pd
import sys

data = pd.read_csv("/Users/zubairlalani/Code/Research/cnaviz/data/demo/drivers.tsv", sep='\t', engine="python", error_bad_lines=False)

# data['Genome Location'] = "chr" + data['Genome Location']

# cols_to_del = ["#SNPS", "COV", "ALPHA", "BETA", "cn_normal", "u_normal", "cn_clone1", "u_clone1", "cn_clone2", "u_clone2", "cn_clone3", "u_clone3", "cn_clone4", "u_clone4"]
cols_to_del = ["Name", "Chr Band", "Role in Cancer", ]

for col in cols_to_del:
    del data[col]

# data[data['Genome Location'].str.contains(":", regex=False)]

print(data)

# data.to_csv("/Users/zubairlalani/Code/Research/cnaviz/data/demo/a12_2col.tsv", sep='\t', index=False)

# p

