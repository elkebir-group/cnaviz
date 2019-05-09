import React from "react";
import parse from "csv-parse";
import _ from "lodash";
import { SampleViz } from "./components/SampleViz";
import { GenomicLocationInput } from "./components/GenomicLocationInput";
import { ChromosomeInterval } from "./model/ChromosomeInterval";
import { GenomicBin, GenomicBinHelpers, IndexedGenomicBins } from "./model/GenomicBin";

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
    indexedData: IndexedGenomicBins;
    hoveredLocation: ChromosomeInterval | null;
}

export class App extends React.Component<{}, State> {
    constructor(props: {}) {
        super(props);
        this.state = {
            processingStatus: ProcessingStatus.none,
            indexedData: {},
            hoveredLocation: null
        };
        this.handleFileChoosen = this.handleFileChoosen.bind(this);
        this.handleLocationHovered = _.throttle(this.handleLocationHovered.bind(this), 50);
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
        let parsed = [];
        try {
            parsed = await parseGenomicBins(contents);
        } catch (error) {
            console.error(error);
            this.setState({processingStatus: ProcessingStatus.error});
            return;
        }

        this.setState({
            indexedData: GenomicBinHelpers.indexBins(parsed),
            processingStatus: ProcessingStatus.done
        });
    }

    handleLocationHovered(location: ChromosomeInterval | null) {
        if (!location) {
            this.setState({hoveredLocation: null});
            return;
        }
        const sampleDatas = Object.values(this.state.indexedData);
        const binSize = sampleDatas.length > 0 ?
            GenomicBinHelpers.estimateBinSize(sampleDatas[0].getAllRecords()) : 50000;
        this.setState({hoveredLocation: location.endsRoundedToMultiple(binSize)});
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
        const {indexedData, hoveredLocation} = this.state;
        const samples = Object.keys(indexedData);
        let mainUI = null;
        if (this.state.processingStatus === ProcessingStatus.done && samples.length > 0) {
            const scatterplotProps = {
                indexedData,
                hoveredLocation: hoveredLocation || undefined,
                onLocationHovered: this.handleLocationHovered
            };

            mainUI = <div>
                <div className="App-global-controls">
                    <GenomicLocationInput label="Highlight region: " onNewLocation={this.handleLocationHovered} />
                </div>
                <div className="row">
                    {
                    samples.length > 0 && <div className="col">
                        <SampleViz {...scatterplotProps} initialSelectedSample={samples[0]} />
                    </div>
                    }
                    {
                    samples.length > 1 && <div className="col">
                        <SampleViz {...scatterplotProps} initialSelectedSample={samples[1]} />
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
