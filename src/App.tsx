import React from "react";
import parseCsvSync from "csv-parse/lib/sync";
import { Scatterplot } from "./components/Scatterplot";
import { GenomicBin } from "./GenomicBin";

import "./App.css";

interface AppState {
    data: GenomicBin[];
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
            data: []
        };
        this.handleFileChoosen = this.handleFileChoosen.bind(this);
    }

    async handleFileChoosen(event: React.ChangeEvent<HTMLInputElement>) {
        const files = event.target.files;
        if (!files || !files[0]) {
            return;
        }
        const contents = await getFileContentsAsString(files[0]);
        const parsed = parseCsvSync(contents, {
            cast: true,
            columns: true,
            delimiter: "\t",
            skip_empty_lines: true,
        }) as GenomicBin[];
        this.setState({data: parsed});
    }

    render() {
        const data = this.state.data;
        return <div>
            <h1>CNA-Viz</h1>
            <div>
                Choose .bbc file: <input type="file" id="fileUpload" onChange={this.handleFileChoosen} />
            </div>
            {data.length > 0 && <Scatterplot data={this.state.data} />}
        </div>;
    }
}
