import pandas as pd
from sklearn.metrics import silhouette_score, silhouette_samples


data = pd.read_csv("/Users/zubairlalani/Code/Research/cnaviz/data/a12.tsv", sep='\t', engine="python", error_bad_lines=False)


X = [[0.5 - 0.377616, 2.03393, 0.5 - 0.373588, 2.33287, 0.5 - 0.35261, 2.32333],
[0.5 - 0.343333, 1.53431, 0.5 - 0.311604, 1.91776, 0.5 - 0.319737, 2.00814],
[0.5 - 0.380769, 1.68726, 0.5 - 0.415385, 2.04443, 0.5 - 0.418831, 1.9949],
[0.5 - 0.358491, 1.66972, 0.5 - 0.375973, 1.86677, 0.5 - 0.376443, 1.76679],
[0.5 - 0.376033, 1.38086, 0.5 - 0.281955, 1.57418, 0.5 - 0.338462, 1.5517],
[0.5 - 0.338583, 1.6874,  0.5 - 0.29771, 2.01914,  0.5 - 0.317881, 1.87081]]

# print((0.377616 - 0.380769)**2 +  (2.03393 - 1.68726)**2 + (0.373588 - 0.415385)**2 + (2.33287 - 2.04443)**2 + (0.35261 - 0.418831)**2 + (2.32333 - 1.9949)**2)

# p10 = X[3]
# p55 = [X[1], X[3], X[5]]

# avg_dist = 0
# for j in range(len(p55)):
#     dist1 = 0
#     for i in range(len(p10)):
#         diff = p10[i] - p55[j][i]
#         dist1 += diff * diff
#     avg_dist += dist1
# print(avg_dist / 3)

labels = [47, 55, 10, 55, 34, 55]
# print(silhouette_samples(X, labels))
# print(silhouette_score(X, labels))

print((-0.05326996238713894 + 0.14753062858871532 + -0.07057320420133709)/3)

# X1 = [
#   [-9.67867, -4.20271],
#   [0.08525, 3.64528],
#   [-7.38729, -8.53728],
#   [-5.93111, -9.25311],
#   [-8.5356, -6.01348],
#   [-2.18773, 3.33352],
#   [-0.79415, 2.10495],
#   [0.319018, 0.838678],
# ];
# labels1 = [0, 0, 2, 2, 0, 1, 1, 2]

# X2 = [
#   [0.377616, 2.03393],
#   [0.343333, 1.53431],
#   [0.380769, 1.68726],
#   [0.358491, 1.66972],
#   [0.376033, 1.38086],
#   [0.338583, 1.6874],
#   [0.319018, 0.838678],
# ];
# labels2 = [47, 55, 10, 55, 34, 55, 13];

# print(silhouette_score(X1, labels1))


# samples = set(data["SAMPLE"].values) # gets all unique samples in data
# clusters = set(data["CLUSTER"].values) # gets all unique clusters in data

# silhouettes = {}

# # s(i) = b - a / max(b, a)
# # b - intercluster dist

# # Finds silhoutte score for each sample individually (each separate scatterplot in cnaviz)
# for sample in samples:
#     sample_df = data[(data["SAMPLE"] == sample) ] # & ((data["CLUSTER"] == cluster) | (data["CLUSTER"] == cluster2))
#     labels = sample_df["CLUSTER"].values
#     X = sample_df[["BAF", "RD"]].values
#     print("SAMPLE: ", sample)
#     print(X)
#     print(labels)
#     score = silhouette_score(X, labels)
#     # s_scores = silhouette_samples(X, labels)
    
#     # print(s_scores)
#     silhouettes[sample] = score


# print(silhouettes)

# results:
# a12 file: (~160k bins)
# time python3 silhouette_score.py - 
    # {'A12-A': -0.3277532631662184, 'A12-C': -0.286403643374718, 'A12-D': -0.19507797281424993}
    # python3 silhouette_score.py  123.23s user 36.00s system 188% cpu 1:24.26 total
    
# a12_reduced file: (~1k bins)
    # {'A12-A': -0.320553589153198, 'A12-C': -0.3523449206906285, 'A12-D': -0.26975136094879043}
    # python3 silhouette_score.py  1.01s user 0.15s system 128% cpu 0.898 total

# a12_SMALL file: (20 bins)
    # {'A12-D': -0.020702813545727245, 'A12-C': 0.10338775633094466, 'A12-A': -0.1578411230009397}
    # python3 silhouette_score.py  1.26s user 0.49s system 65% cpu 2.673 total
