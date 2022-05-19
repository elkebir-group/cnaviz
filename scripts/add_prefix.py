import pandas as pd
import sys

FILE = ""
EXPORT_PATH = "../data/test3.tsv"
COLUMN = "#CHR"
PREFIX = "chr"
TESTMODE = False

data = pd.read_csv(FILE, sep='\t', engine="python", error_bad_lines=False)
data[COLUMN] = PREFIX + data[COLUMN].astype(str)

if(TESTMODE):
    print(data)
else:
    data.to_csv(EXPORT_PATH, sep='\t', index=False)