import React from "react";
import _ from "lodash";
import parseCsv from "csv-parse";
import { Scatterplot } from "./components/Scatterplot";
import { GenomicBin } from "./GenomicBin";

import "./App.css";

enum ProcessingStatus {
    none,
    readingFile,
    processing,
    error
}

interface AppState {
    dataBySample: {[sample: string]: GenomicBin[]};
    processingStatus: ProcessingStatus
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

export class App extends React.Component<{}, AppState> {
    constructor(props: {}) {
        super(props);
        this.state = {
            dataBySample: {},
            processingStatus: ProcessingStatus.none
        };
        this.handleFileChoosen = this.handleFileChoosen.bind(this);
    }

    async handleFileChoosen(event: React.ChangeEvent<HTMLInputElement>) {
        const files = event.target.files;
        if (!files || !files[0]) {
            return;
        }

        this.setState({processingStatus: ProcessingStatus.readingFile});
        const contents = await getFileContentsAsString(files[0]);

        this.setState({processingStatus: ProcessingStatus.processing});
        parseCsv(contents, {
            cast: true,
            columns: true,
            delimiter: "\t",
            skip_empty_lines: true,
        }, (err, parsed) => {
            if (err) {
                this.setState({processingStatus: ProcessingStatus.error});
                return;
            }

            const groupedBySample = _.groupBy(parsed as GenomicBin[], "SAMPLE");
            this.setState({
                dataBySample: groupedBySample,
                processingStatus: ProcessingStatus.none
            });
        });
    }

    getStatusCaption() {
        switch (this.state.processingStatus) {
            case ProcessingStatus.readingFile:
                return "Reading file...";
            case ProcessingStatus.processing:
                return "Processing data...";
            case ProcessingStatus.error:
            case ProcessingStatus.none:
            default:
                return "";
        }
    }

    render() {
        const data = this.state.dataBySample;
        return <div>
            <h1>CNA-Viz</h1>
            <div>
                Choose .bbc file: <input type="file" id="fileUpload" onChange={this.handleFileChoosen} />
            </div>
            <div>
                {this.getStatusCaption()}
            </div>
            {Object.keys(data).length > 0 && <Scatterplot dataBySample={data} />}
        </div>;
    }
}
