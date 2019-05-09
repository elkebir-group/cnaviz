import React from "react";
import _ from "lodash";

import { ChromosomeInterval } from "../model/ChromosomeInterval";
import { SampleIndexedBins } from "../model/BinIndex";
import { MergedGenomicBin } from "../model/BinMerger";

import { Scatterplot } from "./Scatterplot";
import { RDLinearPlot, BAFLinearPlot } from "./RdrBafLinearPlots";
import { DivWithBullseye } from "./DivWithBullseye";

import "./SampleViz.css";

interface Props {
    indexedData: SampleIndexedBins;
    chr?: string;
    initialSelectedSample?: string;
    width?: number;
    height?: number;
    hoveredLocation?: ChromosomeInterval;
    onLocationHovered: (location: ChromosomeInterval | null) => void;
}
interface State {
    selectedSample: string;
}

export class SampleViz extends React.Component<Props, State> {
    static defaultProps = {
        onLocationHovered: _.noop
    };

    constructor(props: Props) {
        super(props);
        this.state = {
            selectedSample: props.initialSelectedSample || Object.keys(props.indexedData)[0]
        }
        this.handleSelectedSampleChanged = this.handleSelectedSampleChanged.bind(this);
        this.handleRecordsHovered = this.handleRecordsHovered.bind(this);
    }

    handleSelectedSampleChanged(event: React.ChangeEvent<HTMLSelectElement>) {
        this.setState({selectedSample: event.target.value});
    }

    handleRecordsHovered(record: MergedGenomicBin | null) {
        const location = record ? record.location : null;
        this.props.onLocationHovered(location);
    }

    render() {
        const {indexedData, chr, width, height, hoveredLocation, onLocationHovered} = this.props;
        const selectedSample = this.state.selectedSample;
        const sampleOptions = indexedData.getSamples().map(sampleName =>
            <option key={sampleName} value={sampleName}>{sampleName}</option>
        );
        let selectedData = indexedData.getDataForSample(selectedSample);
        if (chr) {
            selectedData = selectedData.makeCopyWithJustChr(chr);
        }

        return <div className="SampleViz">
            <div className="SampleViz-select">
                Select sample: <select value={selectedSample} onChange={this.handleSelectedSampleChanged}>
                    {sampleOptions}
                </select>
            </div>
            <DivWithBullseye className="SampleViz-pane">
                <Scatterplot
                    data={selectedData}
                    rdRange={indexedData.rdRange}
                    width={width}
                    height={height}
                    hoveredLocation={hoveredLocation}
                    onRecordsHovered={this.handleRecordsHovered} />
            </DivWithBullseye>
            <DivWithBullseye className="SampleViz-pane">
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
            </DivWithBullseye>
        </div>;
    }
}
