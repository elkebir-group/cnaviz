import React from "react";
import parse from "csv-parse";
import _, { conformsTo, Dictionary, range } from "lodash";
import { ChromosomeInterval } from "./model/ChromosomeInterval";
import { GenomicBin } from "./model/GenomicBin";
import {Chromosome} from "./model/Genome";
import { DataWarehouse} from "./model/DataWarehouse";
import {SampleViz} from "./components/SampleViz";
import spinner from "./loading-small.gif";
import "./App.css";
import {LogTable} from "./components/LogTable";
import * as d3 from "d3";
import {Genome} from "./model/Genome";
import Sidebar, {SIDEBAR_WIDTH} from "./components/Sidebar";
import "./App.css";
import { ClusterTable } from "./components/ClusterTable";
import { Gene } from "./model/Gene";
import {FiX} from "react-icons/fi";
import {AiOutlineQuestionCircle} from "react-icons/ai";
import {IconContext} from "react-icons"; 
import {AnalyticsTab} from "./components/AnalyticsTab";
import {DEFAULT_PLOIDY, REQUIRED_COLS, REQUIRED_DRIVER_COLS} from "./constants";
import {Toolbox} from "./components/Toolbox";
import {Log} from "./components/LogLink";
import {FiDownload} from "react-icons/fi";

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

// Colors picked using the following tool: http://jnnnnn.github.io/category-colors-constrained.html
const CLUSTER_COLORS = [
    "#d3fe14", "#c9080a", "#fec7f8", "#0b7b3e", "#3957ff", "#0bf0e9", "#c203c8", "#fd9b39", 
    "#906407", "#98ba7f", "#fe6794", "#10b0ff", "#ac7bff", "#fee7c0", "#964c63", "#1da49c", "#0ad811", 
    "#bbd9fd", "#fe6cfe", "#d1a09c", "#78579e", "#81ffad", "#739400", "#ca6949", "#d9bf01", 
    "#646a58", "#d5097e", "#bb73a9", "#ccf6e9", "#9cb4b6", "#b6a7d4", "#9e8c62", "#6e83c8", "#01af64", 
    "#a71afd", "#cfe589", "#d4ccd1", "#fd4109", "#bf8f0e", "#2f786e", "#4ed1a5", "#d8bb7d", "#a54509", 
    "#6a9276", "#a4777a", "#fc12c9", "#606f15", "#3cc4d9", "#f31c4e", "#73616f", "#f097c6", "#fc8772", 
    "#92a6fe", "#875b44", "#699ab3", "#94bc19", "#7d5bf0", "#d24dfe", "#c85b74", "#68ff57", "#b62347", 
    "#994b91", "#646b8c", "#977ab4", "#d694fd", "#c4d5b5", "#fdc4bd", "#1cae05", "#7bd972", "#e9700a",
    "#d08f5d", "#8bb9e1", "#fde945", "#a29d98", "#1682fb", "#9ad9e0", "#d6cafe", "#8d8328", "#b091a7", 
    "#647579", "#1f8d11", "#e7eafd", "#b9660b", "#a4a644", "#fec24c", "#b1168c", "#188cc1", "#7ab297", 
    "#c949a6", "#d48295", "#eb6dc2", "#d5b0cb", "#ff9ffb", "#fdb082", "#af4d44", "#a759c4", 
    "#a9e03a", "#0d906b", "#9ee3bd", "#5b8846", "#0d8995", "#f25c58", "#70ae4f", "#847f74", "#9094bb", 
    "#ffe2f1", "#a67149", "#936c8e", "#d04907", "#c3b8a6", "#cef8c4", "#7a9293", "#fda2ab", "#2ef6c5", 
    "#807242", "#cb94cc", "#b6bdd0", "#b5c75d", "#fde189", "#b7ff80", "#fa2d8e", "#839a5f", "#28c2b5", 
    "#e5e9e1", "#bc79d8", "#7ed8fe", "#9f20c3", "#4f7a5b", "#f511fd", "#09c959", "#bcd0ce", "#8685fd", 
    "#98fcff", "#afbff9", "#6d69b4", "#aaa87e", "#b59dfb", "#d9a742", "#ac5c86", 
    "#9468d5", "#a4a2b2", "#b1376e", "#d43f3d", "#05a9d1", "#c38375", "#24b58e", "#6eabaf", "#66bf7f", 
    "#92cbbb", "#ddb1ee", "#1be895", "#c7ecf9", "#a6baa6", "#8045cd", "#a9d796", "#ce62cb", 
    "#0e954d", "#a97d2f", "#fcb8d3", "#9bfee3", "#4e8d84", "#fc6d3f", "#7b9fd4", "#8c6165", "#72805e", 
    "#d53762", "#f00a1b", "#de5c97", "#8ea28b", "#fccd95", "#ba9c57", "#b79a82", "#7c5a82", "#7d7ca4", 
    "#958ad6", "#cd8126", "#bdb0b7", "#10e0f8", "#dccc69", "#d6de0f", "#616d3d", "#985a25", "#30c7fd", 
    "#0aeb65", "#e3cdb4", "#bd1bee", "#ad665d", "#d77070", "#8ea5b8", "#76655e", "#598100", 
    "#86757e", "#5ea068", "#a590b8", "#c1a707", "#85c0cd", "#e2cde9", "#dcd79c", "#d8a882", "#b256f9",
    "#b13323", "#519b3b", "#dd80de", "#f1884b", "#74b2fe", "#a0acd2", "#d199b0", "#f68392", "#8ccaa0",
    "#64d6cb", "#e0f86a", "#75671b", "#796e87", "#6d8075", "#9b8a8d", "#f04c71", "#61bd29", 
    "#bcc18f", "#fecd0f", "#1e7ac9", "#927261", "#dc27cf", "#979605", "#ec9c88", "#8c48a3", "#676769", 
    "#546e64", "#8f63a2", "#b35b2d", "#7b8ca2", "#b87188", "#4a9bda", "#eb7dab", "#f6a602", "#cab3fe", 
    "#ddb8bb", "#107959", "#885973", "#5e858e", "#b15bad", "#e107a7", "#2f9dad", "#4b9e83", "#b992dc", 
    "#6bb0cb", "#bdb363", "#ccd6e4", "#a3ee94", "#9ef718", "#fbe1d9", "#a428a5", "#93514c", "#487434", 
    "#e8f1b6", "#d00938", "#fb50e1", "#fa85e1", "#7cd40a", "#f1ade1", "#b1485d", "#7f76d6", "#d186b3", 
    "#90c25e", "#b8c813", "#a8c9de", "#7d30fe", "#815f2d", "#737f3b", "#c84486", "#946cfe", "#e55432", 
    "#a88674", "#c17a47", "#b98b91", "#fc4bb3", "#da7f5f", "#df920b", "#b7bbba", "#99e6d9", "#a36170", 
    "#c742d8", "#947f9d", "#a37d93", "#889072", "#9b924c", "#23b4bc", "#e6a25f", "#86df9c", "#a7da6c", 
    "#3fee03", "#eec9d8", "#aafdcb", "#7b9139", "#92979c", "#72788a", "#994cff", "#c85956", "#7baa1a", 
    "#de72fe", "#c7bad8", "#85ebfe", "#6e6089", "#9b4d31", "#297a1d", "#9052c0", "#698eba", 
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


            if(parsed.length > 0) {
                for(const col of REQUIRED_COLS) {
                    if(!(col in parsed[0])) {
                        throw new Error("COLUMN: " + col + " IS MISSING FROM INPUTTED DATA");
                    }
                }
           

            
                let end = 0;
                let lastChr = parsed[0]["#CHR"];
                let chrNameLength: Chromosome[] = [];

                const rdMeans : { [sample: string] : number } = {};

                let sampleGrouped = _.groupBy(parsed, "SAMPLE");
                for(const sample in sampleGrouped) {
                    rdMeans[sample] = _.meanBy(sampleGrouped[sample], (d:GenomicBin) => d.RD)
                }

                for (const bin of parsed) {
                    if(!applyClustering || bin.CLUSTER === undefined) {
                        bin.CLUSTER = -1;
                    }

                    bin.fractional_cn = bin.RD * DEFAULT_PLOIDY / rdMeans[bin.SAMPLE]
                    bin.logRD = Math.log2(bin.RD);

                    if(lastChr !==  bin["#CHR"]) {
                        chrNameLength.push({name: lastChr, length: (end - 0)})
                        lastChr = bin["#CHR"]
                    }

                    end = Number(bin.END);
                    bin.reverseBAF = 0.5 - bin.BAF;
                }

                chrNameLength.push({name: lastChr, length: (end - 0)})

                chrNameLength.sort((a: Chromosome, b : Chromosome) => {
                    return String(a.name).localeCompare(b.name, undefined, {
                        numeric: true,
                        sensitivity: 'base'
                    })
                })

                genome = new Genome(chrNameLength);

                for (const bin of parsed) {
                    bin.genomicPosition = genome.getImplicitCoordinates(new ChromosomeInterval(bin["#CHR"], bin.START, bin.END)).start;
                }
            }
            resolve(parsed);
        });
    })
}

function parseDriverGenes(data: string, validChromosomes: string[]): Promise<Gene[]> { 
    return new Promise((resolve, reject) => {
        parse(data, {
            cast: true,
            columns: true,
            delimiter: "\t",
            skip_empty_lines: true,
            skip_lines_with_error: true
        }, (error, parsed) => {
            if (error) {
                reject(error);
                return;
            }

            if(parsed.length > 0) {
                for(const col of REQUIRED_DRIVER_COLS) {
                    if(!(col in parsed[0])) {
                        throw new Error("COLUMN: " + col + " IS MISSING FROM INPUTTED DRIVER DATA");
                    }
                }
            }
            
            const genes = [];
            const chrs = new Set<string>(validChromosomes);
            for(const gene of parsed) {
                
                const components : string[] = gene["Genome Location"].split(":");
                
                if(chrs.has(components[0])) {
                    const start_end = components[1].split("-");
                    let interval : ChromosomeInterval = new ChromosomeInterval(components[0], Number(start_end[0]), Number(start_end[1]));
                    gene.location = interval;
                    genes.push(gene);
                }
            }

            resolve(genes);
        });
    })
}

/**
 * Possible states of processing input data.
 */
export enum ProcessingStatus {
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

    processingStatus: ProcessingStatus; //  Current status of reading/processing input data
   
    indexedData: DataWarehouse; // Holds all the genomic bins

    hoveredLocation: ChromosomeInterval | null; // Current genomic location that the user has selected.  Null if no such location.

    pointsize: number; // size of the points on linear and scatter plots

    selectedChr: string;  // Name of the chromosome selected for detailed viewing.  Empty string if no chromosome is selected.

    selectedColor: string; // Name of selected cluster color. Should default to that blue.  gc

    absorbThresh_rdr: Map<String, number>; // Threshold value to join unassigned bins into the existing. gc 

    absorbThresh_baf: Map<String, number>; // Threshold value to join unassigned bins into the existing. gc 

    mergeThresh_rdr: Map<String, number>; // Threshold value to join unassigned bins into the existing. gc 

    mergeThresh_baf: Map<String, number>; // Threshold value to join unassigned bins into the existing. gc 

    showTetraploid: boolean; // show gridlines for purity and plodiy corresponding to tetraploid? gc

    selectedCluster: string; // cluster selected to be assigned to

    invertAxis: boolean;

    mergeValues: number[]; 

    sampleAmount: number;

    color: string;

    colors: string[];

    assignCluster: boolean;

    assigned: boolean;
    
    applyLog: boolean;

    applyClustering: boolean;
    
    value: string;

    updatedBins: boolean;

    selectedSample: string;

    displayMode: DisplayMode;

    sidebar: boolean;

    chosenFile: string;

    showLinearPlot: boolean;

    showScatterPlot: boolean;

    showDirections: boolean;

    showAbsorbBins: boolean; 

    showLog: boolean;

    showCentroidTable: boolean;

    showCentroids: boolean;

    syncScales: boolean;

    scales: {xScale: [number, number] | null, yScale: [number, number] | null};

    driverGenes: Gene[] | null;

    showSilhouettes: ProcessingStatus;

    silhouettes: {
        cluster: number;
        avg: number;
    }[];

    showPurityPloidyInputs: boolean;
    
    samplesShown: string[];

    samplesNotShown: string[];
}


export enum DisplayMode {
    zoom,
    select,
    boxzoom,
    erase
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
            pointsize: 3, // gc 
            selectedCluster: DataWarehouse.ALL_CLUSTERS_KEY,
            selectedColor: "black", // gc: when set to red, this changes
            // absorbThresh_rdr: 2.5, // gc
            // absorbThresh_baf: 0.5, // gc
            absorbThresh_rdr: new Map(), // gc
            absorbThresh_baf: new Map(), // gc
            mergeThresh_rdr: new Map(), // gc
            mergeThresh_baf: new Map(), // gc
            mergeValues: [], // gc
            invertAxis: false,
            sampleAmount: 1,
            color: 'blue',
            colors:  CLUSTER_COLORS,
            assignCluster: false,
            assigned: false,
            applyLog: false,
            applyClustering: false,
            value: "0",
            updatedBins: false,
            selectedSample: "",
            displayMode: DisplayMode.zoom,  
            sidebar:  true,
            chosenFile: "",
            showLinearPlot: true,
            showScatterPlot: true,
            showDirections: false,
            showAbsorbBins: false, 
            showLog: false,
            showCentroidTable: false,
            showCentroids: false,
            syncScales: false,
            scales: {xScale: null, yScale: null},
            driverGenes: null,
            showSilhouettes: ProcessingStatus.none,
            silhouettes: [],
            showPurityPloidyInputs: false,
            showTetraploid: true, // gc
            samplesShown: [],
            samplesNotShown: []
        };

        this.handleFileChoosen = this.handleFileChoosen.bind(this);
        this.handleDemoFileInput = this.handleDemoFileInput.bind(this);
        this.handleDriverFileChosen = this.handleDriverFileChosen.bind(this);
        this.handleDemoDrivers = this.handleDemoDrivers.bind(this);
        this.handleChrSelected = this.handleChrSelected.bind(this);
        this.handleslider = this.handleslider.bind(this); 
        // this.pointslider = this.pointslider.bind(this);
        this.handleColorSelection = this.handleColorSelection.bind(this); // gc
        this.handleAbsorbThresh_rdr = this.handleAbsorbThresh_rdr.bind(this); // gc
        this.handleAbsorbThresh_baf = this.handleAbsorbThresh_baf.bind(this); // gc
        // this.handleMergeThresh_rdr = this.handleMergeThresh_rdr.bind(this); // gc
        // this.handleMergeThresh_baf = this.handleMergeThresh_baf.bind(this); // gc

        this.handleClusterSelected = this.handleClusterSelected.bind(this);
        this.handleLocationHovered = _.throttle(this.handleLocationHovered.bind(this), 50);
        this.handleAxisInvert = this.handleAxisInvert.bind(this);
        this.handleAddSampleClick = this.handleAddSampleClick.bind(this);
        this.handleColorChange = this.handleColorChange.bind(this);
        this.handleAssignCluster = this.handleAssignCluster.bind(this);
        this.handleCallBack = this.handleCallBack.bind(this);
        this.handleClusterAssignmentInput = this.handleClusterAssignmentInput.bind(this);
        this.updateBrushedBins = this.updateBrushedBins.bind(this);
        this.onClusterRowsChange = this.onClusterRowsChange.bind(this);
        this.onClusterColorChange = this.onClusterColorChange.bind(this);
        this.onClusterRowsToChange = this.onClusterRowsToChange.bind(this);
        this.onClusterColorToChange = this.onClusterColorToChange.bind(this);
        this.onClusterRowsFromChange = this.onClusterRowsFromChange.bind(this);
        this.onClusterColorFromChange = this.onClusterColorFromChange.bind(this);
        this.onSelectedSample = this.onSelectedSample.bind(this);
        this.handleRemovePlot = this.handleRemovePlot.bind(this);
        this.setDisplayMode = this.setDisplayMode.bind(this);
        this.onSideBarChange = this.onSideBarChange.bind(this);
        this.toggleLog = this.toggleLog.bind(this);
        this.onToggleLinear = this.onToggleLinear.bind(this); 
        this.onToggleScatter = this.onToggleScatter.bind(this); 
        this.onToggleSync = this.onToggleSync.bind(this);
        this.goBackToPreviousCluster = this.goBackToPreviousCluster.bind(this);
        this.handleZoom = this.handleZoom.bind(this);
        this.onToggleShowCentroids = this.onToggleShowCentroids.bind(this);
        this.onToggleSilhoutteBarPlot = this.onToggleSilhoutteBarPlot.bind(this);
        this.onToggleDirections = this.onToggleDirections.bind(this);
        this.onToggleShowAbsorbBins = this.onToggleShowAbsorbBins.bind(this);
        this.onToggleShowCentroidTable = this.onToggleShowCentroidTable.bind(this);
        this.onTogglePreviousActionLog = this.onTogglePreviousActionLog.bind(this);
        this.onClearClustering = this.onClearClustering.bind(this);
        this.setProcessingStatus = this.setProcessingStatus.bind(this);
        this.onTogglePurityPloidy = this.onTogglePurityPloidy.bind(this);
        this.changeDisplayedSamples = this.changeDisplayedSamples.bind(this);
        this.onExport = this.onExport.bind(this);

        this.onShowTetraploid = this.onShowTetraploid.bind(this);


        let self = this;
        d3.select("body").on("keypress", function(){
            if (d3.event.key === "p") {
                self.setState({displayMode: DisplayMode.zoom});
            } else if (d3.event.key === "z") {
                self.setState({displayMode: DisplayMode.boxzoom}); 
            } else if (d3.event.key === "b") {
                self.setState({displayMode: DisplayMode.select});
            } else if(d3.event.key === "e") {
                self.setState({displayMode: DisplayMode.erase});
            } else if(d3.event.keyCode === 32) {
                self.onSideBarChange(!self.state.sidebar);
            } else if(d3.event.key === "l") {
                self.setState({showLog: !self.state.showLog});
            } else if(d3.event.key === "c") {
                self.setState({showCentroidTable: !self.state.showCentroidTable});
            } else if(d3.event.key === "s") {
                self.onToggleSilhoutteBarPlot();
            } else if(d3.event.key === "a") {
                self.onToggleShowAbsorbBins(); 
            }
            // else if(d3.event.key === "t") {
            //     self.state.indexedData.calculateCopyNumbers();
            // }
        })

        d3.select("body").on("keydown", function() {
            if (self.state.displayMode === DisplayMode.zoom && d3.event.key === "Shift") {
                self.setState({displayMode: DisplayMode.boxzoom})
            } else if(d3.event.key === "/" || d3.event.key === "?") {
                self.setState({showDirections: true})
            } else if((self.state.displayMode === DisplayMode.zoom ||  self.state.displayMode === DisplayMode.erase) && (d3.event.key === "Meta" || d3.event.key === "Control")) {
                self.setState({displayMode: DisplayMode.select})
            } else if((self.state.displayMode === DisplayMode.zoom ||  self.state.displayMode === DisplayMode.select) && d3.event.key === "Alt") {
                self.setState({displayMode: DisplayMode.erase})
            } 
        })

        d3.select("body").on("keyup", function(){
            if (self.state.displayMode === DisplayMode.boxzoom && d3.event.key === "Shift") {
                self.setState({displayMode: DisplayMode.zoom})
            } else if(d3.event.key === "/" || d3.event.key === "?") {
                self.setState({showDirections: false})
            } else if(self.state.displayMode === DisplayMode.select && (d3.event.key === "Meta" || d3.event.key === "Control")) {
                self.setState({displayMode: DisplayMode.zoom})
            } else if(self.state.displayMode === DisplayMode.erase && d3.event.key === "Alt") {
                self.setState({displayMode: DisplayMode.zoom})
            }
        });
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

        const samples = indexedData.getSampleList();
        const initalDisplayedSamples = [];
        const initalNotDisplayedSamples = [];
        for(let i = 0; i < samples.length; i++) {
            if(i < this.state.sampleAmount) {
                initalDisplayedSamples.push(samples[i]);
            } else {
                initalNotDisplayedSamples.push(samples[i]);
            }
        }

        this.setState({
            indexedData: indexedData,
            processingStatus: ProcessingStatus.done,
            samplesShown: initalDisplayedSamples,
            samplesNotShown: initalNotDisplayedSamples
        });

    }

    async handleDemoFileInput(applyClustering: boolean) {
        this.setState({chosenFile: "a12.tsv"})
        this.setState({processingStatus: ProcessingStatus.readingFile});
        fetch("https://raw.githubusercontent.com/elkebir-group/cnaviz/master/data/demo/a12.tsv")
            .then(r => r.text())
            .then(text => {
                this.setState({processingStatus: ProcessingStatus.processing});

                parseGenomicBins(text, this.state.applyLog, applyClustering)
                .then(parsed => {
                    let indexedData = new DataWarehouse(parsed);
                    const samples = indexedData.getSampleList();
                    const initalDisplayedSamples = [];
                    const initalNotDisplayedSamples = [];
                    for(let i = 0; i < samples.length; i++) {
                        if(i < this.state.sampleAmount) {
                            initalDisplayedSamples.push(samples[i]);
                        } else {
                            initalNotDisplayedSamples.push(samples[i]);
                        }
                    }

                    
                    this.setState({
                        indexedData: indexedData,
                        processingStatus: ProcessingStatus.done,
                        samplesShown: initalDisplayedSamples,
                        samplesNotShown: initalNotDisplayedSamples
                    });
                })
                .catch(error => {
                    console.error(error);
                    this.setState({processingStatus: ProcessingStatus.error});
                    return;
                }) 
            });
    }

    setProcessingStatus(status: ProcessingStatus) {
        this.setState({processingStatus: status});
    }

    async handleDriverFileChosen(event: React.ChangeEvent<HTMLInputElement>) {
        const files = event.target.files;
        if (!files || !files[0]) {
            return;
        }

        let contents = "";
        try {
            
            contents = await getFileContentsAsString(files[0]);
        } catch (error) {
            console.error(error);
            return;
        }
        
        let driverGenes = null;
        try {
            const parsed = await parseDriverGenes(contents, this.state.indexedData.getAllChromosomes());
            driverGenes = parsed;
            

        } catch (error) {
            console.error(error);
            return;
        }
        this.setState({driverGenes: driverGenes});
    }

    async handleDemoDrivers() {
        fetch("https://raw.githubusercontent.com/elkebir-group/cnaviz/master/data/demo/drivers.tsv")
        .then(r => r.text())
        .then(text => {
            parseDriverGenes(text, this.state.indexedData.getAllChromosomes())
            .then(parsed => {
               this.setState({driverGenes: parsed});
            })
            .catch(error => {
                console.error(error);
                return;
            }) 
        });
    }

    // pointslider(value: number) {
    //     this.setState({pointsize: value}); 
    //     // return `${value}??C`;
    //   }

    handleChrSelected(event: React.ChangeEvent<HTMLSelectElement>) {
        this.setState({selectedChr: event.target.value});
        this.state.indexedData.setChrFilter(event.target.value);
    }

    handleslider(event: any, val: number) {
        console.log("Pointsize updated to", val);
        this.setState({pointsize: val});
    }

    handleColorSelection(event: React.ChangeEvent<HTMLSelectElement>) { // gc
        this.setState({selectedColor: event.target.value});
    }

 // const newthresh = Number(event.target.value);
 //                    if(newthresh <= 0 && newPloidy >= 5) {
 //                        this.onUpdateThresh(newthresh);
 //                    }
    handleAbsorbThresh_rdr(sample: String, event: React.ChangeEvent<HTMLInputElement>) { // gc
        console.log("inside handleMergeThresh_rdr() with", sample, "updated value to", Number(event.target.value)); 
        this.state.absorbThresh_rdr.set(sample, Number(event.target.value)); 
    }
    handleAbsorbThresh_baf(sample: String, event: React.ChangeEvent<HTMLInputElement>) { // gc
        console.log("inside handleMergeThresh_baf() with", sample, "updated value to", Number(event.target.value)); 
        this.state.absorbThresh_baf.set(sample, Number(event.target.value)); 
    }

    // handleAbsorbThresh_rdr(event: React.ChangeEvent<HTMLInputElement>) { // gc
    //     // if event.target.value <= 0 && event.target.value >= 5 ... 
    //     this.setState({absorbThresh_rdr: Number(event.target.value)}); 
    //     // this.state.indexedData.absorbUnassigned( Number(event.target.value) );
    // }
    // handleAbsorbThresh_baf(event: React.ChangeEvent<HTMLInputElement>) { // gc
    //     // if event.target.value <= 0 && event.target.value >= 5 ... 
    //     this.setState({absorbThresh_baf: Number(event.target.value)}); 
    //     // this.state.indexedData.absorbUnassigned( Number(event.target.value) );
    // }

    handleMergeThresh_rdr(sample: String, event: React.ChangeEvent<HTMLInputElement>) { // gc
        console.log("inside handleMergeThresh_rdr() with", sample, "updated value to", Number(event.target.value)); 
        this.state.mergeThresh_rdr.set(sample, Number(event.target.value)); 
    }
    handleMergeThresh_baf(sample: String, event: React.ChangeEvent<HTMLInputElement>) { // gc
        console.log("inside handleMergeThresh_baf() with", sample, "updated value to", Number(event.target.value)); 
        this.state.mergeThresh_baf.set(sample, Number(event.target.value)); 
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

        this.setState({hoveredLocation: location});
    }

    handleClusterAssignmentInput(event: any) {
        this.setState({value: event.target.value})
    }

    handleCallBack(selectedCluster: string | number) {
        this.state.indexedData.updateCluster(Number(selectedCluster));
        this.setState({assignCluster: false});
        this.state.indexedData.setChrFilter(this.state.selectedChr);
    }

    updateBrushedBins(brushedBins: GenomicBin[]) {
        this.state.indexedData.setbrushedBins(brushedBins);
        this.setState({updatedBins: true});
    }

    handleAxisInvert() {
        this.setState({invertAxis: !this.state.invertAxis});
    }

    changeDisplayedSamples(newSample: string, oldSample: string) {
        const samplesShown = this.state.samplesShown;
        for(let i = 0; i < samplesShown.length; i++) {
            if(samplesShown[i] === oldSample) {
                samplesShown[i] = newSample;
            }
        }

        let samplesNotShown = this.state.samplesNotShown;
        samplesNotShown = samplesNotShown.filter(sample => sample !== newSample)
        samplesNotShown.push(oldSample);

        this.setState({sampleAmount: this.state.sampleAmount, samplesShown: samplesShown, samplesNotShown: samplesNotShown});
    }

    handleAddSampleClick() {
        const newSample = this.state.samplesNotShown[0]; //this.state.indexedData.getSampleList()[this.state.sampleAmount];

        const samplesShown = this.state.samplesShown;
        samplesShown.push(newSample);

        let samplesNotShown = this.state.samplesNotShown;
        samplesNotShown = samplesNotShown.filter(sample => sample !== newSample)

        this.setState({sampleAmount: this.state.sampleAmount + 1, samplesShown: samplesShown, samplesNotShown: samplesNotShown});
    }

    handleRemovePlot(sample: string) {
        const samplesShown = this.state.samplesShown;
        const removedSample = samplesShown[samplesShown.length-1];
        samplesShown.pop();

        const samplesNotShown = this.state.samplesNotShown;
        samplesNotShown.push(removedSample);

        this.setState({sampleAmount: this.state.sampleAmount - 1});
    }

    handleAssignCluster() {
        this.setState({assignCluster: !this.state.assignCluster});
    }

    handleColorChange(color : any) {
        this.setState({color: color.hex});
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

    onToggleDirections() {
        this.setState({showDirections: !this.state.showDirections});
    }

    absorbBinsAll() {
        console.log("Absorb bins!");
        console.log("Merge bins..."); 
        this.setState({processingStatus: ProcessingStatus.processing});

        // let s = this.state.indexedData.getSampleList()[0]; 
        this.setState({processingStatus: ProcessingStatus.processing});
        let from_set = this.state.indexedData.getFilteredFromClusters();
        let to_set = this.state.indexedData.getFilteredToClusters(); 

        let ythresh = this.state.absorbThresh_rdr;
        let xthresh = this.state.absorbThresh_baf; 
        console.log(ythresh); 
        console.log(xthresh); 

        let is_continue : boolean = true; 
        for (let i = 0; i < this.state.indexedData.getSampleList().length; i++) {
            let sample = this.state.indexedData.getSampleList()[i]; 
            let x_thr = xthresh.get(sample); 
            let y_thr = ythresh.get(sample);
            console.log("sample", sample, "x_thr", x_thr, "y_thr", y_thr); 
            if (Number(x_thr) <= 0 || x_thr === undefined || Number(y_thr) <= 0 || y_thr === undefined) {
                is_continue = false; 
            }
        }
        if (is_continue) {
            // iterate through all bins in from
            let new_reassign_group = this.state.indexedData.absorbBins(from_set, to_set, xthresh, ythresh);

            let mergestring = '';
            // build mergestring
            for (var clusterName of Array.from(new_reassign_group.keys())) {
                mergestring += String(clusterName); // + ": ["; 
                // console.log(clusterName, "assigning bins:", Array.from(new_reassign_group.get(clusterName))); 
                // for (var toCluster of Array.from(new_reassign_group.get(clusterName))) {
                //     mergestring += String(toCluster) + ",";
                // }
                mergestring += ","; 
            }

            let confirmAction = window.confirm("Are you sure you want to absorb bins into: " + mergestring);
            if (confirmAction) {
                alert("Bins absorbed.");
                this.state.indexedData.assignAbsorb(new_reassign_group); 
            } else {
                alert("Action canceled, bins not absorbed.");
            }  
        } else {
            window.confirm("Please use a threshold > 0 for all samples.");
        }  
        this.setState({processingStatus: ProcessingStatus.done});
    }

    // mergeBins(sample: String) {
    //     console.log("Merge bins..."); 
    //     this.setState({processingStatus: ProcessingStatus.processing});
    //     for(let i = 0; i < this.state.indexedData.getSampleList().length; i++) {
    //         let s = this.state.indexedData.getSampleList()[i]; 
    //         if (sample === s) {
    //             let ythresh = this.state.mergeThresh_rdr.get(sample); // mergeThresh_rdr
    //             let xthresh = this.state.mergeThresh_baf.get(sample);
    //             let new_reassign_group = this.state.indexedData.mergeBins(s, Number(xthresh), Number(ythresh));
    //             // window.prompt('Are you sure?', 'Yes');
    //             let mergestring = '\n';
    //             // build mergestring
    //             for (var clusterName of Array.from(new_reassign_group.keys())) {
    //                 mergestring += String(clusterName) + ": ["; 
    //                 for (var toCluster of Array.from(new_reassign_group.get(clusterName))) {
    //                     mergestring += String(toCluster) + ",";
    //                 }
    //                 mergestring += "]\n"; 
    //             }

    //             let confirmAction = window.confirm("Are you sure you want to merge the following bins?" + mergestring);
    //             if (confirmAction) {
    //                 alert("Clusters merged.");
    //                 this.state.indexedData.assignMerge(s, new_reassign_group); 
    //             } else {
    //                 alert("Action canceled, clusters not merged.");
    //             }
    //         }
    //     }
    //     this.setState({processingStatus: ProcessingStatus.done});
    // }

    mergeBinsAll() {
        console.log("Merge bins..."); 
        this.setState({processingStatus: ProcessingStatus.processing});

        let s = this.state.indexedData.getSampleList()[0]; 
        let new_reassign_group = this.state.indexedData.mergeBinsAll(s, this.state.mergeThresh_rdr, this.state.mergeThresh_baf);
        let mergestring = '\n';
        // build mergestring
        for (var clusterName of Array.from(new_reassign_group.keys())) {
            mergestring += String(clusterName) + ": ["; 
            for (var toCluster of Array.from(new_reassign_group.get(clusterName))) {
                mergestring += String(toCluster) + ",";
            }
            mergestring += "]\n"; 
        }

        let confirmAction = window.confirm("Are you sure you want to merge the following bins?" + mergestring);
        if (confirmAction) {
            alert("Clusters merged.");
            this.state.indexedData.assignMerge(s, new_reassign_group); 
        } else {
            alert("Action canceled, clusters not merged.");
        }            
        this.setState({processingStatus: ProcessingStatus.done});
    }

    onToggleShowAbsorbBins() {
        this.setState({showAbsorbBins: !this.state.showAbsorbBins});
    }

    onShowTetraploid() {
        console.log("ShowTetraplod", this.state.showTetraploid); 
        this.setState({showTetraploid: !this.state.showTetraploid});
    }

    toggleLog() {
        if(this.state.applyLog) {
            this.state.indexedData.setDataKeyType("RD");
            this.state.indexedData.recalculateCentroids("RD");
        } else {
            this.state.indexedData.setDataKeyType("logRD");
            this.state.indexedData.recalculateCentroids("logRD");
        }
        
        this.setState({
            applyLog: !this.state.applyLog
        });
        this.state.indexedData.setShouldRecalculatesilhouettes(true);
        
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

    onClusterRowsToChange(state: any) { // gc
        this.state.indexedData.setClusterFiltersTo( state.selectedRows.map((d:any)  => String(d.key)));
        this.setState({indexedData: this.state.indexedData});
    }

    onClusterRowsFromChange(state: any) {// gc
        this.state.indexedData.setClusterFiltersFrom( state.selectedRows.map((d:any)  => String(d.key)));
        this.setState({indexedData: this.state.indexedData});
    }

    onClusterColorChange(colors: string[]) {
        let newColors = [];
        for(const col of colors) {
            newColors.push(col);
        }
        this.setState({colors: newColors});
    }

    onClusterColorToChange(colors: string[]) {// gc
        let newColors = [];
        for(const col of colors) {
            newColors.push(col);
        }
        this.setState({colors: newColors});
    }
    onClusterColorFromChange(colors: string[]) {// gc
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

    onToggleScatter(){
        this.setState({showScatterPlot: !this.state.showScatterPlot});
    }

    onToggleLinear(){
        this.setState({showLinearPlot: !this.state.showLinearPlot});
    }

    onToggleSync() {
        this.setState({syncScales: !this.state.syncScales});
    }

    onToggleShowCentroids() {
        this.setState({showCentroids: !this.state.showCentroids});
    }

    onToggleShowCentroidTable() {
        this.setState({showCentroidTable: !this.state.showCentroidTable});
    }

    goBackToPreviousCluster() {
        this.state.indexedData.undoClusterUpdate();
        this.setState({indexedData: this.state.indexedData});
    }

    handleZoom(newScales: any) {
        this.setState({scales: newScales});
    }

    onTogglePreviousActionLog() {
        this.setState({showLog: !this.state.showLog});
    }

    onClearClustering() {
        this.state.indexedData.clearClustering();
        this.setState({indexedData: this.state.indexedData});
    }

    onExport() {
        this.state.indexedData.calculateCopyNumbers();
    }

    onTogglePurityPloidy() {
        if(this.state.showPurityPloidyInputs) {
            this.state.indexedData.setDataKeyType("RD");
        } else {
            this.state.indexedData.setDataKeyType("fractional_cn");
        }

        this.setState({showPurityPloidyInputs: !this.state.showPurityPloidyInputs});
    }

    async onToggleSilhoutteBarPlot() {
        this.setState({processingStatus: ProcessingStatus.processing});
        if(this.state.showSilhouettes === ProcessingStatus.none) {
            this.setState({showSilhouettes: ProcessingStatus.processing});
            this.state.indexedData.recalculatesilhouettes(this.state.applyLog)
            .then((data: {cluster: number, avg: number}[] | undefined) => {
                if(data !== undefined) {
                    this.setState({silhouettes: data});
                    this.setState({showSilhouettes: ProcessingStatus.done});
                }
            });
        } else {
            this.setState({showSilhouettes: ProcessingStatus.none});
        }
    
        this.setState({processingStatus: ProcessingStatus.done});
    }

    render() {
        const {indexedData, selectedChr, selectedCluster, showTetraploid, hoveredLocation, invertAxis, selectedColor, assignCluster, updatedBins, value, sampleAmount} = this.state; // gc 
        const samplesDisplayed = this.state.samplesShown;
        const samplesShown = new Set<string>(samplesDisplayed);
        const brushedBins = indexedData.getBrushedBins();
        const allData = indexedData.getAllRecords();
        let mainUI = null;
        let visualizeMerge = null; 
        let visualizeAbsorb = null; 
        // let mergeItems = null; 
        let clusterTableData = indexedData.getClusterTableInfo();
        let clusterTableData2 = indexedData.getClusterTableInfo2();
        let clusterTableData3 = indexedData.getClusterTableInfo3();
        let chrOptions : JSX.Element[] = [<option key={DataWarehouse.ALL_CHRS_KEY} value={DataWarehouse.ALL_CHRS_KEY}>ALL</option>]; 
        let actions = indexedData.getActions();

        if (this.state.processingStatus === ProcessingStatus.done && !indexedData.isEmpty()) {
            const clusterTableData = indexedData.getClusterTableInfo();
            const clusterTableData2 = indexedData.getClusterTableInfo2();
            const clusterTableData3 = indexedData.getClusterTableInfo3();

            // console.log("Before passing to scatterplotProps", this.state.pointsize);
            const scatterplotProps = {
                pointsize: this.state.pointsize, 
                data: indexedData,
                hoveredLocation: hoveredLocation || undefined,
                onLocationHovered: this.handleLocationHovered,
                invertAxis,
                chr: selectedChr,
                cluster: selectedCluster,
                customColor: selectedColor, // gc?
                showTetraploid: showTetraploid, // gc
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
                onChangeSample: this.changeDisplayedSamples,
                clusterTableData: clusterTableData,
                clusterTableData2: clusterTableData,
                clusterTableData3: clusterTableData,
                applyLog: this.state.applyLog,
                onClusterSelected: this.handleClusterSelected,
                onUndoClick: this.goBackToPreviousCluster,
                showCentroids: this.state.showCentroids,
                driverGenes: this.state.driverGenes,
            };

            const sortAlphaNum = (a : string, b:string) => a.localeCompare(b, 'en', { numeric: true })

            chrOptions = indexedData.getAllChromosomes().sort(sortAlphaNum).map(chr => <option key={chr} value={chr}>{chr}</option>);
            chrOptions.push(<option key={DataWarehouse.ALL_CHRS_KEY} value={DataWarehouse.ALL_CHRS_KEY}>ALL</option>);

            const clusterOptions = indexedData.getAllClusters().map((clusterName : string) =>
                <option key={clusterName} value={clusterName}>{clusterName}</option>
            );
            clusterOptions.push(<option key={DataWarehouse.ALL_CLUSTERS_KEY} value={DataWarehouse.ALL_CLUSTERS_KEY}>ALL</option>);

            mainUI = (
                <div id="grid-container">
                    
                    <div className="sampleviz-wrapper-row">
                            {_.times(sampleAmount, i => samplesDisplayed.length > i 
                            && <SampleViz 
                                    key={i}
                                    {...scatterplotProps} 
                                    initialSelectedSample={samplesDisplayed[i]} 
                                    plotId={i}
                                    showLinearPlot={this.state.showLinearPlot}
                                    showScatterPlot={this.state.showScatterPlot}
                                    sampleAmount={sampleAmount}
                                    syncScales={this.state.syncScales}
                                    handleZoom={this.handleZoom}
                                    scales={this.state.scales}
                                    showPurityPloidyInputs = {this.state.showPurityPloidyInputs}
                                    samplesShown={samplesShown}
                                ></SampleViz>)}
                            
                    </div>
                </div>);

            visualizeMerge = <div className="grid-container">
                <div className="App-row-contents">
                    Set Merge Thresholds:
                </div>
                <div className="App-row-contents">
                    {this.state.indexedData.getSampleList().map( sample => 
                        <div id="grid-container" key={sample}> 
                                <div className="scroll">
                                    {sample}
                                    <div className="App-row-contents">
                                    BAF: 
                                        <input type="number"
                                            name="Merge Threshold" 
                                            key={sample}
                                            id="Merge-Thresh-BAF"
                                            min={0}
                                            max={10}
                                            step="0.001"
                                            placeholder={(this.state.mergeThresh_baf.has(sample)) ? String(this.state.mergeThresh_baf.get(sample)) : "0"}
                                            onChange={this.handleMergeThresh_baf.bind(this, sample)}> 
                                        </input>
                                    </div>
                                    <div className="App-row-contents">
                                    RDR: 
                                        <input type="number"
                                            name="Merge Threshold" 
                                            key={sample}
                                            id="Merge-Thresh-RDR"
                                            min={0}
                                            max={10}
                                            step="0.001"
                                            placeholder={(this.state.mergeThresh_rdr.has(sample)) ? String(this.state.mergeThresh_rdr.get(sample)) : "0"}
                                            onChange={this.handleMergeThresh_rdr.bind(this, sample)}> 
                                        </input>
                                    </div>      
                                </div>
                        </div> 
                    )} 
                </div>
                <div className="App-row-contents">
                    <label className="directions_label" title="Merges any clusters with a pairwise centroid distance below the BAF and RDR thresholds in all samples.">
                        <input type="button" id="custom-button" disabled={this.state.processingStatus !== ProcessingStatus.done} onClick={this.mergeBinsAll.bind(this)}/>
                        Merge Clusters 
                    </label> 
                </div>
            </div>

            visualizeAbsorb = <div className="grid-container">
                <div className="App-row-contents">
                    Set Absorb Thresholds:
                </div>
                <div className="App-row-contents">
                    {this.state.indexedData.getSampleList().map( sample => 
                        <div id="grid-container" key={sample}> 
                                <div className="scroll">
                                    {sample}
                                    <div className="App-row-contents">
                                    BAF: 
                                        <input type="number"
                                            name="Merge Threshold" 
                                            key={sample}
                                            id="Merge-Thresh-BAF"
                                            min={0}
                                            max={10}
                                            step="0.001"
                                            placeholder={(this.state.mergeThresh_baf.has(sample)) ? String(this.state.mergeThresh_baf.get(sample)) : "0"}
                                            onChange={this.handleAbsorbThresh_baf.bind(this, sample)}> 
                                        </input>
                                    </div>
                                    <div className="App-row-contents">
                                    RDR: 
                                        <input type="number"
                                            name="Merge Threshold" 
                                            key={sample}
                                            id="Merge-Thresh-RDR"
                                            min={0}
                                            max={10}
                                            step="0.001"
                                            placeholder={(this.state.mergeThresh_rdr.has(sample)) ? String(this.state.mergeThresh_rdr.get(sample)) : "0"}
                                            onChange={this.handleAbsorbThresh_rdr.bind(this, sample)}> 
                                        </input>
                                    </div>                                    
                                </div>
                        </div> 
                    )} 
                </div>
                <div className="App-row-contents">
                    <label className="directions_label" title="Absorbs bins in the 'From' list of clusters to the closest 'To' list of centroids. Reassignment only happens if distance is below the BAF and RDR thresholds in every sample.">
                        <input type="button" id="custom-button" disabled={this.state.processingStatus !== ProcessingStatus.done} onClick={this.absorbBinsAll.bind(this)}/>
                        Absorb Bins
                    </label>
                </div>
            </div>
            
        }
        // onChange={function(e : any){console.log("onChange BAF", sample, e); this.handleMergeThresh_rdr(sample, e)}}> 
        const status = this.getStatusCaption();

        return <div className="container-fluid">
            <div>
                <Sidebar 
                    // pointsize={this.state.pointsize}
                    // pointslider={this.pointslider}                    
                    handleslider={this.handleslider}
                    selectedChr={selectedChr} 
                    onChrSelected={this.handleChrSelected} 
                    chrOptions={chrOptions}
                    selectedColor={selectedColor} 
                    onColorSelected={this.handleColorSelection} 
                    onAbsorbThresh_rdr={this.handleAbsorbThresh_rdr}
                    onAbsorbThresh_baf={this.handleAbsorbThresh_baf}
                    onMergeThresh_rdr={this.handleMergeThresh_rdr}
                    onMergeThresh_baf={this.handleMergeThresh_baf}

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
                    onToggleLog = {this.toggleLog}
                    onToggleLinear={this.onToggleLinear}
                    onToggleScatter={this.onToggleScatter}
                    showScatter={this.state.showScatterPlot}
                    showLinear={this.state.showLinearPlot}
                    onToggleSync={this.onToggleSync}
                    syncScales={this.state.syncScales}
                    logData = {actions}
                    onToggleShowCentroids= {this.onToggleShowCentroids}
                    onToggleShowAbsorbBins={this.onToggleShowAbsorbBins}
                    onShowTetraploid={this.onShowTetraploid}
                    showTetraploid={this.state.showTetraploid}
                    showCentroids= {this.state.showCentroids}
                    onDriverFileChosen={this.handleDriverFileChosen}
                    onTogglesilhouettes={this.onToggleSilhoutteBarPlot}
                    showSilhouettes={this.state.showSilhouettes}
                    onToggleDirections = {this.onToggleDirections}
                    onToggleShowCentroidTable={this.onToggleShowCentroidTable}
                    onTogglePreviousActionLog={this.onTogglePreviousActionLog}
                    onClearClustering={this.onClearClustering}
                    handleDemoFileInput={this.handleDemoFileInput}
                    handleDemoDrivers={this.handleDemoDrivers}
                    setProcessingStatus={this.setProcessingStatus}
                    onTogglePurityPloidy={this.onTogglePurityPloidy}
                    showPurityPloidy={this.state.showPurityPloidyInputs}
                    applyLog={this.state.applyLog}
                    processingStatus={this.state.processingStatus}
                    onExport={this.onExport}
                    onUndoClick={this.goBackToPreviousCluster}
                />
            </div>

            {/* position: relative is important for this div because the child toolbar is position: fixed*/}
            {/* position: fixed positions self relative to the nearest relatively positioned ancestor. */}
            <div
                style={{
                    position: "relative",
                    marginLeft: this.state.sidebar ? SIDEBAR_WIDTH : 0,
                    overflowX: "hidden"
                }}
            >
                <div
                    className="toolbar"
                    style={{width: this.state.sidebar ?
                        `calc(100% - ${SIDEBAR_WIDTH} - 20px)` : "calc(100% - 20px)"
                    }}
                >
                    <Toolbox
                        currentDisplayMode={this.state.displayMode}
                        setDisplayMode={this.setDisplayMode}
                    ></Toolbox>
                    <div className="help-box" title="Show a modal describing instructions and shortcuts.">
                        <label style={{cursor: "pointer"}}>
                        <input style={{cursor: "pointer"}} type="button" id="custom-button" onClick={this.onToggleDirections}/>
                            <IconContext.Provider value={{className: "shared-class", size: "40"}}>
                                <AiOutlineQuestionCircle/>
                            </IconContext.Provider>
                        </label>
                    </div>
                </div>
                {status && <div className="App-status-pane">{status}</div>}
                {mainUI}

                {this.state.showDirections && <div className="black_overlay" onClick={this.onToggleDirections}></div> }
                {this.state.showDirections && 
                    <div className="Directions">
                        <h2 className="pop-up-window-header">Directions</h2>
                        <div className="Exit-Popup" onClick={this.onToggleDirections}> 
                            <FiX/>
                        </div>
                        <h5> Selection </h5>
                        <li> Hold down "Command/Control" in Zoom mode to temporarily enter add-to-selection mode. </li>
                        <li> Hold down "Alt" in Zoom mode to temporarily enter remove-from-selection mode. </li>
                        <li> To completely clear your selection, click anywhere in the plot while in add-to-selection or remove-from-selection modes. </li>
                        <li> To stay in add-to-select mode, you can press (b) or click the + icon in the toolbar.</li>
                        <li> To stay in remove-from-select mode, you can press (e) or click the eraser icon in the toolbar. </li>
                        <h5> Zoom/Pan Mode </h5>
                        <li> To enter zoom mode, click the magnifying glass icon in the toolbar, or press (z) on the keyboard. If you hold down shift, it will act as a bounding box zoom. </li>
                        {/* <li> In zoom mode, if you hold down shift, it will act as a bounding box zoom </li> */}
                        <li> To pan, click the grab icon in the toolbar, click and drag on the scatter plot or axes, or press (p) on the keyboard. </li>
                        <h5> Other Key Modifiers: </h5>
                        <li> Click "l" to toggle a log of previous actions. </li>
                        <li> Click space to toggle the sidebar. </li>
                        <li> Hold down "?" or "/" button to open direction panel. </li>
                        <li> Click "c" to toggle a table of the centroids of each cluster for each sample. </li>
                        <li> Click "s" to toggle a bar plot displaying approximate average silhoutte scores for each cluster. </li>
                    </div> }

                {this.state.showAbsorbBins && <div className="black_overlay" onClick={this.onToggleShowAbsorbBins}></div> }
                {this.state.showAbsorbBins && 
                    <div className="Directions">
                        <h2 className="pop-up-window-header">Absorb Bins</h2>
                        <div className="Exit-Popup" onClick={this.onToggleShowAbsorbBins}> 
                            <FiX/>
                        </div>
                        <div className="App-row-contents">
                            From: 
                            <ClusterTable 
                                data={clusterTableData2} 
                                onClusterRowsChange={this.onClusterRowsFromChange}  // gc: need to edit this
                                onClusterColorChange={this.onClusterColorChange} // gc: need to edit this
                                currentFilters={indexedData.getFilteredFromClusters()}
                                colOneName={"Cluster ID"}
                                colTwoName={"Bin (%)"}
                                cols={""}
                                expandable={true}
                                selectable={true}
                                colors={CLUSTER_COLORS}
                            ></ClusterTable>
                            To: 
                            <ClusterTable 
                                data={clusterTableData3} 
                                onClusterRowsChange={this.onClusterRowsToChange} // gc: need to edit this
                                onClusterColorChange={this.onClusterColorChange} // gc: need to edit this
                                currentFilters={indexedData.getFilteredToClusters()}
                                colOneName={"Cluster ID"}
                                colTwoName={"Bin (%)"}
                                cols={""}
                                expandable={true}
                                selectable={true}
                                colors={CLUSTER_COLORS}
                            ></ClusterTable>
                        </div>
                        {visualizeAbsorb}
                    </div> }

                {this.state.showLog && <div className="black_overlay" onClick={()=> this.setState({showLog: !this.state.showLog})}></div> }
                {this.state.showLog && 
                    <div className="Directions">
                        <h2 className="pop-up-window-header"> Previous Actions </h2>
                        <div className="Exit-Popup" onClick={()=> this.setState({showLog: !this.state.showLog})}> 
                            <FiX/>
                        </div>
                        <LogTable
                            data={actions}
                            onClusterColorChange={this.onClusterColorChange}
                            onClusterRowsChange={this.onClusterRowsChange}
                            colName={"Actions (Starting from most recent)"}
                        ></LogTable>
                        <label className="custom-file-export" title="Exports your clustering.">
                            <Log logData={actions} fileName={this.state.chosenFile} onExport={this.onExport}></Log>
                            Export <FiDownload/>
                        </label>
                    </div>}

                {this.state.showCentroidTable && <div className="black_overlay" onClick={()=> this.setState({showCentroidTable: !this.state.showCentroidTable})}></div> }
                {this.state.showCentroidTable && 
                    <div className="Directions">
                        <h2 className="pop-up-window-header"> Centroid Table </h2>
                        <div className="Exit-Popup" onClick={()=> this.setState({showCentroidTable: !this.state.showCentroidTable})}> 
                            <FiX/>
                        </div>
                        
                        <ClusterTable
                            data={indexedData.getCentroidData()}
                            onClusterColorChange={this.onClusterColorChange}
                            onClusterRowsChange={this.onClusterRowsChange}
                            colors={CLUSTER_COLORS}
                            currentFilters={[""]}
                            centroidTable={true}
                            colOneName={"Cluster"}
                            colTwoName={"Sample"}
                            colThreeName={"Centroid"}
                            cols={[{name: "Cluster", type: 'key'}, {name: "Sample", type: 'sample'}, {name: "Centroid", type: 'centroid'}]}
                        ></ClusterTable>
                        {visualizeMerge}
                    </div> }
                
                {this.state.showSilhouettes === ProcessingStatus.done && <div className="black_overlay" onClick={this.onToggleSilhoutteBarPlot}></div> }
                {this.state.showSilhouettes === ProcessingStatus.done && 
                        <AnalyticsTab
                            silhouetteData={this.state.silhouettes}
                            avgClusterSilhouette={this.state.indexedData.getAvgSilhouette()}
                            clusterDistances={this.state.indexedData.getClusterDistanceMatrix()}
                            clusterTableData={clusterTableData}
                            colors={CLUSTER_COLORS}
                            onToggleSilhoutteBarPlot={this.onToggleSilhoutteBarPlot}
                        ></AnalyticsTab>}
                <div className="before-loading">
                    {/* Load your own data, or use the demo button to load the demo data! */}
                </div> 

            </div>
        </div>;
    }
}
