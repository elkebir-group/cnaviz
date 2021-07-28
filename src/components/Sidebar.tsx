  
import React, { useState } from "react";
import { Link } from "react-router-dom";
import "./Sidebar.css";
import {ClusterTable} from "./ClusterTable";
import {DisplayMode} from "../App";
import {CSV} from "./CSVLink"
import { GenomicBin} from "../model/GenomicBin";
import * as d3 from "d3";

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
    data: GenomicBin[];
    onFileChosen: any;
    chosenFile: string;
    show: boolean;
}


function Sidebar(props: Props) {
  const [sidebar, setSidebar] = useState(true);
  const [value, setValue] = useState("");

  const showSidebar = () => {
    props.onSidebarChange(!sidebar)
    setSidebar(!sidebar)
  };
  
  if(props.show !== sidebar) {
    setSidebar(props.show);
  }

  const handleClusterAssignmentInput = (event: any) => {setValue(event.target.value)};
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
    <div className={sidebar ? "sidebar active" : "sidebar"}>
      
      <button className="hamburger" type="button" onClick={showSidebar}>
          <div> </div>
        </button>
      
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
        <div className= "row-contents">
          <span className="App-CheckBox-explanation">Apply log to RD: </span>
          <input type="checkbox" />
        </div>
        

        {/* <div className="row-contents">
          <button onClick={props.onAddSample}> Add Sample </button>
          <button onClick={props.onAssignCluster}> Assign Cluster </button>
          <input type="number" value={props.value} size={30} min="-2" max="100" onChange={props.handleClusterAssignmentInput}/>
        </div> */}
        <div>
          {renderDisplayModeRadioOption(DisplayMode.select)}
          {renderDisplayModeRadioOption(DisplayMode.zoom)}
        </div>
        <div style={{margin: 10}}>
          <ClusterTable 
              data={props.tableData} 
              onClusterRowsChange={props.onClusterRowsChange} 
              onClusterColorChange={props.onClusterColorChange}
              currentFilters={props.currentClusterFilters}
              colOneName={"Cluster"}
              colTwoName={"Percent of total # of Bins(%)"}
              expandable={true}
              selectable={true}
              colors={props.colors}
          ></ClusterTable>
        </div>
      </div>
      <div>
        <h2 className="title-bar">Directions</h2>
      </div>
    </div>
  );
}

export default Sidebar;