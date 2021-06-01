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
    initialSelectedSample?: string;
    initialSelectedCluster?: string;
    width?: number;
    height?: number;
    curveState: CurveState;
    onNewCurveState: (newState: Partial<CurveState>) => void;
    hoveredLocation?: ChromosomeInterval;
    onLocationHovered: (location: ChromosomeInterval | null) => void;
    invertAxis?: boolean;
    customColor: string;
    assignCluster: boolean;
}

interface State {
    selectedSample: string;
    selectedCluster: string;
}

export class SampleViz2D extends React.Component<Props, State> {
    static defaultProps = {
        onNewCurveState: _.noop,
        onLocationHovered: _.noop,
        invertAxis: false
    };

    constructor(props: Props) {
        super(props);
        this.state = {
            selectedSample: props.initialSelectedSample || props.data.getSampleList()[0],
            selectedCluster: props.initialSelectedCluster || ""
        };
        this.handleSelectedSampleChanged = this.handleSelectedSampleChanged.bind(this);
        this.handleSelectedClusterChanged = this.handleSelectedClusterChanged.bind(this);
        this.handleRecordsHovered = this.handleRecordsHovered.bind(this);
        this.handleCallBack = this.handleCallBack.bind(this);
    }

    handleSelectedSampleChanged(event: React.ChangeEvent<HTMLSelectElement>) {
        this.setState({selectedSample: event.target.value});
    }

    handleSelectedClusterChanged(event: React.ChangeEvent<HTMLSelectElement>) {
        this.setState({selectedCluster: event.target.value});
    }

    handleRecordsHovered(record: MergedGenomicBin | null) {
        const location = record ? record.location : null;
        this.props.onLocationHovered(location);
    }

    handleCallBack = (childData : any) =>{
        //this.setState({name: childData})
        // console.log(childData);
        // let allBins = this.props.data.getRecords(this.state.selectedSample, this.state.selectedCluster, "");
        // for (const node of childData) {
        //     for (let i=0; i < allBins.length; i++) {
        //         if(node === allBins[i]) {
        //             allBins[i].CLUSTER = 0;
        //         }
        //     }     
        // }

        // this.setState({data : new DataWarehouse(allBins)});
        console.log("CHILD DATA: ", childData)
        //if(this.props.assignCluster) {
        this.props.parentCallBack({"data": childData, "selectedSample": this.state.selectedSample});
        //}
    }

    render() {
        const {data, chr, width, height, curveState, onNewCurveState, hoveredLocation, invertAxis, customColor, assignCluster} = this.props;
        const selectedSample = this.state.selectedSample;
        const sampleOptions = data.getSampleList().map(sampleName =>
            <option key={sampleName} value={sampleName}>{sampleName}</option>
        );
        
        const selectedCluster = this.state.selectedCluster;
        const clusterOptions = data.getAllClusters().map((clusterName : string) =>
            <option key={clusterName} value={clusterName}>{clusterName}</option>
        );
        clusterOptions.push(<option key="" value="">ALL</option>);

        const rdRange = data.getRdRange();
        rdRange[1] += 1; // Add one so it's prettier

        return <div className="SampleViz">
            <div className="SampleViz-select">
                Select sample: <select value={selectedSample} onChange={this.handleSelectedSampleChanged}>
                    {sampleOptions}
                </select>
            </div>
            <div className="Cluster-select">
                Select cluster: <select value={selectedCluster} 
                                        onChange={this.handleSelectedClusterChanged} 
                                        >
                            {clusterOptions}
                </select>
            </div>
            <DivWithBullseye className="SampleViz-pane">
                <Scatterplot
                    parentCallBack = {this.handleCallBack}
                    data={data.getMergedRecords(selectedSample, chr, selectedCluster)}
                    rdRange={rdRange}
                    width={width}
                    height={height}
                    curveState={curveState}
                    onNewCurveState={onNewCurveState}
                    hoveredLocation={hoveredLocation}
                    onRecordsHovered={this.handleRecordsHovered}
                    invertAxis= {invertAxis || false} 
                    customColor= {customColor}
                    assignCluster= {assignCluster} />
            </DivWithBullseye>
        </div>;
    }
}
