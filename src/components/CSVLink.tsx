import {CSVLink, CSVDownload} from "react-csv"
import React from "react"
import { GenomicBin} from "../model/GenomicBin";

interface Props {
    data : readonly GenomicBin[];
    fileName: string;
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
        const enclosing_char = "";
        
        let csvButton = <div>
            
            {/* <CSVLink 
                data={this.props.data.map(d => ({"#CHR": d["#CHR"], START: d.START, END: d.END, SAMPLE: d.SAMPLE, 
                                                RD: d.RD, "#SNPS":d["#SNPS"], COV: d.COV, ALPHA: d.ALPHA, BETA: d.BETA, 
                                                BAF: d.BAF, CLUSTER: d.CLUSTER, cn_normal: d.cn_normal, u_normal: d.u_normal, 
                                                cn_clone1: d.cn_clone1, u_clone1: d.u_clone1, cn_clone2: d.cn_clone2,  u_clone2: d.u_clone2 }))} 
                separator={separator}
                enclosingCharacter={enclosing_char}
                filename="ClusteredBins.txt"
                className="hidden"
                ref={(r:any) => this.csvLink = r}
                target="_blank" /> */}
            <button type="button" onClick={(e) => {
                let keys = Object.keys(this.props.data[0]);
                
                const headings = keys.slice(0, keys.length-3).join('\t');

                // iterate over the data
                const rows : string = this.props.data.reduce((acc : any, c: any) => {
                
                    // for each row object get its values and add tabs between them
                    // then add them as a new array to the outgoing array
                    let rowVals = Object.values(c);
                    
                    return acc.concat([rowVals.slice(0, rowVals.length-3).join('\t')]);
        
                // finally joining each row with a line break
                }, []).join('\n');
                //console.log("Headings: ", headings);
                let csvContent : any = headings + "\n" + rows;
                // var encodedUri = encodeURI(csvContent);
                // console.log("Encoded URI: ", encodedUri)
                // var link = document.createElement("a");
                // link.setAttribute("href", encodedUri);
                // link.setAttribute("download", "my_data.csv");
                // document.body.appendChild(link); // Required for FF

                // link.click(); // This will download the data file named "my_data.csv".
                // console.log("Completed Download")
                var hiddenElement = document.createElement('a');  
                hiddenElement.href = 'data:text/plain,' + encodeURIComponent(csvContent);  
                //hiddenElement.target = '_blank';
                
                //provide the name for the CSV file to be downloaded 
                const fileName = this.props.fileName;
                let nameExt = fileName.split("."); 
                const currentDate = new Date();
                let date = (currentDate.getMonth() + 1) + "-" + currentDate.getDay() + "-" + currentDate.getFullYear()
                let time = currentDate.getHours() + "-" + currentDate.getMinutes() + "-" + currentDate.getSeconds();
                hiddenElement.download = nameExt[0] + "_" + date + "_" + time;  
                hiddenElement.click();  
                //this.csvLink.link.click()
            }}>Export</button>
        </div>
        return csvButton;
    }
}
