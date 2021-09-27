import React from "react";
import * as d3 from "d3";
// @ts-ignore: Unreachable code error
import * as fc from "d3fc";
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
import {webglColor, getRelativeCoordinates, applyRetinaFix, niceBpCount } from "../util";
import "./Scatterplot.css";
import {DisplayMode, ProcessingStatus} from "../App"
import {ClusterTable} from "./ClusterTable";
import { start } from "repl";
import { cluster, ContainerElement } from "d3";

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
    scales: any;
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
            selectedCluster: (this._clusters.length > 0) ? this._clusters[0] : UNCLUSTERED_ID
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
            && (this._clusters[0] == UNCLUSTERED_ID 
            || this._clusters[0] == DELETED_ID)) {
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
        //const {bafScale, rdrScale} = this.computeScales(rdRange, width, height);
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
                    {/* <div> Genome Pos: {record.genomicPosition}</div> */}
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
        
        clusterOptions.unshift(<option key={UNCLUSTERED_ID} value={UNCLUSTERED_ID} >{UNCLUSTERED_ID}</option>);
        clusterOptions.unshift(<option key={DELETED_ID} value={DELETED_ID} >{DELETED_ID}</option>);
        
        let scatterUI = <div ref={node => this.scatter= node} className="Scatterplot" >
                            <canvas
                                ref={node => this._canvas = node}
                                width={width}
                                height={height}
                                className={"canvas"}
                                style={{position: "absolute", 
                                        top: PADDING.top, 
                                        zIndex: -1, 
                                        left: PADDING.left, 
                                        width: width-PADDING.left - PADDING.right, 
                                        height: height-PADDING.top-PADDING.bottom}}
                            />
                            <svg
                                ref={node => this._svg = node}
                                width={width} height={height}
                                // preserveAspectRatio={'xMinYMin'}
                                onMouseMove={this.handleMouseMove}
                            ></svg>
                            <div className="Scatterplot-tools">
                                <button id="reset" onClick={this.resetZoom}>Reset View</button>
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
        //console.log("New Scales: ", newScales);
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
        if(this.props.scales.xScale 
            && this.props.scales.yScale 
            && prevProps.scales.xScale 
            &&  prevProps.scales.yScale 
            && (this.props.scales.xScale[0] !== prevProps.scales.xScale[0] 
                && this.props.scales.xScale[1] !== prevProps.scales.xScale[1]
                && this.props.scales.yScale[0] !== prevProps.scales.yScale[0]
                && this.props.scales.yScale[1] !== prevProps.scales.yScale[1]) ) {  
                this._currXScale.domain(this.props.scales.xScale);
                this._currYScale.domain(this.props.scales.yScale);
                this.redraw();

        } else if(this.props["assignCluster"]) {
            this.onTrigger(this.state.selectedCluster);
            this.brushedNodes = new Set();
        } else if (this.props.hoveredLocation !== prevProps.hoveredLocation) {
            this.forceUnhover();
            this.forceHover(this.props.hoveredLocation); 
        } else if (this.propsDidChange(prevProps, ["displayMode", "colors", "brushedBins", "width", "height"])) {
            let data : GenomicBin[] = this.props.data;
            // Update quadtree so that when hovering works on new points that appear 
            // (when assigning to an existing cluster - all the points in that cluster show up even if it has been filtered out)
            this.quadTree = d3
                .quadtree<GenomicBin>()
                .x((d : GenomicBin) => d.reverseBAF)
                .y((d : GenomicBin)  => d[this.props.yAxisToPlot])
                .addAll(data)
            this.redraw();
            this.forceHover(this.props.hoveredLocation);
        } else if((!(_.isEqual(this.props["data"], prevProps["data"])) || this.props.yAxisToPlot !== prevProps.yAxisToPlot)) {
            const {bafScale, rdrScale} = this.computeScales(this.props.rdRange, this.props.width, this.props.height);

            if((this._currXScale.domain()[0] === this._original_XScale.domain()[0] 
                && this._currXScale.domain()[1] === this._original_XScale.domain()[1]
                && this._currYScale.domain()[0] === this._original_YScale.domain()[0]
                && this._currYScale.domain()[1] === this._original_YScale.domain()[1])) {  
                // When the sample filter changes, the y-axis max will also change so must recaculate the scales
                // Original scales saves the scales to which we should reset the view
                this._currXScale = bafScale;
                this._currYScale = rdrScale;
                this._original_XScale = this._currXScale;
                this._original_YScale = this._currYScale;
            } else { // If zoom is applied, then update original scales but don't change current zoom
                // CASE 1: going to log
                if(this.props.yAxisToPlot !== prevProps.yAxisToPlot){
                    let currentYDomain = this._currYScale.domain();
                    if (this.props.yAxisToPlot==="logRD") {  
                        if(currentYDomain[0] <= 0) {
                            currentYDomain[0] = 0.1;
                        }
                        if(currentYDomain[1] <= 0) {
                            currentYDomain[1] = 0.1;
                        }
                        const newYDomain = [Math.log2(currentYDomain[0]), Math.log2(currentYDomain[1])];
                        this._currYScale = d3.scaleLinear().domain(newYDomain).range(this._currYScale.range());
                    } else {
                        const newYDomain = [Math.pow(2, currentYDomain[0]), Math.pow(2, currentYDomain[1])];
                        this._currYScale = d3.scaleLinear().domain(newYDomain).range(this._currYScale.range());
                    }
                   
                } 
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

        if(this.props.clusterTableData !== prevProps.clusterTableData) {
            this.initializeListOfClusters();
        }
    }

    computeScales(rdRange: [number, number], width: number, height: number, 
                    bafRange?: [number, number], useLowerBound?: boolean) {
        //console.log("Computing Scales");
        let bafScaleRange = [PADDING.left, width - PADDING.right];
        let rdrScaleRange = [height - PADDING.bottom, PADDING.top];
        const rdLowerBound = (useLowerBound) ? rdRange[0] :((this.props.applyLog) ? -2 : 0);
        let baf = bafRange ? bafRange : [-.0001, 0.5001] // .0001 allows for points exactly on the axis to still be seen
        
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
        console.time("Scatter draw");
        //console.time("Rendering");
        if (!this._svg || !this._canvas || !this.scatter) {
            return;
        }
        let self = this;
        const {width, height, customColor, brushedBins, data, colors, yAxisToPlot} = this.props;
        let {displayMode} = this.props;
        let xScale = this._currXScale;
        let yScale = this._currYScale;
        let xLabel = "Allelic Imbalance (0.5 - BAF)";
        let yLabel = yAxisToPlot === "RD" ? "RDR" : "log RDR";
        
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
            .attr("y", PADDING.left-40)
            .attr("x", 0-_.mean(this._currYScale.range()))
            .attr("transform", `rotate(-90)`)
            .style("text-anchor", "middle")
            .text(yLabel);
        
        let xAx = (g : any, scale : any) => g
            .classed(SCALES_CLASS_NAME, true)
            .attr("transform", `translate(0, ${height - PADDING.bottom})`)
            .call(d3.axisBottom(scale))
        
        let yAx = (g : any, scale : any) => g
            .classed(SCALES_CLASS_NAME, true)
            .attr("transform", `translate(${PADDING.left}, 0)`)
            .call(d3.axisLeft(scale))
            

        let previous : string[] = [];
        
        brushedBins.forEach(d => previous.push(GenomicBinHelpers.toChromosomeInterval(d).toString()))
        this.previous_brushed_nodes = new Set(previous);
        
        const previous_brushed_nodes = this.previous_brushed_nodes;
        //console.log("Brushed Bins1: ", [...previous_brushed_nodes]);

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
                if(displayMode === DisplayMode.zoom || !(doX && doY)) {
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
                let newScales = {xScale: self._currXScale.domain(), yScale: self._currYScale.domain()}
                //console.log("New Scales: ", newScales);
                self.props.onZoom(newScales);
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
        
        let fillColor = fc.webglFillColor().value(languageFill).data(self.props.data);
        let pointSeries = fc
            .seriesWebglPoint()
            .xScale(self._currXScale)
            .yScale(self._currYScale)
            .size(3)
            .crossValue((d : any) => d.reverseBAF)
            .mainValue((d : any) => d[yAxisToPlot])
            .context(gl);
        pointSeries.decorate((program:any) => fillColor(program));

        let pointSeries2 = fc
            .seriesWebglPoint()
            .xScale(self._currXScale)
            .yScale(self._currYScale)
            .size(3)
            .crossValue((d : any) => d.reverseBAF)
            .mainValue((d : any) => d[yAxisToPlot])
            .context(gl);
        pointSeries2.decorate((program:any) => fillColor(program));

        function redraw() {
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
                //let dataMinusBrush = _.difference(data, [...brushedBins]);
                //pointSeries(dataMinusBrush.concat([...brushedBins]));
                pointSeries(data);     
            }
        }
        
        this._canvas.width = width;
        this._canvas.height = height;

        redraw();

        // Create event-rect that allows for svg points to be overlayed under mouse pointer
        var event_rect = svg
            .append("g")
            .classed("eventrect", true)
            .append("rect")
                .on("dblclick", e => console.log("Double click"))
                .attr("x", PADDING.left)
                .attr("y", PADDING.top)
                .attr("width", width - PADDING.right - PADDING.left)
                .attr("height", height - PADDING.bottom - PADDING.top)
                .style("fill", "none")
                .style("pointer-events", "all")
                .attr("clip-path", "url(#clip)");

        

        if(displayMode === DisplayMode.select || displayMode === DisplayMode.erase) {
            const brush = d3.brush()
            .keyModifiers(false)
            .extent([[PADDING.left - 2*CIRCLE_R, PADDING.top - 2*CIRCLE_R], 
                    [this.props.width - PADDING.right + 2*CIRCLE_R , this.props.height - PADDING.bottom + 2*CIRCLE_R]])
                    .on("end", () => {
                        this.updatePoints(d3.event)
                        svg.selectAll("." + "brush").remove();
                        this.onBrushedBinsUpdated([...this.brushedNodes]);
                    });
            
              
            // attach the brush to the chart
            svg.append('g')
                .attr('class', 'brush')
                .call(brush);

        } else if(displayMode === DisplayMode.zoom) {
            svg.selectAll("." + "brush").remove();
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
                    //console.log("Not Clearing");
                    let rect = [[self._currXScale.invert(selection[0][0]), self._currYScale.invert(selection[1][1])], // bottom left (x y)
                                [self._currXScale.invert(selection[1][0]), self._currYScale.invert(selection[0][1])]]; // top right (x y)
                                
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
                } else {
                    //console.log("Clearing");
                }
            }
        }
        
        function chooseColor(d: GenomicBin) {
            if(previous_brushed_nodes.has(GenomicBinHelpers.toChromosomeInterval(d).toString())) {
                //console.log(1);
                return customColor;
            } else if (d.CLUSTER == -1){
                //console.log(2);
                return UNCLUSTERED_COLOR;
            } else if(d.CLUSTER == -2){
                //console.log(3);
                return DELETED_COLOR;
            } else {
                ///onsole.log(4);
                const cluster = d.CLUSTER;
                const col_index = cluster % colors.length;
                return colors[col_index];
            }
        }
        
        //console.timeEnd("Rendering");
        console.timeEnd("Scatter draw");
     }

     updatePoints(event : any) {
        if(!this._svg) {return;}
        const {brushedBins, data, yAxisToPlot, displayMode} = this.props;
        if (data) {
            //try {
                const { selection } = d3.event
                if(selection) {
                let rect = [[this._currXScale.invert(selection[0][0]), 
                            this._currYScale.invert(selection[1][1])], 
                            [this._currXScale.invert(selection[1][0]) , 
                            this._currYScale.invert(selection[0][1])]];
               
                // let brushNodes : GenomicBin[] = visutils.filterInRectFromQuadtree(this.quadTree, rect,
                //     (d : GenomicBin) => d.reverseBAF, 
                //     (d : GenomicBin)  => d[yAxisToPlot]); // The new points selected
                
                function rectContains(rect : any, point : any) {
                    const X = 0;
                    const Y = 1;
                    const TOP_LEFT = 0;
                    const BOTTOM_RIGHT = 1;
                    return rect[TOP_LEFT][X] <= point[X] && point[X] <= rect[BOTTOM_RIGHT][X] &&
                           rect[TOP_LEFT][Y] <= point[Y] && point[Y] <= rect[BOTTOM_RIGHT][Y];
                }
                let brushNodes = data.filter(d => rectContains(selection, [this._currXScale(d.reverseBAF), this._currYScale(d[yAxisToPlot])]));
                
                //console.log("Amount of brushed nodes: ", brushNodes.length);
                if (brushNodes) {
                    if(displayMode == DisplayMode.select) {//event.sourceEvent.shiftKey) {
                        brushNodes = _.uniq(_.union(brushNodes, brushedBins));  
                    } else if(displayMode == DisplayMode.erase) {
                        brushNodes = _.difference(brushedBins, brushNodes);
                    }

                    this.brushedNodes = new Set(brushNodes);                  
                } 
            } else {
                //console.log("TEST");
                this.brushedNodes = new Set([]);
            }
            //} catch (error) { console.log(error);}
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