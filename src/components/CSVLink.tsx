import {CSVLink, CSVDownload} from "react-csv"
import React from "react"
import { GenomicBin} from "../model/GenomicBin";

interface Props {
    data : GenomicBin[];
}

export class CSV extends React.Component<Props> {
    constructor(props: Props) {
        super(props);
    }

    shouldComponentUpdate(nextProps: Props) {
        return this.props["data"] !== nextProps["data"];
    }

    render() {
        
        const separator = "\t"
        const enclosing_char = "'";
        return <CSVLink data={this.props.data} separator={separator} filename={"ClusteredBins.txt"} style={{marginLeft: 100}}> Download to CSV</CSVLink>
        //<CSVDownload data={this.props.data} filename={"ClusteredBins.txt"} separator={separator}></CSVDownload> //
    }
}
