  
import React, { useState } from "react";
import { Link } from "react-router-dom";
import "./Sidebar.css";
import {ClusterTable} from "./ClusterTable";
import {DisplayMode} from "../App";
import {CSV} from "./CSVLink"
import { GenomicBin} from "../model/GenomicBin";
import * as d3 from "d3";
import {FiArrowLeftCircle, FiArrowRightCircle, FiMousePointer, FiZoomIn } from "react-icons/fi";
import { ToggleButton } from "./ToggleButton";

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
    updatedClusterTable: () => void;
}


function Sidebar(props: Props) {
  const showSidebar = () => {
    props.onSidebarChange(!props.show)
  };

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

      {props.currentDisplayMode == DisplayMode.select && <div className="closemenu2" onClick={() => {
                if(props.currentDisplayMode === DisplayMode.zoom) { 
                  props.setDisplayMode(DisplayMode.select)
                } else {
                  props.setDisplayMode(DisplayMode.zoom)
                }
              }}><FiMousePointer></FiMousePointer>  </div>}
      {props.currentDisplayMode == DisplayMode.zoom && <div className="closemenu2" onClick={() => {
                if(props.currentDisplayMode === DisplayMode.zoom) { 
                  props.setDisplayMode(DisplayMode.select)
                } else {
                  props.setDisplayMode(DisplayMode.zoom)
                }
              }}><FiZoomIn></FiZoomIn></div>}
      
      
      <div className="contents">

        <h1>CNA-Viz</h1>
        <div className="title-bar"></div>
        <h2>Import/Export</h2>
          <div className="row-contents" > Chosen File: {props.chosenFile}</div>
          <div className="row-contents">
            <label className="custom-file-upload">
              <input type="file" id="fileUpload" onChange={
                (event: any) =>
                props.onFileChosen(event, false)
              } />
              Import
            </label>
          </div>
          
          <div className="row-contents" >
            <label className="custom-file-upload">
              <input type="file" id="fileUpload" onChange={
                (event: any) =>
                props.onFileChosen(event, true)
              }/>
              Import with Clustering
            </label>
          </div>

          <div className="row-contents">
            <CSV data={props.data} logData={props.logData} fileName={props.chosenFile}></CSV>
          </div>
          
        <div className="title-bar"></div>
        <h2 >Display Settings</h2>
          <div className= "row-contents" >
            <label htmlFor="Select Chromosome"> Select a Chromosome: </label>
            <select
                name="Select Chromosome" 
                id="Select Chromosome"
                value={props.selectedChr}
                onChange={props.onChrSelected} >
                    {props.chrOptions}
            </select>
          </div>
        
          <div className= "row-contents" >
            <label>
              <span className="App-CheckBox-explanation">Apply log to RD: </span>
              <input type="checkbox" onClick={props.onToggleLog}/>
            </label>
          </div>
          <div className= "row-contents" >
            <label>
              <span className="App-CheckBox-explanation">Display Scatterplots: </span>
              <input type="checkbox" onClick={props.onToggleScatter} checked={props.showScatter} readOnly/>
            </label>
            
          </div>
          <div className= "row-contents" >
            <label>
              <span className="App-CheckBox-explanation">Display Linear Plots: </span>
              <input type="checkbox" onClick={props.onToggleLinear} checked={props.showLinear} readOnly/>
            </label>
          </div>
          {/* <div className= "row-contents" >
            <label>
              <span className="App-CheckBox-explanation">Sync Scales: </span>
              <input type="checkbox" onClick={props.onToggleSync} checked={props.syncScales} readOnly/>
            </label>
          </div> */}
          <div className= "row-contents" >
            <label>
              <span className="App-CheckBox-explanation">Show Centroids: </span>
              <input type="checkbox" onClick={props.onToggleShowCentroids} checked={props.showCentroids} readOnly/>
            </label>
          </div>

          <div className= "row-contents" >
            <ToggleButton
                displayMode={props.currentDisplayMode}
                setDisplayMode={() => {
                  if(props.currentDisplayMode === DisplayMode.zoom) { 
                    props.setDisplayMode(DisplayMode.select)
                  } else {
                    props.setDisplayMode(DisplayMode.zoom)
                  }
                }}
              />
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
                updatedClusterTable={props.updatedClusterTable}
            ></ClusterTable>
          
        </div>
      
    </div>
  );
}

export default Sidebar;