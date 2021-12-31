import pandas as pd
import sys

data = pd.read_csv("/Users/zubairlalani/Code/Research/cnaviz/data/a12.tsv", sep='\t', engine="python", error_bad_lines=False)

# data['Genome Location'] = "chr" + data['Genome Location']

cols_to_del = ["CLUSTER"]

for col in cols_to_del:
    del data[col]

# data[data['Genome Location'].str.contains(":", regex=False)]

print(data)

data.to_csv("/Users/zubairlalani/Code/Research/cnaviz/data/a12_no_cluster_col.tsv", sep='\t', index=False)

# p

