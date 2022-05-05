import React from "react";
import { ChromosomeInterval } from "../model/ChromosomeInterval";
import { DataWarehouse } from "../model/DataWarehouse";
import { SampleViz2D } from "./SampleViz2D";
import { SampleViz1D } from "./SampleViz1D";
import "./SampleViz.css";
import {DisplayMode} from "../App"
import {ClusterTable} from "./ClusterTable";
import { GenomicBin } from "../model/GenomicBin";
import { Gene } from "../model/Gene";
import {DEFAULT_PLOIDY, DEFAULT_PURITY} from "../constants";
import _  from "lodash";


const UNCLUSTERED_ID = "-1";
const DELETED_ID = "-2";

interface Props {
    parentCallBack: any;
    data: DataWarehouse;
    chr: string;
    cluster: string;
    initialSelectedSample: string;
    initialSelectedCluster?: string;
    width?: number;
    height?: number;
    hoveredLocation?: ChromosomeInterval;
    onLocationHovered: (location: ChromosomeInterval | null, record?: GenomicBin | null) => void;
    invertAxis?: boolean;
    customColor: string;
    colors: string[];
    onBrushedBinsUpdated: any;
    brushedBins: GenomicBin[];
    updatedBins: boolean;
    dispMode: DisplayMode;
    onRemovePlot: () => void;
    onAddSample: () => void;
    plotId: number;
    clusterTableData: any;
    applyLog: boolean;
    onClusterSelected: any;
    showLinearPlot: boolean;
    showScatterPlot: boolean;
    showSidebar: boolean;
    onUndoClick: () => void;
    sampleAmount: number;
    syncScales: boolean;
    handleZoom: (newScales: any) => void;
    scales: {xScale: [number, number] | null, yScale: [number, number] | null};
    showCentroids: boolean;
    driverGenes: Gene[] | null;
    showPurityPloidyInputs: boolean;
}

interface State {
    selectedSample: string;
    scales: {xScale: [number, number] | null, yScale: [number, number] | null};
    selectedCluster:string;
    implicitRange: [number, number]  | null;
    purity: number;
    ploidy: number;
}

export class SampleViz extends React.Component<Props, State> {
    private _clusters : string[];
    constructor(props: Props) {
        super(props);
        this._clusters = this.initializeListOfClusters();
        this.state = {
            selectedSample: props.initialSelectedSample || props.data.getSampleList()[0],
            scales: {xScale: null, yScale: null},
            selectedCluster: (this._clusters.length > 0) ? this._clusters[0] : UNCLUSTERED_ID,
            implicitRange: null,
            purity: DEFAULT_PURITY,
            ploidy: DEFAULT_PLOIDY
        }

        this.handleSelectedSampleChanged = this.handleSelectedSampleChanged.bind(this);
        this.handleSelectedSampleChange = this.handleSelectedSampleChange.bind(this);
        this.handleZoom = this.handleZoom.bind(this);
        this.handleLinearPlotZoom = this.handleLinearPlotZoom.bind(this);
        this.onUpdatePurity = this.onUpdatePurity.bind(this);
        this.onUpdatePloidy = this.onUpdatePloidy.bind(this);
        props.data.setDisplayedSample(props.initialSelectedSample || props.data.getSampleList()[0]);
    }

    initializeListOfClusters() : string[] {
        let clusterTableData = this.props.clusterTableData;

        this._clusters = [];
        for(const obj of clusterTableData) {
            this._clusters.push(obj.key);
        }

        while(this._clusters.length > 0 
            && (Number(this._clusters[0]) === Number(UNCLUSTERED_ID)
            || Number(this._clusters[0]) === Number(DELETED_ID))) {
            this._clusters.shift();
        }
        
        return this._clusters;
    }

    componentDidUpdate(prevProps: Props) {
        if(this.props.clusterTableData !== prevProps.clusterTableData) {
            this.initializeListOfClusters();
        } else if(this.props.applyLog !== prevProps.applyLog || this.props.showPurityPloidyInputs !== prevProps.showPurityPloidyInputs) {
            let newScale = {xScale: this.state.scales.xScale, yScale: null}; // keep x zoom but reset y
            this.setState({scales: newScale});
        }
    }

    handleSelectedSampleChanged(selected : string) {
        this.setState({selectedSample: selected});
    }

    handleSelectedSampleChange(event : any) {
        // this.props.data.removeDisplayedSample(this.state.selectedSample);
        // this.props.data.setDisplayedSample(event.target.value);
        this.setState({selectedSample: event.target.value});
    }

    handleZoom(newScales: any) {
        this.setState({scales: newScales})
    }

    handleLinearPlotZoom(genomicRange: [number, number] | null, yscale: [number, number] | null, key: boolean, reset?: boolean) {
        if(reset) {
            this.setState({implicitRange: null});
            let newScale = {xScale: null, yScale: null};
            this.setState({scales: newScale});
        } else {
            this.setState({implicitRange: genomicRange});
            let newScale = (!key) ? {xScale: yscale, yScale: this.state.scales.yScale} : {xScale: this.state.scales.xScale, yScale: yscale};
            this.setState({scales: newScale});
        }
    }

    onUpdatePurity(purity: number) {
        this.setState({purity: purity});
    }

    onUpdatePloidy(ploidy: number) {
        // this.props.data.updateFractionalCopyNumbers(ploidy, this.state.selectedSample);
        this.setState({ploidy: ploidy});
    }

    getSelectedBins(syncScales : boolean, implicitRange : [number, number] | null, selectedSample:string, applyLog:boolean, showPurityPloidy: boolean, meanRD:number, data:DataWarehouse) {
        let selectedRecords : GenomicBin[] = [];
        let scales = (syncScales) ? this.props.scales : this.state.scales;
        let dataKey : keyof Pick<GenomicBin, "RD" | "logRD" | "fractional_cn"> = (applyLog) ? "logRD" : ((showPurityPloidy) ? "fractional_cn" : "RD");

        if (implicitRange !== null || scales.xScale !== null || scales.yScale !== null) {
            let implicitStart = (implicitRange) ? implicitRange[0] : null;
            let implicitEnd = (implicitRange) ? implicitRange[1] : null;
            selectedRecords = data.getRecords(selectedSample, dataKey, implicitStart, implicitEnd, scales.xScale, scales.yScale, meanRD, this.state.ploidy);
        } else { 
            selectedRecords = data.getRecords(selectedSample, dataKey, null, null, null, null, meanRD, this.state.ploidy);
        }
        return selectedRecords;
    }

    render() {
        const {data, initialSelectedSample, applyLog, 
        showLinearPlot, showScatterPlot, dispMode, showSidebar, sampleAmount, syncScales, showPurityPloidyInputs} = this.props;
        const {implicitRange} = this.state;
        
        const selectedSample = this.state.selectedSample;
        let rdRange = data.getRdRange(selectedSample, applyLog);
        // console.log("Plot: ", this.props.plotId, " Displayed Samples: ", this.props.data.getDisplayedSamples());

        const sampleOptions = data.getSampleList().map(sampleName =>
            <option key={sampleName} value={sampleName} disabled={!(sampleName === this.state.selectedSample) && data.sampleIsDisplaying(sampleName)}>{sampleName} </option> //disabled={data.sampleIsDisplaying(sampleName)}
        );

        // console.log(sampleOptions);
        const meanRD = data.getMeanRD(selectedSample)

        let selectedRecords : GenomicBin[] = this.getSelectedBins(syncScales, implicitRange, selectedSample, applyLog, showPurityPloidyInputs, meanRD, data);
        // selectedRecords = this.scaleBins(selectedRecords, this.state.ploidy, this.state.selectedSample);

        const BAFTICKS = data.getBAFLines(this.state.purity);

        rdRange[1] += 0.5;
        if(showPurityPloidyInputs) {
            rdRange = data.getFractionCNRange(this.state.purity, 0, 20);
        }

        const fractional_range : [number, number] = [this.state.purity*0 + 2*(1 - this.state.purity), this.state.purity*10 + 2*(1 - this.state.purity)]
        const fractionalCNTicks = data.getFractionalCNTicks(this.state.purity, 0, 20);

        let clusterOptions = this._clusters.map((clusterName) =>
            <option key={clusterName} value={clusterName} >{clusterName}</option>
        );
        
        const scaleFactor = (showPurityPloidyInputs) ? this.state.ploidy / meanRD  :  1; // Sent into getCentroids to scale the centroids to the new yAxis for purity/ploidy

        clusterOptions.unshift(<option key={UNCLUSTERED_ID} value={UNCLUSTERED_ID} >{UNCLUSTERED_ID}</option>);
        clusterOptions.unshift(<option key={DELETED_ID} value={DELETED_ID} >{DELETED_ID}</option>);
        let disableSelectOptions = (data.getBrushedBins().length === 0);
        return <div className="SampleViz-wrapper">
            
            <div style={{verticalAlign: "middle"}}>
            {(showLinearPlot || showScatterPlot) &&
            <div className="SampleViz-select">
                <span>Sample: </span>
                <select value={selectedSample} onChange={this.handleSelectedSampleChange}>
                    {sampleOptions}
                </select>
                <button className="custom-button" onClick={() => {
                    this.props.onAddSample();
                }} disabled={sampleAmount >= sampleOptions.length}> Add Sample </button>
                <button className="custom-button" onClick={() => {
                    this.props.onRemovePlot();
                }} disabled={sampleAmount <= 1}> Remove Sample </button>
            </div>}
            
            {(showLinearPlot || showScatterPlot) &&
            <div className="SampleViz-select">
                    <span >Cluster: </span>
                        
                    <select
                    name="Select Cluster" 
                    title="Cluster"
                    className="Sampleviz-cluster-select"
                    value={this.state.selectedCluster}
                    disabled={disableSelectOptions}
                    onChange={(event: React.ChangeEvent<HTMLSelectElement>) => {this.setState({selectedCluster: event.target.value})}} >
                    {clusterOptions}
                    </select>
                   
                   <button className="custom-button" onClick={() => {
                        this.props.parentCallBack(this.state.selectedCluster);
                        this.props.onBrushedBinsUpdated([]);
                    }}
                    disabled={disableSelectOptions}>Assign Cluster</button>

                    <button className="custom-button" onClick={()=>{
                        this.initializeListOfClusters();
                        let clusters = this._clusters;
                        clusters.sort((a: string, b:string) => (Number(a) - Number(b)))
                        const highestCurrentCluster = (clusters.length > 0) ? Number(clusters[clusters.length-1]) : -1;
                        let nextAvailable = highestCurrentCluster + 1;

                        for(let i = 0; i < clusters.length; i++) {
                            if(Number(clusters[i]) !== i){
                                nextAvailable = i;
                                break;
                            }
                        }
                        
                        this.props.parentCallBack(nextAvailable);
                        this.props.onBrushedBinsUpdated([]);
                    }}
                    disabled={disableSelectOptions} >New Cluster</button>
                    <button className="custom-button" onClick={this.props.onUndoClick}> Undo</button>
                </div>}

                {(showLinearPlot || showScatterPlot) 
                && <div className="Inputs">
                    <label>Ploidy:</label> <input  type="number" id="Purity-Input" name="volume"
                        min="1" max="10" step="1" value={this.state.ploidy} onChange={event => this.onUpdatePloidy(Number(event.target.value))} onKeyDown={() => {return false}}></input>
                    
                    <label className="input-label">Purity:</label> <input type="number" id="Purity-Input" name="volume"
                        min="0" max="1" step="0.1" value={this.state.purity} onChange={event => this.onUpdatePurity(Number(event.target.value))} onKeyDown={() => {return false}}></input>
                    
                </div>}
                
            </div>

            <div className="SampleViz-plots">
                {showScatterPlot && <SampleViz2D 
                        {...this.props} 
                        data={selectedRecords}
                        onSelectedSample={this.handleSelectedSampleChanged}
                        selectedSample={selectedSample}
                        initialSelectedSample={initialSelectedSample}
                        onZoom={this.handleZoom}
                        rdRange={rdRange}
                        implicitRange={this.state.implicitRange}
                        scales={(syncScales) ? this.props.scales : this.state.scales}
                        centroidPts={data.getCentroidPoints(selectedSample, this.props.chr, scaleFactor)}
                        purity={this.state.purity}
                        ploidy={this.state.ploidy}
                        meanRD={meanRD}
                        fractionalCNTicks={fractionalCNTicks}
                        showPurityPloidy={showPurityPloidyInputs}
                        />
                }
                {showLinearPlot && <SampleViz1D 
                    {...this.props}  
                    data={selectedRecords} // selectedRecords
                    onLinearPlotZoom={this.handleLinearPlotZoom}
                    onZoom={this.handleZoom}
                    yScale={this.state.scales.yScale}
                    xScale={this.state.scales.xScale} 
                    selectedSample={this.state.selectedSample} 
                    initialSelectedSample={initialSelectedSample}
                    rdRange={rdRange}
                    displayMode={dispMode}
                    width={600} 
                    implicitRange={this.state.implicitRange}
                    purity={this.state.purity}
                    ploidy={this.state.ploidy}
                    fractional_range={fractional_range}
                    meanRD={meanRD}
                    fractionalCNTicks={fractionalCNTicks}
                    showPurityPloidy={showPurityPloidyInputs}
                />}

            </div>
            

            {(showLinearPlot || showScatterPlot) &&
            <div className={(showLinearPlot && showScatterPlot) ? "SampleViz-clusters" : ""}>
                <ClusterTable 
                    data={data.brushedTableData()} 
                    onClusterRowsChange={() => {}} 
                    onClusterColorChange={() => {}}
                    currentFilters={["-1"]}
                    colOneName={"Cluster ID"}
                    colTwoName={"Cluster (%)"}
                    colThreeName={"Selection (%)"}
                    colFourName={"Bin (%)"}
                    cols={""}
                    expandable={false}
                    selectable={false}
                    colors={this.props.colors}
                ></ClusterTable>
            </div>}
            
            
        </div>
    }
}