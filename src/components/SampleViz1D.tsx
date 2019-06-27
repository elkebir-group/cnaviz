import React from "react";
import { RdrBafCircosPlot } from "./RdrBafCircosPlot";
import { SampleIndexedBins } from "../model/BinIndex";
import { ChromosomeInterval } from "../model/ChromosomeInterval";
import { hg38 } from "../model/Genome";
import { DivWithBullseye } from "./DivWithBullseye";
import { RDLinearPlot, BAFLinearPlot } from "./RdrBafLinearPlots";

import "./SampleViz.css";

interface Props {
    indexedData: SampleIndexedBins;
    chr?: string;
    hoveredLocation?: ChromosomeInterval;
    initialSelectedSample?: string;
    onLocationHovered?: (location: ChromosomeInterval | null) => void;
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
            selectedSample: props.initialSelectedSample || props.indexedData.getSamples()[0],
            displayMode: DisplayMode.linear
        };
        this.handleSelectedSampleChanged = this.handleSelectedSampleChanged.bind(this);
    }

    handleSelectedSampleChanged(event: React.ChangeEvent<HTMLSelectElement>) {
        this.setState({selectedSample: event.target.value});
    }

    render() {
        const {indexedData, chr, hoveredLocation, onLocationHovered} = this.props;
        const selectedSample = this.state.selectedSample;
        const sampleOptions = indexedData.getSamples().map(sampleName =>
            <option key={sampleName} value={sampleName}>{sampleName}</option>
        );
        let selectedData = indexedData.getDataForSample(selectedSample);
        if (chr) {
            selectedData = selectedData.makeCopyWithJustChr(chr);
        }

        const rdRange: [number, number] = [indexedData.rdRange[0], indexedData.rdRange[1]];
        let visualization: React.ReactNode = null;
        if (this.state.displayMode === DisplayMode.linear) {
            visualization = <DivWithBullseye className="SampleViz-pane">
                <RDLinearPlot
                    data={selectedData}
                    chr={chr}
                    rdRange={indexedData.rdRange}
                    hoveredLocation={hoveredLocation}
                    onLocationHovered={onLocationHovered} />
                <div className="SampleViz-separator" />
                <BAFLinearPlot
                    data={selectedData}
                    chr={chr}
                    hoveredLocation={hoveredLocation}
                    onLocationHovered={onLocationHovered} />
            </DivWithBullseye>;
        } else if (this.state.displayMode === DisplayMode.circos) {
            visualization = <RdrBafCircosPlot
                data={selectedData}
                rdRange={rdRange}
                hoveredLocation={hoveredLocation}
                onLocationHovered={onLocationHovered}
                genome={hg38}
                chr={chr} />;
        }

        return <div>
            <div className="SampleViz-select">
                Select sample: <select value={selectedSample} onChange={this.handleSelectedSampleChanged}>
                    {sampleOptions}
                </select>
                {this.renderDisplayModeRadioOption(DisplayMode.linear)}
                {this.renderDisplayModeRadioOption(DisplayMode.circos)}
            </div>
            {visualization}
        </div>;
    }

    renderDisplayModeRadioOption(mode: DisplayMode) {
        let label: string;
        switch (mode) {
            case DisplayMode.linear:
                label = "Linear";
                break;
            case DisplayMode.circos:
                label = "Circos";
                break;
            default:
                label = "???";
        }

        return <div>
            <div style={{display: "inline-block"}} onClick={() => this.setState({displayMode: mode})}>
                {label} <input type="radio" checked={this.state.displayMode === mode} />
            </div>
        </div>;
    }
}
