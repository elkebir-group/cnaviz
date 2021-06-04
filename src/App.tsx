import React from "react";
import parse from "csv-parse";
import _, { sample } from "lodash";

import { ChromosomeInterval } from "./model/ChromosomeInterval";
import { GenomicBin } from "./model/GenomicBin";
import { DataWarehouse } from "./model/DataWarehouse";
import { CurveState, CurvePickStatus, INITIAL_CURVE_STATE } from "./model/CurveState";

import { SampleViz2D } from "./components/SampleViz2D";
import { SampleViz1D } from "./components/SampleViz1D";
import { GenomicLocationInput } from "./components/GenomicLocationInput";
import { CurveManager } from "./components/CurveManager";
import spinner from "./loading-small.gif";
import {HuePicker, SliderPicker} from "react-color";
import "./App.css";
import { cpuUsage } from "process";

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

    /**  */
    curveState: CurveState;

    invertAxis: boolean;

    sampleAmount: number;

    color: string;

    assignCluster: boolean;

    assigned: boolean;
    
    applyLog: boolean;

    applyClustering: boolean;

    clusterAssignment: number;

    inputError: boolean;
    
    value: string;
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
            indexedData: new DataWarehouse([], false),
            hoveredLocation: null,
            selectedChr: DataWarehouse.ALL_CHRS_KEY,
            curveState: INITIAL_CURVE_STATE,
            invertAxis: false,
            sampleAmount: 1,
            color: '#1b9e77',
            assignCluster: false,
            assigned: false,
            applyLog: false,
            applyClustering: false,
            clusterAssignment: -1,
            inputError: false,
            value: ""
        };
        this.handleFileChoosen = this.handleFileChoosen.bind(this);
        this.handleChrSelected = this.handleChrSelected.bind(this);
        this.handleLocationHovered = _.throttle(this.handleLocationHovered.bind(this), 50);
        this.handleNewCurveState = _.throttle(this.handleNewCurveState.bind(this), 20);
        this.handleAxisInvert = this.handleAxisInvert.bind(this);
        this.handleAddSampleClick = this.handleAddSampleClick.bind(this);
        this.handleColorChange = this.handleColorChange.bind(this);
        this.handleAssignCluster = this.handleAssignCluster.bind(this);
        this.handleCallBack = this.handleCallBack.bind(this);
        this.handleClusterAssignmentInput = this.handleClusterAssignmentInput.bind(this);
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
            console.log("Parsing")
            indexedData = new DataWarehouse(parsed, this.state.applyClustering);
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
    }

    handleLocationHovered(location: ChromosomeInterval | null) {
        if (!location) {
            this.setState({hoveredLocation: null});
            return;
        }
        const binSize = this.state.indexedData.guessBinSize();
        this.setState({hoveredLocation: location}); //.endsRoundedToMultiple(binSize)
    }

    handleClusterAssignmentInput(event: any) {
        this.setState({value: event.target.value})
    }

    handleCallBack(childData: any) {
        const allBins = this.state.indexedData.getRawData();
        console.log("Brushed nodes: ", childData["data"]);

        for (const node of childData["data"]) {
            for (let i=0; i < allBins.length; i++) {
                if(node.bins[0] === allBins[i]) {
                    //console.log("doing it")
                    allBins[i] = {
                        "#CHR": allBins[i]["#CHR"],
                        "START": allBins[i]["START"],
                        "END": allBins[i]["END"],
                        "SAMPLE": allBins[i]["SAMPLE"],
                        "RD": allBins[i]["RD"],
                        "#SNPS": allBins[i]["#SNPS"],
                        "COV": allBins[i]["COV"],
                        "ALPHA": allBins[i]["ALPHA"],
                        "BETA": allBins[i]["BETA"],
                        "BAF": allBins[i]["BAF"],
                        "CLUSTER": Number(this.state.value)
                    };
                }
            }     
        }

        this.setState({indexedData: new DataWarehouse(allBins, true)})
        console.log(this.state.indexedData.getAllClusters());
        this.setState({assignCluster: false});
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

    render() {
        const {indexedData, selectedChr, hoveredLocation, curveState, invertAxis, sampleAmount, color, assignCluster} = this.state;
        const samples = indexedData.getSampleList();
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
                customColor: color,
                assignCluster
            };

            const chrOptions = indexedData.getAllChromosomes().map(chr => <option key={chr} value={chr}>{chr}</option>);
            chrOptions.push(<option key={DataWarehouse.ALL_CHRS_KEY} value={DataWarehouse.ALL_CHRS_KEY}>ALL</option>);
            
            mainUI = <div>
                <div className="App-global-controls" style={{marginLeft: 30}}>
                        Select chromosome: <select value={selectedChr} onChange={this.handleChrSelected} style={{marginLeft: 10}}>
                            {chrOptions}
                        </select>
                        <div className="row">
                            <div className="col">
                                <GenomicLocationInput label="Highlight region: " onNewLocation={this.handleLocationHovered} />
                            </div>
                        </div>
                        <CurveManager curveState={curveState} onNewCurveState={this.handleNewCurveState} />
                        
                        <div className="row">
                            <div className = "col">
                                <button onClick={this.handleAxisInvert}> Invert Axes </button>
                                <button onClick={this.handleAddSampleClick}> Add Sample </button>
                                <button onClick={this.handleAssignCluster}> Assign Cluster </button>
                                <input type="number" size={30} min="0" max="14" 
                                        onChange={this.handleClusterAssignmentInput}/>
                            </div>
                            <div className = "col" style={{paddingTop: 5}}>
                                <HuePicker color={color} onChange={this.handleColorChange}/>
                            </div>
                        </div>
                </div>
                
                <div className="col">
                    <div className="row">
                    {_.times(sampleAmount, i => samples.length > i && <div className="col" > <SampleViz2D parentCallBack = {this.handleCallBack} key={i} {...scatterplotProps} /> </div>)}
                        <div className="col"> <SampleViz1D {...scatterplotProps} initialSelectedSample={samples[0]} /> </div>   
                    </div>
                </div>
            </div>;
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
