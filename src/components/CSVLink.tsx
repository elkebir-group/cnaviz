import {CSVLink, CSVDownload} from "react-csv"
import React from "react"
import { GenomicBin} from "../model/GenomicBin";

interface Props {
    data : GenomicBin[];
}

export class CSV extends React.Component<Props> {
    private csvLink: any;
    constructor(props: Props) {
        super(props);
        this.csvLink = React.createRef();
    }

    shouldComponentUpdate(nextProps: Props) {
        return this.props["data"] !== nextProps["data"];
    }
    // fetchData = () => {
    //     fetch('/mydata/'+this.props.id).then(data => {
    //         console.log(data);
    //       this.setState({ data:data }, () => {
    //         // click the CSVLink component to trigger the CSV download
    //         this.csvLink.current.link.click()
    //       })
    //     })
    //   }

    render() {
        
        const separator = "\t"
        const enclosing_char = "'";
        let csvButton = <div>
            
            <CSVLink 
                data={this.props.data} 
                separator={separator}
                filename="ClusteredBins.txt"
                className="hidden"
                ref={(r:any) => this.csvLink = r}
                target="_blank" />
            <button type="button" onClick={(e) => this.csvLink.link.click()}>Download</button>
        </div>
        return csvButton;
        // return <CSVLink data={this.props.data} separator={separator} filename={"ClusteredBins.txt"} style={{marginLeft: 100}}> Download to CSV</CSVLink>
        //<CSVDownload data={this.props.data} filename={"ClusteredBins.txt"} separator={separator}></CSVDownload> //
    }
}
