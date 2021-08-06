import React from "react";
import _, { assign } from "lodash";

import { ChromosomeInterval } from "../model/ChromosomeInterval";
import { DataWarehouse } from "../model/DataWarehouse";
import { MergedGenomicBin } from "../model/BinMerger";
import { CurveState } from "../model/CurveState";

import { SampleViz2D } from "./SampleViz2D";
import { SampleViz1D } from "./SampleViz1D";
import { Scatterplot } from "./Scatterplot";
import { DivWithBullseye } from "./DivWithBullseye";
import "./SampleViz.css";
import {DisplayMode} from "../App"
import {ClusterTable} from "./ClusterTable";
import { GenomicBin } from "../model/GenomicBin";

const UNCLUSTERED_ID = "-1";
const DELETED_ID = "-2";

interface Props {
    parentCallBack: any;
    data: DataWarehouse;
    chr: string;
    cluster: string;
    initialSelectedSample?: string;
    initialSelectedCluster?: string;
    width?: number;
    height?: number;
    curveState: CurveState;
    onNewCurveState: (newState: Partial<CurveState>) => void;
    hoveredLocation?: ChromosomeInterval;
    onLocationHovered: (location: ChromosomeInterval | null, record?: GenomicBin | null) => void;
    invertAxis?: boolean;
    customColor: string;
    colors: string[];
    assignCluster: boolean;
    onBrushedBinsUpdated: any;
    brushedBins: GenomicBin[];
    updatedBins: boolean;
    dispMode: DisplayMode;
    onRemovePlot: any;
    onAddSample: any;
    plotId: number;
    clusterTableData: any;
    applyLog: boolean;
    onClusterSelected: any;
    showLinearPlot: boolean;
    showScatterPlot: boolean;
    showSidebar: boolean;
    onUndoClick: () => void;
}

interface State {
    selectedSample: string;
    yScale: [number, number] | null;
    xScale: [number, number] | null;
    scales: {xScale: [number, number] | null, yScale: [number, number] | null};
    selectedCluster:string;
}

export class SampleViz extends React.Component<Props, State> {
    private _clusters : string[];
    constructor(props: Props) {
        super(props);
        this._clusters = this.initializeListOfClusters();
        this.state = {
            selectedSample: props.initialSelectedSample || props.data.getSampleList()[0],
            yScale: null,
            xScale: null,
            scales: {xScale: null, yScale: null},
            selectedCluster: (this._clusters.length > 0) ? this._clusters[0] : UNCLUSTERED_ID
        }
        this.handleSelectedSampleChanged = this.handleSelectedSampleChanged.bind(this);
        this.handleSelectedSampleChange = this.handleSelectedSampleChange.bind(this);
        this.handleZoom = this.handleZoom.bind(this);
        
    }

    initializeListOfClusters() : string[] {
        let clusterTableData = this.props.clusterTableData;
        clusterTableData.sort((a : any, b : any) => {
            if (a.key > b.key) return 1;
            if (a.key < b.key) return -1;
            return 0;
        })

        this._clusters = [];
        for(const obj of clusterTableData) {
            this._clusters.push(obj.key);
        }

        while(this._clusters.length > 0 
            && (this._clusters[0] == UNCLUSTERED_ID 
            || this._clusters[0] == DELETED_ID)) {
            this._clusters.shift();
        }

        return this._clusters;
    }

    componentDidUpdate(prevProps: Props) {
        if(this.props.clusterTableData !== prevProps.clusterTableData) {
            this.initializeListOfClusters();
        }
    }

    handleSelectedSampleChanged(selected : string) {
        this.setState({selectedSample: selected});
    }

    handleSelectedSampleChange(event : any) {
        this.setState({selectedSample: event.target.value});
    }

    handleZoom(newScales: any) {
        this.setState({scales: newScales})
    }

    render() {
        const {data, initialSelectedSample, plotId, applyLog, showLinearPlot, showScatterPlot, dispMode, showSidebar} = this.props;
        const selectedSample = this.state.selectedSample;
        const rdRange = data.getRdRange(selectedSample, applyLog);
        //console.log("NEW RD RANGE: ", rdRange);
        const sampleOptions = data.getSampleList().map(sampleName =>
            <option key={sampleName} value={sampleName}>{sampleName}</option>
        );
        //sampleOptions.unshift(<option selected disabled>Sample</option>);
        rdRange[1] += 0.5;
        let elem = document.getElementById("grid-container");
        let width = 0;
        if(elem) {
            width = elem.offsetWidth;
        }
        
        let clusterOptions = this._clusters.map(clusterName =>
            <option key={clusterName} value={clusterName} >{clusterName}</option>
        );
        
        clusterOptions.unshift(<option key={UNCLUSTERED_ID} value={UNCLUSTERED_ID} >{UNCLUSTERED_ID}</option>);
        clusterOptions.unshift(<option key={DELETED_ID} value={DELETED_ID} >{DELETED_ID}</option>);
        // clusterOptions.unshift(<option selected disabled>Cluster</option>);
        return <div className="SampleViz-wrapper">
            <div style={{verticalAlign: "middle"}}>
            {(showLinearPlot || showScatterPlot) &&
            <div className="SampleViz-select">
                <span>Sample: </span>
                <select value={selectedSample} onChange={this.handleSelectedSampleChange}>
                    {sampleOptions}
                </select>
                <button onClick={this.props.onAddSample}> Add Sample </button>
                <button onClick={this.props.onRemovePlot}> Remove Sample </button>
            </div>}
            
            {(showLinearPlot || showScatterPlot) &&
            <div className="SampleViz-select">
                    {(dispMode==DisplayMode.select) && <span >Cluster: </span>}
                     {(dispMode==DisplayMode.select) &&
                        
                          <select
                            name="Select Cluster" 
                            title="Cluster"
                            className="Sampleviz-cluster-select"
                            value={this.state.selectedCluster}
                            onChange={(event: React.ChangeEvent<HTMLSelectElement>) => {this.setState({selectedCluster: event.target.value})}} >
                            {clusterOptions}
                            </select>
                        }
                        
                    {(dispMode==DisplayMode.select) &&
                                <button onClick={() => {
                                    this.props.parentCallBack(this.state.selectedCluster);
                                    this.props.onBrushedBinsUpdated([]);
                                }}>Assign Cluster</button>}

                    {(dispMode==DisplayMode.select) 
                        && <button onClick={()=>{

                        let clusters = this._clusters;

                        const highestCurrentCluster = (clusters.length > 0) ? Number(clusters[clusters.length-1]) : -1;
                        let nextAvailable = highestCurrentCluster + 1;

                        for(let i = 0; i < clusters.length; i++) {
                            if(Number(clusters[i]) !== i){
                                nextAvailable = i;
                                break;
                            }
                        }

                        this.props.parentCallBack(nextAvailable);
                        this.props.onBrushedBinsUpdated([]);
                    }} >New Cluster</button>} 
                    {(dispMode==DisplayMode.select) && <button onClick={this.props.onUndoClick}> Undo</button>}
                </div>}
            </div>

            <div className="SampleViz-plots">
                {showScatterPlot && <SampleViz2D 
                        {...this.props} 
                        onSelectedSample={this.handleSelectedSampleChanged}
                        selectedSample={selectedSample}
                        initialSelectedSample={initialSelectedSample}
                        onZoom={this.handleZoom}
                        rdRange={rdRange}/>}
                {showLinearPlot && <SampleViz1D 
                    {...this.props}  
                    yScale={this.state.scales.yScale} 
                    xScale={this.state.scales.xScale} 
                    selectedSample={this.state.selectedSample} 
                    initialSelectedSample={initialSelectedSample}
                    rdRange={rdRange}
                    displayMode={dispMode}
                    width={showSidebar ? 600 : 800} />}
            </div>
            {/* <div className="SampleViz-clusters"> */}
            {(showLinearPlot || showScatterPlot) &&
            <div className={(showLinearPlot && showScatterPlot) ? "SampleViz-clusters" : ""}>
                <ClusterTable 
                    data={data.brushedTableData()} 
                    onClusterRowsChange={() => {}} 
                    onClusterColorChange={() => {}}
                    currentFilters={["-1"]}
                    colOneName={"Cluster ID"}
                    colTwoName={"Cluster (%)"}
                    expandable={false}
                    selectable={false}
                    colors={this.props.colors}
                ></ClusterTable>
            </div>}
            
        </div>
    }
}