import React from "react";
import "./Sidebar.css";
import {ClusterTable} from "./ClusterTable";
import {DisplayMode, ProcessingStatus} from "../App";
import {CSV} from "./CSVLink";
import { GenomicBin} from "../model/GenomicBin";
import {FiArrowLeftCircle, FiArrowRightCircle, FiZoomIn, FiUpload, FiDownload} from "react-icons/fi";
import {IoHandRight} from "react-icons/io5"
import {BiEraser, BiMessageSquareAdd} from "react-icons/bi";
import { Slider } from '@mui/material';
import Box from "@mui/material/Box";
import { isPropertySignature } from "typescript";

interface Props {
    // pointsize : number; 
    selectedChr : string;
    selectedColor : string;
    onChrSelected : any;
    onColorSelected : any;
    onAbsorbThresh_rdr : any; 
    onAbsorbThresh_baf : any; 
    onMergeThresh_rdr : any; 
    onMergeThresh_baf : any; 
    chrOptions: any;
    onAddSample: any;
    onAssignCluster: any;
    tableData: any;
    onClusterRowsChange: any;
    onClusterColorChange: any;
    currentClusterFilters: String[];
    handleClusterAssignmentInput: any;
    value: string;
    setDisplayMode: any;
    currentDisplayMode: DisplayMode;
    colors: string[];
    onSidebarChange: any;
    data: readonly GenomicBin[];
    logData: any[];
    onFileChosen: any;
    onDriverFileChosen: any;
    chosenFile: string;
    show: boolean;
    onToggleLog: () => void;
    onToggleScatter: () => void;
    onToggleLinear: () => void;
    onToggleShowCentroids: () => void;
    showCentroids: boolean;
    showScatter: boolean;
    showLinear: boolean;
    syncScales: boolean;
    onToggleSync: () => void;
    onTogglesilhouettes: () => void;
    showSilhouettes: ProcessingStatus;
    onToggleDirections: () => void;
    onToggleShowCentroidTable: () => void;
    onToggleShowAbsorbBins: () => void;
    onTogglePreviousActionLog: () => void;
    onUndoClick: () => void; 
    onClearClustering: () => void;
    handleDemoFileInput: (applyClustering: boolean) => void;
    handleDemoDrivers: () => void;
    setProcessingStatus: (status: ProcessingStatus) => void;
    onTogglePurityPloidy: () => void;
    onShowTetraploid: () => void; 
    showTetraploid: boolean; 
    showPurityPloidy: boolean;
    applyLog: boolean;
    processingStatus: ProcessingStatus;
    onExport: () => void;
    handleslider: (event: any, val: number) => void; 
    // pointslider: (value: number) => void; 
}

export const SIDEBAR_WIDTH = "320px";

function Sidebar(props: Props) {
  const showSidebar = () => {
    props.onSidebarChange(!props.show)
  };

  let chosenFile = props.chosenFile;
  if(chosenFile.length > 35) {
    chosenFile = chosenFile.substring(0, 34) + "...";
  }

  // let pointslider(value: number) {
  //   this.setState({pointsize: value}); 
  //   // return `${value}??C`;
  // }

  return (

    <div
      className="sidebar"
      style={{
        width: SIDEBAR_WIDTH,
        left: props.show ? 0 : "-" + SIDEBAR_WIDTH
      }}
    >
      <div className="closemenu" onClick={showSidebar} title="Close/open the sidebar.">
          <div> </div>
          {props.show ? (
                <div className="arrow-container"> 
                  <FiArrowLeftCircle/>
                </div>
              ) : (
                <div className="arrow-container">
                  <FiArrowRightCircle/>
                </div>
              )
          }
      </div>

      <div className="contents">
      <div className="row-contents" > <h1>CNAViz v2.0</h1> </div>
        <div className="title-bar"></div>
          <div className="row-contents" > Chosen File: {chosenFile}</div>
          <div className="row-contents">
              <label className="custom-file-upload" title="Uploads a file.">
                <input type="file" id="fileUpload" onChange={
                  (event: any) =>
                  props.onFileChosen(event, true)
                } />
                Import <FiUpload/>
              </label>
              
              <label className="custom-file-export" title="Exports your clustering.">
                {/* <CSV data={props.data} logData={props.logData} fileName={props.chosenFile} onExport={props.onExport}></CSV> */}
                <CSV data={props.data} fileName={props.chosenFile} onExport={props.onExport}></CSV>
                Export <FiDownload/>
              </label>
              <label className="demo" title="Loads CNAViz with demo data.">
                <input type="button" id="custom-button" onClick={
                    (event: any) => props.handleDemoFileInput(true)
                }/>
                Demo
              </label>
          </div>
          
          <div className="row-contents" >
            <label className={props.processingStatus !== ProcessingStatus.done ? "custom-file-upload-disabled" : "custom-file-upload2"} title="Uploads your driver genes.">
              <input type="file" id="fileUpload"  disabled={props.processingStatus !== ProcessingStatus.done} onChange={
                (event: any) => props.onDriverFileChosen(event, true)
              }/>
              Import Driver Genes
            </label>

            <label className={props.processingStatus !== ProcessingStatus.done ? "custom-file-upload-disabled" : "custom-file-upload3"} title="Uploads Cancer Gene Census driver genes.">
              <input type="button" id="custom-button" disabled={props.processingStatus !== ProcessingStatus.done} onClick={
                  (event: any) => props.handleDemoDrivers()
              }/>
              CGC Drivers
            </label> 
          </div>
  
          <div className= "row-contents" >
            <div className="Select-Chrom" title="Select a chromosome to visualize in the linear and scatter plots.">
              <label htmlFor="Select Chromosome" style={{margin: 10}}> Chromosome: </label>
              <select
                  name="Select Chromosome" 
                  id="Select Chromosome"
                  value={props.selectedChr}
                  onChange={props.onChrSelected} >
                      {props.chrOptions}
              </select>
            </div>
          </div>

          <div className= "row-contents" >
            <div className="selection-color" title="Pick a color to represent your selected bins.">
              <label htmlFor="Select Cluster Color" style={{margin: 10}}> Selection Color: </label>
              <input type="color"
                  name="Select Color" 
                  id="Select Color"
                  value={props.selectedColor}
                  onChange={props.onColorSelected} >
              </input>
            </div>
          </div>

          <div className="row-contents">
          {/* <label className="point-slider" title="Changes the size of the points in the scatterplot and linear plot."> */}
          <Box sx={{ width: 300 }}>  
              Point Size:
              <Slider
                aria-label="Point Size"
                defaultValue={3}
                onChangeCommitted={props.handleslider}
                // getAriaValueText={this.pointslider}
                valueLabelDisplay="auto"
                step={1}
                marks={true}
                min={1}
                max={10}
              />
            {/* </label> */}
            </Box>
          </div>

          <div className= "row-contents" >
            <label className="logrdr" title="Shows read-depth ratio (RDR) in log form.">
              <span className="App-CheckBox-explanation">Log RDR: </span>
              <input type="checkbox" onClick={props.onToggleLog} disabled={props.showPurityPloidy}/>
            </label>
            <label className="centroids" title="Shows centroids for each visualized cluster on the scatterplot."> 
              <span className="App-CheckBox-explanation">Centroids: </span>
              <input type="checkbox" onClick={props.onToggleShowCentroids} checked={props.showCentroids} readOnly/>
            </label>
          </div>
          <div className= "row-contents" >
            <label className="scatterplot" title="Shows the scatterplots.">
              <span className="App-CheckBox-explanation">Scatterplots: </span>
              <input type="checkbox" onClick={props.onToggleScatter} checked={props.showScatter} readOnly/>
            </label>
            <label className="linearplot" title="Shows the linear plots.">
              <span className="App-CheckBox-explanation">Linear Plots: </span>
              <input type="checkbox" onClick={props.onToggleLinear} checked={props.showLinear} readOnly/>
            </label>
          </div>
          <div className= "row-contents" >
            <label className="purityploidy" title="Shows lines for purity and ploidy on the scatterplots.">
              <span className="App-CheckBox-explanation">Purity/Ploidy: </span>
              <input type="checkbox" onClick={props.onTogglePurityPloidy} checked={props.showPurityPloidy} readOnly/>
            </label>
            <label className="tetraploid" title="Shows tetraploid gridlines for purity and ploidy.">
              <span className="App-CheckBox-explanation">Tetraploid: </span>
              <input type="checkbox" onClick={props.onShowTetraploid} checked={props.showTetraploid}readOnly/>
            </label>
          </div>
         
         

          {/* Analytics:  */}
          <div className= "row-contents" >
            <label className="analytics" title="Shows pop-up displaying cluster analytics.">
              <input type="button" id="custom-button" onClick={() => { 
                props.onTogglesilhouettes();
              }}/>
              Analytics (s)
            </label>
            <label className="centroidtable" title="Shows pop-up displaying centroid table.">
              <input type="button" id="custom-button" onClick={props.onToggleShowCentroidTable}/>
              Centroids (c)
            </label>
            {/* <label className="absorbbins" title="Shows pop-up helping user automate reallocation of bins.">
              <input type="button" id="custom-button" onClick={props.onToggleShowAbsorbBins}/>
              Absorb Bins (a)
            </label> */}
            {/* <label className="directions_label" title="Shows pop-up describing instructions and shortcuts.">
              <input type="button" id="custom-button" onClick={props.onToggleDirections}/>
              HELP (?)
            </label> */}
          </div>

          <div className="row-contents">
            <label className="absorbbins" title="Shows pop-up helping user automate reallocation of bins.">
              <input type="button" id="custom-button" onClick={props.onToggleShowAbsorbBins}/>
              Absorb Bins (a)
            </label>
          </div>

          {/* Cluster Actions: */}
          <div className="row-contents" >
            <label className="showlog" title="Shows the cluster assignment log.">
              <input type="button" id="custom-button" onClick={props.onTogglePreviousActionLog}/>
              Log (l)
            </label>
            <label className="clearclustering" title="Clears the clustering.">
              <input type="button" id="custom-button" onClick={props.onClearClustering}/>
              Clear Clustering
            </label>
            <label className="undocluster" title="Undo cluster assignment.">
              <input type="button" id="custom-button" onClick={props.onUndoClick}/>
              Undo Cluster
            </label>
          </div>

      </div>
        <div className="contents2">
          <ClusterTable 
                data={props.tableData} 
                onClusterRowsChange={props.onClusterRowsChange} 
                onClusterColorChange={props.onClusterColorChange}
                currentFilters={props.currentClusterFilters}
                colOneName={"Cluster ID"}
                colTwoName={"Bin (%)"}
                cols={""}
                expandable={true}
                selectable={true}
                colors={props.colors}
            ></ClusterTable>
          
        </div>
      
    </div>
  );
}

export default Sidebar;
