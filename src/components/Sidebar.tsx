import React from "react";
import "./Sidebar.css";
import {ClusterTable} from "./ClusterTable";
import {DisplayMode, ProcessingStatus} from "../App";
import {CSV} from "./CSVLink"
import { GenomicBin} from "../model/GenomicBin";
import {FiArrowLeftCircle, FiArrowRightCircle, FiMousePointer, FiZoomIn } from "react-icons/fi";
import {BiEraser} from "react-icons/bi";


interface Props {
    selectedChr : string;
    selectedColor : string;
    onChrSelected : any;
    onColorSelected : any;
    onAbsorbThresh : any; 
    chrOptions: any;
    colorOptions: any;
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
    onTogglePreviousActionLog: () => void;
    onClearClustering: () => void;
    handleDemoFileInput: (applyClustering: boolean) => void;
    handleDemoDrivers: () => void;
    setProcessingStatus: (status: ProcessingStatus) => void;
    onTogglePurityPloidy: () => void;
    showPurityPloidy: boolean;
    applyLog: boolean;
    processingStatus: ProcessingStatus;
    onExport: () => void;


}

function Sidebar(props: Props) {
  const showSidebar = () => {
    props.onSidebarChange(!props.show)
  };

  let chosenFile = props.chosenFile;
  if(chosenFile.length > 35) {
    chosenFile = chosenFile.substring(0, 34) + "...";
  }

  return (

    <div className={props.show ? "sidebar active" : "sidebar"}>
      <div className="closemenu" onClick={showSidebar}>
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
      
      <div className="closemenu2" onClick={() => props.setDisplayMode(DisplayMode.select)}>
            <div className="arrow-container"> 
              <FiMousePointer
                color={props.currentDisplayMode === DisplayMode.select ? "red" : "black"}
              />
            </div>
      </div>

      <div className="closemenu3" onClick={() => props.setDisplayMode(DisplayMode.zoom)}>
            <div className="arrow-container"> 
              <FiZoomIn
                color={props.currentDisplayMode === DisplayMode.zoom || props.currentDisplayMode === DisplayMode.boxzoom ? "red" : "black"}
              />
            </div>
      </div>
      
      <div className="closemenu4" onClick={() => props.setDisplayMode(DisplayMode.erase)}>
            <div className="arrow-container"> 
              <BiEraser
                color={props.currentDisplayMode === DisplayMode.erase ? "red" : "black"}
              />
            </div>
      </div>

      <div className="contents">
      <div className="row-contents" > <h1>CNAViz</h1> </div>
        <div className="title-bar"></div>
          <div className="row-contents" > Chosen File: {chosenFile}</div>
          <div className="row-contents">
              <label className="custom-file-upload">
                <input type="file" id="fileUpload" onChange={
                  (event: any) =>
                  props.onFileChosen(event, true)
                } />
                Import
              </label>
              
              <label className="custom-file-upload">
                <CSV data={props.data} logData={props.logData} fileName={props.chosenFile} onExport={props.onExport}></CSV>
                Export
              </label>
              <label className="custom-file-upload">
                <input type="button" id="custom-button" onClick={
                    (event: any) => props.handleDemoFileInput(true)
                }/>
                Demo
              </label>
          </div>
          
          <div className="row-contents" >
            <label className={props.processingStatus !== ProcessingStatus.done ? "custom-file-upload-disabled" : "custom-file-upload"}>
              <input type="file" id="fileUpload"  disabled={props.processingStatus !== ProcessingStatus.done} onChange={
                (event: any) => props.onDriverFileChosen(event, true)
              }/>
              Import Driver Genes
            </label>

            <label className={props.processingStatus !== ProcessingStatus.done ? "custom-file-upload-disabled" : "custom-file-upload"}>
              <input type="button" id="custom-button" disabled={props.processingStatus !== ProcessingStatus.done} onClick={
                  (event: any) => props.handleDemoDrivers()
              }/>
              CGC Drivers
            </label> 
          </div>
  
          <div className= "row-contents" >
            <div>
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
            <div>
              <label htmlFor="Select Cluster Color" style={{margin: 10}}> Selection Color: </label>
              <select
                  name="Select Color" 
                  id="Select Color"
                  value={props.selectedColor}
                  onChange={props.onColorSelected} >
                      {props.colorOptions}
              </select>
            </div>
          </div>

          <div className= "row-contents" >
            <div>
              <label htmlFor="Absorb Thresh" style={{margin: 10}}> Absorb Thresh: </label>
              <input
                  name="Absorb Thresh" 
                  id="Thresh-Input"
                  min={0} max={5} step=".1"
                  onChange={props.onAbsorbThresh} > 
              </input>
            </div>
          </div>
        
          <div className= "row-contents" >
            <label>
              <span className="App-CheckBox-explanation">Log RDR: </span>
              <input type="checkbox" onClick={props.onToggleLog} disabled={props.showPurityPloidy}/>
            </label>
            <label>
              <span className="App-CheckBox-explanation">Centroids: </span>
              <input type="checkbox" onClick={props.onToggleShowCentroids} checked={props.showCentroids} readOnly/>
            </label>
          </div>
          <div className= "row-contents" >
            <label>
              <span className="App-CheckBox-explanation">Scatterplots: </span>
              <input type="checkbox" onClick={props.onToggleScatter} checked={props.showScatter} readOnly/>
            </label>
            <label>
              <span className="App-CheckBox-explanation">Linear Plots: </span>
              <input type="checkbox" onClick={props.onToggleLinear} checked={props.showLinear} readOnly/>
            </label>
          </div>
          <div className= "row-contents" >
            <label>
              <span className="App-CheckBox-explanation">Purity/Ploidy: </span>
              <input type="checkbox" onClick={props.onTogglePurityPloidy} checked={props.showPurityPloidy} disabled={props.applyLog} readOnly/>
            </label>
          </div>
                    

          <div className= "row-contents" >
            <label className="custom-file-upload">
              <input type="button" id="custom-button" onClick={() => { 
                props.onTogglesilhouettes();
              }}/>
              Analytics (s)
            </label>
            <label className="custom-file-upload">
              <input type="button" id="custom-button" onClick={props.onToggleShowCentroidTable}/>
              Centroids (c)
            </label>
            <label className="custom-file-upload">
              <input type="button" id="custom-button" onClick={props.onToggleDirections}/>
              Usage (?)
            </label>
          </div>
          <div className= "row-contents" >
            <label className="custom-file-upload">
              <input type="button" id="custom-button" onClick={props.onClearClustering}/>
              Clear Clustering
            </label>
            <label className="custom-file-upload">
              <input type="button" id="custom-button" onClick={props.onTogglePreviousActionLog}/>
              Previous Actions (l)
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
