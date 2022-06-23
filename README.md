# Click [here](https://elkebir-group.github.io/cnaviz/) to try out CNAViz!

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Running on localhost
1) Run `yarn install` which will download all the required packages. A node_modules folder and yarn.lock file should be in the directory
2) Run `yarn run start`
3) Open https://localhost:3000 in the browser

## Tutorial
Click [here](docs/Tutorial.md) to view a CNAViz tutorial.

In order to prepare data to load into CNAViz, we present one example of how to get a clustering with HATCHet.
To get the clustering results with locality clustering, use the current HATCHet.ini file ([here](docs/hatchet.ini)). 
To perform copy number calling after using CNAViz, users should set the last three steps under the [run] section to True, and set all others to False.
For further details, we refer the user to the [HATCHet demo](https://github.com/raphael-group/hatchet/blob/master/examples/demo-complete/demo-complete.sh#configuring-the-hatchets-execution).

### Screencasts and Data Analysis
Screencasts, data and analysis files are available on the [cnaviz-paper repo](https://github.com/elkebir-group/cnaviz-paper).

