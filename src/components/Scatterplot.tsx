import React from "react";
import * as d3 from "d3";
// @ts-ignore: Unreachable code error
import * as fc from "d3fc";
import _ from "lodash";
import memoizeOne from "memoize-one";
import { ChromosomeInterval } from "../model/ChromosomeInterval";
import {GenomicBin, GenomicBinHelpers} from "../model/GenomicBin";
import {webglColor, getRelativeCoordinates, niceBpCount } from "../util";
import "./Scatterplot.css";
import {DisplayMode} from "../App"
import { cn_pair, fractional_copy_number } from "../constants";
import { scaleBand } from "d3";

const PADDING = { // For the SVG
    left: 70,
    right: 20,
    top: 35,
    bottom: 60,
};

const UNCLUSTERED_COLOR = "#999999";
const DELETED_COLOR = "rgba(232, 232, 232, 1)";
const UNCLUSTERED_ID = "-1";
const DELETED_ID = "-2";
const SCALES_CLASS_NAME = "scatterplot-scale";
const CIRCLE_GROUP_CLASS_NAME = "circles";
const CIRCLE_R = 1;
const TOOLTIP_OFFSET = 10; // Pixels
let nextCircleIdPrefix = 0;

interface Props {
    pointsize: number; 
    parentCallBack: any;
    data: GenomicBin[];
    rdRange: [number, number];
    yAxisToPlot: keyof Pick<GenomicBin, "RD" | "logRD" | "fractional_cn">;
    hoveredLocation?: ChromosomeInterval;
    width: number;
    height: number;
    invertAxis: boolean;
    onRecordsHovered: (record: GenomicBin | null) => void;
    onBrushedBinsUpdated: (brushedBins: GenomicBin[]) => void;
    customColor: string;
    col: string;
    colors: string[];
    brushedBins: GenomicBin[];
    updatedBins: boolean;
    displayMode: DisplayMode;
    onZoom: (newScales: any) => void;
    clusterTableData: any;
    applyLog: boolean;
    onClusterSelected: any;
    scales: any;
    centroidPts: {cluster: number, point: [number, number]}[];
    showCentroids: boolean;
    purity: number;
    ploidy: number;
    offset: number; 
    meanRD: number;
    fractionalCNTicks: fractional_copy_number[];
    showPurityPloidy: boolean;
    showTetraploid: boolean; 
    BAF_lines: cn_pair[];
    max_cn: number;
}

interface State {
    selectedCluster: string;
    quadTree: d3.Quadtree<GenomicBin>;
}

export class Scatterplot extends React.Component<Props, State> {
    static defaultProps = {
        width: 400,
        height: 302,
        onNewCurveState: _.noop,
        onRecordHovered: _.noop,
    };

    private _svg: SVGSVGElement | null;
    private _circleIdPrefix: number;
    private _clusters : string[];
    private brushedNodes: Set<GenomicBin>;
    private previous_brushed_nodes: Set<string>;
    // private quadTree: d3.Quadtree<GenomicBin>;
    private _canvas: HTMLCanvasElement | null;
    // private _canvas2: HTMLCanvasElement | null;
    private _currXScale: d3.ScaleLinear<number, number>;
    private _currYScale: d3.ScaleLinear<number, number>;
    private _original_XScale: d3.ScaleLinear<number, number>;
    private _original_YScale: d3.ScaleLinear<number, number>;

    private _original_transform: any;
    private _current_transform: any;
    private scatter: any;
    private zoom: any;

    constructor(props: Props) {
        super(props);   
        this._svg = null;
        this._canvas = null;
        this.scatter = null;
        // this._canvas2 = null;
        this._circleIdPrefix = nextCircleIdPrefix;
        nextCircleIdPrefix++;
        this.computeScales = memoizeOne(this.computeScales);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.onBrushedBinsUpdated = this.onBrushedBinsUpdated.bind(this);
        this._clusters = this.initializeListOfClusters();
        
        this.brushedNodes = new Set();
        this.previous_brushed_nodes = new Set();
        this.onZoom = this.onZoom.bind(this);
        this.resetZoom = this.resetZoom.bind(this);
        this.zoom = null;
       
        const {bafScale, rdrScale} = this.computeScales(this.props.rdRange, props.width, props.height);
        this._currXScale = bafScale;
        this._currYScale = rdrScale;
        this._original_XScale = this._currXScale;
        this._original_YScale = this._currYScale;

        let data : GenomicBin[] = props.data;

        this._original_transform = d3.zoomIdentity.translate(0, 0).scale(1);
        this._current_transform = this._original_transform;
        this.state = {
            selectedCluster: (this._clusters.length > 0) ? this._clusters[0] : UNCLUSTERED_ID,
            quadTree: d3.quadtree<GenomicBin>()
            .x((d : GenomicBin) => d.reverseBAF)
            .y((d : GenomicBin)  => d[props.yAxisToPlot])
            .addAll(data)
        }
    }

    initializeListOfClusters() : string[] {
        let clusterTableData = this.props.clusterTableData;
        clusterTableData.sort((a : any, b : any) => {
            if (a.key > b.key) return 1;
            if (a.key < b.key) return -1;
            return 0;
        })

        this._clusters = [];
        for(const obj of clusterTableData) {
            this._clusters.push(obj.key);
        }

        while(this._clusters.length > 0 
            && (this._clusters[0] === UNCLUSTERED_ID 
            || this._clusters[0] === DELETED_ID)) {
            this._clusters.shift();
        }

        return this._clusters;
    }

    handleMouseMove(event: React.MouseEvent<SVGSVGElement>) {
        // const {rdRange, width, height, curveState, onNewCurveState, invertAxis} = this.props;
        const {x, y} = getRelativeCoordinates(event);
        const hoveredRdBaf = {
            rd: this._currYScale.invert(y),
            baf: this._currXScale.invert(x)
        };

        if( hoveredRdBaf.baf > this._currXScale.domain()[0] && hoveredRdBaf.baf < this._currXScale.domain()[1] 
            && hoveredRdBaf.rd > this._currYScale.domain()[0] && hoveredRdBaf.rd < this._currYScale.domain()[1] ) {
            
            const radius = Math.abs(this._currXScale.invert(x) - this._currXScale.invert(x - 20));
            this.props.onRecordsHovered(this.state.quadTree.find(hoveredRdBaf.baf, hoveredRdBaf.rd, radius) || null);
        } else {
            this.props.onRecordsHovered(null);
        }
    }

    renderTooltipAtRdBaf(rd: number, baf: number, contents: JSX.Element | null) {
        if (!contents) {
            return null;
        }

        const top =  (this._currYScale(rd) || 0);
        const left = ((this._currXScale(baf) || 0) + TOOLTIP_OFFSET);
        const tooltipHeight = 150;
        const tooltipWidth = 275;
        
        return <div
            className="Scatterplot-tooltip"
            style={{
                position: "absolute",
                top: top - tooltipHeight, // Alternatively, this could be 0.5 - baf
                left:  left,
                width: tooltipWidth,
                height: tooltipHeight,
                pointerEvents: "none"
            }}
        >
            {contents}
        </div>;
    }

    renderTooltip() {
        const {data, hoveredLocation, yAxisToPlot} = this.props;

        if (!hoveredLocation) {
            return null;
        }
        let hoveredRecords : GenomicBin[] = [];
        hoveredRecords = data.filter(record => {
            let currLoc = GenomicBinHelpers.toChromosomeInterval(record);
            return (hoveredLocation.chr === currLoc.chr
            && hoveredLocation.start === currLoc.start 
            && hoveredLocation.end === currLoc.end)}) //record.location.hasOverlap(hoveredLocation));

        if(hoveredRecords.length === 0) {
            hoveredRecords = data.filter(record => GenomicBinHelpers.toChromosomeInterval(record).hasOverlap(hoveredLocation))
        }
        if(hoveredRecords[0]) {
            const x = this._currXScale(hoveredRecords[0].reverseBAF);
            const y = this._currYScale(hoveredRecords[0][yAxisToPlot]);
            
            let range = this._currXScale.range();
            let range2 = this._currYScale.range();
            let yLabel = "RDR: ";
            if (yAxisToPlot === "fractional_cn") {
                yLabel = "Fractional CN: ";
            } else if (yAxisToPlot === "logRD") {
                yLabel = "Log RDR: ";
            }
            
            if (hoveredRecords.length === 1 && x && y && x > range[0] && x < range[1] && y < range2[0] && y > range2[1]) {
                const record = hoveredRecords[0];
                const recordLocation = GenomicBinHelpers.toChromosomeInterval(record);
                return this.renderTooltipAtRdBaf(record[yAxisToPlot], record.reverseBAF, <React.Fragment>
                    <p>
                        <b>{recordLocation.toString()}</b><br/>
                        ({niceBpCount(recordLocation.getLength())})
                    </p>
                    <div> {yLabel + record[yAxisToPlot].toFixed(2)}</div>
                    <div> 0.5 - BAF: {record.reverseBAF.toFixed(2)}</div>
                    <div> Cluster ID: {record.CLUSTER}</div>
                    
                </React.Fragment>);
            } 
        }

        return null;
    }

    render() {
        
        const {width, height} = this.props;

        let clusterOptions = this._clusters.map(clusterName =>
            <option key={clusterName} value={clusterName} >{clusterName}</option>
        );
        
        clusterOptions.unshift(<option key={UNCLUSTERED_ID} value={UNCLUSTERED_ID} >{UNCLUSTERED_ID}</option>);
        clusterOptions.unshift(<option key={DELETED_ID} value={DELETED_ID} >{DELETED_ID}</option>);
        
        let scatterUI = <div ref={node => this.scatter= node} className="Scatterplot" style={{width: width, height: height}}>
                            <canvas
                                ref={node => this._canvas = node}
                                width={width}
                                height={height}
                                className={"canvas"}
                                style={{position: "absolute", 
                                        top: PADDING.top, 
                                        zIndex: -4, 
                                        left: PADDING.left, 
                                        width: width-PADDING.left - PADDING.right, 
                                        height: height-PADDING.top-PADDING.bottom}}
                            />

                            <svg
                                ref={node => this._svg = node}
                                style={{zIndex: 100}}
                                preserveAspectRatio={'xMinYMin meet'}
                                viewBox={'0 0 ' + (width) + ' ' + (height)}
                                onMouseMove={this.handleMouseMove}
                            ></svg>
                            <div className="Scatterplot-tools">
                                <button className="custom-button" onClick={this.resetZoom}>Reset View</button>
                            </div>

                            {this.renderTooltip()}
                        </div>;
        return scatterUI;
    }

    resetZoom() {
        if(!this._svg) { return; }
        this._currXScale = this._original_XScale;
        this._currYScale = this._original_YScale;
        const newScales = {xScale: null, yScale: null}
        this.props.onZoom(newScales);
        this.redraw();
    }

    componentDidMount() { 
        this.redraw();
        this.forceHover(this.props.hoveredLocation);
    }

    propsDidChange(prevProps: Props, keys: (keyof Props)[]) {
        return keys.some(key => this.props[key] !== prevProps[key]);
    }

    componentDidUpdate(prevProps: Props) {
        const xScale = this.props.scales.xScale
        const yScale =  this.props.scales.yScale
        const prevXScale = prevProps.scales.xScale
        const prevYScale = prevProps.scales.yScale

        function scalesUpdated(scaleOne: any, scaleTwo:any) {
            if(scaleOne && !scaleTwo) {
                return true;
            }
            if(scaleOne && scaleTwo) {
                if((scaleOne[0] !== scaleTwo[0] || scaleOne[1] !== scaleTwo[1])) {
                    
                    return true;
                }
            }
            return false;
        }

        function scalesUpdated2(scaleOne: number[] | null, scaleTwo: number[] | null) {
            if(scaleOne && !scaleTwo) {
                return true;
            }
            if(scaleOne && scaleTwo) {
                if((Math.abs(scaleOne[0]-scaleTwo[0]) > .0001) || (Math.abs(scaleOne[1]-scaleTwo[1]) > .0001)) {
                    return true;
                }
            }
            return false;
        }

        if(!xScale && !yScale && prevXScale && prevYScale) {
            // Scales prop is not passed if we are at the original zoom, 
            // so when previously we had scales passed, but now we don't we must reset the zoom
            this.resetZoom();
        } else if(scalesUpdated(xScale, prevXScale) || scalesUpdated(yScale, prevYScale)) {
                // If either scale was changed, then update scales 
                // and update the quadtree so that tooltip stays in accurate
                // Then rerender points with the updated scales

                if(xScale) {
                    this._currXScale.domain(xScale);
                }

                if(yScale) {
                    this._currYScale.domain(yScale);
                }

                let data : GenomicBin[] = this.props.data;

                let q = d3
                    .quadtree<GenomicBin>()
                    .x((d : GenomicBin) => d.reverseBAF)
                    .y((d : GenomicBin)  => d[this.props.yAxisToPlot])
                    .addAll(data);

                this.setState({quadTree: q});
                this.redraw();

        } if (this.props.hoveredLocation !== prevProps.hoveredLocation) {
            this.forceUnhover();
            this.forceHover(this.props.hoveredLocation); 
        } else if (this.propsDidChange(prevProps, ["purity", "ploidy", "offset"])) {
            let data : GenomicBin[] = this.props.data;
            const rdrScale = this.computeScales(this.props.rdRange, this.props.width, this.props.height).rdrScale;
            this._currYScale = rdrScale;
            this._original_YScale = rdrScale;

            // Update quadtree so that when hovering works on new points that appear 
            // (when assigning to an existing cluster - all the points in that cluster show up even if it has been filtered out)

            let q = d3
                .quadtree<GenomicBin>()
                .x((d : GenomicBin) => d.reverseBAF)
                .y((d : GenomicBin)  => d[this.props.yAxisToPlot])
                .addAll(data)
            
            this.setState({quadTree: q});
            this.redraw();
        } else if (this.propsDidChange(prevProps, ["showCentroids", "displayMode", "colors", "brushedBins", "width", "height", "customColor", "pointsize", "showTetraploid"])) { // gc added customColor, redraws scatterplot on change
            // console.log("propsDidChange: calling this.redraw()");
            // console.log("recognizing showTetraploid change", this.props.showTetraploid); 

            let data : GenomicBin[] = this.props.data;
            // Update quadtree so that when hovering works on new points that appear 
            // (when assigning to an existing cluster - all the points in that cluster show up even if it has been filtered out)

            let q = d3
                .quadtree<GenomicBin>()
                .x((d : GenomicBin) => d.reverseBAF)
                .y((d : GenomicBin)  => d[this.props.yAxisToPlot])
                .addAll(data);
            
            this.setState({quadTree: q});
            this.redraw();
            this.forceHover(this.props.hoveredLocation);
        } else if((!(_.isEqual(this.props["data"], prevProps["data"])) || this.props.yAxisToPlot !== prevProps.yAxisToPlot)) { 
            const {bafScale, rdrScale} = this.computeScales(this.props.rdRange, this.props.width, this.props.height);

            if(!scalesUpdated2(this._currXScale.domain(), this._original_XScale.domain()) 
            && !scalesUpdated2(this._currYScale.domain(), this._original_YScale.domain())) { // zoom not applied
                // When the sample filter changes, the y-axis max will also change so must recaculate the scales
                // Original scales saves the scales to which we should reset the view
                this._currXScale = bafScale;
                this._currYScale = rdrScale;
                this._original_XScale = this._currXScale;
                this._original_YScale = this._currYScale;
            } else { // If zoom is applied, then update original scales but don't change current zoom
                if(this.props.yAxisToPlot !== prevProps.yAxisToPlot){ // When changing to log scale
                    let currentYDomain = this._currYScale.domain();
                    if (this.props.yAxisToPlot=== "logRD") {   // previous was RD
                        if(currentYDomain[0] <= 0) { currentYDomain[0] = 0.1; }
                        if(currentYDomain[1] <= 0) { currentYDomain[1] = 0.1; }
                        const newYDomain = [Math.log2(currentYDomain[0]), Math.log2(currentYDomain[1])];
                        this._currYScale.domain(newYDomain).range(this._currYScale.range());
                    } else if(this.props.yAxisToPlot === "fractional_cn"){ // Switched to fractional_cn from RD
                        const newYDomain = [currentYDomain[0] * this.props.ploidy / this.props.meanRD, currentYDomain[1] * this.props.ploidy / this.props.meanRD]
                        this._currYScale.domain(newYDomain).range(this._currYScale.range());
                    } else if(prevProps.yAxisToPlot=== "logRD"){ // Switched to RD from logRD
                        const newYDomain = [Math.pow(2, currentYDomain[0]), Math.pow(2, currentYDomain[1])];
                        this._currYScale.domain(newYDomain).range(this._currYScale.range());
                    } else if(prevProps.yAxisToPlot === "fractional_cn") {
                        const newYDomain = [currentYDomain[0] * this.props.meanRD / this.props.ploidy, currentYDomain[1] * this.props.meanRD / this.props.ploidy]
                        this._currYScale.domain(newYDomain).range(this._currYScale.range());
                    }
                }

                this._original_XScale = bafScale;
                this._original_YScale = rdrScale;
            }
            
            
            // Rebuild quadtree since scale changed (when going to log scale, sample change, etc)
            let data : GenomicBin[] = this.props.data;
            let q = d3
                .quadtree<GenomicBin>()
                .x((d : GenomicBin) => d.reverseBAF)
                .y((d : GenomicBin)  => d[this.props.yAxisToPlot])
                .addAll(data);
            
            this.setState({quadTree: q});

            let newScales = {xScale: this._currXScale.domain(), yScale: this._currYScale.domain()}
            this.props.onZoom(newScales);
            this.redraw();
            this.forceHover(this.props.hoveredLocation);
        } 

        if(this.props.clusterTableData !== prevProps.clusterTableData) {
            this.initializeListOfClusters();
        }
    }

    computeScales(rdRange: [number, number], width: number, height: number, 
                    bafRange?: [number, number], useLowerBound?: boolean) {
        let bafScaleRange = [PADDING.left, width - PADDING.right];
        let rdrScaleRange = [height - PADDING.bottom, PADDING.top];
        let rdLowerBound = (useLowerBound) ? rdRange[0] :((this.props.applyLog) ? -2 : 0);

        if(this.props.showPurityPloidy) {
            rdLowerBound = rdRange[0];
        }

        let baf = bafRange ? bafRange : [-.01, 0.51] // .0001 allows for points exactly on the axis to still be seen
        
        return {
            bafScale: d3.scaleLinear()
                .domain(baf)
                .range(bafScaleRange),
            rdrScale: d3.scaleLinear()
                .domain([rdLowerBound, rdRange[1]])
                .range(rdrScaleRange)
        };
    }

    onBrushedBinsUpdated = (brushedNodes: GenomicBin[]) => {
        this.props.onBrushedBinsUpdated(brushedNodes);
    }

    onZoom(newScales: any) {
        this.props.onZoom(newScales);
    }

    // filterFractionalCNTicks() {
    //     let currDomain = this._currYScale.domain();
    //     const {rdRange, max_cn} = this.props;
    //     // console.log("CurrDomain: ", currDomain);
    //     // console.log("Original Ticks: ", this.props.fractionalCNTicks);
    //     // console.log("Max Cn: ", max_cn);
    //     return this.props.fractionalCNTicks.filter(value => value > currDomain[0] && value <= max_cn && value < currDomain[1]);
    // }


    redraw() {
        // console.log("Beginning redraw().");
        if (!this._svg || !this._canvas || !this.scatter) {
            return;
        }
        
        let self = this;
        const {width, height, customColor, pointsize, brushedBins, data, colors, yAxisToPlot, centroidPts, showPurityPloidy, showTetraploid} = this.props;

        let {displayMode} = this.props;
        let xScale = this._currXScale;
        let yScale = this._currYScale;
        let xLabel = "Allelic Imbalance (0.5 - BAF)";
        let yLabel = yAxisToPlot === "RD" ? "RDR" : ((yAxisToPlot === "fractional_cn") ? "Copy Number" : "log RDR");
        
        const svg = d3.select(this._svg);

        // Remove any previous scales
        svg.selectAll("." + SCALES_CLASS_NAME).remove();

        // X axis stuff
        svg.append("text")
            .classed(SCALES_CLASS_NAME, true)
            .attr("text-anchor", "middle")
            .attr("x", _.mean(this._currXScale.range()))
            .attr("y", height - PADDING.bottom + 40)
            .style("text-anchor", "middle")
            .text(xLabel);

        // Y axis stuff
        svg.append("text")
            .classed(SCALES_CLASS_NAME, true)
            .attr("y", 20)
            .attr("x", 0-_.mean(this._currYScale.range()))
            .attr("transform", `rotate(-90)`)
            .style("text-anchor", "middle")
            .text(yLabel);
        
        let xAx = (g : any, scale : any) => g
            .classed(SCALES_CLASS_NAME, true)
            .attr("transform", `translate(0, ${height - PADDING.bottom})`)
            .call(d3.axisBottom(scale))
            .selectAll('text')
            .style("text-anchor", "end")
            .attr("dx", "-.8em")
            .attr("dy", ".15em")
            .attr('transform', 'rotate(-30)')

        let new_BAF_lines : cn_pair[] = []; 
        if(showPurityPloidy) {
            const currXDomain = this._currXScale.domain();
            // console.log("[Scatterplot render() -> showTetraploid", showTetraploid);
            if (!showTetraploid) {
                const new_BAF_ticks : cn_pair[] = [];
                // filter BAF lines
                // console.log("BAF_lines", this.props.BAF_lines); 
                for(const cn_pair_i of this.props.BAF_lines) {
                    // console.log(cn_pair_i); 
                    // if (cn_pair_i.state[1] != 2) {
                    if ((cn_pair_i.state[0] + cn_pair_i.state[1]) < 4) {
                        new_BAF_ticks.push(cn_pair_i); 
                    }
                }
                new_BAF_lines = new_BAF_ticks; 
            } else {
                new_BAF_lines = this.props.BAF_lines; 
            }
            
            const filteredBAFTicks = new_BAF_lines.filter(value => value.tick > currXDomain[0] && value.tick < currXDomain[1]);
            const ticks = filteredBAFTicks.map(d => d.tick);
            const ticksWithoutOverlap : number[] = []
            const filterBAFTicksNoOverlap : cn_pair[] = []

            if(ticks.length > 0) {
                ticksWithoutOverlap.push(ticks[0])
                filterBAFTicksNoOverlap.push(filteredBAFTicks[0])
            }

            for(let i = 1; i < ticks.length; i++) {
                // console.log(ticks[i])
                let first = xScale(ticksWithoutOverlap[ticksWithoutOverlap.length-1]) || 0;
                let second = xScale(ticks[i]) || 0;
                let pixelDist = second - first;

                if(pixelDist > 12) {
                    ticksWithoutOverlap.push(ticks[i]);
                    filterBAFTicksNoOverlap.push(filteredBAFTicks[i])
                }
            }
            

            // console.log("Test: ", dist_test)


            // console.log("filteredBAFTicks[i]", filteredBAFTicks); 
            // xAx = (g : any, scale : any) => g
            // .classed(SCALES_CLASS_NAME, true)
            // .attr("id", "Grid")
            // .attr("transform", `translate(0, ${height - PADDING.bottom})`)
            // .call(d3.axisBottom(scale).tickValues(ticks).tickSizeInner(-height + PADDING.top + PADDING.bottom).tickFormat((d, i) =>ticks[i].toFixed(2) + " ("+filteredBAFTicks[i].state[0]+","+filteredBAFTicks[i].state[1]+")"))
            // .selectAll('text')
            // .style("text-anchor", "end")
            // .attr("dx", "-.8em")
            // .attr("dy", ".15em")
            // .attr('transform', 'rotate(-30)')
            xAx = (g : any, scale : any) => g
            .classed(SCALES_CLASS_NAME, true)
            .attr("id", "Grid")
            .attr("transform", `translate(0, ${height - PADDING.bottom})`)
            // .call(d3.axisBottom(scale).tickValues(ticks).tickSizeInner(-height + PADDING.top + PADDING.bottom).tickFormat((d, i) => ((filteredBAFTicks[i].state[0] != filteredBAFTicks[i].state[1]) || (filteredBAFTicks[i].state[1] != 2)) ? ticks[i].toFixed(2) + " ("+filteredBAFTicks[i].state[0]+","+filteredBAFTicks[i].state[1]+")" : ((filteredBAFTicks[i].state[1] != 2) ? ticks[i].toFixed(2) + "(x,x)" : "")))
            .call(d3.axisBottom(scale).tickValues(ticksWithoutOverlap).tickSizeInner(-height + PADDING.top + PADDING.bottom).tickFormat((d, i) => (filterBAFTicksNoOverlap[i].state[0] != filterBAFTicksNoOverlap[i].state[1]) ? ticksWithoutOverlap[i].toFixed(2) + " ("+filterBAFTicksNoOverlap[i].state[0]+","+filterBAFTicksNoOverlap[i].state[1]+")" : ticksWithoutOverlap[i].toFixed(2) + " (x,x)"))
            .selectAll('text')
            .style("text-anchor", "end")
            .attr("dx", "-.8em")
            .attr("dy", ".15em")
            .attr('transform', 'rotate(-30)')

        }
        
        let yAx = (g : any, scale : any) => g
            .classed(SCALES_CLASS_NAME, true)
            .attr("id", "Grid")
            .attr("transform", `translate(${PADDING.left}, 0)`)
            .call(d3.axisLeft(scale));

        if(showPurityPloidy) {
            const originalTicks = this.props.fractionalCNTicks;
            const dom = this._currYScale.domain();
            const {max_cn} = this.props;
            const upperBound = (max_cn > dom[1]) ? max_cn : dom[1]; 
            const filteredTicks = originalTicks.filter(value => value.fractionalTick > dom[0] && value.fractionalTick < upperBound && value.fractionalTick < dom[1]);
            const filteredTicksVals = filteredTicks.map(d => d.fractionalTick);
            
            const ticksWithoutOverlap : number[] = []
            const filterYAxisTicksNoOverlap : fractional_copy_number[] = []

            // yAx = (g : any, scale : any) => g
            //     .classed(SCALES_CLASS_NAME, true)
            //     .attr("id", "Grid")
            //     .attr("transform", `translate(${PADDING.left}, 0)`)
            //     .call(d3.axisLeft(scale).tickValues(filteredTicksVals).tickSizeInner(-width + 80).tickFormat((d, i) => filteredTicks[i].totalCN + "(x,x)"));
            if(filteredTicks.length > 0) {
                ticksWithoutOverlap.push(filteredTicksVals[0])
                filterYAxisTicksNoOverlap.push(filteredTicks[0])
            }

            for(let i = 1; i < filteredTicksVals.length; i++) {
                console.log(filteredTicksVals[i])
                let first = yScale(ticksWithoutOverlap[ticksWithoutOverlap.length-1]) || 0;
                let second = yScale(filteredTicksVals[i]) || 0;
                let pixelDist = first - second;
                if(pixelDist > 10) {
                    ticksWithoutOverlap.push(filteredTicksVals[i]);
                    filterYAxisTicksNoOverlap.push(filteredTicks[i])
                }
            }

            yAx = (g : any, scale : any) => g
                .classed(SCALES_CLASS_NAME, true)
                .attr("id", "Grid")
                .attr("transform", `translate(${PADDING.left}, 0)`)
                .call(d3.axisLeft(scale).tickValues(ticksWithoutOverlap).tickSizeInner(-width + 80).tickFormat((d, i) => filterYAxisTicksNoOverlap[i].totalCN + " ("+Number(d.valueOf()).toFixed(2)+")"));
        }
        
        

        let previous : string[] = [];
        
        brushedBins.forEach(d => previous.push(GenomicBinHelpers.toChromosomeInterval(d).toString()))
        this.previous_brushed_nodes = new Set(previous);
        
        const previous_brushed_nodes = this.previous_brushed_nodes;

        const gx = svg.append("g");
        const gy = svg.append("g");
        let z = d3.zoomIdentity;
        const zoomX : any = d3.zoom().scaleExtent([0, 100]);
        const zoomY : any = d3.zoom().scaleExtent([0, 100]);
        const tx = () => d3.zoomTransform(gx.node() as Element);
        const ty = () => d3.zoomTransform(gy.node() as Element);
        gx.call(zoomX).attr("pointer-events", "none");
        gy.call(zoomY).attr("pointer-events", "none");
        
        const zoom : any = d3.zoom().on("zoom", () => {
            try {
                const t = d3.event.transform;
                const k = t.k / z.k;
                const point = center(d3.event);

                // is it on an axis?
                const doX = point[0] > xScale.range()[0];
                const doY = point[1] < yScale.range()[0];
                if(displayMode === DisplayMode.zoom || !(doX && doY) || displayMode === DisplayMode.boxzoom) {
                    if (k === 1) {
                        // pure translation?
                        doX && zoomX && k && point && gx && gx.call(zoomX.translateBy, (t.x - z.x) / tx().k, 0);
                        doY && zoomY && k && point && gy && gy.call(zoomY.translateBy, 0, (t.y - z.y) / ty().k);
                    } else {
                        // if not, we're zooming on a fixed point
                        doX && zoomX && k && point && gx && gx.call(zoomX.scaleBy, k, point);
                        doY && zoomY && k && point && gy && gy.call(zoomY.scaleBy, k, point);
                    }
                }
            
                z = t;
                redraw();
            } catch(error) {
                console.log("Error: ", error);
            }
          }).on("end", () => {
                const xDomain = self._currXScale.domain();
                const yDomain = self._currYScale.domain();
                const xDomain2 = self._original_XScale.domain();
                const yDomain2 = self._original_YScale.domain();
                if(xDomain[0] !== xDomain2[0] || xDomain[1] !== xDomain2[1] || yDomain[0] !== yDomain2[0] || yDomain[1] !== yDomain2[1]) {
                    let newScales = {xScale: self._currXScale.domain(), yScale: self._currYScale.domain()}
                    self.props.onZoom(newScales);
                }
            }
        );
        
        function center(event : any) {
            if (event.sourceEvent) {
                return [event.sourceEvent.layerX, event.sourceEvent.layerY];
            }
            return [width / 2, height / 2];
        }

        const gl = this._canvas.getContext("webgl")!;
        gl.clearColor(0,0,0,1);

        let languageFill = (d:any) => {
            return webglColor(chooseColor(d));
        };
        
        let newData :GenomicBin[]= [];
        for(const d of data) {
            if(!previous_brushed_nodes.has(GenomicBinHelpers.toChromosomeInterval(d).toString())) {
                newData.push(d);
            }
        }

        for(const d of data) {
            if(previous_brushed_nodes.has(GenomicBinHelpers.toChromosomeInterval(d).toString())) {
                newData.push(d);
            }
        }
        
        let fillColor = fc.webglFillColor().value(languageFill).data(newData);
        // console.log("Scatterplot.tsx", this.props.pointsize);
        let pointSeries = fc // plotting points in webgl - d3fc library within js/ts for using webgl
            .seriesWebglPoint()
            .xScale(self._currXScale)
            .yScale(self._currYScale)
            // .size(3)
            .crossValue((d : any) => d.reverseBAF) // x 0.5 - BAF
            .mainValue((d : any) => d[yAxisToPlot]) // y CN
            .context(gl)
            .size(this.props.pointsize);
            // .sizes((new Float32Array(data.length)).fill(this.props.pointsize)); 
            // .attr("r", this.props.pointsize); // gc
        
        pointSeries.decorate((program:any) => {
                fillColor(program)
                gl.depthFunc(gl.NEVER);
                gl.disable(gl.DEPTH_TEST);
                
        });


        svg
        .append("clipPath")
        .attr("id", "clip")
        .append("rect")
            .attr("x", PADDING.left)
            .attr("y", PADDING.top)
            .attr("width", width - PADDING.right - PADDING.left)
            .attr("height", height - PADDING.bottom - PADDING.top);

        // Create event-rect that allows for svg points to be overlayed under mouse pointer
        svg
            .append("g")
            .classed("eventrect", true)
            .append("rect")
                .attr("x", PADDING.left)
                .attr("y", PADDING.top)
                .attr("width", width - PADDING.right - PADDING.left)
                .attr("height", height - PADDING.bottom - PADDING.top)
                .style("fill", "none")
                .style("pointer-events", "all")
                .attr("clip-path", "url(#clip)");
         
       

        function redraw() {
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.clearColor(255,255,255,1);
            const xr = tx().rescaleX(xScale);
            const yr = ty().rescaleY(yScale);
        
            gx.call(xAx , xr);
            gy.call(yAx, yr);
            
            self._currXScale = xr;
            self._currYScale = yr;

            if(self._canvas) {
                pointSeries
                    .xScale(self._currXScale)
                    .yScale(self._currYScale)
                pointSeries(newData);
            }
            
            svg.select(".Centroids").remove();
            if(self.props.showCentroids) {
                svg.select(".eventrect")
                    .append("g")
                    .attr("clip-path", "url(#clip)")
                    .classed("Centroids", true)
                    .selectAll("path")
                    .data(centroidPts)
                    .enter()
                    .append("path")
                    .attr("class", "point")
                    .attr("d", d3.symbol().type(d3.symbolCross))
                    .attr("fill", d => chooseColor2(d.cluster))
                    .attr("fill-opacity", 1)
                    .attr("stroke-width", 2)
                    .attr("stroke", "black") 
                    .attr("transform", function(d) {
                        return "translate(" + self._currXScale(d.point[0]) + "," + self._currYScale(d.point[1]) + ")"; 
                    });
            }
        }
        
        this._canvas.width = width;
        this._canvas.height = height;

        redraw();

        if(displayMode === DisplayMode.select || displayMode === DisplayMode.erase) {
            const brush = d3.brush()
            .keyModifiers(false)
            .extent([[PADDING.left - 2*CIRCLE_R, PADDING.top - 2*CIRCLE_R], 
                    [this.props.width - PADDING.right + 2*CIRCLE_R , this.props.height - PADDING.bottom + 2*CIRCLE_R]])
                    .on("end", () => {
                        this.updatePoints(d3.event)
                        svg.selectAll(".brush").remove();
                        this.onBrushedBinsUpdated([...this.brushedNodes]);
                    });
            
              
            // attach the brush to the chart
            svg.append('g')
                .attr('class', 'brush')
                .call(brush);

        } else if(displayMode === DisplayMode.zoom) {
            svg.selectAll(".brush").remove();
        } else if(displayMode === DisplayMode.boxzoom) {
            const brush = d3.brush()
            .keyModifiers(false)
            .extent([[PADDING.left - 2*CIRCLE_R, PADDING.top - 2*CIRCLE_R], 
                    [this.props.width - PADDING.right + 2*CIRCLE_R , this.props.height - PADDING.bottom + 2*CIRCLE_R]])
                    .on("start brush", () => this.updatePoints(d3.event))
                    .on("end", () => {
                        svg.selectAll(".brush").remove();
                        brush_endEvent();
                });
               
            // attach the brush to the chart
            svg.append('g')
                .attr('class', 'brush')
                .call(brush);
        }

        svg.call(zoom).call(zoom.transform, d3.zoomIdentity.scale(1.0));

        function brush_endEvent() {
            if(!self._svg) {return;}
            const {data} = self.props;
            if (data) {
                const { selection } = d3.event;
                if(selection) { 
                    let newRdRange : [number, number] = [Number(self._currYScale.invert(selection[1][1])), 
                                                        Number(self._currYScale.invert(selection[0][1]))];
                    let newBafRange : [number, number] = [Number(self._currXScale.invert(selection[0][0])), 
                                                            Number(self._currXScale.invert(selection[1][0]))];
                    const {bafScale, rdrScale} = self.computeScales(newRdRange, width, height, newBafRange, true);
                    self._currXScale = bafScale;
                    self._currYScale = rdrScale;
                    
                    self.redraw();

                    let newScales = {xScale: self._currXScale.domain(), yScale: self._currYScale.domain()}
                    self.props.onZoom(newScales);
                }
            }
        }
        
        function chooseColor(d: GenomicBin) {
            if(previous_brushed_nodes.has(GenomicBinHelpers.toChromosomeInterval(d).toString())) {
                return customColor;
            } else if (d.CLUSTER === -1){
                return UNCLUSTERED_COLOR;
            } else if(d.CLUSTER === -2){
                return DELETED_COLOR;
            } else {
                const cluster = d.CLUSTER;
                const col_index = cluster % colors.length;
                return colors[col_index];
            }
        }

        function chooseColor2(c: number) {
            if (c === -1){
                return UNCLUSTERED_COLOR;
            } else if(c === -2){
                return DELETED_COLOR;
            } else {
                const cluster = c;
                const col_index = cluster % colors.length;
                return colors[col_index];
            }
        }
        // console.log("Done redrawing.");
    }

     updatePoints(event : any) {
        if(!this._svg) {return;}
        const {brushedBins, data, yAxisToPlot, displayMode} = this.props;
        if (data) {
            const { selection } = d3.event
            if(selection) {   

                function rectContains(rect : any, point : any) {
                    const X = 0;
                    const Y = 1;
                    const TOP_LEFT = 0;
                    const BOTTOM_RIGHT = 1;
                    return rect[TOP_LEFT][X] <= point[X] && point[X] <= rect[BOTTOM_RIGHT][X] &&
                           rect[TOP_LEFT][Y] <= point[Y] && point[Y] <= rect[BOTTOM_RIGHT][Y];
                }

                function currContains(currNode: any, toEraseSet: any) {
                    let existingNode = (currNode["#CHR"], currNode["START"], currNode["END"], currNode["genomicPosition"]);
                    if (toEraseSet.has(existingNode)) { // if existing node is one to delete
                        return false; // filter out the existing node
                    } else { // if existing node is not one to delete
                        return true; // keep this existing node 
                    }
                }

                let brushNodes = data.filter(d => rectContains(selection, [this._currXScale(d.reverseBAF), this._currYScale(d[yAxisToPlot])]));
                
                if (brushNodes) {
                    console.log(brushNodes); 
                    if(displayMode === DisplayMode.select) {
                        brushNodes = _.uniqBy(_.union(brushNodes, brushedBins), element => element["#CHR"] + "_" + element.START);
                    } else if(displayMode === DisplayMode.erase) {
                        let toEraseSet = new Set(); 
                        for(let i = 0; i < brushNodes.length; i++) {
                            toEraseSet.add((brushNodes[i]["#CHR"], brushNodes[i]["START"], brushNodes[i]["END"], brushNodes[i]["genomicPosition"]));
                        }
                        brushNodes = brushedBins.filter(d => currContains(d, toEraseSet)); 
                    }

                    this.brushedNodes = new Set(brushNodes);                  
                } 
            } else {
                this.brushedNodes = new Set([]);
            }
        }
    }

    getElementsForGenomeLocation(hoveredLocation?: ChromosomeInterval) {
        if (!this._svg || !hoveredLocation || !this._canvas) {
            return [];
        }
        
        const {data, yAxisToPlot} = this.props;

        let hoveredRecords : GenomicBin[] = [];
        hoveredRecords = data.filter(record => {
            let currLoc = GenomicBinHelpers.toChromosomeInterval(record);
            return (hoveredLocation.chr === currLoc.chr
            && hoveredLocation.start === currLoc.start 
            && hoveredLocation.end === currLoc.end)
        })
        
        let range = this._currXScale.range();
        let range2 = this._currYScale.range();
        if(hoveredRecords.length === 0) {
            
            hoveredRecords = data.filter(record => GenomicBinHelpers.toChromosomeInterval(record).hasOverlap(hoveredLocation))
            hoveredRecords = hoveredRecords.filter(record => {
                const x = this._currXScale(record.reverseBAF);
                const y = this._currYScale(record[yAxisToPlot]);
                return x && y && x > range[0] && x < range[1] && y < range2[0] && y > range2[1]
            })
        }
    
        let svg = d3.select(this._svg);
        svg.select("." + CIRCLE_GROUP_CLASS_NAME).remove();
        svg.select(".eventrect")
            .append("g")
            .classed(CIRCLE_GROUP_CLASS_NAME, true)
            .selectAll("circle")
                .data(hoveredRecords)
                .enter()
                .append("circle")
                    .attr("id", d => this._circleIdPrefix + GenomicBinHelpers.toChromosomeInterval(d).toString())
                    .attr("cx", d => this._currXScale(d.reverseBAF) || 0)
                    .attr("cy", d => this._currYScale(d[yAxisToPlot]) || 0) // Alternatively, this could be 0.5 - baf
                    .attr("r", 3)
                    .attr("fill", d => {
                        if(this.previous_brushed_nodes.has(GenomicBinHelpers.toChromosomeInterval(d).toString())) {
                            return this.props.customColor;
                        } else if (d.CLUSTER === -1){
                            return UNCLUSTERED_COLOR;
                        } else if(d.CLUSTER === -2){
                            return DELETED_COLOR;
                        } else {
                            const cluster = d.CLUSTER;
                            const col_index = cluster % this.props.colors.length;
                            return this.props.colors[col_index];
                        }
                        
                    })
                    .attr("fill-opacity", 1)
                    .attr("stroke-width", 2)
                    .attr("stroke", "black");

    }

    forceHover(genomeLocation?: ChromosomeInterval) {
        this.getElementsForGenomeLocation(genomeLocation);
    }

    forceUnhover() {
        if(this._svg) {
            d3.select(this._svg).select("." + CIRCLE_GROUP_CLASS_NAME).remove();
        }
    }
}