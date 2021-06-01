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

function parseGenomicBins(data: string): Promise<GenomicBin[]> {
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
            for (const bin of parsed) {
                bin.RD = Math.log2(bin.RD);
            }
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
            curveState: INITIAL_CURVE_STATE,
            invertAxis: false,
            sampleAmount: 1,
            color: '#fff',
            assignCluster: false,
            assigned: false
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
            const parsed = await parseGenomicBins(contents);
            console.log("Parsing")
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
    }

    handleLocationHovered(location: ChromosomeInterval | null) {
        if (!location) {
            this.setState({hoveredLocation: null});
            return;
        }
        const binSize = this.state.indexedData.guessBinSize();
        this.setState({hoveredLocation: location.endsRoundedToMultiple(binSize)});
    }

    handleCallBack(childData: any) {
        console.log("CHILD DATA2: ", childData);
        if(!this.state.assigned) {
            let allBins = this.state.indexedData.getRecords(childData["selectedSample"], this.state.selectedChr, "");
            for (const node of childData["data"]) {
                for (let i=0; i < allBins.length; i++) {
                    if(node === allBins[i]) {
                        console.log("doing it")
                        allBins[i].CLUSTER = 0;
                    }
                }     
            }
            let indexedData = new DataWarehouse(allBins);
            this.setState({indexedData : indexedData});
            this.setState({assigned: true})
        }
    }

    handleAxisInvert() {
        this.setState({invertAxis: !this.state.invertAxis});
    }

    handleAddSampleClick() {
        this.setState({sampleAmount: this.state.sampleAmount + 1})
    }

    handleAssignCluster() {
        this.setState({assignCluster: !this.state.assignCluster})
    }

    handleColorChange(color : any) {
        this.setState({color: color.hex}) 
        console.log(this.state.color);
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
                    <div className="row">
                        
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
            </div>
            {status && <div className="App-status-pane">{status}</div>}
            {mainUI}
        </div>;
    }
}
