import React from "react";
import _, { assign } from "lodash";

import { ChromosomeInterval } from "../model/ChromosomeInterval";
import { DataWarehouse } from "../model/DataWarehouse";
import { MergedGenomicBin } from "../model/BinMerger";
import { CurveState } from "../model/CurveState";

import { SampleViz2D } from "./SampleViz2D";
import { SampleViz1D } from "./SampleViz1D";
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
    colors: string[];
    assignCluster: boolean;
    onBrushedBinsUpdated: any;
    brushedBins: MergedGenomicBin[];
    updatedBins: boolean;
}

interface State {
    selectedSample: string;
}

export class SampleViz extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            selectedSample: props.initialSelectedSample || props.data.getSampleList()[0],
        }
        this.handleSelectedSampleChanged = this.handleSelectedSampleChanged.bind(this);

    }
    
    handleSelectedSampleChanged(selected : string) {
        this.setState({selectedSample: selected});
        //this.props.onSelectedSample(event.target.value);
    }

    render() {
        const {data, initialSelectedSample} = this.props;
        const samples = data.getSampleList();
        return <div className="sampleviz-wrapper">
             <div className="row"> 
                <div className="col"> 
                    <SampleViz2D {...this.props} onSelectedSample={this.handleSelectedSampleChanged} initialSelectedSample={initialSelectedSample}/> 
                </div>
                <div className="col">
                    <SampleViz1D {...this.props} selectedSample={this.state.selectedSample} initialSelectedSample={initialSelectedSample} /> 
                </div>
            </div> 
                
        </div>
    }
}