import React from "react";
import _, { assign } from "lodash";

import { ChromosomeInterval } from "../model/ChromosomeInterval";
import { DataWarehouse } from "../model/DataWarehouse";
import { MergedGenomicBin } from "../model/BinMerger";
import { CurveState } from "../model/CurveState";

import { Scatterplot } from "./Scatterplot";
import { DivWithBullseye } from "./DivWithBullseye";

import "./SampleViz.css";

interface Props {
    parentCallBack: any;
    data: DataWarehouse;
    chr: string;
    cluster: string;
    initialSelectedSample?: string;
    initialSelectedCluster?: string;
    width?: number;
    height?: number;
    curveState: CurveState;
    onNewCurveState: (newState: Partial<CurveState>) => void;
    hoveredLocation?: ChromosomeInterval;
    onLocationHovered: (location: ChromosomeInterval | null, record?: MergedGenomicBin | null) => void;
    invertAxis?: boolean;
    customColor: string;
    assignCluster: boolean;
    onBrushedBinsUpdated: any;
    brushedBins: MergedGenomicBin[];
    updatedBins: boolean;
    shiftKey: boolean;
}

interface State {
    selectedSample: string;
    //selectedCluster: string;
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
            selectedSample: props.initialSelectedSample || props.data.getSampleList()[0],
           // selectedCluster: props.initialSelectedCluster || ""
        };
        this.handleSelectedSampleChanged = this.handleSelectedSampleChanged.bind(this);
        //this.handleSelectedClusterChanged = this.handleSelectedClusterChanged.bind(this);
        this.handleRecordsHovered = this.handleRecordsHovered.bind(this);
        this.handleCallBack = this.handleCallBack.bind(this);
        this.handleUpdatedBrushedBins = this.handleUpdatedBrushedBins.bind(this);
    }

    handleSelectedSampleChanged(event: React.ChangeEvent<HTMLSelectElement>) {
        this.setState({selectedSample: event.target.value});
        //this.props.data.setSampleFilter(event.target.value);
    }

    // handleSelectedClusterChanged(event: React.ChangeEvent<HTMLSelectElement>) {
    //     this.setState({selectedCluster: event.target.value});
    //     this.props.data.setClusterFilters([event.target.value]);
    // }

    handleRecordsHovered(record: MergedGenomicBin | null) {
        const location = record ? record.location : null;
        this.props.onLocationHovered(location);
    }

    handleCallBack = (childData : MergedGenomicBin[]) => {
        this.props.parentCallBack(childData);
    }

    handleUpdatedBrushedBins(brushedBins: MergedGenomicBin[]) {
        this.props.onBrushedBinsUpdated(brushedBins);
    }

    render() {
        const {data, chr, width, height, curveState, onNewCurveState, 
                hoveredLocation, invertAxis, customColor, assignCluster, 
                brushedBins, updatedBins, shiftKey} = this.props;
        const selectedSample = this.state.selectedSample;
        const sampleOptions = data.getSampleList().map(sampleName =>
            <option key={sampleName} value={sampleName}>{sampleName}</option>
        );

        const rdRange = data.getRdRange();
        rdRange[1] += 1; // Add one so it's prettier

        return <div className="SampleViz">
            <div className="SampleViz-select">
                Select sample: <select value={selectedSample} onChange={this.handleSelectedSampleChanged}>
                    {sampleOptions}
                </select>
            </div>
            {/* <div className="Cluster-select">
                Select cluster: <select value={selectedCluster} 
                                        onChange={this.handleSelectedClusterChanged} 
                                        >
                            {clusterOptions}
                </select>
            </div> */}
            <DivWithBullseye className="SampleViz-pane">
                <Scatterplot
                    parentCallBack = {this.handleCallBack}
                    data={data.getMergedRecords(selectedSample, chr)}
                    rdRange={rdRange}
                    width={width}
                    height={height}
                    curveState={curveState}
                    onNewCurveState={onNewCurveState}
                    hoveredLocation={hoveredLocation}
                    onRecordsHovered={this.handleRecordsHovered}
                    invertAxis= {invertAxis || false} 
                    customColor= {customColor}
                    assignCluster= {assignCluster} 
                    onBrushedBinsUpdated= {this.handleUpdatedBrushedBins}
                    brushedBins= {brushedBins}
                    updatedBins= {updatedBins}
                    shiftKey={shiftKey}
                    />
            </DivWithBullseye>
        </div>;
    }
}
