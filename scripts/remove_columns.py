import pandas as pd
import sys

PATH = ""
EXPORT_PATH = ""

data = pd.read_csv(PATH, sep='\t', engine="python", error_bad_lines=False)

cols_to_del = ["#SNPS", "COV", "ALPHA", "BETA", "cn_normal", "u_normal", "cn_clone1", "u_clone1", "cn_clone2", "u_clone2", "cn_clone3", "u_clone3", "cn_clone4", "u_clone4"]
cols_to_del = ["Name", "Chr Band", "Role in Cancer", ]

for col in cols_to_del:
    del data[col]

# data.to_csv(EXPORT_PATH, sep='\t', index=False)

