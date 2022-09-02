# CNAViz 2.1 (2022-09-02)
- Additionally allows per bin exporting of copy number according to cluster assignment. Additionally, columns for RDR and BAF are only exported if the purity-ploidy option is chosen. In total, six additional columns will be output. 
- Demo button has become a dropdown menu, with three options. One for bulk sequencing data and two for single cell sequencing data. The final option, ``None'' will refresh the page if selected.
- Adding functionality: if no cluster column was uploaded, the file no longer throws an error, and will just unassign all bins.
- Increase the maximum point size to 20.
- Allows use of the mouse wheel in zoom mode. 
- Changed the name of 'erase' mode is now 'deselect', and cleared up the tool tips for 'Undo Cluster' and added a pop-up confirmation for 'Clear Clustering'.
- Changed the axis text so it won't be double printed on global and local plots. Also added a space to the (x, x) for the purity/ploidy axis label.

# CNAViz 2.0 
Summary: 
- Revised the data preparation script, and added the segment_bins.py script, a script to create the .seg file, and the datapreparation.md.
- Additionally added two pieces of major functionality:  Merge Clusters and Absorb Bins, with sample-specific thresholds.
- Code for gmmhmm initial clustering, and data for the best clustering solution, as well as the diagnostic plot for model selection.
- Adding the rho psi calculation script.
- Adding the ASCAT_casasent.R script. 
- Thicker margin on top of mainUI css container so the thicker toolbar doesn't overlap the buttons by default.
- Updates the toolbar with the keyboard shortcuts, and adds keyboard shortcut for pan, changes the one for zoom. Updates the directions as well.
- Moved the log file download from Export in sidebar to a separate Export button in the Log popup.
- Tetraploidy checkbox is synced in both the scatterplot and the linear plot.
- Made all step sizes 0.01.
- Added the hatchet.ini file, and a few lines to the README directing the user to this file.

Ease of Use Changes:

 Added a color dropper to choose the selection color. Change the default to be black.
 Added a HELP button on the main screen
 Updated default values for purity and ploidy
 Added tooltips
 Moved all the modes to the toolbar at the top and added an icon for each mode.
 Changed the default mode to be pan on both the scatter and linear plots.
 Changed the hover icon over scatterplot and linear plot to be a grab cursor when in default mode, or crosshair otherwise.
 Click off popup closes the popup
Functionality Changes:

 Added AbsorbBins functionality. Button is added to the sidebar, and allows the user to choose clusters to "steal" bins from, and choose clusters to reassign those bins to. This choice is done based off of Euclidean distance to the "to" cluster centroid, and is finalized if the BAF and RDR values are within the provided threshold. On click this button automatically performs assignment.
 Purity and Ploidy grid lines.
 Added a user-input (x, x) BAF offset
 Added MergeBins functionality. Button is added to the centroids table, and allows the user to automatically merge any clusters whose centroids fall within some per-sample threshold.
Additional Changes:

 Toolbar to the right and move HELP to the left, name Tools to Modes
 Previous Actions -> Log
 Tooltips for the Sampleviz buttons
 Take out the word Cluster and Sample from the SampleViz buttons
 Eliminate HELP button from sidebar
 HELP button should look like the Icon buttons.
 Make border changes for all buttons (Previous Actions) on hover.
 Add hover Tooltips and button change to toolbar
 Group sidebar buttons logically
 Move undo cluster into sidebar
 BAF balance offset lower bound - can’t type in less than 0.1.
 Absorb Bins should have a popup shortcut - key binding (a)?
 In the Centroid Table pop-up: MergeBins -> Merge
 In the MergeBins functionality, pick the larger cluster to absorb it into
 Pop-up to alert user to all cluster merges that will happen -> give option to allow or abort
 Make input number boxes wider in centroid table
 Button for Merge All according to all sample thresholds
Additional Changes 2:

 Pick a different icon, put it in a circle, use a thicker line width for the question mark - help icon
 Centroid Table: instead of X, Y just have BAF and RDR
 default value should be set to 0 for all
 Step size of .01 for all
 Upper bound of 1 for purity, BAF offset upper bound
 Hover is pushing the UI down in toolbar and sidebar
 Make step size back to .1 for ploidy and .05 purity, step size: 0.01
Additional Changes 3:

 Added a slider to the sidebar to allow user to change the point size on scatterplot and linear plots
 Added CNAViz version number (v2.0) to the title
