# CNAViz: User-guided segmentation for copy-number calling of tumor sequencing data

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Running CNAViz
Click [here](https://elkebir-group.github.io/cnaviz/) to run the latest version of CNAViz.

## Running CNAViz on localhost
1) Run `yarn install` which will download all the required packages. A node_modules folder and yarn.lock file should be in the directory
2) Run `yarn run start`
3) Open https://localhost:3000 in the browser

## Data preparation
CNAViz can be run in *de novo* mode, i.e. starting from an empty clustering, or in refinement mode, i.e. starting with a given initial clustering. Following user-guided refinement using CNAViz, the resulting clustering file can be provided to any method of the user's choice for CNA calling. We provide details on how to provide the CNAViz output clustering to HATCHet for CNA calling. 

1 (a). HATCHet to get RDR and BAF values. 
1 (b). Run GMMHMM.py to get an initial clustering.
1 (c). Use CNAViz.
1 (d). Perform CNA calling using HATCHet (example .ini file [here](docs/hatchet_post.ini)). 

2 (a). HATCHet clustering (example.ini file [here](docs/hatchet_pre.ini)).
2 (b). Use CNAViz to refine the existing clustering. 
2 (c). Perform CNA calling using HATCHet (example .ini file [here](docs/hatchet_post.ini)). 

3 (a). ASCAT clustering.
3 (b). Use CNAViz to refine the existing clustering.
3 (c). Perform CNA calling using HATCHet (example .ini file [here](docs/hatchet_post.ini)). 

<!-- ### De novo clustering

*TODO:* HATCHet ini file for just estimating RDR and BAF starting from BAM files.

In order to prepare data to load into CNAViz, we present one example of how to get a clustering with [HATCHet](https://github.com/raphael-group/hatchet).
o get the clustering results with locality clustering, use the current [hatchet_pre.ini file](docs/hatchet_pre.ini). 
To perform copy number calling after using CNAViz, users should set the last three steps under the [run] section to True, and set all others to False. We provide the user with this post [hatchet_post.ini script](docs/hatchet_post.ini)). 
For further details, we refer the user to the [HATCHet demo](https://github.com/raphael-group/hatchet/blob/master/examples/demo-complete/demo-complete.sh#configuring-the-hatchets-execution). -->

## Tutorial
Click [here](docs/Tutorial.md) to view a CNAViz tutorial.

## Screencasts and Data Analysis
Screencasts, data and analysis files are available on the [cnaviz-paper repo](https://github.com/elkebir-group/cnaviz-paper).

