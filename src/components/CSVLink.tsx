import {CSVLink} from "react-csv"
import React from "react"

interface Props {
    data : any;
}

export class CSV extends React.Component<Props> {
    constructor(props: Props) {
        super(props);
    }

    shouldComponentUpdate(nextProps: Props) {
        return this.props["data"] !== nextProps["data"];
    }

    render() {
        return <CSVLink data={this.props.data} filename={"ClusteredBins"} style={{marginLeft: 100}}> Download to CSV</CSVLink>
    }
}
