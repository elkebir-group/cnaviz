import React from "react";
import { GenomicBin, IndexedGenomicBins } from "../model/GenomicBin";
import { ChromosomeInterval } from "../model/ChromosomeInterval";
import { Scatterplot } from "./Scatterplot";
import { RDLinearPlot, BAFLinearPlot } from "./RdrBafLinearPlots";
import { DivWithBullseye } from "./DivWithBullseye";

import "./SampleViz.css";

interface Props {
    indexedData: IndexedGenomicBins;
    initialSelectedSample?: string;
    hoveredLocation?: ChromosomeInterval;
    width?: number;
    height?: number;
    onRecordHovered?: (record: GenomicBin | null) => void;
}
interface State {
    selectedSample: string;
}

export class SampleViz extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            selectedSample: props.initialSelectedSample || Object.keys(props.indexedData)[0]
        }
        this.handleSelectedSampleChanged = this.handleSelectedSampleChanged.bind(this);
    }

    handleSelectedSampleChanged(event: React.ChangeEvent<HTMLSelectElement>) {
        this.setState({selectedSample: event.target.value});
    }

    render() {
        const {indexedData, width, height, hoveredLocation, onRecordHovered} = this.props;
        const selectedSample = this.state.selectedSample;
        const sampleOptions = Object.keys(indexedData).map(sampleName =>
            <option key={sampleName} value={sampleName}>{sampleName}</option>
        );
        const selectedData = indexedData[selectedSample];

        return <div className="SampleViz">
            <div className="SampleViz-select">
                Select sample: <select value={selectedSample} onChange={this.handleSelectedSampleChanged}>
                    {sampleOptions}
                </select>
            </div>
            <DivWithBullseye className="SampleViz-pane">
                <Scatterplot
                    data={selectedData}
                    width={width}
                    height={height}
                    hoveredLocation={hoveredLocation}
                    onRecordHovered={onRecordHovered} />
            </DivWithBullseye>
            <DivWithBullseye className="SampleViz-pane">
                <RDLinearPlot data={selectedData} hoveredLocation={hoveredLocation} />
                <div className="SampleViz-separator" />
                <BAFLinearPlot data={selectedData} hoveredLocation={hoveredLocation} />
            </DivWithBullseye>
        </div>;
    }
}
