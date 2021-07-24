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
    onLocationHovered: (location: ChromosomeInterval | null, record?: MergedGenomicBin | null) => void;
    invertAxis?: boolean;
    customColor: string;
    colors: string[];
    assignCluster: boolean;
    onBrushedBinsUpdated: any;
    brushedBins: MergedGenomicBin[];
    updatedBins: boolean;
    dispMode: DisplayMode;
    onRemovePlot: any;
    onAddSample: any;
    plotId: number;
    clusterTableData: any;
    applyLog: boolean;
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
        //console.log(newScales)
        this.setState({scales: newScales})
    }

    render() {
        const {data, initialSelectedSample, plotId} = this.props;
        const selectedSample = this.state.selectedSample;
        const rdRange = data.getRdRange(selectedSample);
        //console.log("NEW RD RANGE: ", rdRange);
        const sampleOptions = data.getSampleList().map(sampleName =>
            <option key={sampleName} value={sampleName}>{sampleName}</option>
        );
        rdRange[1] += 0.5;
        
        return <div className="SampleViz-wrapper">
            <div className="SampleViz-select">
                Sample: <select value={selectedSample} onChange={this.handleSelectedSampleChange}>
                    {sampleOptions}
                </select>
                <button onClick={this.props.onAddSample} style={{marginLeft: 9}}> Add Sample </button>
                <button onClick={this.props.onRemovePlot} style={{marginLeft: 9}}> Remove Sample </button>
                {/* {this.renderDisplayModeRadioOption(DisplayMode.select)}
                {this.renderDisplayModeRadioOption(DisplayMode.zoom)} */}
            </div>
            <div className="SampleViz-plots">
                <SampleViz2D 
                        {...this.props} 
                        onSelectedSample={this.handleSelectedSampleChanged}
                        selectedSample={selectedSample}
                        initialSelectedSample={initialSelectedSample}
                        onZoom={this.handleZoom}
                        rdRange={rdRange}/> 
                <SampleViz1D 
                    {...this.props}  
                    yScale={this.state.scales.yScale} 
                    xScale={this.state.scales.xScale} 
                    selectedSample={this.state.selectedSample} 
                    initialSelectedSample={initialSelectedSample}
                    rdRange={rdRange} />
            </div>
            <div className="SampleViz-clusters">
                <ClusterTable 
                    data={data.brushedTableData()} 
                    onClusterRowsChange={() => {}} 
                    onClusterColorChange={() => {}}
                    currentFilters={["-1"]}
                    colOneName={"Cluster"}
                    colTwoName={"Percent of Cluster (%)"}
                    expandable={false}
                    selectable={false}
                ></ClusterTable>
            </div>
            
        </div>
    }
}