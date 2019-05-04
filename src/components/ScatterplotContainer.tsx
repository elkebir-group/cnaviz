import React from "react";
import { GenomicBin, IndexedGenomicBins } from "../GenomicBin";
import { ChromosomeInterval } from "../ChromosomeInterval";
import { Scatterplot } from "./Scatterplot";

import "./ScatterplotContainer.css";

interface Props {
    indexedData: IndexedGenomicBins;
    hoveredLocation?: ChromosomeInterval;
    width?: number;
    height?: number;
    onRecordHovered?: (record: GenomicBin | null) => void;
}
interface State {
    selectedSample: string;
}

export class ScatterplotContainer extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            selectedSample: Object.keys(props.indexedData)[0]
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

        return <div className="ScatterplotContainer">
            <div>
                Select sample: <select value={selectedSample} onChange={this.handleSelectedSampleChanged}>
                    {sampleOptions}
                </select>
            </div>
            <Scatterplot
                data={indexedData[selectedSample].getAllRecords()}
                width={width}
                height={height}
                hoveredLocation={hoveredLocation}
                onRecordHovered={onRecordHovered} />
        </div>;
    }
}
