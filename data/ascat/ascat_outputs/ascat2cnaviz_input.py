import numpy as np

f1 = "/Users/gillianchu/mek/ascat/p10_segments.csv"
baf_file = '/Users/gillianchu/mek/ascat/P10_ascat_baf.txt'
rdr_file = '/Users/gillianchu/mek/ascat/P10_ascat_logr.txt'
bafs = np.loadtxt(baf_file, dtype=str)[1:]
rdrs = np.loadtxt(rdr_file, dtype=str)[1:]

segments = np.loadtxt(f1, delimiter=',', dtype=str)
seg = segments[1:]
s1 = [row for row in seg if row[0] == '"S1"']



