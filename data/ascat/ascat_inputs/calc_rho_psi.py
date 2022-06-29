# import pandas
import pandas as pd

# Read remote old HATCHet result's file
#data = pd.read_csv("https://github.com/raphael-group/hatchet-paper/raw/master/cancer/Casasent2018/P10/results/best.bbc.ucn.gz", sep='\t')
#data = pd.read_csv('/Users/gillianchu/mek/cnaviz/og_hatchet/output_P10/results/best.bbc.ucn', sep='\t')
data = pd.read_csv('/Users/gillianchu/mek/cnaviz/simulations/hatchet-paper/simulation/free/noWGD/dataset_n2_s4669/k4_01090_02008_00506035_00504055/hatchet/hatchet.seg.ucn.gz', sep='\t')

# Compute tumor purity per every row
data['TumorPurity'] = 1 - data['u_normal']

# Compute size of genomic regions
data['width'] = data['END'] - data['START']

# Compute clones
clones = [col.split('_')[1] for col in data.columns if 'cn_' == col[:3]]

# Compute total copy numbers for every clone and weight it by related proportions, scaled or not by tumour purity
for clone in clones:
    data['tot_{}'.format(clone)] = data['cn_{}'.format(clone)].str.split('|', expand=True).astype(int).sum(axis=1)
    data['weighted_{}'.format(clone)] = data['tot_{}'.format(clone)] * data['u_{}'.format(clone)]
    if clone != 'normal':
        data['scaled_weighted_{}'.format(clone)] = data['tot_{}'.format(clone)] * (data['u_{}'.format(clone)] / data['TumorPurity'])

# Sum the weighted copy numbers
data['weighted'] = sum(data['weighted_{}'.format(clone)] for clone in clones)
data['scaled_weighted'] = sum(data['scaled_weighted_{}'.format(clone)] for clone in clones if clone != 'normal')

# Print tumor purity
print("Using tumor purity as rho for ASCAT")
print("tumor purity (rho):", data.groupby('SAMPLE')['TumorPurity'].first())

# Compute and print sample ploidy (including normal cells) per sample
print("Using sample ploidy as psi for ASCAT")
print("sample ploidy (psi, including normal cells):", data.groupby('SAMPLE')[['width', 'weighted']].apply(lambda sample : (sample['width'] * sample['weighted']).sum() / sample['width'].sum()))

# Compute and print tumor ploidy (including normal cells) per sample
print("tumor ploidy (psi, including normal cells):", data.groupby('SAMPLE')[['width', 'scaled_weighted']].apply(lambda sample : (sample['width'] * sample['scaled_weighted']).sum() / sample['width'].sum()))
