import React from "react";
import { ChromosomeInterval } from "../model/ChromosomeInterval";
import { DivWithBullseye } from "./DivWithBullseye";
import { RDLinearPlot, BAFLinearPlot } from "./RdrBafLinearPlots";

import "./SampleViz.css";
import { GenomicBin } from "../model/GenomicBin";
import { DisplayMode } from "../App";
import { Gene } from "../model/Gene";

interface Props {
    data: GenomicBin[];
    chr: string;
    hoveredLocation?: ChromosomeInterval;
    initialSelectedSample: string;
    onLocationHovered?: (location: ChromosomeInterval | null) => void;
    onBrushedBinsUpdated: (brushedBins: GenomicBin[]) => void;
    brushedBins: GenomicBin[];
    customColor: string;
    colors: string[];
    selectedSample: string;
    yScale: [number, number] | null;
    xScale: [number, number] | null;
    rdRange: [number, number];
    clusterTableData: any;
    applyLog: boolean;
    displayMode: DisplayMode;
    width: number;
    onLinearPlotZoom: (genomicRange: [number, number] | null, yscale: [number, number] | null, key: boolean, reset?: boolean) => void;
    onZoom: (newScales: any) => void;
    implicitRange: [number, number] | null;
    driverGenes: Gene[] | null;
}

interface State {
    selectedSample: string;
}

export class SampleViz1D extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            selectedSample: props.initialSelectedSample
        };

        this.handleSelectedSampleChanged = this.handleSelectedSampleChanged.bind(this);
    }

    handleSelectedSampleChanged(event: React.ChangeEvent<HTMLSelectElement>) {
        this.setState({selectedSample: event.target.value});
    }

    render() {
        const {data, chr, hoveredLocation, onLocationHovered, onBrushedBinsUpdated, brushedBins,
             customColor, yScale, xScale, rdRange, clusterTableData, applyLog, displayMode, width, onLinearPlotZoom, implicitRange, onZoom, driverGenes} = this.props;

        let visualization: React.ReactNode = null;
            visualization = <DivWithBullseye className="SampleViz-pane">
                <RDLinearPlot
                    data={data}
                    chr={chr}
                    rdRange={rdRange}
                    hoveredLocation={hoveredLocation}
                    onLocationHovered={onLocationHovered} 
                    onBrushedBinsUpdated={onBrushedBinsUpdated}
                    brushedBins={brushedBins}
                    customColor={customColor}
                    colors={this.props.colors}
                    yScale= {yScale}
                    xScale= {xScale}
                    clusterTableData={clusterTableData}
                    applyLog={applyLog}
                    displayMode={displayMode}
                    width={width}
                    onLinearPlotZoom ={onLinearPlotZoom}
                    implicitStart={(implicitRange) ? implicitRange[0] : implicitRange}
                    implicitEnd={(implicitRange) ? implicitRange[1] : implicitRange}
                    onZoom={onZoom}
                    driverGenes={driverGenes}
                    />
                    
                <div className="SampleViz-separator" />
                <BAFLinearPlot
                    data={data}
                    chr={chr}
                    hoveredLocation={hoveredLocation}
                    onLocationHovered={onLocationHovered}
                    onBrushedBinsUpdated={onBrushedBinsUpdated}
                    brushedBins={brushedBins} 
                    customColor={customColor}
                    colors={this.props.colors}
                    yScale={yScale}
                    xScale= {xScale}
                    clusterTableData={clusterTableData}
                    applyLog={applyLog}
                    displayMode={displayMode}
                    width={width}
                    onLinearPlotZoom={onLinearPlotZoom}
                    onZoom={onZoom}
                    implicitStart={(implicitRange) ? implicitRange[0] : implicitRange}
                    implicitEnd={(implicitRange) ? implicitRange[1] : implicitRange}
                    driverGenes={driverGenes}/>
                    
            </DivWithBullseye>;

        return <div className="SampleViz-linear" >
            {visualization}
        </div>;
    }
}
