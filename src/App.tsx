import React from "react";
import parse from "csv-parse";
import _, { last, sample } from "lodash";
import { ChromosomeInterval } from "./model/ChromosomeInterval";
import { GenomicBin, GenomicBinHelpers} from "./model/GenomicBin";
import { DataWarehouse } from "./model/DataWarehouse";
import { CurveState, CurvePickStatus, INITIAL_CURVE_STATE } from "./model/CurveState";

import { SampleViz2D } from "./components/SampleViz2D";
import { SampleViz1D } from "./components/SampleViz1D";
import {SampleViz} from "./components/SampleViz";
import { GenomicLocationInput } from "./components/GenomicLocationInput";
import { CurveManager } from "./components/CurveManager";
import spinner from "./loading-small.gif";
import {HuePicker} from "react-color";
import "./App.css";
import { cpuUsage } from "process";
import { MergedGenomicBin } from "./model/BinMerger";
import DataTable from "react-data-table-component"
import {ClusterTable} from "./components/ClusterTable";
import {CSV} from "./components/CSVLink"
import * as d3 from "d3";
import {Genome} from "./model/Genome";

import { BrowserRouter as Router, Switch, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import "./App.css";

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

// const CLUSTER_COLORS = [
//     "#18c61a", "#9817ff", "#d31911", "#24b7f1", "#fa82ce", "#736c31", "#1263e2", "#18c199", "#ed990a", 
//     "#f2917f", "#7b637c", "#a8b311", "#a438c0", "#d00d5e", "#1e7b1d", "#05767b", "#aaa1f9", "#a5aea1", 
//     "#a75312", "#026eb8", "#94b665", "#91529e", "#caa74f", "#c90392", "#a84e5d", "#6a4cf1", "#1ac463", 
//     "#d89ab1", "#3c764d", "#2dbdc5", "#fb78fa", "#a6a9cd", "#c1383d", "#8b614e", "#73be38", "#ff8d52", 
//     "#cea37e", "#b53c7e", "#656d61", "#436f90", "#5e7304", "#82b792", "#fb88a3", "#dd8df2", "#6a5cc0", 
//     "#d098d5", "#ac15dc", "#a4543b", "#76b4cc", "#6963a4", "#8e620d", "#77adf8", "#c9a918", "#99537d", 
//     "#acaf7d", "#7850d5", "#ae3a9f", "#68bd74", "#e09d60", "#1069cd", "#d50438", "#c03d17", "#79b6af", 
//     "#517430", "#db9b94", "#095cf8", "#b1b045", "#c0a4a9", "#bc01c1", "#906033", "#e49c3f", "#8e4db9", 
//     "#bb3a64", "#cb1478", "#776b09", "#94b743", "#763eff", "#1a7a3e", "#617046", "#915c62", "#ec8dc0", 
//     "#ba22ac", "#437461", "#913ddc", "#4bbda8", "#b4482e", "#a9a5e3", "#78b1e2", "#855b91", "#fc902e", 
//     "#2cbada", "#64c104", "#8abb0b", "#3cc441", "#68be5c", "#b9ac66", "#11c37b", "#5e6c7c", "#686690", 
//     "#f09469", "#66bc8a", "#736a4e", "#776768", "#c43251", "#c1a0c6", "#a2acb7", "#457713", "#f87fe4", 
//     "#c1a693", "#b14949", "#487175", "#eb929c", "#e18fdc", "#326ea4", "#147861", "#9b584f", "#dba103", 
//     "#cca567", "#5464b9", "#c797f2", "#94b57c", "#d3084b", "#e09b7e", "#cd2729", "#525ae2", "#a04c8a", 
//     "#bb308b", "#1d7489", "#a82bce", "#ee9751", "#a94b70", "#9432ea", "#9c5a24", "#9cb193", "#816722", 
//     "#826540", "#fb8b8e", "#696f20", "#33b4ff", "#d3a434", "#7b5aab", "#5b5bd4", "#c22c71", "#ca2f01", 
//     "#34792f", "#81bb4c", "#3064d4", "#80ba6d", "#4f68ab", "#b6a5bf", "#8a5d76", "#dc9f50", "#935e41", 
//     "#a94491", "#147953", "#8cb1be", "#41c183", "#acb05e", "#53c153", "#54c06c", "#7b618a", "#05bfb6", 
//     "#fb85b9", "#eb90b1", "#9a5669", "#9f42b3", "#c0ab3c", "#2f56ff", "#d09fa2", "#60b9be", "#b64708", 
//     "#8b4ac7", "#bcaa76", "#a905ea", "#bd9fdc", "#dd94c6", "#e786f9", "#6eb9a0", "#5d6a89", "#ca2844", 
//     "#93acdb", "#724ee3", "#bc2998", "#2b6abf", "#9e5a01", "#11776e", "#9441ce", "#98b722", "#ff8a78", 
//     "#d70123", "#8f2df8", "#a1b26d", "#8cb4a1", "#aead8c", "#0d7396", "#d7a06f", "#467082", "#b93f57", 
//     "#5e7138", "#a0b455", "#d0a18c", "#bea885", "#75685b", "#59705b", "#a4b43b", "#a046a5", "#80b983", 
//     "#ab5025", "#b5af25", "#91aaea", "#54699d", "#8554b2", "#bc9dea", "#e9958d", "#7456c7", "#04c553", 
//     "#e09f2a", "#53c22b", "#f09637", "#ae35ac", "#604aff", "#c62a5e", "#4c753f", "#c3372f", "#706c40", 
//     "#e39a70", "#8b5b83", "#856162", "#97a6f8", "#96b0b0", "#86ba5d", "#4d63c6", "#9a5a33", "#b34171", 
//     "#94548a", "#cc2737", "#ee87dc", "#e78ece", "#527168", "#a75149", "#b3483c", "#716776", "#666b6f", 
//     "#bcac57", "#5ac141", "#78be07", "#4bc401", "#4cb9cc", "#58b6db", "#fd8f11", "#7d5c9e", "#85b0d4", 
//     "#b2a4d4", "#b6471e", "#14c0a7", "#8440ea", "#37746e", "#4c7454", "#b426ba", "#38783e", "#b14563", 
//     "#926023", "#b50dce", "#b1a9a9", "#54741f", "#61baaf", "#c92f19", "#a54b7d", "#83670b", "#9f2fdc", 
//     "#bf2e7e", "#fd8d62", "#6ebe4b", "#85bb39", "#d29abf", "#cb9fb0", "#dd99a2", "#5354f1", "#c40b9f", 
//     "#107b2f", "#ce116b", "#81626f", "#4cbe99", "#766b21", "#7f6732", "#9aadc5", "#c81885", "#7f664e", 
//     "#bb3e4a", "#78b5be", "#6b6f06", "#56b4f1", "#cf96e3", "#736297", "#9e555c", "#fb9041", "#86b874", 
//     "#f87cf2", "#68bb99", "#31775a", "#49bcb6", "#90b855", "#7aba7c", "#fb8d71", "#4f7603", "#d01c3e", 
//     "#cca19b", "#676f31", "#696883", "#c59ecd", "#f686c7", "#81645b", "#6c6e38", "#5ab2f8", "#ef8fa3", 
//     "#b0ae6e", "#73b2db", "#8d5f5c", "#f78b9c", "#b0ab9a", "#ca2064", "#a84784", "#786a39", "#bf3d28", 
//     "#bd3e36", "#527346", "#467637", "#7543f8", "#9050ac", "#516b97", "#bcad15", "#636e54", "#16729d", 
//     "#8847d5", "#985d0f", "#9d20f1", "#9744c0", "#b14c14", "#65b7c5", "#c7a933", "#e294b8", "#e793aa", 
//     "#f788b2", "#4ac264", "#17c28a", "#4bbf8a", "#a04998", "#b13e8b", "#d5a258", "#d7a247", "#935970", 
//     "#5266b2", "#7abb65", "#4e61cd", "#417727", "#6e5eb2", "#cca73d", "#716d16", "#6e6d29", "#86652a", 
//     "#a1b09a", "#a0572c", "#965d2c", "#863bf1", "#9338e3", "#a54e6a", "#f3945a", "#9d35d5", "#aa22d5", 
//     "#a632c7", "#b43891", "#975191", "#5257ea", "#315ee9", "#6755dc", "#dc9d77", "#d89e85", "#e59886", 
//     "#e89777", "#cd1e51", "#9ab384", "#ca94f9", "#c4a86e", "#c7a75f", "#975b48", "#356dab", "#ea8bd5", 
//     "#dd92d5", "#e48ce4", "#566f6f", "#b74443", "#ad4d42", "#ab4d50", "#3e7801", "#3a791d", "#7b6847", 
//     "#5fbe83", "#ec9761", "#3dc273", "#76bd54", "#49c34a", "#80bc20", "#6dbf1e"
//     ]
const CLUSTER_COLORS = [
    "#3957ff", "#d3fe14", "#c9080a", "#fec7f8", "#0b7b3e", "#0bf0e9", "#c203c8", "#fd9b39", "#888593", 
    "#906407", "#98ba7f", "#fe6794", "#10b0ff", "#ac7bff", "#fee7c0", "#964c63", "#1da49c", "#0ad811", 
    "#bbd9fd", "#fe6cfe", "#297192", "#d1a09c", "#78579e", "#81ffad", "#739400", "#ca6949", "#d9bf01", 
    "#646a58", "#d5097e", "#bb73a9", "#ccf6e9", "#9cb4b6", "#b6a7d4", "#9e8c62", "#6e83c8", "#01af64", 
    "#a71afd", "#cfe589", "#d4ccd1", "#fd4109", "#bf8f0e", "#2f786e", "#4ed1a5", "#d8bb7d", "#a54509", 
    "#6a9276", "#a4777a", "#fc12c9", "#606f15", "#3cc4d9", "#f31c4e", "#73616f", "#f097c6", "#fc8772", 
    "#92a6fe", "#875b44", "#699ab3", "#94bc19", "#7d5bf0", "#d24dfe", "#c85b74", "#68ff57", "#b62347", 
    "#994b91", "#646b8c", "#977ab4", "#d694fd", "#c4d5b5", "#fdc4bd", "#1cae05", "#7bd972", "#e9700a", 
    "#d08f5d", "#8bb9e1", "#fde945", "#a29d98", "#1682fb", "#9ad9e0", "#d6cafe", "#8d8328", "#b091a7", 
    "#647579", "#1f8d11", "#e7eafd", "#b9660b", "#a4a644", "#fec24c", "#b1168c", "#188cc1", "#7ab297", 
    "#4468ae", "#c949a6", "#d48295", "#eb6dc2", "#d5b0cb", "#ff9ffb", "#fdb082", "#af4d44", "#a759c4", 
    "#a9e03a", "#0d906b", "#9ee3bd", "#5b8846", "#0d8995", "#f25c58", "#70ae4f", "#847f74", "#9094bb", 
    "#ffe2f1", "#a67149", "#936c8e", "#d04907", "#c3b8a6", "#cef8c4", "#7a9293", "#fda2ab", "#2ef6c5", 
    "#807242", "#cb94cc", "#b6bdd0", "#b5c75d", "#fde189", "#b7ff80", "#fa2d8e", "#839a5f", "#28c2b5", 
    "#e5e9e1", "#bc79d8", "#7ed8fe", "#9f20c3", "#4f7a5b", "#f511fd", "#09c959", "#bcd0ce", "#8685fd", 
    "#98fcff", "#afbff9", "#6d69b4", "#5f99fd", "#aaa87e", "#b59dfb", "#5d809d", "#d9a742", "#ac5c86", 
    "#9468d5", "#a4a2b2", "#b1376e", "#d43f3d", "#05a9d1", "#c38375", "#24b58e", "#6eabaf", "#66bf7f", 
    "#92cbbb", "#ddb1ee", "#1be895", "#c7ecf9", "#a6baa6", "#8045cd", "#5f70f1", "#a9d796", "#ce62cb", 
    "#0e954d", "#a97d2f", "#fcb8d3", "#9bfee3", "#4e8d84", "#fc6d3f", "#7b9fd4", "#8c6165", "#72805e", 
    "#d53762", "#f00a1b", "#de5c97", "#8ea28b", "#fccd95", "#ba9c57", "#b79a82", "#7c5a82", "#7d7ca4", 
    "#958ad6", "#cd8126", "#bdb0b7", "#10e0f8", "#dccc69", "#d6de0f", "#616d3d", "#985a25", "#30c7fd", 
    "#0aeb65", "#e3cdb4", "#bd1bee", "#ad665d", "#d77070", "#8ea5b8", "#5b5ad0", "#76655e", "#598100", 
    "#86757e", "#5ea068", "#a590b8", "#c1a707", "#85c0cd", "#e2cde9", "#dcd79c", "#d8a882", "#b256f9", 
    "#b13323", "#519b3b", "#dd80de", "#f1884b", "#74b2fe", "#a0acd2", "#d199b0", "#f68392", "#8ccaa0", 
    "#64d6cb", "#e0f86a", "#42707a", "#75671b", "#796e87", "#6d8075", "#9b8a8d", "#f04c71", "#61bd29", 
    "#bcc18f", "#fecd0f", "#1e7ac9", "#927261", "#dc27cf", "#979605", "#ec9c88", "#8c48a3", "#676769", 
    "#546e64", "#8f63a2", "#b35b2d", "#7b8ca2", "#b87188", "#4a9bda", "#eb7dab", "#f6a602", "#cab3fe", 
    "#ddb8bb", "#107959", "#885973", "#5e858e", "#b15bad", "#e107a7", "#2f9dad", "#4b9e83", "#b992dc", 
    "#6bb0cb", "#bdb363", "#ccd6e4", "#a3ee94", "#9ef718", "#fbe1d9", "#a428a5", "#93514c", "#487434", 
    "#e8f1b6", "#d00938", "#fb50e1", "#fa85e1", "#7cd40a", "#f1ade1", "#b1485d", "#7f76d6", "#d186b3", 
    "#90c25e", "#b8c813", "#a8c9de", "#7d30fe", "#815f2d", "#737f3b", "#c84486", "#946cfe", "#e55432", 
    "#a88674", "#c17a47", "#b98b91", "#fc4bb3", "#da7f5f", "#df920b", "#b7bbba", "#99e6d9", "#a36170", 
    "#c742d8", "#947f9d", "#a37d93", "#889072", "#9b924c", "#23b4bc", "#e6a25f", "#86df9c", "#a7da6c", 
    "#3fee03", "#eec9d8", "#aafdcb", "#7b9139", "#92979c", "#72788a", "#994cff", "#c85956", "#7baa1a", 
    "#de72fe", "#c7bad8", "#85ebfe", "#6e6089", "#9b4d31", "#297a1d", "#9052c0", "#5c75a5", "#698eba", 
    "#d46222", "#6da095", "#b483bb", "#04d183", "#9bcdfe", "#2ffe8c", "#9d4279", "#c909aa", "#826cae"]
export let genome : Genome;

function parseGenomicBins(data: string, applyLog: boolean, applyClustering: boolean): Promise<GenomicBin[]> {
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
            
            let start = Number(parsed[0].START);
            let end = 0;
            let lastChr = parsed[0]["#CHR"];
            let chrNameLength: any = [];

            for (const bin of parsed) {
                if(!applyClustering) {
                    bin.CLUSTER = -1;
                }

                //if(applyLog) { 
                bin.logRD = Math.log2(bin.RD);
                //}

                if(lastChr !==  bin["#CHR"]) {
                    chrNameLength.push({name: lastChr, length: (end - start)})
                    start = Number(bin.START);
                    lastChr = bin["#CHR"]
                }
                end = Number(bin.END);
                bin.BAF = 0.5 - bin.BAF;
            }
            
            
            chrNameLength.push({name: lastChr, length: (end - start)})
            const sortedChrNameLength = chrNameLength.sort((a: any, b : any) => {
                return a.name.localeCompare(b.name, undefined, {
                    numeric: true,
                    sensitivity: 'base'
                })
            })

            genome = new Genome(chrNameLength);
            resolve(parsed);
        });
    })
}

/**
 * Possible states of processing input data.
 */
enum ProcessingStatus {
    /** No data input (yet) */
    none,

    /** Reading data into memory */
    readingFile,

    /** Reformatting, aggregating, converting, or otherwise analyzing data. */
    processing,

    /** The results of data processing step are available. */
    done,

    /** An error happened during any step. */
    error
}

interface State {
    /** Current status of reading/processing input data */
    processingStatus: ProcessingStatus;

    /** Indexed data */
    indexedData: DataWarehouse;
    
    /** Current genomic location that the user has selected.  Null if no such location. */
    hoveredLocation: ChromosomeInterval | null;

    /** Name of the chromosome selected for detailed viewing.  Empty string if no chromosome is selected. */
    selectedChr: string;

    selectedCluster: string;

    /**  */
    curveState: CurveState;

    invertAxis: boolean;

    sampleAmount: number;

    color: string;

    colors: string[];

    assignCluster: boolean;

    assigned: boolean;
    
    applyLog: boolean;

    applyClustering: boolean;

    inputError: boolean;
    
    value: string;

    updatedBins: boolean;

    selectedSample: string;

    displayMode: DisplayMode;

    showComponents: boolean[];

    sidebar: boolean;

    chosenFile: string;
}


export enum DisplayMode {
    zoom,
    select,
    boxzoom
};

/**
 * Top-level container.
 * 
 * @author Silas Hsu
 */

export class App extends React.Component<{}, State> {
    
    constructor(props: {}) {
        super(props);
        
        this.state = {
            processingStatus: ProcessingStatus.none,
            indexedData: new DataWarehouse([]),
            hoveredLocation: null,
            selectedChr: DataWarehouse.ALL_CHRS_KEY,
            selectedCluster: DataWarehouse.ALL_CLUSTERS_KEY,
            curveState: INITIAL_CURVE_STATE,
            invertAxis: false,
            sampleAmount: 1,
            showComponents: [true],
            color: 'blue',
            colors:  CLUSTER_COLORS,
            assignCluster: false,
            assigned: false,
            applyLog: false,
            applyClustering: false,
            inputError: false,
            value: "0",
            updatedBins: false,
            selectedSample: "",
            displayMode: DisplayMode.select,  
            sidebar:  true,
            chosenFile: ""
        };

        this.handleFileChoosen = this.handleFileChoosen.bind(this);
        this.handleChrSelected = this.handleChrSelected.bind(this);
        this.handleClusterSelected = this.handleClusterSelected.bind(this);
        this.handleLocationHovered = _.throttle(this.handleLocationHovered.bind(this), 50);
        this.handleNewCurveState = _.throttle(this.handleNewCurveState.bind(this), 20);
        this.handleAxisInvert = this.handleAxisInvert.bind(this);
        this.handleAddSampleClick = this.handleAddSampleClick.bind(this);
        this.handleColorChange = this.handleColorChange.bind(this);
        this.handleAssignCluster = this.handleAssignCluster.bind(this);
        this.handleCallBack = this.handleCallBack.bind(this);
        this.handleClusterAssignmentInput = this.handleClusterAssignmentInput.bind(this);
        this.updateBrushedBins = this.updateBrushedBins.bind(this);
        this.onClusterRowsChange = this.onClusterRowsChange.bind(this);
        this.onClusterColorChange = this.onClusterColorChange.bind(this);
        this.onSelectedSample = this.onSelectedSample.bind(this);
        this.handleRemovePlot = this.handleRemovePlot.bind(this);
        this.setDisplayMode = this.setDisplayMode.bind(this);
        this.onSideBarChange = this.onSideBarChange.bind(this);

        let self = this;
        d3.select("body").on("keypress", function(){
            if (d3.event.key == "z") {
                self.setState({displayMode: DisplayMode.zoom})
            } else if (d3.event.key == "b") {
                self.setState({displayMode: DisplayMode.select})
            } else if(d3.event.key == "a") {
                self.setState({displayMode: DisplayMode.boxzoom})
            } else if(d3.event.keyCode == 32) {
                self.onSideBarChange(!self.state.sidebar);
            }
        })

        d3.select("body").on("keydown", function(){
            if (self.state.displayMode === DisplayMode.zoom && d3.event.key == "Shift") {
                self.setState({displayMode: DisplayMode.boxzoom})
            }
        })

        d3.select("body").on("keyup", function(){
            if (self.state.displayMode === DisplayMode.boxzoom && d3.event.key == "Shift") {
                self.setState({displayMode: DisplayMode.zoom})
            }
        })
    }

    async handleFileChoosen(event: React.ChangeEvent<HTMLInputElement>, applyClustering: boolean) {
        const files = event.target.files;
        if (!files || !files[0]) {
            return;
        }

        this.setState({chosenFile: files[0].name})
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
        let indexedData = null;
        try {
            const parsed = await parseGenomicBins(contents, this.state.applyLog, applyClustering);
            indexedData = new DataWarehouse(parsed);
        } catch (error) {
            console.error(error);
            this.setState({processingStatus: ProcessingStatus.error});
            return;
        }

        this.setState({
            indexedData: indexedData,
            processingStatus: ProcessingStatus.done
        });
    }

    handleChrSelected(event: React.ChangeEvent<HTMLSelectElement>) {
        this.setState({selectedChr: event.target.value});
        this.state.indexedData.setChrFilter(event.target.value);
    }

    handleClusterSelected(event: React.ChangeEvent<HTMLSelectElement>) {
        this.setState({selectedCluster: event.target.value});
        this.state.indexedData.setClusterFilters([event.target.value]);
    }

    handleLocationHovered(location: ChromosomeInterval | null) {
        if (!location) {
            this.setState({hoveredLocation: null});
            return;
        }

        //const binSize = this.state.indexedData.guessBinSize();
        this.setState({hoveredLocation: location}); //.endsRoundedToMultiple(binSize)
    }

    handleClusterAssignmentInput(event: any) {
        this.setState({value: event.target.value})
    }

    handleCallBack(selectedCluster: string | number) {
        this.state.indexedData.updateCluster(Number(selectedCluster));
        this.setState({assignCluster: false});
    }

    updateBrushedBins(brushedBins: MergedGenomicBin[]) {
        this.state.indexedData.setbrushedBins(brushedBins);
        this.setState({updatedBins: true});
    }

    handleAxisInvert() {
        this.setState({invertAxis: !this.state.invertAxis});
    }

    handleAddSampleClick() {
        const newShowComponents = this.state.showComponents.concat([true]);
        this.setState({showComponents: newShowComponents})
        this.setState({sampleAmount: this.state.sampleAmount + 1});
    }

    handleRemovePlot(plotId: number) {
        let newShowComponents = [...this.state.showComponents];
        newShowComponents.splice(plotId, 1);
        this.setState({showComponents: newShowComponents});
        this.setState({sampleAmount: this.state.sampleAmount - 1});
    }

    handleAssignCluster() {
        this.setState({assignCluster: !this.state.assignCluster});
    }

    handleColorChange(color : any) {
        this.setState({color: color.hex});
    }

    handleNewCurveState(newState: Partial<CurveState>) {
        this.setState(prevState => {
            const nextCurveState = {
                ...prevState.curveState,
                ...newState
            };
    
            if (prevState.curveState.pickStatus === CurvePickStatus.pickingNormalLocation) {
                nextCurveState.state1 = null;
                nextCurveState.state2 = null;
            }
            return {curveState: nextCurveState};
        });
    }

    getStatusCaption() {
        switch (this.state.processingStatus) {
            case ProcessingStatus.readingFile:
                return <div>Reading file... <img src={spinner} alt="Loading" /></div>;
            case ProcessingStatus.processing:
                return <div>Processing data... <img src={spinner} alt="Loading" /></div>;
            case ProcessingStatus.error:
                return "ERROR";
            case ProcessingStatus.none:
            case ProcessingStatus.done:
            default:
                return "";
        }
    }

    toggleLog() {
        this.setState({
            applyLog: !this.state.applyLog
        });
    }

    toggleClustering() {
        this.setState({
            applyClustering: !this.state.applyClustering
        });
    }

    onClusterRowsChange(state: any) {
        this.state.indexedData.setClusterFilters( state.selectedRows.map((d:any)  => String(d.key)));
        this.setState({indexedData: this.state.indexedData});
    }

    onClusterColorChange(colors: string[]) {
        let newColors = [];
        for(const col of colors) {
            newColors.push(col);
        }
        this.setState({colors: newColors});
    }

    onSelectedSample(selectedSample : any) {
        this.setState({selectedSample : selectedSample});
    }

    setDisplayMode(mode: DisplayMode) {
        this.setState({displayMode: mode});
    }

    onSideBarChange(sidebar: boolean) {
        this.setState({sidebar: sidebar});
    }

    render() {
        const {indexedData, selectedChr, selectedCluster, hoveredLocation, curveState, invertAxis, color, assignCluster, updatedBins, value, sampleAmount} = this.state;
        const samples = indexedData.getSampleList();
        const brushedBins = indexedData.getBrushedBins();
        const allData = indexedData.getAllRecords();
        //indexedData.setRDFilter([1.0, 1.5]);
        let mainUI = null;
        let clusterTableData = indexedData.getClusterTableInfo();
        let chrOptions : JSX.Element[] = [<option key={DataWarehouse.ALL_CHRS_KEY} value={DataWarehouse.ALL_CHRS_KEY}>ALL</option>];
        if (this.state.processingStatus === ProcessingStatus.done && !indexedData.isEmpty()) {
            const clusterTableData = indexedData.getClusterTableInfo();
            // clusterTableData.sort((a : any, b : any) => {
            //     if (a.value > b.value) return -1;
            //     if (a.value < b.value) return 1;
            //     return 0;
            // })
            const scatterplotProps = {
                data: indexedData,
                hoveredLocation: hoveredLocation || undefined,
                curveState,
                onNewCurveState: this.handleNewCurveState,
                onLocationHovered: this.handleLocationHovered,
                invertAxis,
                chr: selectedChr,
                cluster: selectedCluster,
                customColor: color,
                colors: this.state.colors,
                assignCluster,
                onBrushedBinsUpdated: this.updateBrushedBins,
                parentCallBack: this.handleCallBack,
                brushedBins: brushedBins,
                updatedBins: updatedBins,
                onSelectedSample: this.onSelectedSample,
                selectedSample: this.state.selectedSample,
                dispMode: this.state.displayMode,
                onRemovePlot: this.handleRemovePlot,
                onAddSample: this.handleAddSampleClick,
                clusterTableData: clusterTableData,
                applyLog: this.state.applyLog,
                onClusterSelected: this.handleClusterSelected
            };

            chrOptions = indexedData.getAllChromosomes().map(chr => <option key={chr} value={chr}>{chr}</option>);
            chrOptions.push(<option key={DataWarehouse.ALL_CHRS_KEY} value={DataWarehouse.ALL_CHRS_KEY}>ALL</option>);

            const clusterOptions = indexedData.getAllClusters().map((clusterName : string) =>
                <option key={clusterName} value={clusterName}>{clusterName}</option>
            );
            clusterOptions.push(<option key={DataWarehouse.ALL_CLUSTERS_KEY} value={DataWarehouse.ALL_CLUSTERS_KEY}>ALL</option>);

            mainUI = (
                <div id="grid-container">
                    
                    <div className="App-global-controls">
                    </div>
                    
                    <div className="sampleviz-wrapper">
                            {_.times(sampleAmount, i => samples.length > i 
                            && this.state.showComponents[i] 
                            && <SampleViz 
                                    {...scatterplotProps} 
                                    initialSelectedSample={samples[i]} 
                                    plotId={i}
                                ></SampleViz>)}
                    </div>
                </div>);
        }

        const status = this.getStatusCaption();
        
        return <div className="container-fluid">
            <div>
                <Sidebar 
                    selectedChr={selectedChr} 
                    onChrSelected={this.handleChrSelected} 
                    chrOptions={chrOptions}
                    onAddSample={this.handleAddSampleClick}
                    onAssignCluster={this.handleAssignCluster}
                    tableData={clusterTableData}
                    onClusterRowsChange={this.onClusterRowsChange}
                    onClusterColorChange={this.onClusterColorChange}
                    currentClusterFilters={indexedData.getFilteredClusters()}
                    handleClusterAssignmentInput={this.handleClusterAssignmentInput}
                    value={value}
                    setDisplayMode={this.setDisplayMode}
                    currentDisplayMode={this.state.displayMode} 
                    colors={this.state.colors}
                    onSidebarChange={this.onSideBarChange}
                    data={allData}
                    onFileChosen={this.handleFileChoosen}
                    chosenFile={this.state.chosenFile}
                    show={this.state.sidebar}
                />
            </div>

            <div className={this.state.sidebar ? "marginContent" : "content"}>
                <div className="App-title-bar">
                    <h1>CNA-Viz</h1>
                    {/* {samples.length === 0 &&
                        <span className="App-file-upload-explanation">To get started, choose a .bbc file:</span>
                    } */}
                        
                    {/* <input type="file" id="fileUpload" onChange={this.handleFileChoosen} /> */}
                    <span className="App-CheckBox-explanation">Apply log to RD: </span>
                    <input type="checkbox" style={{marginRight: 2}} onClick={this.toggleLog.bind(this)} />
                    {/* <span className="App-CheckBox-explanation">Apply provided clustering: </span>
                    <input type="checkbox" onClick={this.toggleClustering.bind(this)}  /> */}
                </div>
                {status && <div className="App-status-pane">{status}</div>}
                {mainUI}
            </div>
            
        </div>;
        
    }
}
