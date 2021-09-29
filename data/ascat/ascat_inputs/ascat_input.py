import numpy as np

bbc = "/Users/gillianchu/mek/cnaviz/data/Casasent2018/P6/results/best.bbc.ucn"
output_baf = "P6_ascat_baf.txt"
output_logr = "P6_ascat_logr.txt"

chrm_dict = dict()
with open(bbc, "r") as r:
    lines = r.readlines()
    for line in lines[1:]: 
        #print(line)
        chrm, start, end, sample, rd, numsnp, cov, alpha, beta, baf = line.split()[:10]

        chrm = int(chrm[3:])
        if chrm not in chrm_dict.keys():
            chrm_dict[chrm] = dict()
        snp_dict = chrm_dict[chrm]
        #print("\t saving chrm as", chrm)

        s = int(start)
        e = int(end)
        snp_pos = int((s + e)/2)
        #print("\t saving snp_pos as", snp_pos)

        rdr = np.log(float(rd))
        if snp_pos not in snp_dict.keys():
            # must be a different sample
            snp_dict[snp_pos] = dict()
        snp_dict[snp_pos][sample] = (baf, rdr)
        #print("\t saving snp_dict as", snp_dict)
        
        #if sample == 'INV':
            # see if there's a DCIS, and if not, report (s, e)
            #if "DCIS" not in snp_dict[snp_pos]:
                #print("DCIS is missing? @", s, e)

#print(lines[-1])
#print(chrm_dict.keys())
count_num = 0
### Checks
for chrm in chrm_dict.keys():
    snp_dict = chrm_dict[chrm]
    snp_pos_list = list(snp_dict.keys())
    for pos in snp_pos_list:
        sample_dict = snp_dict[pos]
        if len(list(sample_dict.keys())) != 2:
            count_num += 1

print(count_num, "dont have 2 samples.")

sample_names = ["DCIS", "INV"]
sample_name_str = 'DCIS\tINV'

numsnp = 1
delimiter = '\t'
with open(output_baf, "w+") as w1:
    with open(output_logr, "w+") as w2:
        
        w1.write("\tchrs\tpos\t" + sample_name_str + "\n")
        w2.write("\tchrs\tpos\t" + sample_name_str + "\n")

        for chrm in chrm_dict.keys(): #sorted([int(x) for x in chrm_dict.keys()]):
            snp_dict = chrm_dict[chrm]
            snp_pos_list = list(snp_dict.keys())
        
            for pos in snp_pos_list:
                
                sample_baf_list = []
                sample_rdr_list = []
                
                sample_dict = snp_dict[pos] 
                
                #print(sample_dict, pos, chrm)
                if len(sample_dict.keys()) != 2:
                    print("Containing < 2 samples:", sample_dict, chrm, pos)
                    continue
                for sample in sample_names:
                    sample_info = sample_dict[sample]
                    sample_baf, sample_rdr = sample_info
                    
                    sample_baf_list.append(str(sample_baf))
                    sample_rdr_list.append(str(sample_rdr))
                
                sample_baf_str = delimiter.join(sample_baf_list)
                sample_rdr_str = delimiter.join(sample_rdr_list)
                
                w1.write("SNP%s\t%s\t%s\t%s\n" % (numsnp, str(chrm), str(pos), sample_baf_str))
                w2.write("SNP%s\t%s\t%s\t%s\n" % (numsnp, str(chrm), str(pos), sample_rdr_str))

                numsnp += 1
