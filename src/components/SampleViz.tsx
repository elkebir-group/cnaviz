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
import {DEFAULT_PLOIDY, DEFAULT_PURITY, DEFAULT_OFFSET, START_CN, END_CN, UNCLUSTERED_ID, DELETED_ID, MAX_PLOIDY, MIN_PLOIDY, MAX_PURITY, MIN_PURITY, MIN_OFFSET, MAX_OFFSET} from "../constants";
import {useRef} from 'react'; 

interface Props {
    pointsize: number; 
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
    onRemovePlot: (sample: string) => void;
    onAddSample: () => void;
    plotId: number;
    clusterTableData: any;
    applyLog: boolean;
    onClusterSelected: any;
    showLinearPlot: boolean;
    showScatterPlot: boolean;
    onUndoClick: () => void;
    sampleAmount: number;
    syncScales: boolean;
    handleZoom: (newScales: any) => void;
    scales: {xScale: [number, number] | null, yScale: [number, number] | null};
    showCentroids: boolean;
    driverGenes: Gene[] | null;
    showPurityPloidyInputs: boolean;
    onChangeSample: (newSample: string, oldSample: string) => void;
    samplesShown: Set<string>;
}

interface State {
    selectedSample: string;
    scales: {xScale: [number, number] | null, yScale: [number, number] | null};
    selectedCluster:string;
    implicitRange: [number, number]  | null;
    purity: number;
    ploidy: number;
    offset: number; 
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
            ploidy: DEFAULT_PLOIDY,
            offset: DEFAULT_OFFSET
        }

        this.handleSelectedSampleChanged = this.handleSelectedSampleChanged.bind(this);
        this.handleSelectedSampleChange = this.handleSelectedSampleChange.bind(this);
        this.handleZoom = this.handleZoom.bind(this);
        this.handleLinearPlotZoom = this.handleLinearPlotZoom.bind(this);
        this.onUpdatePurity = this.onUpdatePurity.bind(this);
        this.onUpdatePloidy = this.onUpdatePloidy.bind(this);
        this.onUpdateOffset = this.onUpdateOffset.bind(this);
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
        this.setState({selectedSample: event.target.value});
    }

    handleZoom(newScales: any) {
        // console.log("Handle zoom: ", newScales);
        this.setState({scales: newScales});
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
        this.props.data.setSamplePloidy(this.state.selectedSample, ploidy);
        this.setState({ploidy: ploidy});
        this.setState({scales: {xScale: null, yScale: null}});
    }

    onUpdateOffset(offset: number) {
        this.setState({offset: offset}); 
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
        showLinearPlot, showScatterPlot, dispMode, sampleAmount, syncScales, showPurityPloidyInputs, samplesShown} = this.props;
        const {implicitRange} = this.state;
        
        const selectedSample = this.state.selectedSample;
        let rdRange = data.getRdRange(selectedSample, applyLog);
        const sampleOptions = data.getSampleList().map(sampleName =>
            <option key={sampleName} value={sampleName} disabled={!(sampleName === this.state.selectedSample) && samplesShown.has(sampleName)}>{sampleName} </option> //disabled={data.sampleIsDisplaying(sampleName)}
        );

        const meanRD = data.getMeanRD(selectedSample)

        let selectedRecords : GenomicBin[] = this.getSelectedBins(syncScales, implicitRange, selectedSample, applyLog, showPurityPloidyInputs, meanRD, data);

        const BAF_lines = data.getBAFLines(this.state.purity, this.state.selectedSample, this.state.offset); // gc: add offset as a parameter

        // Derived from formula: FRACTIONAL_COPY_NUMBER = purity * (TOTAL_CN) + 2*(1 - purity)
        const max_cn = (this.state.purity) ? ((rdRange[1]) * this.state.ploidy / meanRD - 2*(1-this.state.purity)) / this.state.purity : 0;
        
        rdRange[1] += 0.5;
        
        const fractionalCNTicks = data.getFractionalCNTicks(this.state.purity, START_CN, END_CN, Math.ceil(max_cn), this.state.selectedSample);

        if(showPurityPloidyInputs) {
            rdRange = [rdRange[0]* this.state.ploidy /meanRD, rdRange[1] * this.state.ploidy /meanRD];
        }

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
            <div className="SampleViz-select" title="Selects a sample from the loaded data.">
                <span>Sample: </span>
                <select value={selectedSample} onChange={(event: any) => {
                    this.props.onChangeSample(event.target.value, this.state.selectedSample);
                    this.handleSelectedSampleChange(event);
                }}>
                    {sampleOptions}
                </select>
                <button className="custom-button-add" title="Add the next sequential sample in the dropdown menu." onClick={() => {
                    this.props.onAddSample();
                }} disabled={sampleAmount >= sampleOptions.length}> Add </button>
                <button className="custom-button-remove" title="Removes this sample." onClick={() => {
                    this.props.onRemovePlot(this.state.selectedSample);
                }} disabled={sampleAmount <= 1}> Remove </button>
            </div>}
            
            {(showLinearPlot || showScatterPlot) &&
            <div className="SampleViz-select" title="Selects a cluster from the loaded data.">
                    <span >Cluster: </span>

                    <select
                    name="Select Cluster" 
                    // title="Pick a cluster to assign your selected bins to!"
                    className="Sampleviz-cluster-select"
                    value={this.state.selectedCluster}
                    disabled={disableSelectOptions}
                    onChange={(event: React.ChangeEvent<HTMLSelectElement>) => {this.setState({selectedCluster: event.target.value})}} >
                    {clusterOptions}
                    </select>
                   
                   <button className="custom-button" title="Assigns your selected bins to the selected cluster." onClick={() => {
                        this.props.parentCallBack(this.state.selectedCluster);
                        this.props.onBrushedBinsUpdated([]);
                    }}
                    disabled={disableSelectOptions}>Assign</button>

                    <button className="custom-button" title="Assigns your selected bins to a new cluster." onClick={()=>{
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
                    disabled={disableSelectOptions} >New</button>
                    {/* <button className="custom-button" title="Undo cluster assignment." onClick={this.props.onUndoClick}> Undo Cluster Assignment</button> */}
                </div>}

                {(showLinearPlot || showScatterPlot) && showPurityPloidyInputs
                && <div className="Inputs">
                    <label>Ploidy:</label> <input value={this.state.ploidy} type="number" id="Purity-Input" name="volume"
                        step="0.01" title="Set ploidy gridlines." onChange={event => {
                            const newPloidy = Number(event.target.value);
                            // if(newPloidy <= MAX_PLOIDY && newPloidy >= MIN_PLOIDY) {
                                this.onUpdatePloidy(newPloidy);
                            // }
                        }}></input>
                    {/* <div className="input-class" title="Set purity gridlines. Max purity is 1.">   */}
                        <label className="input-label">Purity:</label> <input type="number" id="Purity-Input" name="volume"
                            step="0.01" value={this.state.purity} title="Set purity gridlines. Max purity is 1." onChange={event => {
                                const newPurity = Number(event.target.value);
                                if(newPurity <= MAX_PURITY) { // && newPurity >= MIN_PURITY) {
                                    this.onUpdatePurity(newPurity);
                                }
                                
                            }}></input>
                    {/* </div> */}
                    {/* <div className="input-class" title="Set offset for first vertical gridline. Max offset is 1.">   */}
                        <label className="input-label">BAF Balance: Offset for (x,x):</label> <input type="number" id="Purity-Input" name="volume" 
                            step="0.01" value={this.state.offset} title="Set offset for first vertical gridline. Max offset is 1." onChange={event => {
                                const newoffset = Number(event.target.value);
                                if(newoffset <= MAX_OFFSET) { // } && newoffset >= MIN_OFFSET) {
                                    this.onUpdateOffset(newoffset);
                                // }
                            }}}></input>
                    {/* </div> */}
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
                        offset={this.state.offset}
                        meanRD={meanRD}
                        fractionalCNTicks={fractionalCNTicks}
                        showPurityPloidy={showPurityPloidyInputs}
                        BAF_lines={BAF_lines}
                        max_cn = {Math.ceil(max_cn)}
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
                    meanRD={meanRD}
                    fractionalCNTicks={fractionalCNTicks}
                    showPurityPloidy={showPurityPloidyInputs}
                    BAF_lines={BAF_lines}
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