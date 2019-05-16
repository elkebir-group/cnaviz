import React from "react";
import parse from "csv-parse";
import _ from "lodash";

import { ChromosomeInterval } from "./model/ChromosomeInterval";
import { GenomicBin } from "./model/GenomicBin";
import { SampleIndexedBins } from "./model/BinIndex";
import { CurveState, CurvePickStatus } from "./model/CurveState";

import { SampleViz } from "./components/SampleViz";
import { GenomicLocationInput } from "./components/GenomicLocationInput";

import spinner from "./loading-small.gif";
import "./App.css";

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

enum ProcessingStatus {
    none,
    readingFile,
    processing,
    done,
    error
}

interface State {
    processingStatus: ProcessingStatus;
    indexedData: SampleIndexedBins;
    hoveredLocation: ChromosomeInterval | null;
    selectedChr: string;
    curveState: CurveState;
}

const INITIAL_CURVE_STATE: CurveState = {
    hoveredP: -1,
    state1: null,
    state2: null,
    pickStatus: CurvePickStatus.none
};

export class App extends React.Component<{}, State> {
    constructor(props: {}) {
        super(props);
        this.state = {
            processingStatus: ProcessingStatus.none,
            indexedData: new SampleIndexedBins([]),
            hoveredLocation: null,
            selectedChr: "",
            curveState: INITIAL_CURVE_STATE
        };
        this.handleFileChoosen = this.handleFileChoosen.bind(this);
        this.handleChrSelected = this.handleChrSelected.bind(this);
        this.handleLocationHovered = _.throttle(this.handleLocationHovered.bind(this), 50);
        this.toggleCurveDrawing = this.toggleCurveDrawing.bind(this);
        this.handleNewCurveState = _.throttle(this.handleNewCurveState.bind(this), 20);
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
            indexedData = new SampleIndexedBins(parsed);
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
        const binSize = this.state.indexedData.estimateBinSize();
        this.setState({hoveredLocation: location.endsRoundedToMultiple(binSize)});
    }

    toggleCurveDrawing() {
        this.setState(prevState => {
            let newCurveState;
            if (prevState.curveState.pickStatus !== CurvePickStatus.none) {
                newCurveState = INITIAL_CURVE_STATE;
            } else {
                newCurveState = {
                    ...prevState.curveState,
                    pickStatus: CurvePickStatus.pickingState1
                };
            }
            return {
                curveState: newCurveState
            };
        });
    }

    handleNewCurveState(newState: CurveState) {
        this.setState({curveState: newState});
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
        const {indexedData, selectedChr, hoveredLocation, curveState} = this.state;
        const samples = indexedData.getSamples();
        let mainUI = null;
        if (this.state.processingStatus === ProcessingStatus.done && !indexedData.isEmpty()) {
            const scatterplotProps = {
                indexedData,
                hoveredLocation: hoveredLocation || undefined,
                curveState,
                onNewCurveState: this.handleNewCurveState,
                onLocationHovered: this.handleLocationHovered
            };

            const chrOptions = indexedData.getChromosomes().map(chr => <option key={chr} value={chr}>{chr}</option>);
            chrOptions.push(<option key="" value="">ALL</option>);
            mainUI = <div>
                <div className="App-global-controls">
                    Select chromosome: <select value={selectedChr} onChange={this.handleChrSelected}>
                        {chrOptions}
                    </select>
                    <GenomicLocationInput label="Highlight region: " onNewLocation={this.handleLocationHovered} />
                    <div>
                        {curveState.pickStatus === CurvePickStatus.none ? 
                            <button onClick={this.toggleCurveDrawing}>
                                Draw curve <i className="fas fa-pencil-alt" />
                            </button>
                            :
                            <button onClick={this.toggleCurveDrawing}>
                                Clear curve <i className="fas fa-times" />
                            </button>
                        }
                    </div>
                </div>
                <div className="row">
                    {
                    samples.length > 0 && <div className="col">
                        <SampleViz {...scatterplotProps} chr={selectedChr} initialSelectedSample={samples[0]} />
                    </div>
                    }
                    {
                    samples.length > 1 && <div className="col">
                        <SampleViz {...scatterplotProps} chr={selectedChr} initialSelectedSample={samples[1]} />
                    </div>
                    }
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
