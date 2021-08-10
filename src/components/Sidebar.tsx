  
import React, { useState } from "react";
import { Link } from "react-router-dom";
import "./Sidebar.css";
import {ClusterTable} from "./ClusterTable";
import {DisplayMode} from "../App";
import {CSV} from "./CSVLink"
import { GenomicBin} from "../model/GenomicBin";
import * as d3 from "d3";
import { FiHome, FiLogOut, FiArrowLeftCircle, FiArrowRightCircle } from "react-icons/fi";
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
    onFileChosen: any;
    chosenFile: string;
    show: boolean;
    onToggleLog: () => void;
    onToggleScatter: () => void;
    onToggleLinear: () => void;
    showScatter: boolean;
    showLinear: boolean;
    syncScales: boolean;
    onToggleSync: () => void;
}


function Sidebar(props: Props) {
  // const [sidebar, setSidebar] = useState(true);
  const [value, setValue] = useState("");
  const [selected, setSelected] = useState(false);
  const showSidebar = () => {
    props.onSidebarChange(!props.show)
  };

  const renderDisplayModeRadioOption = (mode: DisplayMode) => {
    let label: string;
    let padding: string;
    switch (mode) {
        case DisplayMode.zoom:
            label = "Zoom";
            padding= "15px"
            break;
        case DisplayMode.select:
            label = "Select";
            padding = "15px";
            break;
        default:
            label = "???";
            padding= "0px"
    }

    return <div className="row-contents">
        <div onClick={() => props.setDisplayMode(mode)}>
            {label} <input type="radio" checked={props.currentDisplayMode === mode} readOnly/>
        </div>
    </div>;
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
          {/* <FiArrowLeftCircle/> */}
        </div>
      
      <div className="contents">
        <div>
          <h1>CNA-Viz</h1>
          <h2 className="title-bar">Import/Export</h2>
        </div>
        {/* <span className="App-file-upload-explanation">To get started, choose a .bbc file:</span> */}
        <div>Chosen File: {props.chosenFile}</div>
        <div className="contents">
          <div>
            <label className="custom-file-upload">
              <input type="file" id="fileUpload" onChange={
                (event: any) =>
                props.onFileChosen(event, false)
              } />
              Import TSV
            </label>
          </div>
          
          <div>
            <label className="custom-file-upload">
              <input type="file" id="fileUpload" onChange={
                (event: any) =>
                props.onFileChosen(event, true)
              }/>
              Import TSV with Clustering
            </label>
          </div>
          

          <CSV data={props.data}></CSV>
        </div>
        <div>
          <h2 className="title-bar">Display Settings</h2>
        </div>

        <div className= "row-contents">
          <label htmlFor="Select Chromosome"> Select a Chromosome: </label>
          <select
              name="Select Chromosome" 
              id="Select Chromosome"
              value={props.selectedChr}
              onChange={props.onChrSelected} >
                  {props.chrOptions}
          </select>
        </div>
        <div className="contents">
          <div className= "row-contents">
            <label>
              <span className="App-CheckBox-explanation">Apply log to RD: </span>
              <input type="checkbox" onClick={props.onToggleLog}/>
            </label>
          </div>
          <div className= "row-contents">
            <label>
              <span className="App-CheckBox-explanation">Display Scatterplots: </span>
              <input type="checkbox" onClick={props.onToggleScatter} checked={props.showScatter} readOnly/>
            </label>
            
          </div>
          <div className= "row-contents">
            <label>
              <span className="App-CheckBox-explanation">Display Linear Plots: </span>
              <input type="checkbox" onClick={props.onToggleLinear} checked={props.showLinear} readOnly/>
            </label>
          </div>
          <div className= "row-contents">
            <label>
              <span className="App-CheckBox-explanation">Sync Scales: </span>
              <input type="checkbox" onClick={props.onToggleSync} checked={props.syncScales} readOnly/>
            </label>
          </div>
        </div>

        <div className= "row-contents">
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
        

        <div >
          <ClusterTable 
              data={props.tableData} 
              onClusterRowsChange={props.onClusterRowsChange} 
              onClusterColorChange={props.onClusterColorChange}
              currentFilters={props.currentClusterFilters}
              colOneName={"Cluster ID"}
              colTwoName={"Bins (%)"}
              expandable={true}
              selectable={true}
              colors={props.colors}
          ></ClusterTable>
        </div>
      </div>
      <div>
        <h2 className="title-bar">Directions</h2>
        <li> Press "s" to hide the scatterplot </li>
        <li> Press "l" to hide the linear plot </li>
        <li> Press "z" or use the toggle to enter zoom mode </li>
        <li> Press "b" or use the toggle to enter selection mode </li>
        <li> In zoom mode, if you hold down shift, it will act as a bounding box zoom (in the scatterplot) </li>
        <li> In select mode, shift allows you to add to a selection, and alt will allow you to erase </li>
        {/* <li> Only the bounding box zoom is available on the linear plot in zoom mode </li> */}

      </div>
    </div>
  );
}

export default Sidebar;