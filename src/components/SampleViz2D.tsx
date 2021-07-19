import React from "react";
import _, { assign } from "lodash";

import { ChromosomeInterval } from "../model/ChromosomeInterval";
import { DataWarehouse } from "../model/DataWarehouse";
import { MergedGenomicBin } from "../model/BinMerger";
import { CurveState } from "../model/CurveState";

import { Scatterplot } from "./Scatterplot";
import { DivWithBullseye } from "./DivWithBullseye";
import * as d3 from "d3";

import "./SampleViz.css";
import { zoom } from "d3-zoom";

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
    onSelectedSample: any;
    invertAxis?: boolean;
    customColor: string;
    colors: string[];
    assignCluster: boolean;
    onBrushedBinsUpdated: any;
    brushedBins: MergedGenomicBin[];
    updatedBins: boolean;
    dispMode: DisplayMode;
    onZoom: (newYScale: [number, number]) => void;
    onRemovePlot: any;
    plotId: number;
}

interface State {
    selectedSample: string;
    displayMode: DisplayMode;
}


export enum DisplayMode {
    zoom,
    select
};

export class SampleViz2D extends React.Component<Props, State> {
    static defaultProps = {
        onNewCurveState: _.noop,
        onLocationHovered: _.noop,
        invertAxis: false,
        customColor: "#1b9e77"
    };

    constructor(props: Props) {
        super(props);
        this.state = {
            selectedSample: props.initialSelectedSample || props.data.getSampleList()[0],
            displayMode: DisplayMode.select
        };
        this.handleSelectedSampleChanged = this.handleSelectedSampleChanged.bind(this);
        this.handleRecordsHovered = this.handleRecordsHovered.bind(this);
        this.handleCallBack = this.handleCallBack.bind(this);
        this.handleUpdatedBrushedBins = this.handleUpdatedBrushedBins.bind(this);
        this.onRemovePlot = this.onRemovePlot.bind(this);
    }

    handleSelectedSampleChanged(event: React.ChangeEvent<HTMLSelectElement>) {
        this.setState({selectedSample: event.target.value});
        this.props.onSelectedSample(event.target.value);
    }

    handleRecordsHovered(record: MergedGenomicBin | null) {
        const location = record ? record.location : null;
        this.props.onLocationHovered(location);
    }

    handleCallBack = (childData : MergedGenomicBin[]) => {
        this.props.parentCallBack(childData);
    }

    handleUpdatedBrushedBins(brushedBins: MergedGenomicBin[]) {
        this.props.onBrushedBinsUpdated(brushedBins);
    }

    onRemovePlot() {
        this.props.onRemovePlot(this.props.plotId);
    }
    
    render() {
        const {data, chr, width, height, curveState, onNewCurveState, 
                hoveredLocation, invertAxis, customColor, assignCluster, 
                brushedBins, updatedBins, dispMode, onZoom} = this.props;
        const selectedSample = this.state.selectedSample;
        const sampleOptions = data.getSampleList().map(sampleName =>
            <option key={sampleName} value={sampleName}>{sampleName}</option>
        );

        const rdRange = data.getRdRange(this.props.plotId);//data.getRdRange();
        rdRange[1] += 1; // Add one so it's prettier
        
        //const testRdRange = data.getRdRange(this.props.plotId);
        //console.log("TEST RD RANGE for plotId "+ String(this.props.plotId) + " : ", rdRange);
        // .on("keypress", function() {
        //     if (d3.event.key == "a") {
        //         console.log("Zooming/Panning")
                
        //     } else if (d3.event.key == "b") {
        //         console.log("Brushing")
        //     }
        

        return <div className="SampleViz">
            <div className="SampleViz-select">
                Select sample: <select value={selectedSample} onChange={this.handleSelectedSampleChanged}>
                    {sampleOptions}
                </select>
                <button onClick={this.onRemovePlot} style={{marginLeft: 10}}> Remove plot </button>
                {/* {this.renderDisplayModeRadioOption(DisplayMode.select)}
                {this.renderDisplayModeRadioOption(DisplayMode.zoom)} */}
            </div>
            
            <DivWithBullseye className="SampleViz-pane">
                <Scatterplot
                    parentCallBack = {this.handleCallBack}
                    data={data.getMergedRecords(selectedSample, chr)}
                    rdRange={rdRange}
                    width={width}
                    height={height}
                    curveState={curveState}
                    onNewCurveState={onNewCurveState}
                    hoveredLocation={hoveredLocation}
                    onRecordsHovered={this.handleRecordsHovered}
                    invertAxis= {invertAxis || false} 
                    customColor= {customColor}
                    colors = {this.props.colors}
                    assignCluster= {assignCluster} 
                    onBrushedBinsUpdated= {this.handleUpdatedBrushedBins}
                    brushedBins= {brushedBins}
                    updatedBins= {updatedBins}
                    displayMode = {dispMode}//{this.state.displayMode}
                    onZoom = {onZoom}
                    />
            </DivWithBullseye>
        </div>;
    }

    renderDisplayModeRadioOption(mode: DisplayMode) {
        let label: string;
        let padding: string;
        switch (mode) {
            case DisplayMode.zoom:
                label = "Zoom";
                padding= "15px"
                break;
            case DisplayMode.select:
                label = "Select";
                padding = "10px";
                break;
            default:
                label = "???";
                padding= "0px"
        }

        return <div className="row">
            <div className="col" style={{marginLeft: padding, display: "inline-block"}} onClick={() => this.setState({displayMode: mode})}>
                {label} <input type="radio" checked={this.state.displayMode === mode} readOnly/>
            </div>
        </div>;
    }
}
