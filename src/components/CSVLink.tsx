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

    render() {
        
        const separator = "\t"
        const enclosing_char = "'";
        let csvButton = <div>
            
            <CSVLink 
                data={this.props.data.map(d => ({"#CHR": d["#CHR"], START: d.START, END: d.END, SAMPLE: d.SAMPLE, 
                                                RD: d.RD, "#SNPS":d["#SNPS"], COV: d.COV, ALPHA: d.ALPHA, BETA: d.BETA, 
                                                BAF: d.BAF, CLUSTER: d.CLUSTER, cn_normal: d.cn_normal, u_normal: d.u_normal, 
                                                cn_clone1: d.cn_clone1, u_clone1: d.u_clone1, cn_clone2: d.cn_clone2,  u_clone2: d.u_clone2 }))} 
                separator={separator}
                filename="ClusteredBins.txt"
                className="hidden"
                ref={(r:any) => this.csvLink = r}
                target="_blank" />
            <button type="button" onClick={(e) => this.csvLink.link.click()}>Export to CSV</button>
        </div>
        return csvButton;
    }
}
