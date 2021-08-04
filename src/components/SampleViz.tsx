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
}

interface State {
    selectedSample: string;
    yScale: [number, number] | null;
    xScale: [number, number] | null;
    scales: {xScale: [number, number] | null, yScale: [number, number] | null};
}

export class SampleViz extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            selectedSample: props.initialSelectedSample || props.data.getSampleList()[0],
            yScale: null,
            xScale: null,
            scales: {xScale: null, yScale: null}
        }
        this.handleSelectedSampleChanged = this.handleSelectedSampleChanged.bind(this);
        this.handleSelectedSampleChange = this.handleSelectedSampleChange.bind(this);
        this.handleZoom = this.handleZoom.bind(this);
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
        rdRange[1] += 0.5;
        let elem = document.getElementById("grid-container");
        let width = 0;
        if(elem) {
            width = elem.offsetWidth;
        }
        // if (width) {
        //     width = width.clientWidth;
        // }
        
        // console.log("WIDTH: ", width)
        return <div className="SampleViz-wrapper">
            {(showLinearPlot || showScatterPlot) &&
            <div className="SampleViz-select">
                Sample: <select value={selectedSample} onChange={this.handleSelectedSampleChange}>
                    {sampleOptions}
                </select>
                <button onClick={this.props.onAddSample} style={{marginLeft: 9}}> Add Sample </button>
                <button onClick={this.props.onRemovePlot} style={{marginLeft: 9}}> Remove Sample </button>
            </div>}
            {/* {(showLinearPlot || showScatterPlot) &&
            <div className="SampleViz-select">
                Sample: <select value={selectedSample} onChange={this.handleSelectedSampleChange}>
                    {sampleOptions}
                </select>
                <button onClick={this.props.onAddSample} style={{marginLeft: 9}}> Add Sample </button>
                <button onClick={this.props.onRemovePlot} style={{marginLeft: 9}}> Remove Sample </button>
            </div>} */}
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