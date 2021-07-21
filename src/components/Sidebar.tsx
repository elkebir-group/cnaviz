  
import React, { useState } from "react";
import { Link } from "react-router-dom";
import "./Sidebar.css";
import {ClusterTable} from "./ClusterTable";

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
}


function Sidebar(props: Props) {
  const [sidebar, setSidebar] = useState(false);
  const [value, setValue] = useState("");

  const showSidebar = () => setSidebar(!sidebar);
  const handleClusterAssignmentInput = (event: any) => {setValue(event.target.value)};
  return (
    <nav className={sidebar ? "sidebar active" : "sidebar"}>
      <button className="hamburger" type="button" onClick={showSidebar}>
        <div></div>
      </button>
      <div className="contents">
        <h1>CNA-Viz</h1>
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

        <div className="row-contents">
          <button onClick={props.onAddSample}> Add Sample </button>
          <button onClick={props.onAssignCluster}> Assign Cluster </button>
          <input type="number" value={props.value} size={30} min="-2" max="100" onChange={props.handleClusterAssignmentInput}/>
        </div>
        <div style={{margin: 10}}>
          <ClusterTable 
              test={props.tableData} 
              onClusterRowsChange={props.onClusterRowsChange} 
              onClusterColorChange={props.onClusterColorChange}
              currentFilters={props.currentClusterFilters}
          ></ClusterTable>
        </div>
      </div>
      <div>
        <h2>Directions</h2>
      </div>
    </nav>
  );
}

export default Sidebar;