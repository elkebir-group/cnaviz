import React from "react";
import parse from "csv-parse";
import _, { last, sample } from "lodash";
import { ChromosomeInterval } from "./model/ChromosomeInterval";
import { GenomicBin, GenomicBinHelpers} from "./model/GenomicBin";
import { DataWarehouse } from "./model/DataWarehouse";
import { CurveState, CurvePickStatus, INITIAL_CURVE_STATE } from "./model/CurveState";

import { SampleViz2D } from "./components/SampleViz2D";
import { SampleViz1D } from "./components/SampleViz1D";
import {SampleViz} from "./components/SampleViz";
import { GenomicLocationInput } from "./components/GenomicLocationInput";
import { CurveManager } from "./components/CurveManager";
import spinner from "./loading-small.gif";
import {HuePicker} from "react-color";
import "./App.css";
import { cpuUsage } from "process";
import { MergedGenomicBin } from "./model/BinMerger";
import DataTable from "react-data-table-component"
import {ClusterTable} from "./components/ClusterTable";
import {CSV} from "./components/CSVLink"
import * as d3 from "d3";
import {Genome} from "./model/Genome";

function getFileContentsAsString(file: File) {
    return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsText(file);
        reader.onload = function() {
            resolve(reader.result as string);
        }
        reader.onerror = reject;
        reader.onabort = reject;
    });
}

export let genome : Genome;

function parseGenomicBins(data: string, applyLog: boolean, applyClustering: boolean): Promise<GenomicBin[]> {
    return new Promise((resolve, reject) => {
        parse(data, {
            cast: true,
            columns: true,
            delimiter: "\t",
            skip_empty_lines: true,
        }, (error, parsed) => {
            if (error) {
                reject(error);
                return;
            }
            
            let start = Number(parsed[0].START);
            let end = 0;
            let lastChr = parsed[0]["#CHR"];
            let chrNameLength: any = [];

            for (const bin of parsed) {
                if(!applyClustering) {
                    bin.CLUSTER = -1;
                }

                if(applyLog) { 
                    bin.RD = Math.log2(bin.RD);
                }

                if(lastChr !==  bin["#CHR"]) {
                    chrNameLength.push({name: lastChr, length: (end - start)})
                    start = Number(bin.START);
                    lastChr = bin["#CHR"]
                }
                end = Number(bin.END);
            }
            
            
            chrNameLength.push({name: lastChr, length: (end - start)})
            
            chrNameLength.sort((a : any, b : any) => (a.name < b.name) ? 1 : -1)


            const sortedChrNameLength = chrNameLength.sort((a: any, b : any) => {
                return a.name.localeCompare(b.name, undefined, {
                    numeric: true,
                    sensitivity: 'base'
                })
            })

            //console.log(sorted);
            genome = new Genome(sortedChrNameLength);
            
            console.log("PARSED: ", parsed);
            resolve(parsed);
        });
    })
}

/**
 * Possible states of processing input data.
 */
enum ProcessingStatus {
    /** No data input (yet) */
    none,

    /** Reading data into memory */
    readingFile,

    /** Reformatting, aggregating, converting, or otherwise analyzing data. */
    processing,

    /** The results of data processing step are available. */
    done,

    /** An error happened during any step. */
    error
}

interface State {
    /** Current status of reading/processing input data */
    processingStatus: ProcessingStatus;

    /** Indexed data */
    indexedData: DataWarehouse;
    
    /** Current genomic location that the user has selected.  Null if no such location. */
    hoveredLocation: ChromosomeInterval | null;

    /** Name of the chromosome selected for detailed viewing.  Empty string if no chromosome is selected. */
    selectedChr: string;

    selectedCluster: string;

    /**  */
    curveState: CurveState;

    invertAxis: boolean;

    sampleAmount: number;

    color: string;

    colors: string[];

    assignCluster: boolean;

    assigned: boolean;
    
    applyLog: boolean;

    applyClustering: boolean;

    inputError: boolean;
    
    value: string;

    updatedBins: boolean;

    selectedSample: string;

    displayMode: DisplayMode;
}


export enum DisplayMode {
    zoom,
    select
};

/**
 * Top-level container.
 * 
 * @author Silas Hsu
 */

export class App extends React.Component<{}, State> {
    
    constructor(props: {}) {
        super(props);
        this.state = {
            processingStatus: ProcessingStatus.none,
            indexedData: new DataWarehouse([]),
            hoveredLocation: null,
            selectedChr: DataWarehouse.ALL_CHRS_KEY,
            selectedCluster: DataWarehouse.ALL_CLUSTERS_KEY,
            curveState: INITIAL_CURVE_STATE,
            invertAxis: false,
            sampleAmount: 1,
            color: 'blue',
            colors:  [
                "#1b9e77", 
                "#d95f02", 
                "#7570b3", 
                "#e7298a", 
                "#66a61e", 
                "#e6ab02", 
                "#a6761d", 
                "#666666", 
                "#fe6794", 
                "#10b0ff", 
                "#ac7bff", 
                "#964c63", 
                "#cfe589", 
                "#fdb082", 
                "#28c2b5"
            ],
            assignCluster: false,
            assigned: false,
            applyLog: false,
            applyClustering: false,
            inputError: false,
            value: "0",
            updatedBins: false,
            selectedSample: "",
            displayMode: DisplayMode.select
        };
        this.handleFileChoosen = this.handleFileChoosen.bind(this);
        this.handleChrSelected = this.handleChrSelected.bind(this);
        this.handleClusterSelected = this.handleClusterSelected.bind(this);
        this.handleLocationHovered = _.throttle(this.handleLocationHovered.bind(this), 50);
        this.handleNewCurveState = _.throttle(this.handleNewCurveState.bind(this), 20);
        this.handleAxisInvert = this.handleAxisInvert.bind(this);
        this.handleAddSampleClick = this.handleAddSampleClick.bind(this);
        this.handleColorChange = this.handleColorChange.bind(this);
        this.handleAssignCluster = this.handleAssignCluster.bind(this);
        this.handleCallBack = this.handleCallBack.bind(this);
        this.handleClusterAssignmentInput = this.handleClusterAssignmentInput.bind(this);
        this.updateBrushedBins = this.updateBrushedBins.bind(this);
        this.onClusterRowsChange = this.onClusterRowsChange.bind(this);
        this.onClusterColorChange = this.onClusterColorChange.bind(this);
        this.onSelectedSample = this.onSelectedSample.bind(this);
        let self = this;
        d3.select("body").on("keypress", function(){
            if (d3.event.key == "a") {
                console.log("Test Zooming/Panning")
                self.setState({displayMode: DisplayMode.zoom})
            } else if (d3.event.key == "b") {
                console.log("Test2 Brushing")
                self.setState({displayMode: DisplayMode.select})
            }
        })
    }

    async handleFileChoosen(event: React.ChangeEvent<HTMLInputElement>) {
        const files = event.target.files;
        if (!files || !files[0]) {
            return;
        }

        this.setState({processingStatus: ProcessingStatus.readingFile});
        let contents = "";
        try {
            contents = await getFileContentsAsString(files[0]);
        } catch (error) {
            console.error(error);
            this.setState({processingStatus: ProcessingStatus.error});
            return;
        }

        this.setState({processingStatus: ProcessingStatus.processing});
        let indexedData = null;
        try {
            const parsed = await parseGenomicBins(contents, this.state.applyLog, this.state.applyClustering);
            indexedData = new DataWarehouse(parsed);
        } catch (error) {
            console.error(error);
            this.setState({processingStatus: ProcessingStatus.error});
            return;
        }

        this.setState({
            indexedData: indexedData,
            processingStatus: ProcessingStatus.done
        });
    }

    handleChrSelected(event: React.ChangeEvent<HTMLSelectElement>) {
        this.setState({selectedChr: event.target.value});
        this.state.indexedData.setChrFilter(event.target.value);
    }

    handleClusterSelected(event: React.ChangeEvent<HTMLSelectElement>) {
        this.setState({selectedCluster: event.target.value});
        this.state.indexedData.setClusterFilters([event.target.value]);
    }

    handleLocationHovered(location: ChromosomeInterval | null) {
        if (!location) {
            this.setState({hoveredLocation: null});
            return;
        }

        //const binSize = this.state.indexedData.guessBinSize();
        this.setState({hoveredLocation: location}); //.endsRoundedToMultiple(binSize)
    }

    handleClusterAssignmentInput(event: any) {
        this.setState({value: event.target.value})
    }

    handleCallBack() {
        this.state.indexedData.updateCluster(Number(this.state.value));
        this.setState({assignCluster: false});
    }

    updateBrushedBins(brushedBins: MergedGenomicBin[]) {
        this.state.indexedData.setbrushedBins(brushedBins);
        console.log("test");
        this.setState({updatedBins: true});
    }

    handleAxisInvert() {
        this.setState({invertAxis: !this.state.invertAxis});
    }

    handleAddSampleClick() {
        this.setState({sampleAmount: this.state.sampleAmount + 1});
    }

    handleAssignCluster() {
        this.setState({assignCluster: !this.state.assignCluster});
    }

    handleColorChange(color : any) {
        this.setState({color: color.hex});
    }

    handleNewCurveState(newState: Partial<CurveState>) {
        this.setState(prevState => {
            const nextCurveState = {
                ...prevState.curveState,
                ...newState
            };
    
            if (prevState.curveState.pickStatus === CurvePickStatus.pickingNormalLocation) {
                nextCurveState.state1 = null;
                nextCurveState.state2 = null;
            }
            return {curveState: nextCurveState};
        });
    }

    getStatusCaption() {
        switch (this.state.processingStatus) {
            case ProcessingStatus.readingFile:
                return <div>Reading file... <img src={spinner} alt="Loading" /></div>;
            case ProcessingStatus.processing:
                return <div>Processing data... <img src={spinner} alt="Loading" /></div>;
            case ProcessingStatus.error:
                return "ERROR";
            case ProcessingStatus.none:
            case ProcessingStatus.done:
            default:
                return "";
        }
    }

    toggleLog() {
        this.setState({
            applyLog: !this.state.applyLog
        });
    }

    toggleClustering() {
        this.setState({
            applyClustering: !this.state.applyClustering
        });
    }

    onClusterRowsChange(state: any) {
        this.state.indexedData.setClusterFilters( state.selectedRows.map((d:any)  => String(d.key)));
        this.setState({indexedData: this.state.indexedData});
    }

    onClusterColorChange(colors: any) {
        console.log("SETTING STATE TOOO, ", colors);
        this.setState({colors: colors})
        this.forceUpdate();
        console.log("CURRENT STATE:  ", this.state.colors);
    }

    onSelectedSample(selectedSample : any) {
        this.setState({selectedSample : selectedSample})
    }

    render() {
        const {indexedData, selectedChr, selectedCluster, hoveredLocation, curveState, invertAxis, color, assignCluster, updatedBins, value, sampleAmount} = this.state;
        const samples = indexedData.getSampleList();
        const brushedBins = indexedData.getBrushedBins();
        const allData = this.state.indexedData.getAllRecords();
        //indexedData.setRDFilter([1.0, 1.5]);
        let mainUI = null;
        if (this.state.processingStatus === ProcessingStatus.done && !indexedData.isEmpty()) {
            const scatterplotProps = {
                data: indexedData,
                hoveredLocation: hoveredLocation || undefined,
                curveState,
                onNewCurveState: this.handleNewCurveState,
                onLocationHovered: this.handleLocationHovered,
                invertAxis,
                chr: selectedChr,
                cluster: selectedCluster,
                customColor: color,
                colors: this.state.colors,
                assignCluster,
                onBrushedBinsUpdated: this.updateBrushedBins,
                parentCallBack: this.handleCallBack,
                brushedBins: brushedBins,
                updatedBins: updatedBins,
                onSelectedSample: this.onSelectedSample,
                selectedSample: this.state.selectedSample,
                dispMode: this.state.displayMode
            };

            const chrOptions = indexedData.getAllChromosomes().map(chr => <option key={chr} value={chr}>{chr}</option>);
            chrOptions.push(<option key={DataWarehouse.ALL_CHRS_KEY} value={DataWarehouse.ALL_CHRS_KEY}>ALL</option>);

            const clusterOptions = indexedData.getAllClusters().map((clusterName : string) =>
                <option key={clusterName} value={clusterName}>{clusterName}</option>
            );
            clusterOptions.push(<option key={DataWarehouse.ALL_CLUSTERS_KEY} value={DataWarehouse.ALL_CLUSTERS_KEY}>ALL</option>);
           
            mainUI = (
                <div id="grid-container">
                    <div className="App-global-controls">
                            <label htmlFor="Select Chromosome"> Select a Chromosome: </label>
                            <select name="Select Chromosome" id="Select Chromosome" value={selectedChr} onChange={this.handleChrSelected} >
                                {chrOptions}
                            </select>
                        
                        
                        <div className="row">
                            <div className = "col" >
                                <div className="row" style={{paddingTop: 10}}>
                                    <button onClick={this.handleAddSampleClick} style={{marginRight: 10}}> Add Sample </button>
                                    <button onClick={this.handleAssignCluster} style={{marginRight: 10}} > Assign Cluster </button>
                                    <input type="number" style={{marginLeft: 10}} value={value} size={30} min="0" max="14" 
                                            onChange={this.handleClusterAssignmentInput}/>
                                </div>
                            </div>
                        </div>

                        <ClusterTable test={indexedData.getClusterTableInfo()} onClusterRowsChange={this.onClusterRowsChange} onClusterColorChange={this.onClusterColorChange}></ClusterTable>
                    </div>
                    
                    <div className="sampleviz-wrapper">
                            {_.times(sampleAmount, i => samples.length > i 
                            && <SampleViz {...scatterplotProps} initialSelectedSample={samples[i]}></SampleViz>)}
                    </div>
                </div>);
        }

        const status = this.getStatusCaption();
        
        return <div className="container-fluid">
            <div className="App-title-bar">
                <h1>CNA-Viz</h1>
                {samples.length === 0 &&
                    <span className="App-file-upload-explanation">To get started, choose a .bbc file:</span>
                }
                <input type="file" id="fileUpload" onChange={this.handleFileChoosen} />
                <span className="App-CheckBox-explanation">Apply log to RD: </span>
                <input type="checkbox" style={{marginRight: 2}} onClick={this.toggleLog.bind(this)} />
                <span className="App-CheckBox-explanation" style={{marginLeft: 10}}>Apply provided clustering: </span>
                <input type="checkbox" style={{marginRight: 2}} onClick={this.toggleClustering.bind(this)} />
                <CSV data={allData}> /</CSV>
            </div>
            {status && <div className="App-status-pane">{status}</div>}
            {mainUI}
        </div>;
        
    }
}
