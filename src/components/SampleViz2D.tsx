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
import {DisplayMode, ProcessingStatus} from "../App"
import { GenomicBin, GenomicBinHelpers } from "../model/GenomicBin";

interface Props {
    parentCallBack: any;
    data: GenomicBin[];
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
    selectedSample: string;
    onSelectedSample: any;
    invertAxis?: boolean;
    customColor: string;
    colors: string[];
    assignCluster: boolean;
    onBrushedBinsUpdated: (brushedBins: GenomicBin[]) => void;
    brushedBins: GenomicBin[];
    updatedBins: boolean;
    dispMode: DisplayMode;
    onZoom: (newScales: any) => void;
    onRemovePlot: any;
    rdRange: [number, number];
    plotId: number;
    clusterTableData: any;
    applyLog: boolean;
    onClusterSelected: any;
    implicitRange: [number, number] | null;
    scales: any;
    centroidPts: {cluster: number, point: [number, number]}[]//[number, number][];
}

interface State {
    selectedSample: string;

}

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
            selectedSample: props.initialSelectedSample
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

    handleRecordsHovered(record: GenomicBin | null) {
        const location = record ? GenomicBinHelpers.toChromosomeInterval(record) : null;
        this.props.onLocationHovered(location);
    }

    handleCallBack = (childData : GenomicBin[]) => {
        this.props.parentCallBack(childData);
    }

    handleUpdatedBrushedBins(brushedBins: GenomicBin[]) {
        this.props.onBrushedBinsUpdated(brushedBins);
    }

    onRemovePlot() {
        this.props.onRemovePlot(this.props.plotId);
    }
    
    render() {
        const {data, chr, width, height, curveState, onNewCurveState, 
                hoveredLocation, invertAxis, customColor, assignCluster, 
                brushedBins, updatedBins, dispMode, onZoom, rdRange, clusterTableData, selectedSample, applyLog, implicitRange, scales, centroidPts} = this.props;

        return <div className="SampleViz-scatter">
            <DivWithBullseye className="SampleViz-pane">
                <Scatterplot
                    parentCallBack = {this.handleCallBack}
                    data={data}
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
                    col = {this.props.colors[0]}
                    assignCluster= {assignCluster} 
                    onBrushedBinsUpdated= {this.handleUpdatedBrushedBins}
                    brushedBins= {brushedBins}
                    updatedBins= {updatedBins}
                    displayMode = {dispMode}
                    onZoom = {onZoom}
                    clusterTableData = {clusterTableData}
                    applyLog = {applyLog}
                    yAxisToPlot = {applyLog ? "logRD" : "RD"}
                    onClusterSelected ={this.props.onClusterSelected}
                    scales={scales}
                    centroidPts={centroidPts}
                    />
            </DivWithBullseye>
        </div>;
    }
}
