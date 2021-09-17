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
import {DisplayMode, ProcessingStatus} from "../App"
import {ClusterTable} from "./ClusterTable";
import { GenomicBin } from "../model/GenomicBin";
import { isExpressionWithTypeArguments } from "typescript";

const UNCLUSTERED_ID = "-1";
const DELETED_ID = "-2";

interface Props {
    parentCallBack: any;
    data: DataWarehouse;
    chr: string;
    cluster: string;
    initialSelectedSample: string;
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
    sampleAmount: number;
    syncScales: boolean;
    handleZoom: (newScales: any) => void;
    scales: {xScale: [number, number] | null, yScale: [number, number] | null};
}

interface State {
    selectedSample: string;
    scales: {xScale: [number, number] | null, yScale: [number, number] | null};
    selectedCluster:string;
    implicitRange: [number, number]  | null;
}

export class SampleViz extends React.Component<Props, State> {
    private _clusters : string[];
    constructor(props: Props) {
        super(props);
        this._clusters = this.initializeListOfClusters();
        this.state = {
            selectedSample: props.initialSelectedSample || props.data.getSampleList()[0],
            scales: {xScale: null, yScale: null},
            selectedCluster: (this._clusters.length > 0) ? this._clusters[0] : UNCLUSTERED_ID,
            implicitRange: null
        }
        this.handleSelectedSampleChanged = this.handleSelectedSampleChanged.bind(this);
        this.handleSelectedSampleChange = this.handleSelectedSampleChange.bind(this);
        this.handleZoom = this.handleZoom.bind(this);
        this.handleLinearPlotZoom = this.handleLinearPlotZoom.bind(this);
        
    }

    initializeListOfClusters() : string[] {
        let clusterTableData = this.props.clusterTableData;
        // clusterTableData.sort((a : any, b : any) => {
        //     if (a.key > b.key) return 1;
        //     if (a.key < b.key) return -1;
        //     return 0;
        // })

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
        const {syncScales, handleZoom} = this.props;
        //console.log("New Scales Samplviz: ", newScales);
        (syncScales) ?  handleZoom(newScales) : this.setState({scales: newScales})
    }

    handleLinearPlotZoom(genomicRange: [number, number] | null) {
        //console.log("Linear plot zooming");
        // this.props.data.setGenomicPositionFilter(genomicRange);
        // this.forceUpdate();
        // console.log("TEST");
        this.setState({implicitRange: genomicRange})
    }

    
    render() {
        const {data, initialSelectedSample, plotId, applyLog, 
            showLinearPlot, showScatterPlot, dispMode, showSidebar, sampleAmount, syncScales} = this.props;
        const {implicitRange} = this.state;

        const selectedSample = this.state.selectedSample;
        const rdRange = data.getRdRange(selectedSample, applyLog);
        
        const sampleOptions = data.getSampleList().map(sampleName =>
            <option key={sampleName} value={sampleName}>{sampleName}</option>
        );

        let selectedRecords = [];
        let scales = (syncScales) ? this.props.scales : this.state.scales;
        if (implicitRange !== null || scales.xScale !== null || scales.yScale !== null) {
            let implicitStart = (implicitRange) ? implicitRange[0] : null;
            let implicitEnd = (implicitRange) ? implicitRange[1] : null;
            selectedRecords = data.getRecords(selectedSample, applyLog, implicitStart, implicitEnd, scales.xScale, scales.yScale);
        } else { 
            selectedRecords = data.getRecords(selectedSample, applyLog, null, null, null, null);
        }
        
        //sampleOptions.unshift(<option selected disabled>Sample</option>);
        rdRange[1] += 0.5;
        
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
                <button onClick={this.props.onAddSample} disabled={sampleAmount >= sampleOptions.length}> Add Sample </button>
                <button onClick={this.props.onRemovePlot} disabled={sampleAmount <= 1}> Remove Sample </button>
            </div>}
            
            {(showLinearPlot || showScatterPlot) &&
            <div className="SampleViz-select">
                    <span >Cluster: </span>
                        
                    <select
                    name="Select Cluster" 
                    title="Cluster"
                    className="Sampleviz-cluster-select"
                    value={this.state.selectedCluster}
                    disabled={dispMode==DisplayMode.zoom}
                    onChange={(event: React.ChangeEvent<HTMLSelectElement>) => {this.setState({selectedCluster: event.target.value})}} >
                    {clusterOptions}
                    </select>
                        

                    <button onClick={() => {
                        this.props.parentCallBack(this.state.selectedCluster);
                        this.props.onBrushedBinsUpdated([]);
                    }}
                    disabled={dispMode==DisplayMode.zoom}>Assign Cluster</button>

                    <button onClick={()=>{
                        this.initializeListOfClusters();
                        let clusters = this._clusters;
                        clusters.sort((a: string, b:string) => (Number(a) - Number(b)))
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
                    }}
                    disabled={dispMode==DisplayMode.zoom} >New Cluster</button>
                    <button onClick={this.props.onUndoClick} disabled={true}> Undo</button>
                </div>}
            </div>

            <div className="SampleViz-plots">
                {showScatterPlot && <SampleViz2D 
                        {...this.props} 
                        data={selectedRecords}
                        onSelectedSample={this.handleSelectedSampleChanged}
                        selectedSample={selectedSample}
                        initialSelectedSample={initialSelectedSample}
                        onZoom={this.handleZoom}
                        rdRange={rdRange}
                        implicitRange={this.state.implicitRange}
                        scales={(syncScales) ? this.props.scales : this.state.scales}/>}
                {showLinearPlot && <SampleViz1D 
                    {...this.props}  
                    data={selectedRecords}
                    onLinearPlotZoom={this.handleLinearPlotZoom}
                    yScale={(syncScales) ? this.props.scales.yScale : this.state.scales.yScale} 
                    xScale={(syncScales) ? this.props.scales.xScale : this.state.scales.xScale} 
                    selectedSample={this.state.selectedSample} 
                    initialSelectedSample={initialSelectedSample}
                    rdRange={rdRange}
                    displayMode={dispMode}
                    width={showSidebar ? 600 : 600} 
                    implicitRange={this.state.implicitRange}/>}
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