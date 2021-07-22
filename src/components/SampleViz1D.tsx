import React from "react";
import { RdrBafCircosPlot } from "./RdrBafCircosPlot";
import { DataWarehouse } from "../model/DataWarehouse";
import { ChromosomeInterval } from "../model/ChromosomeInterval";
import { hg38 } from "../model/Genome";
import { DivWithBullseye } from "./DivWithBullseye";
import { RDLinearPlot, BAFLinearPlot } from "./RdrBafLinearPlots";

import "./SampleViz.css";
import { MergedGenomicBin } from "../model/BinMerger";

interface Props {
    data: DataWarehouse;
    chr: string;
    hoveredLocation?: ChromosomeInterval;
    initialSelectedSample?: string;
    onLocationHovered?: (location: ChromosomeInterval | null) => void;
    onBrushedBinsUpdated: any;
    brushedBins: MergedGenomicBin[];
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

        const selectedRecords = data.getMergedRecords(selectedSample, chr);//data.getRecords(selectedSample, chr);
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
        } else if (this.state.displayMode === DisplayMode.circos) {
            // visualization = <RdrBafCircosPlot
            //     data={selectedRecords}
            //     rdRange={data.getRdRange()}
            //     hoveredLocation={hoveredLocation}
            //     onLocationHovered={onLocationHovered}
            //     genome={hg38}
            //     chr={chr} />;
        }

        return <div className="SampleViz-linear" >
             
            {/* <div className="SampleViz-select" >
                <div className="row" style={{marginLeft: 1}}>
                    
                </div>
            </div> */}
            {/* {this.renderDisplayModeRadioOption(DisplayMode.linear)} */}
                    {/* {this.renderDisplayModeRadioOption(DisplayMode.circos)} */}
            {visualization}
        </div>;
    }

    renderDisplayModeRadioOption(mode: DisplayMode) {
        let label: string;
        let padding: string;
        switch (mode) {
            case DisplayMode.linear:
                label = "Linear";
                padding= "15px"
                break;
            case DisplayMode.circos:
                label = "Circos";
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
