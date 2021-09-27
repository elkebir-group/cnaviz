// import {CSVLink} from "react-csv"
import { head } from "lodash";
import React from "react"
import { GenomicBin} from "../model/GenomicBin";
import {toCSV} from "../util";
import spinner from "../loading-small.gif";
const fs = require('fs')
interface Props {
    data : readonly GenomicBin[];
    logData: any[];
    fileName: string;
}

interface State {
    loading: boolean;
}

function convertToTsv(data: readonly GenomicBin[]): Promise<string> {
    return new Promise((resolve, reject) => {
        let keys = Object.keys(data[0]);
            
        const headings = keys.slice(0, keys.length-3);//.join('\t');

        // iterate over the data
        const rows : string = toCSV(data, headings, "\t", " ");
        let csvContent : any = rows;
        resolve(csvContent);
    })  
}

export class CSV extends React.Component<Props, State> {
    private csvLink: any;
    constructor(props: Props) {
        super(props);
        this.csvLink = React.createRef();
        this.state = {
            loading: false
        }
        this.handleFileDownload = this.handleFileDownload.bind(this);
    }

    // shouldComponentUpdate(nextProps: Props) {
    //     return this.props["data"] !== nextProps["data"];
    // }
    async handleFileDownload() {
        this.setState({loading: true})
        //let promise = new Promise((resolve, reject) => {
            //setTimeout(() => resolve("I am a done promise!"), 3000)

        let csvContent = "";
        try {
            csvContent = await convertToTsv(this.props.data);
        } catch(error) {
            console.error(error);
            return;
        }
        
        var hiddenElement = document.createElement('a');  
        hiddenElement.href = 'data:text/tab-separated-values,' + encodeURIComponent(csvContent);  
        
        //provide the name for the CSV file to be downloaded 
        const fileName = this.props.fileName;
        let removeDateTime = fileName.split("_");
        console.log(removeDateTime);

        let nameExt = removeDateTime[0].split("."); 
        console.log("nameExt: " + nameExt);
        let newFileName = "";
        for(let i = 0; i < nameExt.length-1; i++) {
            newFileName += nameExt[i];
        }
        console.log("newFileName: " + newFileName);
        const currentDate = new Date();
        let date = (currentDate.getMonth() + 1) + "-" + currentDate.getDate() + "-" + currentDate.getFullYear()
        let time = currentDate.getHours() + "-" + currentDate.getMinutes() + "-" + currentDate.getSeconds();
        hiddenElement.download = newFileName + "_" + date + "_" + time;
        hiddenElement.click();
        
        let actions = [];
        for(let action of this.props.logData) {
            actions.push(action.action);
        }
        let logFileContent = "";
        logFileContent = actions.join("\n");
        var hiddenElement2 = document.createElement('a');  
        hiddenElement2.href = 'data:text/plain,' + encodeURIComponent(logFileContent);  
        const fileName2 = this.props.fileName;
        //let nameExt2 = fileName.split("."); 
        hiddenElement2.download = newFileName + "-" + "log" + "_" + date + "_" + time;  
        hiddenElement2.click();


        this.setState({loading: false})
            //this.setState({loading: false})
            //this.setState({loading: false})
        //});
        
        //let result = await promise

        //alert(result);
    }

    render() {
        // console.log(this.state.loading);
        const separator = "\t"
        const enclosing_char = "";
        function download(filename : string, textInput  : string) {
            var element = document.createElement('a');
            element.setAttribute('href','data:text/plain;charset=utf-8, ' + encodeURIComponent(textInput));
            element.setAttribute('download', filename);
            document.body.appendChild(element);
            element.click();
            //document.body.removeChild(element);
        }

        let self = this;
        const toggleLoader = () => {
            if (!this.state.loading) {
                console.log("Test");
              this.setState({ loading: true });
            } else {
              this.setState({ loading: false });
            }
          };

        let csvButton = <div>
                
            <button type="button" onClick={this.handleFileDownload}>Export</button>
            {this.state.loading && <div>Reading file... <img src={spinner} alt="Loading" /></div>}
        </div>
        return csvButton;
    }
}
