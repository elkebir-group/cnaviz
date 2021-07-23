import React from "react";
import * as d3 from "d3";
import _, { assign } from "lodash";
import memoizeOne from "memoize-one";

import { CopyNumberCurveDrawer } from "./CopyNumberCurveDrawer";
import { MergedBinHelpers, MergedGenomicBin } from "../model/BinMerger";
import { ChromosomeInterval } from "../model/ChromosomeInterval";
import { CurveState, CurvePickStatus } from "../model/CurveState";
import { CopyNumberCurve } from "../model/CopyNumberCurve";
import { getCopyStateFromRdBaf, copyStateToString } from "../model/CopyNumberState";
//import { niceBpCount, getRelativeCoordinates } from "../util";
import {GenomicBinHelpers} from "../model/GenomicBin";
import { getRelativeCoordinates, applyRetinaFix, niceBpCount } from "../util";
import "./Scatterplot.css";
import {DisplayMode} from "../App"

const visutils = require('vis-utils');

const PADDING = { // For the SVG
    left: 60,
    right: 20,
    top: 20,
    bottom: 60,
};

const UNCLUSTERED_COLOR = "#999999";
const DELETED_COLOR = "rgba(232, 232, 232, 1)";

const CLUSTER_COLORS = [
    "#1b9e77", 
    "#d95f02", 
    "#7570b3", 
    "#e7298a", 
    "#66a61e", 
    "#e6ab02", 
    "#a6761d", 
    "#666666", 
    "#fe6794", 
    "#10b0ff",
    "#ac7bff", 
    "#964c63", 
    "#cfe589", 
    "#fdb082", 
    "#28c2b5"
];
//const HIGHLIGHT_COLOR = "red";

const SCALES_CLASS_NAME = "scatterplot-scale";
const CIRCLE_GROUP_CLASS_NAME = "circles";
const CIRCLE_R = 1;
const SELECTED_CIRCLE_R_INCREASE = 2;
const TOOLTIP_OFFSET = 10; // Pixels
let nextCircleIdPrefix = 0;

interface Props {
    parentCallBack: any;
    data: MergedGenomicBin[];
    rdRange: [number, number];
    hoveredLocation?: ChromosomeInterval;
    width: number;
    height: number;
    curveState: CurveState;
    invertAxis: boolean;
    onNewCurveState: (state: Partial<CurveState>) => void;
    onRecordsHovered: (record: MergedGenomicBin | null) => void;
    onBrushedBinsUpdated: any;
    customColor: string;
    col: string;
    colors: string[];
    assignCluster: boolean;
    brushedBins: MergedGenomicBin[];
    updatedBins: boolean;
    displayMode: DisplayMode;
    onZoom: (newScales: any) => void;
    clusterTableData: any;
    applyLog: boolean;
}


export class Scatterplot extends React.Component<Props> {
    static defaultProps = {
        width: 400,
        height: 302,
        onNewCurveState: _.noop,
        onRecordHovered: _.noop,
        customColor: CLUSTER_COLORS[0]
    };

    private _svg: SVGSVGElement | null;
    private _circleIdPrefix: number;
    private _clusters : string[];
    private brushedNodes: Set<MergedGenomicBin>;
    private quadTree: any;
    private _canvas: HTMLCanvasElement | null;
    private _currXScale: any;
    private _currYScale: any;
    private _original_XScale: any;
    private _original_YScale: any;

    private _original_transform: any;
    private _current_transform: any;
    private scatter: any;
    private zoom: any;

    constructor(props: Props) {
        super(props);
        //console.log("Scatter plot cluster tbale data: ", props.clusterTableData);
        
        this._svg = null;
        this._canvas = null;
        this.scatter = null;
        this._circleIdPrefix = nextCircleIdPrefix;
        nextCircleIdPrefix++;
        this.computeScales = memoizeOne(this.computeScales);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleCurveHovered = this.handleCurveHovered.bind(this);
        this.onTrigger = this.onTrigger.bind(this);
        this.onBrushedBinsUpdated = this.onBrushedBinsUpdated.bind(this);
        this._clusters = this.initializeListOfClusters();
        this.createNewBrush = this.createNewBrush.bind(this);
        this.brushedNodes = new Set();
        this.onZoom = this.onZoom.bind(this);
        this.resetZoom = this.resetZoom.bind(this);
        this.zoom = null;
        
        const {bafScale, rdrScale} = this.computeScales(this.props.rdRange, props.width, props.height);
        this._currXScale = bafScale;
        this._currYScale = rdrScale;
        this._original_XScale = this._currXScale;
        this._original_YScale = this._currYScale;

        let data : any = props.data;
        this.quadTree = d3
            .quadtree()
            .x((d : any) => d.averageBaf)
            .y((d : any)  => d.averageRd)
            .addAll(data)

        this._original_transform = d3.zoomIdentity.translate(0, 0).scale(1);
        this._current_transform = this._original_transform;
        let self = this;
        // d3.select("body").on("keypress", function(){
        //     // if (d3.event.key == "z") {
        //     //     //self.setState({displayMode: DisplayMode.zoom})
        //     // } else if (d3.event.key == "b") {
        //     //     //self.setState({displayMode: DisplayMode.select})
        //     // }
        //     if (d3.event.key == "q") {
                
        //         if(self._svg) {
        //             if(props.displayMode === DisplayMode.zoom) {
        //                 d3.select(self._svg).selectAll("." + "brush").remove();
        //             }
        //         }
        //     }
        // })
    }

    initializeListOfClusters() : string[] {
        let collator = new Intl.Collator(undefined, {numeric: true, sensitivity: 'base'});
        // let clusters = [...new Set(this.props.data.map(d => String(d.bins[0].CLUSTER)))].sort(collator.compare); 
        // if(clusters[0] === "-2") {
        //     clusters.shift();
        // }
        // if(clusters[0] === "-1") {
        //     clusters.shift();
        // }

        let clusterTableData = this.props.clusterTableData;
        clusterTableData.sort((a : any, b : any) => {
            if (a.value > b.value) return -1;
            if (a.value < b.value) return 1;
            return 0;
        })

        let clusters : string[] = [];
        for(const obj of clusterTableData) {
            clusters.push(obj.key);
        }
        //console.log(clusters);
        // clusterTableData = clusterTableData.filter((cluster : any) => cluster.key === "-1" || cluster.key === "-2")
        // console.log(clusterTableData);
        // console.log("CLUSTER TABLE DATA: ", clusterTableData);
        // const clusters = Object.keys(clusterTableData);
        // console.log("INITIALIZING CLUSTERS: ", clusters);
        return clusters;
    }

    handleMouseMove(event: React.MouseEvent<SVGSVGElement>) {
        const {rdRange, width, height, curveState, onNewCurveState, invertAxis} = this.props;
        const {x, y} = getRelativeCoordinates(event);
        const {rdrScale, bafScale} = this.computeScales(rdRange, width, height);
        const hoveredRdBaf = {
            rd: this._currYScale.invert(y),
            baf: this._currXScale.invert(x)
        };
    
        if( hoveredRdBaf.baf > this._currXScale.domain()[0] && hoveredRdBaf.baf < this._currXScale.domain()[1] && hoveredRdBaf.rd > this._currYScale.domain()[0] && hoveredRdBaf.rd < this._currYScale.domain()[1] ) {
            const radius = Math.abs(this._currXScale.invert(x) - this._currXScale.invert(x - 20));
            this.props.onRecordsHovered(this.quadTree.find(hoveredRdBaf.baf, hoveredRdBaf.rd, radius) || null);
        } else {
            this.props.onRecordsHovered(null);
        }
    }

    handleCurveHovered(p: number) {
        this.props.onNewCurveState({hoveredP: p});
    }

    renderTooltipAtRdBaf(rd: number, baf: number, contents: JSX.Element | null) {
        if (!contents) {
            return null;
        }

        const {rdRange, width, height, invertAxis} = this.props;
        const {bafScale, rdrScale} = this.computeScales(rdRange, width, height);
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
        const {data, hoveredLocation, curveState} = this.props;

        if (!hoveredLocation) {
            return null;
        }
        let hoveredRecords : MergedGenomicBin[] = [];
        hoveredRecords = data.filter(record => record.location.chr === hoveredLocation.chr 
                                                && hoveredLocation.start === record.location.start 
                                                && hoveredLocation.end === record.location.end) //record.location.hasOverlap(hoveredLocation));
        if(hoveredRecords.length === 0) {
            hoveredRecords = data.filter(record => record.location.hasOverlap(hoveredLocation))
        }
        if(hoveredRecords[0]) {
            const x = this._currXScale(hoveredRecords[0].averageBaf);
            const y = this._currYScale(hoveredRecords[0].averageRd);
            
            let range = this._currXScale.range();
            let range2 = this._currYScale.range();

            if (hoveredRecords.length === 1 && x > range[0] && x < range[1] && y < range2[0] && y > range2[1]) {
                const record = hoveredRecords[0];
                return this.renderTooltipAtRdBaf(record.averageRd, record.averageBaf, <React.Fragment>
                    <p>
                        <b>{record.location.toString()}</b><br/>
                        ({niceBpCount(record.location.getLength())})
                    </p>
                    {/* <div>Number of Bins: {record.bins.length}</div> */}
                    <div> RDR: {record.averageRd.toFixed(2)}</div>
                    <div> BAF: {Number(0.5-record.averageBaf).toFixed(2)}</div>
                    <div>Cluster ID:{record.bins[0].CLUSTER}</div>
                </React.Fragment>);
            } 
        }
        // else if (hoveredRecords.length > 1) {
        //     const minBaf = _.minBy(hoveredRecords, "averageBaf")!.averageBaf;
        //     const maxBaf = _.maxBy(hoveredRecords, "averageBaf")!.averageBaf;
        //     const meanBaf = _.meanBy(hoveredRecords, "averageBaf");
        //     const minRd = _.minBy(hoveredRecords, "averageRd")!.averageRd;
        //     const maxRd = _.maxBy(hoveredRecords, "averageRd")!.averageRd;
        //     const meanRd = _.meanBy(hoveredRecords, "averageRd");
        //     return this.renderTooltipAtRdBaf(maxRd, maxBaf, <React.Fragment>
        //         <p><b>{hoveredRecords.length} corresponding regions</b></p>
        //         <div>Average RDR: {meanRd.toFixed(2)}</div>
        //         <div>Average BAF: {meanBaf.toFixed(2)}</div>
        //         <div>RDR range: [{minRd.toFixed(2)}, {maxRd.toFixed(2)}]</div>
        //         <div>BAF range: [{minBaf.toFixed(2)}, {maxBaf.toFixed(2)}]</div>
        //     </React.Fragment>);
        // }

        return null;
    }

    render() {
        
        const {width, height, rdRange} = this.props;
        //console.log("Rendering")
        let scatterUI = <div ref={node => this.scatter= node} className="Scatterplot" style={{position: "relative"}}>
                            <canvas
                                ref={node => this._canvas = node}
                                width={width}
                                height={height}
                                style={{position: "absolute", zIndex: -1}} />
                            <svg
                                ref={node => this._svg = node}
                                width={width} height={height}
                                onMouseMove={this.handleMouseMove}
                            ></svg>
                            <div className="Scatterplot-tools">
                                <button id="reset" onClick={this.resetZoom}>Reset</button>
                                <button id="new-cluster" >New</button>
                                <button id="assign-cluster" >Assign</button>
                                <select
                                    name="Select Cluster" 
                                    id="Select Cluster"
                                    value={"Test 1"}
                                    //onChange={props.onChrSelected} >
                                    >
                                    <option>
                                        Test 1
                                    </option>
                                    <option>
                                        Test 2
                                    </option>
                                    <option>
                                        Test 3
                                    </option>
                                    <option>
                                        Test 4
                                    </option>
                                        {/* {["Test 1", "Test 2", "Test 3", "Test 4"]} */}
                                </select>
                            </div>
                            {this.renderTooltip()}
                        </div>;
        return scatterUI;
    }

    resetZoom() {
        if(!this._svg) {
            return;
        }
        const {rdRange, width, height, displayMode} = this.props;
        //const {bafScale, rdrScale} = this.computeScales(rdRange, width, height);

        this._currXScale = this._original_XScale;
        this._currYScale = this._original_YScale;
        const newScales = {xScale: this._currXScale.domain(), yScale: this._currYScale.domain()}
        //d3.select(this._svg).call(this.zoom.transform, d3.zoomIdentity.scale(1))
        this.props.onZoom(newScales);

        this.redraw();
    }

    createNewBrush() {
        const svg = d3.select(this._svg);
        const brush = d3.brush()
        .keyModifiers(false)
        .extent([[PADDING.left - 2*CIRCLE_R, PADDING.top - 2*CIRCLE_R], 
                [this.props.width - PADDING.right + 2*CIRCLE_R , this.props.height - PADDING.bottom + 2*CIRCLE_R]])
                .on("start brush", () => this.updatePoints(d3.event))
                .on("end", () => {
                    svg.selectAll("." + "brush").remove();
                    this.onBrushedBinsUpdated([...this.brushedNodes]);
                });
                
        // attach the brush to the chart
        svg.append('g')
            .attr('class', 'brush')
            .call(brush);
    }

    componentDidMount() { 
        this.redraw();
        this.forceHover(this.props.hoveredLocation);
    }

    propsDidChange(prevProps: Props, keys: (keyof Props)[]) {
        return keys.some(key => this.props[key] !== prevProps[key]);
    }

    componentDidUpdate(prevProps: Props) {
        if(this.props["assignCluster"]) {
            this.onTrigger([...this.brushedNodes]);
            this.brushedNodes = new Set();
            this._clusters = this.initializeListOfClusters();
            this.redraw();
        } else if (this.propsDidChange(prevProps, ["displayMode", "colors", "brushedBins", "width", "height"])) {
            this.redraw();
            this.forceHover(this.props.hoveredLocation);
        } else if (this.props.hoveredLocation !== prevProps.hoveredLocation) {
            this.forceUnhover(prevProps.hoveredLocation);
            this.forceHover(this.props.hoveredLocation); 
        }
         else if(!(_.isEqual(this.props["data"], prevProps["data"]))) {
            const {bafScale, rdrScale} = this.computeScales(this.props.rdRange, this.props.width, this.props.height);
            if(this._currXScale === this._original_XScale 
                    && this._currYScale === this._original_YScale) {
                this._currXScale = bafScale;
                this._currYScale = rdrScale;
                this._original_XScale = this._currXScale;
                this._original_YScale = this._currYScale;
            } else {
                this._original_XScale = bafScale;
                this._original_YScale = rdrScale;
            }

            let data : any = this.props.data;
            this.quadTree = d3
                .quadtree()
                .x((d : any) => d.averageBaf)
                .y((d : any)  => d.averageRd)
                .addAll(data)
            this.redraw();
            this.forceHover(this.props.hoveredLocation);
        }
    }

    computeScales(rdRange: [number, number], width: number, height: number, bafRange?: [number, number], useLowerBound?: boolean) {
        let bafScaleRange = [PADDING.left, width - PADDING.right];
        let rdrScaleRange = [height - PADDING.bottom, PADDING.top];
        const rdLowerBound = (useLowerBound) ? rdRange[0] :((this.props.applyLog) ? -2 : 0);
        let baf = bafRange ? bafRange : [-.0001, 0.5] // .0001 allows for points exactly on the axis to still be seen
        
        return {
            bafScale: d3.scaleLinear()
                .domain(baf)
                .range(bafScaleRange),
            rdrScale: d3.scaleLinear()
                .domain([rdLowerBound, rdRange[1]])
                .range(rdrScaleRange)
        };
    }

    onTrigger = (brushedNodes : MergedGenomicBin[]) => {
        this.props.parentCallBack(brushedNodes);
    }

    onBrushedBinsUpdated = (brushedNodes: MergedGenomicBin[]) => {
        this.props.onBrushedBinsUpdated(brushedNodes);
    }

    onZoom(newScales: any) {
        this.props.onZoom(newScales);
    }

    redraw() {
        
        console.time("Rendering");
        if (!this._svg || !this._canvas || !this.scatter) {
            return;
        }
        let self = this;
        const {width, height, onRecordsHovered, customColor, 
                assignCluster, invertAxis, brushedBins, data, rdRange, colors} = this.props;
        let {displayMode} = this.props;
        //const colorScale = d3.scaleOrdinal(colors).domain(this._clusters);
        //console.log("NEW RD RANGE@: ", rdRange);
        //const {bafScale, rdrScale} = this.computeScales(rdRange, width, height);

        let xScale = this._currXScale;
        let yScale = this._currYScale;
        let xLabel = "0.5 - BAF";
        let yLabel = "RDR";
        // if (invertAxis) {
        //     [xScale, yScale, xLabel, yLabel] = [rdrScale, bafScale, "RDR", "0.5 - BAF"];
        // }
        
        const svg = d3.select(this._svg);
        const canvas = d3.select(this._canvas);

        // Remove any previous scales
        svg.selectAll("." + SCALES_CLASS_NAME).remove();

        // X axis stuff
        let xAxis = svg.append("g")
            .classed(SCALES_CLASS_NAME, true)
            .attr("transform", `translate(0, ${height - PADDING.bottom})`)
            .call(d3.axisBottom(this._currXScale));
        svg.append("text")
            .classed(SCALES_CLASS_NAME, true)
            .attr("text-anchor", "middle")
            .attr("x", _.mean(this._currXScale.range()))
            .attr("y", height - PADDING.bottom + 40)
            .style("text-anchor", "middle")
            .text(xLabel);

        // Y axis stuff
       let yAxis = svg.append("g")
            .classed(SCALES_CLASS_NAME, true)
            .attr("transform", `translate(${PADDING.left}, 0)`)
            .call(d3.axisLeft(this._currYScale));
        svg.append("text")
            .classed(SCALES_CLASS_NAME, true)
            .attr("y", PADDING.left-40)
            .attr("x", 0-_.mean(this._currYScale.range()))
            .attr("transform", `rotate(-90)`)
            .style("text-anchor", "middle")
            .text(yLabel);
            
        let previous : any = [];
        brushedBins.forEach(d => previous.push(String(d.location)))
        let previous_brushed_nodes = new Set(previous);
        
        const ctx = this._canvas.getContext("2d")!;
        this.zoom = d3.zoom()
            .scaleExtent([0, 100])
            .extent([[0, 0], [width, height]])
            .on("zoom", () => {
 
                const transform = d3.event.transform;
                this._current_transform = transform;
                ctx.save();
                zoomAxes(this._current_transform, true, true);
                ctx.restore();
            }).on("end", () => {
                let newScales = {xScale: self._currXScale.domain(), yScale: self._currYScale.domain()}
                //console.log("New scales: ", newScales);
                self.props.onZoom(newScales);
            });
        
        let zoomY : any= d3.zoom()
            .scaleExtent([0, 100])
            .extent([[0, 0], [width, height]])
            .on("zoom", () => {
                const transform = d3.event.transform;
                this._current_transform = transform;
                ctx.save();
                zoomAxes(this._current_transform, false, true);
                ctx.restore();})
            .on("end", () => {
                let newScales = {xScale: self._currXScale.domain(), yScale: self._currYScale.domain()}
                //console.log("New scales: ", newScales);
                self.props.onZoom(newScales);
            });
        
        this._canvas.width = width;
        this._canvas.height = height;

        applyRetinaFix(this._canvas);

        drawAllGenomicBins();

        function drawAllGenomicBins() {
            ctx.clearRect(0, 0, width, height);
            for (const d of data) {
                if(!previous_brushed_nodes.has(String(d.location))) {
                    drawGenomicBin(d);
                }
            }
            for (const d of data) {
                if(previous_brushed_nodes.has(String(d.location))) {
                    drawGenomicBin(d);
                }
            }
        }

        function drawGenomicBin(d : MergedGenomicBin) {
            const x = self._currXScale(d.averageBaf);
            const y = self._currYScale(d.averageRd);
            
            let range = self._currXScale.range();
            let range2 = self._currYScale.range();

            if(x > range[0] && x < range[1] && y < range2[0] && y > range2[1]) {
                ctx.fillStyle = chooseColor(d);
                ctx.fillRect(x || 0, (y || 0) - 1, 2, 3);
            }
        }
        
        var event_rect = svg
            .append("g")
            .classed("eventrect", true)
            .on("mouseenter", () => { 
                xScale = this._currXScale;
                yScale = this._currYScale;
            })
            .on("wheel", () => {console.log("wheeled")})
            .call(this.zoom)
                .append("rect")
                    .attr("x", PADDING.left)
                    .attr("y", PADDING.top)
                    .attr("width", width - PADDING.right - PADDING.left)
                    .attr("height", height - PADDING.bottom - PADDING.top)
                    .style("fill", "none")
                    .style("pointer-events", "all")
                    .attr("clip-path", "url(#clip)");

        
        
            // .call(this.zoom.transform, d3.zoomIdentity
            //     .translate(width / 2, height / 2)
            //     .scale(0.5)
            //     .translate(-width / 2, -height / 2));
                    
        
        var event_rectY = svg
            .append("g")
            .classed("eventrectY", true)
            .on("mouseenter", () => { 
                xScale = this._currXScale;
                yScale = this._currYScale;
            })
            .call(zoomY)
                .append("rect")
                    .attr("width", PADDING.left)
                    .attr("height", height-PADDING.bottom)
                    .style("fill", "none")
                    .style("pointer-events", "all")
                    .attr("clip-path", "url(#clip)");

        if(displayMode === DisplayMode.select) {
            //this.createNewBrush();
            const svg = d3.select(this._svg);
            const brush = d3.brush()
            .keyModifiers(false)
            .extent([[PADDING.left - 2*CIRCLE_R, PADDING.top - 2*CIRCLE_R], 
                    [this.props.width - PADDING.right + 2*CIRCLE_R , this.props.height - PADDING.bottom + 2*CIRCLE_R]])
                    .on("start brush", () => this.updatePoints(d3.event))
                    .on("end", () => {
                        svg.selectAll("." + "brush").remove();
                        if(d3.event.sourceEvent.metaKey) {
                            brush_endEvent();
                        } else {
                            this.onBrushedBinsUpdated([...this.brushedNodes]);
                        }
                    });
                    
            // // attach the brush to the chart
            svg.append('g')
                .attr('class', 'brush')
                .call(brush);
        } else if(displayMode === DisplayMode.zoom) {
            svg
                .on("mouseenter", () => { 
                    xScale = this._currXScale;
                    yScale = this._currYScale;
                })
                .call(this.zoom) 
        } else if(displayMode === DisplayMode.boxzoom) {
            const brush = d3.brush()
            .keyModifiers(false)
            .extent([[PADDING.left - 2*CIRCLE_R, PADDING.top - 2*CIRCLE_R], 
                    [this.props.width - PADDING.right + 2*CIRCLE_R , this.props.height - PADDING.bottom + 2*CIRCLE_R]])
                    .on("start brush", () => this.updatePoints(d3.event))
                    .on("end", () => {
                        svg.selectAll("." + "brush").remove();
                        brush_endEvent();
                });
               
            // // attach the brush to the chart
            svg.append('g')
                .attr('class', 'brush')
                .call(brush);
        }

        function brush_endEvent() {
            if(!self._svg) {return;}
            const {data} = self.props;
            if (data) {
                try {
                    const { selection } = d3.event;
                    let rect = [[self._currXScale.invert(selection[0][0]), self._currYScale.invert(selection[1][1])], // bottom left (x y)
                                [self._currXScale.invert(selection[1][0]), self._currYScale.invert(selection[0][1])]]; // top right (x y)
                    //console.log("RECT: ", rect);
                    let newRdRange : [number, number] = [Number(self._currYScale.invert(selection[1][1])), 
                                                        Number(self._currYScale.invert(selection[0][1]))];
                    let newBafRange : [number, number] = [Number(self._currXScale.invert(selection[0][0])), 
                                                            Number(self._currXScale.invert(selection[1][0]))];
                    const {bafScale, rdrScale} = self.computeScales(newRdRange, width, height, newBafRange, true);
                    self._currXScale = bafScale;
                    self._currYScale = rdrScale;
                    xAxis.call(d3.axisBottom(self._currXScale))
                    yAxis.call(d3.axisLeft(self._currYScale))
                    
                    self.redraw();

                    drawAllGenomicBins();

                    let newScales = {xScale: self._currXScale.domain(), yScale: self._currYScale.domain()}
                    //console.log("New scales: ", newScales);
                    self.props.onZoom(newScales);
                } catch (error) { console.log(error);}
            }
        }
        
        
        // A function that updates the chart when the user zoom and thus new boundaries are available
        
        function zoomAxes(transform : any, zoomX: boolean, zoomY: boolean) {
            var newX = (zoomX) ? transform.rescaleX(xScale) : self._currXScale;
            var newY = (zoomY) ? transform.rescaleY(yScale) : self._currYScale ;
            self._currXScale = newX;
            self._currYScale = newY;

            // update axes with these new boundaries
            xAxis.call(d3.axisBottom(newX))
            yAxis.call(d3.axisLeft(newY))
        
            drawAllGenomicBins();
        }
        
        function chooseColor(d: MergedGenomicBin) {
            if(previous_brushed_nodes.has(String(d.location))) {
                return customColor;
            } else if (d.bins[0].CLUSTER == -1){
                return UNCLUSTERED_COLOR;
            } else if(d.bins[0].CLUSTER == -2){
                return DELETED_COLOR;
            } else {
                const cluster = d.bins[0].CLUSTER;
                const col_index = cluster % colors.length;
                return colors[col_index];//colorScale(String(d.bins[0].CLUSTER));
            }
        }

        if(assignCluster) {
            this.onTrigger([...this.brushedNodes]);
            this.brushedNodes = new Set();
            this._clusters = this.initializeListOfClusters();
        }
        
        console.timeEnd("Rendering");
     }

     updatePoints(event : any) {
        if(!this._svg) {return;}
        const {brushedBins, data} = this.props;
        if (data) {
            try {
                const { selection } = d3.event;
                let rect = [[this._currXScale.invert(selection[0][0]), 
                            this._currYScale.invert(selection[1][1])], 
                            [this._currXScale.invert(selection[1][0]), 
                            this._currYScale.invert(selection[0][1])]];
                let brushNodes : MergedGenomicBin[] = visutils.filterInRectFromQuadtree(this.quadTree, rect,
                    (d : MergedGenomicBin) => d.averageBaf, 
                    (d : MergedGenomicBin)  => d.averageRd); // The new points selected
             
                if (brushNodes) {
                    if(event.sourceEvent.shiftKey) {
                        brushNodes = _.uniq(_.union(brushNodes, brushedBins));  
                    } else if(event.sourceEvent.altKey) {
                        brushNodes = _.difference(brushedBins, brushNodes);
                    }

                    this.brushedNodes = new Set(brushNodes);                  
                } 
            } catch (error) { console.log(error);}
        }
    }

    getElementsForGenomeLocation(hoveredLocation?: ChromosomeInterval): Element[] {
        if (!this._svg || !hoveredLocation || !this._canvas) {
            return [];
        }

        let hoveredRecords = this.props.data.filter(record => record.location.chr === hoveredLocation.chr 
                                                && hoveredLocation.start === record.location.start 
                                                && hoveredLocation.end === record.location.end)//record.location.hasOverlap(hoveredLocation));
        if(hoveredRecords.length === 0) {
            hoveredRecords = this.props.data.filter(record => record.location.hasOverlap(hoveredLocation))
        }

        const results: Element[] = [];
        let svg = d3.select(this._svg);
        svg.select("." + CIRCLE_GROUP_CLASS_NAME).remove();
        const colorScale = d3.scaleOrdinal(CLUSTER_COLORS).domain(this._clusters);
        svg.select(".eventrect")
            .append("g")
            .classed(CIRCLE_GROUP_CLASS_NAME, true)
            .selectAll("circle")
                .data(hoveredRecords)
                .enter()
                .append("circle")
                    .attr("id", d => this._circleIdPrefix + d.location.toString())
                    .attr("cx", d => this._currXScale(d.averageBaf))
                    .attr("cy", d => this._currYScale(d.averageRd)) // Alternatively, this could be 0.5 - baf
                    .attr("r", 3)
                    .attr("fill", d => {
                        if(this.brushedNodes.has(d)) {
                            return this.props.customColor;
                        } else if (d.bins[0].CLUSTER == -1){
                            return UNCLUSTERED_COLOR;
                        } else if(d.bins[0].CLUSTER == -2){
                            return DELETED_COLOR;
                        } else if(this.props.colors[d.bins[0].CLUSTER]) {
                            return this.props.colors[d.bins[0].CLUSTER];
                        } else {
                            return colorScale(String(d.bins[0].CLUSTER));
                        }
                    })
                    .attr("fill-opacity", 1)
                    .attr("stroke-width", 2)
                    .attr("stroke", "black");
        

        for (const record of hoveredRecords) {
            const id = this._circleIdPrefix + record.location.toString();
            const element = this._svg.getElementById(id);
            if (element) {
                results.push(element);
            }
        }

        return results;
    }

    forceHover(genomeLocation?: ChromosomeInterval) {
        this.getElementsForGenomeLocation(genomeLocation);
    }

    forceUnhover(genomeLocation?: ChromosomeInterval) {
        //const elements = this.getElementsForGenomeLocation(genomeLocation);

        if(this._svg)
            d3.select(this._svg).select("." + CIRCLE_GROUP_CLASS_NAME).remove();
    }
}