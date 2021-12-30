import React from "react";
import "./Sidebar.css";
import {ClusterTable} from "./ClusterTable";
import {DisplayMode, ProcessingStatus} from "../App";
import {CSV} from "./CSVLink"
import { GenomicBin} from "../model/GenomicBin";
import {FiArrowLeftCircle, FiArrowRightCircle, FiMousePointer, FiZoomIn } from "react-icons/fi";
import { ToggleButton } from "./ToggleButton";
import spinner from "../loading-small.gif";
import {BsQuestionCircle} from "react-icons/bs";


interface Props {
    selectedChr : string;
    onChrSelected : any;
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
    onToggleSilhouttes: () => void;
    showSilhouttes: ProcessingStatus;
    onToggleDirections: () => void;
    onToggleShowCentroidTable: () => void;
    onTogglePreviousActionLog: () => void;
    onClearClustering: () => void;
    handleDemoFileInput: (applyClustering: boolean) => void;
    handleDemoDrivers: () => void;
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
      
      <div className="contents">
      <div className="row-contents" > <h1>CNA-Viz</h1> </div>
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
                <CSV data={props.data} logData={props.logData} fileName={props.chosenFile}></CSV>
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
            <label className="custom-file-upload">
              <input type="file" id="fileUpload" onChange={
                (event: any) =>
                props.onDriverFileChosen(event, true)
              }/>
              Import Driver Genes
            </label>

            <label className="custom-file-upload">
              <input type="button" id="custom-button" onClick={
                  (event: any) => props.handleDemoDrivers()
              }/>
              Demo Drivers
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
            <label>
              <span className="App-CheckBox-explanation">Log RDR: </span>
              <input type="checkbox" onClick={props.onToggleLog}/>
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
            <ToggleButton
                displayMode={props.currentDisplayMode}
                setDisplayMode={() => {
                  if(props.currentDisplayMode === DisplayMode.zoom) { 
                    // setDisplayMode is what the toggle should should change to when clicked (so whatever displayMode that it isn't currently on)
                    props.setDisplayMode(DisplayMode.select) 
                  } else {
                    props.setDisplayMode(DisplayMode.zoom)
                  }
                }}
              />
          </div>
          <div className= "row-contents" >
            <label className="custom-file-upload">
              <input type="button" id="custom-button" onClick={props.onToggleSilhouttes}/>
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
                colTwoName={"Bins (%)"}
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