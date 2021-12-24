import pandas as pd
import sys

data = pd.read_csv("/Users/zubairlalani/Code/Research/cnaviz/data/driver_genes_reduced.tsv", sep='\t', engine="python", error_bad_lines=False)

# data['Genome Location'] = "chr" + data['Genome Location']

cols_to_del = ["Chr Band", "Role in Cancer"]

for col in cols_to_del:
    del data[col]

# data[data['Genome Location'].str.contains(":", regex=False)]

print(data)

# data.to_csv("/Users/zubairlalani/Code/Research/cnaviz/data/testdata5.tsv", sep='\t', index=False)

# p

