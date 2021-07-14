import {CSVLink} from "react-csv"
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
        return <CSVLink data={this.props.data} separator={separator} filename={"ClusteredBins.txt"} style={{marginLeft: 100}}> Download to CSV</CSVLink>
    }
}
