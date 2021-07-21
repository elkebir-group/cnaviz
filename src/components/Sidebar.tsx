  
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
}


function Sidebar(props: Props) {
  const [sidebar, setSidebar] = useState(false);
  const [value] = useState("");

  const showSidebar = () => setSidebar(!sidebar);
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
          <input type="number" value={value} size={30} min="-2" max="100"/>
        </div>
        <div style={{margin: 10}}>
          <ClusterTable 
              test={props.tableData} 
              onClusterRowsChange={props.onClusterRowsChange} 
              onClusterColorChange={props.onClusterColorChange}
              currentFilters={props.currentClusterFilters}
          ></ClusterTable>
        </div>
          
        
        {/* <div className="row">
            <div className = "row" >
                <div className="col" style={{paddingTop: 10}}>
                    <button onClick={props.onAddSample} style={{marginLeft: 10, marginRight: 5}}> Add Sample </button>
                    <button onClick={props.onAssignCluster} style={{marginRight: 5}} > Assign Cluster </button>
                    <input type="number" style={{marginLeft: 5}} size={30} min="-2" max="100"/>
                </div>
            </div>
            <div >
                <ClusterTable 
                    test={props.tableData} 
                    onClusterRowsChange={props.onClusterRowsChange} 
                    onClusterColorChange={props.onClusterColorChange}
                    currentFilters={props.currentClusterFilters}
                ></ClusterTable>
            </div>
        </div> */}
      </div>
      <div>
        <h2>Directions</h2>
      </div>
    </nav>
  );
}

export default Sidebar;