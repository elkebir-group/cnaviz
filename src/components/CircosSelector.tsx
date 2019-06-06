import React from "react";
import { SampleIndexedBins } from "../model/BinIndex";
import { ChromosomeInterval } from "../model/ChromosomeInterval";
import { RdrBafCircosPlot } from "./RdrBafCircosPlot";

interface Props {
    indexedData: SampleIndexedBins;
    chr?: string;
    hoveredLocation?: ChromosomeInterval;
    initialSelectedSample?: string;
}

interface State {
    selectedSample: string;
}

export class CircosSelector extends React.Component<Props, State> {
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
        const {indexedData, chr, hoveredLocation} = this.props;
        const selectedSample = this.state.selectedSample;
        const sampleOptions = indexedData.getSamples().map(sampleName =>
            <option key={sampleName} value={sampleName}>{sampleName}</option>
        );
        let selectedData = indexedData.getDataForSample(selectedSample);
        if (chr) {
            selectedData = selectedData.makeCopyWithJustChr(chr);
        }

        const rdRange: [number, number] = [indexedData.rdRange[0], indexedData.rdRange[1]];
        return <div>
            <div className="SampleViz-select">
                Select sample: <select value={selectedSample} onChange={this.handleSelectedSampleChanged}>
                    {sampleOptions}
                </select>
            </div>
            <RdrBafCircosPlot
                data={selectedData}
                rdRange={rdRange}
                hoveredLocation={hoveredLocation} />
        </div>;
    }
}
