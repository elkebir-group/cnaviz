This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Quickstart
1) Run `yarn install` which will download all the required packages. A node_modules folder and yarn.lock file should be in the directory
2) Run `yarn run start`
3) Open https://localhost:3000 in the browser (I have only tested the app on google chrome)
4) You should also be able to use npm, but I usually use yarn. In that case, it would be `npm install` and `npm start`

## Controls
1) First choose a file from the data directory (or any other Hatchet .bbc file of your choosing)
2) There are two modes: Bounding box mode and mouse wheel mode
   
### Using the Bounding Box
1) To go into bounding box mode, click the key `b`. Now if you click and drag on the scatterplot, a bounding box should appear.
2) Without holding down any other keys, the bounding box will select points and highlight them a blue color. 
3) Holding down shift while selecting new points will add to your current selection. 
4) Holding down shift while boxing in already selected points will remove points from your current selection.
5) The above method of selection applies to both the scatterplot and the linear plot.
6) If you hold down the metakey (command on mac or control on windows), then the scatterplot will zoom to the bounding box. (Note: This hasn't yet been tested on windows but it should work)
   
### Using the mousewheel
1) To use mousewheel zooming, click the key `z`. Now if your scroll the mouse wheel (or sliding 2 fingers on mac), the scatterplot will zoom with respect to the mouse cursor. In this mode, you can also pan by clicking and dragging on the scatterplot
2) To reset any zooming/panning that has been done, click the reset button in the top right corner of the scatterplot. At the moment, you may have to click twice in some scenarios (still trying to work this out).
3) Note: This type of zoom can be quite slow on large datasets when drawing using canvas because you have to constantly redraw. I'm currently looking for a faster approach. If it is too slow, just use the bounding box zoom.

### Zooming along y-axis only
1) Regardless of which mode you are in, you can zoom along the y axis by hovering over the y axis and using the mouse wheel (added this recently and so there may be a few small bugs).

### Saving progress
1) To save your progress, download to csv. If you want to reload that saved data, you have to remove the quotes and replace commas with tabs (I will attempt to automate this later).  One way to do this using unix/linux commands is to run `tr ',' '\t' < ClusteredBins.txt > ClusteredBins2.txt` and `tr -d \" < ClusteredBins2.txt > ClusteredBins3.txt` in the terminal. Then ClusteredBins3.txt should contain the properly formatted save file. 
2) Note: Make sure to confirm that the saved file actually works in another session, before closing out the session with your clustering. 
3) As of yet, I haven't run into any bugs that completely crash the program, but it might still be worth it to download to csv periodically to prevent all your progress being lost.

### Assigning to a cluster
1)  To assign points to a cluster, you will have to first select points using the bounding box. 
2)  Then, you pick a cluster id using the number input to the right of the Assign Cluster button. If you are adding to an existing cluster, use that that cluster's id. If you are creating a new cluster, you will have to choose a cluster id that hasn't been used before (will try to make this easier in the future).
3)  Click Assign Cluster
4)  Assigning points to cluster -2 will prevent those points from being exported when you download to csv
5)  Points under cluster -1 are considered unclustered
