import React from "react";
import parse from "csv-parse";
import { ChromosomeInterval } from "./ChromosomeInterval";
import { ScatterplotContainer } from "./components/ScatterplotContainer";
import { GenomicBin, GenomicBinHelpers, IndexedGenomicBins } from "./GenomicBin";

import "./App.css";

enum ProcessingStatus {
    none,
    readingFile,
    processing,
    error
}

interface AppState {
    processingStatus: ProcessingStatus;
    indexedData: IndexedGenomicBins;
    hoveredLocation: ChromosomeInterval | null;
}

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

export class App extends React.Component<{}, AppState> {
    constructor(props: {}) {
        super(props);
        this.state = {
            processingStatus: ProcessingStatus.none,
            indexedData: {},
            hoveredLocation: null
        };
        this.handleFileChoosen = this.handleFileChoosen.bind(this);
        this.handleRecordHovered = this.handleRecordHovered.bind(this);
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
            processingStatus: ProcessingStatus.none
        });
    }

    handleRecordHovered(record: GenomicBin | null) {
        if (!record) {
            this.setState({hoveredLocation: null});
            return;
        }
        this.setState({hoveredLocation: GenomicBinHelpers.toChromosomeInterval(record)});
    }

    getStatusCaption() {
        switch (this.state.processingStatus) {
            case ProcessingStatus.readingFile:
                return "Reading file...";
            case ProcessingStatus.processing:
                return "Processing data...";
            case ProcessingStatus.error:
                return "ERROR";
            case ProcessingStatus.none:
            default:
                return "";
        }
    }

    render() {
        const {indexedData, hoveredLocation} = this.state;
        return <div>
            <h1>CNA-Viz</h1>
            <div>
                Choose .bbc file: <input type="file" id="fileUpload" onChange={this.handleFileChoosen} />
            </div>
            <div>{this.getStatusCaption()}</div>
            {
            Object.keys(indexedData).length > 0 && <ScatterplotContainer
                indexedData={indexedData}
                hoveredLocation={hoveredLocation || undefined}
                onRecordHovered={this.handleRecordHovered}
            />
            }
        </div>;
    }
}
