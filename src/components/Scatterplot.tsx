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
import {GenomicBin, GenomicBinHelpers} from "../model/GenomicBin";
import { getRelativeCoordinates, applyRetinaFix, niceBpCount } from "../util";
import "./Scatterplot.css";
import {DisplayMode} from "../App"
import {ClusterTable} from "./ClusterTable";
import { start } from "repl";
import { cluster } from "d3";

const visutils = require('vis-utils');

const PADDING = { // For the SVG
    left: 60,
    right: 20,
    top: 35,
    bottom: 60,
};

const UNCLUSTERED_COLOR = "#999999";
const DELETED_COLOR = "rgba(232, 232, 232, 1)";
const UNCLUSTERED_ID = "-1";
const DELETED_ID = "-2";
//const HIGHLIGHT_COLOR = "red";

const SCALES_CLASS_NAME = "scatterplot-scale";
const CIRCLE_GROUP_CLASS_NAME = "circles";
const CIRCLE_R = 1;
const SELECTED_CIRCLE_R_INCREASE = 2;
const TOOLTIP_OFFSET = 10; // Pixels
let nextCircleIdPrefix = 0;

interface Props {
    parentCallBack: any;
    data: GenomicBin[];
    rdRange: [number, number];
    yAxisToPlot: keyof Pick<GenomicBin, "RD" | "logRD">;
    hoveredLocation?: ChromosomeInterval;
    width: number;
    height: number;
    curveState: CurveState;
    invertAxis: boolean;
    onNewCurveState: (state: Partial<CurveState>) => void;
    onRecordsHovered: (record: GenomicBin | null) => void;
    onBrushedBinsUpdated: (brushedBins: GenomicBin[]) => void;
    customColor: string;
    col: string;
    colors: string[];
    assignCluster: boolean;
    brushedBins: GenomicBin[];
    updatedBins: boolean;
    displayMode: DisplayMode;
    onZoom: (newScales: any) => void;
    clusterTableData: any;
    applyLog: boolean;
    onClusterSelected: any;
}

interface State {
    selectedCluster: string;
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
    private quadTree: d3.Quadtree<GenomicBin>;
    private _canvas: HTMLCanvasElement | null;
    private _currXScale: d3.ScaleLinear<number, number>;
    private _currYScale: d3.ScaleLinear<number, number>;
    private _original_XScale: d3.ScaleLinear<number, number>;
    private _original_YScale: d3.ScaleLinear<number, number>;

    private _original_transform: any;
    private _current_transform: any;
    private scatter: any;
    private zoom: any;
    //private selectedCluster: string;

    constructor(props: Props) {
        super(props);   
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
        this.state = {
            selectedCluster: this._clusters[0]
        }
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
        this.quadTree = d3
            .quadtree<GenomicBin>()
            .x((d : GenomicBin) => d.reverseBAF)
            .y((d : GenomicBin)  => d[props.yAxisToPlot])
            .addAll(data)

        this._original_transform = d3.zoomIdentity.translate(0, 0).scale(1);
        this._current_transform = this._original_transform;
    }

    initializeListOfClusters() : string[] {
        let collator = new Intl.Collator(undefined, {numeric: true, sensitivity: 'base'});
        let clusters = [...new Set(this.props.data.map(d => String(d.CLUSTER)))].sort(collator.compare); 
        return clusters;
    }

    handleMouseMove(event: React.MouseEvent<SVGSVGElement>) {
        // const {rdRange, width, height, curveState, onNewCurveState, invertAxis} = this.props;
        const {x, y} = getRelativeCoordinates(event);
        const hoveredRdBaf = {
            rd: this._currYScale.invert(y),
            baf: this._currXScale.invert(x)
        };

        if( hoveredRdBaf.baf < this._currXScale.domain()[0] && hoveredRdBaf.baf > this._currXScale.domain()[1] 
            && hoveredRdBaf.rd > this._currYScale.domain()[0] && hoveredRdBaf.rd < this._currYScale.domain()[1] ) {
            
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

            if (hoveredRecords.length === 1 && x && y && x > range[0] && x < range[1] && y < range2[0] && y > range2[1]) {
                const record = hoveredRecords[0];
                const recordLocation = GenomicBinHelpers.toChromosomeInterval(record);
                return this.renderTooltipAtRdBaf(record[yAxisToPlot], record.reverseBAF, <React.Fragment>
                    <p>
                        <b>{recordLocation.toString()}</b><br/>
                        ({niceBpCount(recordLocation.getLength())})
                    </p>
                    <div> RDR: {record[yAxisToPlot].toFixed(2)}</div>
                    <div> 0.5 - BAF: {record.reverseBAF.toFixed(2)}</div>
                    <div> Cluster ID: {record.CLUSTER}</div>
                </React.Fragment>);
            } 
        }

        return null;
    }

    render() {
        
        const {width, height, displayMode} = this.props;
        let clusterOptions = this._clusters.map(clusterName =>
            <option key={clusterName} value={clusterName} >{clusterName}</option>
        );
        
        if(!this._clusters.includes(UNCLUSTERED_ID)) {
            clusterOptions.unshift(<option key={UNCLUSTERED_ID} value={UNCLUSTERED_ID} >{UNCLUSTERED_ID}</option>);
        }

        if(!this._clusters.includes(DELETED_ID)) {
            clusterOptions.unshift(<option key={DELETED_ID} value={DELETED_ID} >{DELETED_ID}</option>);
        }
        
        
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
                                {(displayMode==DisplayMode.zoom 
                                    || displayMode==DisplayMode.boxzoom 
                                    || displayMode==DisplayMode.select) 
                                    && <button id="reset" onClick={this.resetZoom}>Reset View</button>}
                                {(displayMode==DisplayMode.select) 
                                    && <button id="new-cluster" onClick={()=>{
                                    const highestCurrentCluster = Number(this._clusters[this._clusters.length-1]);
                                    let nextAvailable = highestCurrentCluster + 1;
                                    let startIndex = 0;

                                    // Assumes the clusters are sorted least to greatest
                                    for(let i = 0; i < 2; i++) {
                                        if(this._clusters[i] === UNCLUSTERED_ID || this._clusters[i] === DELETED_ID) {
                                            startIndex++;
                                        }
                                    }

                                    for(let i = 0; i < this._clusters.length; i++) {
                                        if(Number(this._clusters[i + startIndex]) !== i){
                                            nextAvailable = i;
                                            break;
                                        }
                                    }
                                    
                                    this.onTrigger(nextAvailable);
                                    this.brushedNodes = new Set();
                                    this._clusters = this.initializeListOfClusters();
                                }} >New Cluster</button>}
                                {(displayMode==DisplayMode.select) &&
                                    <button id="assign-cluster" onClick={() => {
                                        this.onTrigger(this.state.selectedCluster);
                                        this.brushedNodes = new Set();
                                        this._clusters = this.initializeListOfClusters();
                                    }}>Assign Cluster</button>}
                                {(displayMode==DisplayMode.select) &&
                                    <select
                                        name="Select Cluster" 
                                        id="Select Cluster"
                                        value={this.state.selectedCluster}
                                        onChange={(event: React.ChangeEvent<HTMLSelectElement>) => {this.setState({selectedCluster: event.target.value})}} >
                                        {clusterOptions}
                                    </select>}
                            </div>

                            {this.renderTooltip()}
                        </div>;
        return scatterUI;
    }

    resetZoom() {
        if(!this._svg) { return; }
        this._currXScale = this._original_XScale;
        this._currYScale = this._original_YScale;
        const newScales = {xScale: this._currXScale.domain(), yScale: this._currYScale.domain()}
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
        if(this.props["assignCluster"]) {
            this.onTrigger(this.state.selectedCluster);
            this.brushedNodes = new Set();
            this._clusters = this.initializeListOfClusters();
        } else if (this.propsDidChange(prevProps, ["displayMode", "colors", "brushedBins", "width", "height"])) {
            this.redraw();
            this.forceHover(this.props.hoveredLocation);
        } else if (this.props.hoveredLocation !== prevProps.hoveredLocation) {
            this.forceUnhover();
            this.forceHover(this.props.hoveredLocation); 
        }
         else if(!(_.isEqual(this.props["data"], prevProps["data"])) || this.props.yAxisToPlot !== prevProps.yAxisToPlot) {
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
            
            let data : GenomicBin[] = this.props.data;
            this.quadTree = d3
                .quadtree<GenomicBin>()
                .x((d : GenomicBin) => d.reverseBAF)
                .y((d : GenomicBin)  => d[this.props.yAxisToPlot])
                .addAll(data)

            let newScales = {xScale: this._currXScale.domain(), yScale: this._currYScale.domain()}
            this.props.onZoom(newScales);
            this.redraw();
            this.forceHover(this.props.hoveredLocation);
        }
    }

    computeScales(rdRange: [number, number], width: number, height: number, 
                    bafRange?: [number, number], useLowerBound?: boolean) {
        let bafScaleRange = [PADDING.left, width - PADDING.right];
        let rdrScaleRange = [height - PADDING.bottom, PADDING.top];
        const rdLowerBound = (useLowerBound) ? rdRange[0] :((this.props.applyLog) ? -2 : 0);
        let baf = bafRange ? bafRange : [0.5001, -.0001] // .0001 allows for points exactly on the axis to still be seen
        
        return {
            bafScale: d3.scaleLinear()
                .domain(baf)
                .range(bafScaleRange),
            rdrScale: d3.scaleLinear()
                .domain([rdLowerBound, rdRange[1]])
                .range(rdrScaleRange)
        };
    }

    onTrigger = (selectedCluster: string | number) => {
        this.props.parentCallBack(selectedCluster);
    }

    onBrushedBinsUpdated = (brushedNodes: GenomicBin[]) => {
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
        const {width, height, customColor, brushedBins, data, colors, yAxisToPlot} = this.props;
        let {displayMode} = this.props;
        let xScale = this._currXScale;
        let yScale = this._currYScale;
        let xLabel = "0.5 - BAF";
        let yLabel = "RDR";
        
        const svg = d3.select(this._svg);

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
            
        let previous : string[] = [];
        brushedBins.forEach(d => previous.push(GenomicBinHelpers.toChromosomeInterval(d).toString()))
        this.previous_brushed_nodes = new Set(previous);
        const previous_brushed_nodes = this.previous_brushed_nodes;

        const ctx = this._canvas.getContext("2d")!;
        this.zoom = d3.zoom()
            .scaleExtent([0, 100])
            .extent([[0, 0], [width, height]])
            .on("zoom", () => {
                if (displayMode === DisplayMode.select) {
                    return null;
                }
                const transform = d3.event.transform;
                this._current_transform = transform;
                ctx.save();
                zoomAxes(this._current_transform, true, true);
                ctx.restore();
            }).on("end", () => {
                let newScales = {xScale: self._currXScale.domain(), yScale: self._currYScale.domain()}
                self.props.onZoom(newScales);
            });
        
        let zoomY : any = d3.zoom()
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
                if(!previous_brushed_nodes.has(GenomicBinHelpers.toChromosomeInterval(d).toString())) {
                    drawGenomicBin(d);
                }
            }
            for (const d of data) {
                if(previous_brushed_nodes.has(GenomicBinHelpers.toChromosomeInterval(d).toString())) {
                    drawGenomicBin(d);
                }
            }
        }

        function drawGenomicBin(d : GenomicBin) {
            const x = self._currXScale(d.reverseBAF);
            const y = self._currYScale(d[yAxisToPlot]);
            
            let range = self._currXScale.range();
            let range2 = self._currYScale.range();

            if(x && y && x > range[0] && x < range[1] && y < range2[0] && y > range2[1]) {
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
                        console.log([...this.brushedNodes])
                        this.onBrushedBinsUpdated([...this.brushedNodes]);
                    });
                    
            // // attach the brush to the chart
            svg.append('g')
                .attr('class', 'brush')
                .call(brush);
            svg
                .on("mouseenter", () => { 
                    xScale = this._currXScale;
                    yScale = this._currYScale;
                })
                .call(this.zoom) 
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
        
        function chooseColor(d: GenomicBin) {
            if(previous_brushed_nodes.has(GenomicBinHelpers.toChromosomeInterval(d).toString())) {
                return customColor;
            } else if (d.CLUSTER == -1){
                return UNCLUSTERED_COLOR;
            } else if(d.CLUSTER == -2){
                return DELETED_COLOR;
            } else {
                const cluster = d.CLUSTER;
                const col_index = cluster % colors.length;
                return colors[col_index];
            }
        }
        
        console.timeEnd("Rendering");
     }

     updatePoints(event : any) {
        if(!this._svg) {return;}
        const {brushedBins, data, yAxisToPlot} = this.props;
        if (data) {
            try {
                const { selection } = d3.event;
                let rect = [[this._currXScale.invert(selection[1][0]), 
                            this._currYScale.invert(selection[1][1])], 
                            [this._currXScale.invert(selection[0][0]), 
                            this._currYScale.invert(selection[0][1])]];
                let brushNodes : GenomicBin[] = visutils.filterInRectFromQuadtree(this.quadTree, rect,
                    (d : GenomicBin) => d.reverseBAF, 
                    (d : GenomicBin)  => d[yAxisToPlot]); // The new points selected
             
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
            && hoveredLocation.end === currLoc.end)}) //record.location.hasOverlap(hoveredLocation));
        
        if(hoveredRecords.length === 0) {
            hoveredRecords = data.filter(record => GenomicBinHelpers.toChromosomeInterval(record).hasOverlap(hoveredLocation))
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
                        } else if (d.CLUSTER == -1){
                            return UNCLUSTERED_COLOR;
                        } else if(d.CLUSTER == -2){
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