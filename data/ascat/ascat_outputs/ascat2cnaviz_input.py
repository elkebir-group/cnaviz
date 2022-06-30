import numpy as np

# patient = "P6"
# segments = "%s_logr_segments.csv" % patient
# snpdata = "%s_snpdata.csv" % patient
# baf_file = "../ascat_inputs/%s_ascat_baf.txt" % patient # edit header line to have SNPS column
# rdr_file = "../ascat_inputs/%s_ascat_logr.txt" % patient # edit header line to have SNPS column
# inputdata = '/Users/gillianchu/mek/cnaviz/data/Casasent2018/P6/results/best.bbc.ucn'


segments = "../ascat/segments.csv"
baf_file = '../ascat/ascat_baf.txt'
snpdata = '../ascat/snpdata.csv'
rdr_file = '../ascat/ascat_logr.txt'
input_data = 'ascat_input_data.tsv'
sample_names = ['DCIS', 'INV']


# output files
output_file = "%s_cnaviz_input_test.txt" % patient


# chrm -> bins
segment_dict = dict()
bafs = np.loadtxt(baf_file, dtype=str)[1:]
rdrs = np.loadtxt(rdr_file, dtype=str)[1:]

for x in sample_names:
    segment_dict[x] = []

last_sample_val = dict()
segidx_sample = dict()
for x in sample_names:
    last_sample_val[x] = ''
    segidx_sample[x] = 0

with open(segments, "r") as r:
    lines = r.readlines()
    for i, line in enumerate(lines[1:]):
        persample = line.rstrip().split(',')
        
        for i in range(len(sample_names)):
            sample = sample_names[i]
            sample_val = persample[i]
            
            if sample_val == '':
                last_sample_val[sample] = sample_val
            if sample_val != last_sample_val[sample]:
                segidx_sample[sample] += 1
        for x in sample_names: 
            segment_dict[x].append(segidx_sample[sample])

chrm_dict = dict()
bin_idx = 0
with open(snpdata, "r") as r:
    lines = r.readlines()
    for i, line in enumerate(lines[1:]):
        chrm, pos = line.rstrip().split(',')
        if chrm not in chrm_dict.keys():
            chrm_dict[chrm] = dict()
            bin_idx = 0
        chrm_dict[chrm][bin_idx] = dict()
        for sample in sample_names:
            chrm_dict[chrm][bin_idx][sample] = segment_dict[sample][i]
        bin_idx += 1
            
# keeps which bin we've seen so far 
chrm_count_dict = dict()
for sample in sample_names:
    chrm_count_dict[sample] = dict()

with open(inputdata, "r") as r:
    with open(output_file, "w+") as w:
        lines = r.readlines()
        for _, line in enumerate(lines):
            if line[0] == 'c': 
                vals = line.split('\t')
                chrm = vals[0][3:]
                samplename = vals[3]
                
                if chrm not in chrm_count_dict[samplename].keys():
                    chrm_count_dict[samplename][chrm] = 0
                bin_idx = chrm_count_dict[samplename][chrm]
                
                vals[10] = str(chrm_dict[str(chrm)][bin_idx][samplename])
                chrm_count_dict[samplename][chrm] += 1
                
                line = '\t'.join(vals)
            w.write(line)    