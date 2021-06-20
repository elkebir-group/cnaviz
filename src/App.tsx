import React from "react";
import parse from "csv-parse";
import _, { sample } from "lodash";
import { ChromosomeInterval } from "./model/ChromosomeInterval";
import { GenomicBin, GenomicBinHelpers} from "./model/GenomicBin";
import { DataWarehouse } from "./model/DataWarehouse";
import { CurveState, CurvePickStatus, INITIAL_CURVE_STATE } from "./model/CurveState";

import { SampleViz2D } from "./components/SampleViz2D";
import { SampleViz1D } from "./components/SampleViz1D";
import { GenomicLocationInput } from "./components/GenomicLocationInput";
import { CurveManager } from "./components/CurveManager";
import spinner from "./loading-small.gif";
import {HuePicker} from "react-color";
import "./App.css";
import { cpuUsage } from "process";
import { MergedGenomicBin } from "./model/BinMerger";
import keydown, { Keys } from "react-keydown";
import DataTable from "react-data-table-component"
import {MyComponent} from "./components/ClusterTable";

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
            if(applyLog) {
                for (const bin of parsed) {
                    bin.RD = Math.log2(bin.RD);
                    //console.log("Applying clustering: ", bin.RD);
                    if (!applyClustering) {
                        bin.CLUSTER = -1;
                    }
                }
            } else if(!applyClustering) {
                for (const bin of parsed) {
                    bin.CLUSTER = -1;
                }
            }

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

    assignCluster: boolean;

    assigned: boolean;
    
    applyLog: boolean;

    applyClustering: boolean;

    inputError: boolean;
    
    value: string;

    updatedBins: boolean;

}


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
            color: '#1b9e77',
            assignCluster: false,
            assigned: false,
            applyLog: false,
            applyClustering: false,
            inputError: false,
            value: "0",
            updatedBins: false
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
    }

    componentDidMount() {
        document.addEventListener('keydown', this.onCero, false);
      }
      
    componentWillUnmount() {
        document.removeEventListener('keydown', this.onCero, false);
    }

    onCero = (e:any) => {
        //if (e.keyCode === 27 || e.keyCode === 13) {
        if(e.keyCode === 8) {
            console.log("CLUSTER DELETED: ", this.state.value);
            this.state.indexedData.deleteCluster(Number(this.state.value));
            this.setState({indexedData: this.state.indexedData});
        }
    };

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
        console.log("Assign cluster: ", this.state.assignCluster);
        this.state.indexedData.updateCluster(Number(this.state.value));
        this.setState({assignCluster: false});
    }

    updateBrushedBins(brushedBins: MergedGenomicBin[]) {
        this.state.indexedData.setbrushedBins(brushedBins);
        this.setState({updatedBins: true});
        this.forceUpdate();
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

    // handleKeyPress = (event : any) => {
    //     if(event.key === 'Shift') {
    //       console.log('Shift press here! ')
    //     }
    // }

    onClusterRowsChange(state: any) {
        //console.log("Changed!", state.selectedRows);
        this.state.indexedData.setClusterFilters( state.selectedRows.map((d:any)  => String(d.key)));
        this.setState({indexedData: this.state.indexedData});
    }

    render() {
        const {indexedData, selectedChr, selectedCluster, hoveredLocation, curveState, invertAxis, sampleAmount, color, assignCluster, updatedBins, value} = this.state;
        const samples = indexedData.getSampleList();
        const brushedBins = indexedData.getBrushedBins();
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
                assignCluster,
                onBrushedBinsUpdated: this.updateBrushedBins,
                parentCallBack: this.handleCallBack,
                brushedBins: brushedBins,
                updatedBins: updatedBins
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
                                    <button onClick={this.handleAxisInvert} style={{marginRight: 10}}> Invert Axes </button>
                                    <button onClick={this.handleAddSampleClick} style={{marginRight: 10}}> Add Sample </button>
                                    <button onClick={this.handleAssignCluster} style={{marginRight: 10}} > Assign Cluster </button>
                                    <input type="number" style={{marginLeft: 10}} value={value} size={30} min="0" max="14" 
                                            onChange={this.handleClusterAssignmentInput}/>
                                </div>
                                
                                <div className = "row" style={{paddingTop: 10}}>
                                    <HuePicker width="100%" color={color} onChange={this.handleColorChange}/>
                                </div>
                            </div>
                        </div>

                        <MyComponent test={indexedData.getClusterTableInfo()} onClusterRowsChange={this.onClusterRowsChange}></MyComponent>
                        
                    </div>
                    
                    <div className="sampleviz-wrapper">
                        {_.times(sampleAmount, i => samples.length > i 
                            && <div className="row"> 
                                    <div className="col"> 
                                        <SampleViz2D key={i} {...scatterplotProps} initialSelectedSample={samples[i]}/> 
                                    </div>
                                    <div className="col">
                                        <SampleViz1D {...scatterplotProps} initialSelectedSample={samples[i]} /> 
                                    </div>
                                </div> 
                            )}
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
            </div>
            {status && <div className="App-status-pane">{status}</div>}
            {mainUI}
        </div>;
        
    }
}
