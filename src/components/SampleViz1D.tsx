import React from "react";
import { RdrBafCircosPlot } from "./RdrBafCircosPlot";
import { DataWarehouse } from "../model/DataWarehouse";
import { ChromosomeInterval } from "../model/ChromosomeInterval";
import { hg38 } from "../model/Genome";
import { DivWithBullseye } from "./DivWithBullseye";
import { RDLinearPlot, BAFLinearPlot } from "./RdrBafLinearPlots";

import "./SampleViz.css";
import { MergedGenomicBin } from "../model/BinMerger";
import { GenomicBin } from "../model/GenomicBin";

interface Props {
    data: DataWarehouse;
    chr: string;
    hoveredLocation?: ChromosomeInterval;
    initialSelectedSample?: string;
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
}

enum DisplayMode {
    linear,
    circos
};

interface State {
    selectedSample: string;
    displayMode: DisplayMode;
}

export class SampleViz1D extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            selectedSample: props.initialSelectedSample || props.data.getSampleList()[0],
            displayMode: DisplayMode.linear
        };

        this.handleSelectedSampleChanged = this.handleSelectedSampleChanged.bind(this);
    }

    handleSelectedSampleChanged(event: React.ChangeEvent<HTMLSelectElement>) {
        this.setState({selectedSample: event.target.value});
    }

    render() {
        const {data, chr, hoveredLocation, onLocationHovered, onBrushedBinsUpdated, brushedBins, customColor, yScale, xScale, rdRange, clusterTableData} = this.props;
        const selectedSample = this.props.selectedSample;

        const selectedRecords = data.getRecords(selectedSample, chr);
        let visualization: React.ReactNode = null;
        if (this.state.displayMode === DisplayMode.linear) {
            visualization = <DivWithBullseye className="SampleViz-pane">
                <RDLinearPlot
                    data={selectedRecords}
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
                    />
                    
                <div className="SampleViz-separator" />
                <BAFLinearPlot
                    data={selectedRecords}
                    chr={chr}
                    hoveredLocation={hoveredLocation}
                    onLocationHovered={onLocationHovered}
                    onBrushedBinsUpdated={onBrushedBinsUpdated}
                    brushedBins={brushedBins} 
                    customColor={customColor}
                    colors={this.props.colors}
                    yScale={yScale}
                    xScale= {xScale}
                    clusterTableData={clusterTableData}/>

            </DivWithBullseye>;
        }

        return <div className="SampleViz-linear" >
            {visualization}
        </div>;
    }
}
