# CNAViz: An interactive webtool for user-guided segmentation of tumor DNA sequencing data

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Running CNAViz
Click [here](https://elkebir-group.github.io/cnaviz/) to run the latest version of CNAViz.

## Running CNAViz on localhost
1) Run `yarn install` which will download all the required packages. A node_modules folder and yarn.lock file should be in the directory
2) Run `yarn run start`
3) Open https://localhost:3000 in the browser

## Data Prepartion
Click [here](docs/DataPreparation.md) for the full tutorial on preparing data for CNAViz, obtaining a HATCHet, ASCAT or GMMHMM clustering, or performing downstream copy-number calling with HATCHet. . 

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

