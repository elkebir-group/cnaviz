import React from "react";
import _ from "lodash";
import { ChromosomeInterval } from "../model/ChromosomeInterval";
import { Scatterplot } from "./Scatterplot";
import { DivWithBullseye } from "./DivWithBullseye";
import "./SampleViz.css";
import {DisplayMode} from "../App"
import { GenomicBin, GenomicBinHelpers } from "../model/GenomicBin";
import { cn_pair, fractional_copy_number } from "../constants";

interface Props {
    parentCallBack: any;
    data: GenomicBin[];
    chr: string;
    cluster: string;
    initialSelectedSample: string;
    initialSelectedCluster?: string;
    width?: number;
    height?: number;
    hoveredLocation?: ChromosomeInterval;
    onLocationHovered: (location: ChromosomeInterval | null, record?: GenomicBin | null) => void;
    selectedSample: string;
    onSelectedSample: any;
    invertAxis?: boolean;
    customColor: string;
    colors: string[];
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
    centroidPts: {cluster: number, point: [number, number]}[]
    showCentroids: boolean;
    purity: number;
    ploidy: number;
    offset: number; // gc: required because Scatterplot needs to watch for prop changes.
    meanRD: number;
    fractionalCNTicks: fractional_copy_number[];
    showPurityPloidy: boolean;
    BAF_lines: cn_pair[];
    max_cn: number;
}

interface State {
    selectedSample: string;
}

export class SampleViz2D extends React.Component<Props, State> {
    
    static defaultProps = {
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
        const {data, width, height, hoveredLocation, invertAxis, customColor,
                brushedBins, updatedBins, dispMode, onZoom, rdRange, clusterTableData, 
                applyLog, scales, centroidPts, showCentroids, purity, ploidy, offset, meanRD, fractionalCNTicks, showPurityPloidy, BAF_lines, max_cn} = this.props;
        
        return <div className="SampleViz-scatter">
            <DivWithBullseye className="SampleViz-pane">
                <Scatterplot
                    parentCallBack = {this.handleCallBack}
                    data={data}
                    rdRange={rdRange}
                    width={width}
                    height={height}
                    hoveredLocation={hoveredLocation}
                    onRecordsHovered={this.handleRecordsHovered}
                    invertAxis= {invertAxis || false} 
                    customColor= {customColor}
                    colors = {this.props.colors}
                    col = {this.props.colors[0]}
                    onBrushedBinsUpdated= {this.handleUpdatedBrushedBins}
                    brushedBins= {brushedBins}
                    updatedBins= {updatedBins}
                    displayMode = {dispMode}
                    onZoom = {onZoom}
                    clusterTableData = {clusterTableData}
                    applyLog = {applyLog}
                    yAxisToPlot = {(applyLog) ? "logRD" : ((showPurityPloidy) ? "fractional_cn" : "RD")}
                    onClusterSelected ={this.props.onClusterSelected}
                    scales={scales}
                    centroidPts={centroidPts}
                    showCentroids={showCentroids}
                    purity={purity}
                    ploidy={ploidy}
                    offset={offset}
                    meanRD={meanRD}
                    fractionalCNTicks={fractionalCNTicks}
                    showPurityPloidy={showPurityPloidy}
                    BAF_lines={BAF_lines}
                    max_cn={max_cn}
                    />
            </DivWithBullseye>
        </div>;
    }
}
