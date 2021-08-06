import React from "react";
import * as d3 from "d3";
import _ from "lodash";
import memoizeOne from "memoize-one";

import { GenomicBin, GenomicBinHelpers } from "../model/GenomicBin";
import { Genome, Chromosome } from "../model/Genome";
import { ChromosomeInterval } from "../model/ChromosomeInterval";
import { getRelativeCoordinates, applyRetinaFix, niceBpCount } from "../util";
import { MergedGenomicBin } from "../model/BinMerger";
import { brush } from "d3";
import { DisplayMode } from "../App";
import { start } from "repl";
import "./LinearPlot.css";

const visutils = require('vis-utils');
const SCALES_CLASS_NAME = "linearplot-scale";
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
const UNCLUSTERED_COLOR = "#999999";
const DELETED_COLOR = "rgba(232, 232, 232, 1)";
const PADDING = { // For the SVG
    left: 50,
    right: 10,
    top: 10,
    bottom: 35,
};

function findChrNumber(chr: string) {
    const match = chr.match(/\d+/);
    if (!match) {
        return chr;
    } else {
        return match[0];
    }
}

interface Props {
    data: GenomicBin[];
    chr: string;
    dataKeyToPlot: keyof Pick<GenomicBin, "RD" | "logRD" | "reverseBAF" | "BAF">;
    width: number;
    height: number;
    hoveredLocation?: ChromosomeInterval;
    onLocationHovered: (location: ChromosomeInterval | null) => void
    brushedBins: GenomicBin[];
    onBrushedBinsUpdated: (brushedBins: GenomicBin[]) => void;
    genome: Genome;
    yLabel?: string;
    yMin: number;
    yMax: number;
    implicitStart ?: number;
    implicitEnd ?: number;
    customColor: string;
    colors: string[];
    clusterTableData: any;
    displayMode: DisplayMode;
    onLinearPlotZoom: (genomicRange: [number, number] | null) => void;
}

export class LinearPlot extends React.PureComponent<Props> {
    static defaultProps = {
        width: 600,
        height: 150,
        onLocationHovered: _.noop
    };

    private _svg: SVGSVGElement | null;
    private _canvas: HTMLCanvasElement | null;
    private _clusters: string[];
    private brushedNodes: Set<GenomicBin>;
    private implicitStart : number | null;
    private implicitEnd : number | null;

    constructor(props: Props) {
        super(props);
        //console.log("Linear plot cluster tbale data: ", props.clusterTableData);
        this._svg = null;
        this._canvas = null;
        this.getXScale = memoizeOne(this.getXScale);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseLeave = this.handleMouseLeave.bind(this);
        this._clusters = this.initializeListOfClusters();
        this.brushedNodes = new Set();
        this.implicitStart = null;
        this.implicitEnd = null;
    }

    initializeListOfClusters() : string[] {
        let collator = new Intl.Collator(undefined, {numeric: true, sensitivity: 'base'});
        let clusters = [...new Set(this.props.data.map(d => String(d.CLUSTER)))].sort(collator.compare);
        if(clusters[0] === "-2") {
            clusters.shift();
        }
        if(clusters[0] === "-1") {
            clusters.shift();
        }
        return clusters;  
    }

    componentDidMount() {
        this.redraw();
    }

    propsDidChange(prevProps: Props, keys: (keyof Props)[]) {
        return keys.some(key => this.props[key] !== prevProps[key]);
    }

    componentDidUpdate(prevProps: Props) {
        if(this.propsDidChange(prevProps, ["chr"])) {
            this.implicitStart = null;
            this.implicitEnd = null;
            this.redraw();
        } else if (this.propsDidChange(prevProps, ["displayMode", "yMin", "yMax", "colors", "brushedBins", "width", "height", "chr"])) {
            if(this.props["brushedBins"].length === 0)
                this._clusters = this.initializeListOfClusters();
            this.redraw();
        } else if(!(_.isEqual(this.props["data"], prevProps["data"])) || this.props["dataKeyToPlot"] !== prevProps["dataKeyToPlot"]) {
            this.redraw();
        }
    }

    getXScale(width: number, genome: Genome, chr?: string, implicitStart ?: number | null, implicitEnd ?: number | null) {
        let domain = [0, 0];
        //console.log("TEST: ", implicitStart + "  " + implicitEnd);
        if(implicitStart && implicitEnd) {
            //console.log("TEST");
            domain[0] = implicitStart;
            domain[1] = implicitEnd;
        } else if (!chr) { // No chromosome specified: X domain is entire genome
            domain[1] = genome.getLength();
        } else { // Chromosome specified: X domain is length of one chromosome
            domain[0] = genome.getImplicitCoordinates(new ChromosomeInterval(chr, 0, 1)).start;
            domain[1] = domain[0] + genome.getLength(chr);
        }

        //domain[1] = 7000000;
        return d3.scaleLinear()
            .domain(domain)
            .range([PADDING.left, width - PADDING.right]);
    }

    createNewBrush() {
        const svg = d3.select(this._svg);
        const brush = d3.brush()
        .keyModifiers(true)
        .extent([[PADDING.left, PADDING.top], 
                [this.props.width - PADDING.right, this.props.height - PADDING.bottom]])
                .on("end", () => {
                    svg.selectAll("." + "brush").remove();
                    
                });
                
        // attach the brush to the chart
        svg.append('g')
            .attr('class', 'brush')
            .call(brush);
    }

    redraw() {
        if (!this._svg) {
            return;
        }
        let self = this;
        const {data, width, height, genome, chr, dataKeyToPlot, 
            yMin, yMax, yLabel, customColor, brushedBins, colors, displayMode} = this.props;
        const xScale = this.getXScale(width, genome, chr, this.implicitStart, this.implicitEnd);
        const yScale = d3.scaleLinear()
            .domain([yMin, yMax])
            .range([height - PADDING.bottom, PADDING.top]);
        let xAxis;
        if (!chr) {
            
            const chromosomes = genome.getChromosomeList();

            xAxis = d3.axisBottom(xScale)
                .tickValues(genome.getChromosomeStarts2(chromosomes))
                .tickFormat((unused, i) => findChrNumber(chromosomes[i].name));
        } else {
            
            let nonImplicitXScale = d3.scaleLinear()
                .domain([0, genome.getLength(chr)])
                .range(xScale.range())
            if (this.implicitStart && this.implicitEnd) {
                console.log("TEST")
                const selectedNonImplicitStart = genome.getChromosomeLocation(this.implicitStart);
                const selectedNonImplicitEnd = genome.getChromosomeLocation(this.implicitEnd);
                nonImplicitXScale = d3.scaleLinear()
                .domain([selectedNonImplicitStart.start, selectedNonImplicitEnd.end])
                .range(xScale.range())
            }
            xAxis = d3.axisBottom(nonImplicitXScale)
                .tickFormat(baseNum => niceBpCount(baseNum.valueOf(), 0));
        }
        
        const yAxis = d3.axisLeft(yScale)
            .ticks((yScale.range()[0] - yScale.range()[1]) / 15); // Every ~10 pixels

        const svg = d3.select(this._svg);
        // Remove any previous scales
        svg.selectAll("." + SCALES_CLASS_NAME).remove();

        // X axis stuff
        svg.append("g")
            .classed(SCALES_CLASS_NAME, true)
            .attr("transform", `translate(0, ${height - PADDING.bottom})`)
            .call(xAxis);
        svg.append("text")
            .classed(SCALES_CLASS_NAME, true)
            .attr("text-anchor", "middle")
            .attr("font-size", 11)
            .attr("x", _.mean(xScale.range()))
            .attr("y", height - PADDING.bottom + 30)
            .text(chr || genome.getName());

        // Y axis stuff
        svg.append("g")
            .classed(SCALES_CLASS_NAME, true)
            .attr("transform", `translate(${PADDING.left}, 0)`)
            .call(yAxis);
        svg.append("text")
            .classed(SCALES_CLASS_NAME, true)
            //.attr("transform", `rotate(90, ${PADDING.left - 40}, ${_.mean(yScale.range())})`)
            .attr("transform", `rotate(-90, ${PADDING.left- 30}, ${_.mean(yScale.range())})`)
            .text(yLabel || dataKeyToPlot)
            .attr("y", _.mean(yScale.range()));

        // Data
        if (!this._canvas) {
            return;
        }

        this._canvas.width = 800;
        this._canvas.height = 150;
        let previous : string[] = [];
        brushedBins.forEach(d => previous.push(GenomicBinHelpers.toChromosomeInterval(d).toString()));
        let previous_brushed_nodes = new Set(previous);
        
        //console.time("Linear plot DRAWING POINTS")
        applyRetinaFix(this._canvas);
        const ctx = this._canvas.getContext("2d")!;
        ctx.clearRect(0, 0, width, height); // Clearing an area larger than the canvas dimensions, but that's fine.
        
        for (const d of data) {
            const location = GenomicBinHelpers.toChromosomeInterval(d);
            const range = genome.getImplicitCoordinates(location);
            const x = xScale(range.getCenter());
            const y = yScale(d[dataKeyToPlot]);
            if(x && y && y < yScale.range()[0] && y > yScale.range()[1] 
                    && x < xScale.range()[1] && x > xScale.range()[0]) {
                ctx.fillStyle = chooseColor(d);
                ctx.fillRect(x, y - 1, 2, 3);
            }
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
        let brush : any = null;
        if(displayMode == DisplayMode.select) {
        brush = d3.brush()
        .keyModifiers(false)
        .extent([[PADDING.left, PADDING.top], 
                [this.props.width, this.props.height - PADDING.bottom]])
                .on("start brush", () => {
                    if(d3.event.metaKey) {
                        console.log("TEST");
                    } else {
                        try{
                            const { selection} = d3.event;
                            
                            let brushed : GenomicBin[] = visutils.filterInRect(data, selection, 
                                function(d: GenomicBin){
                                    const location = GenomicBinHelpers.toChromosomeInterval(d);
                                    const range = genome.getImplicitCoordinates(location);
                                    return xScale(range.getCenter());
                                }, 
                                function(d: GenomicBin){
                                    const location = GenomicBinHelpers.toChromosomeInterval(d);
                                    //const range = genome.getImplicitCoordinates(location);
                                    return yScale(d[dataKeyToPlot]);
                                });

                            if(d3.event.sourceEvent.shiftKey) {
                                brushed = _.uniq(_.union(brushed, brushedBins));  
                            } else if(d3.event.sourceEvent.altKey) {
                                brushed = _.difference(brushedBins, brushed);
                            }

                            this.brushedNodes = new Set(brushed);  
                        }catch(error) {
                            console.log(error);
                        }
                    }
                })
                .on("end", () => {
                    svg.selectAll("." + "brush").remove();
                    this.props.onBrushedBinsUpdated([...this.brushedNodes]);
                });
        } else {
            //svg.selectAll("." + "brush").remove();
            brush = d3.brushX().extent([[PADDING.left, PADDING.top], 
                [this.props.width, this.props.height - PADDING.bottom]])
                .on("end", () => {
                    svg.selectAll("." + "brush").remove();
                    const {selection} = d3.event;
                    try {
                        //console.log(selection);
                        const startEnd = {
                            start: selection[0],
                            end: selection[1]
                        };
                        const implicitStart = xScale.invert(startEnd.start);
                        const implicitEnd = xScale.invert(startEnd.end);
                        this.implicitStart = implicitStart;
                        this.implicitEnd = implicitEnd;
                        this.props.onLinearPlotZoom([this.implicitStart, this.implicitEnd]);
                        
                    } catch (error) {

                    }
                    this.redraw();
                    
                })
        }
             
        // attach the brush to the chart
        svg.append('g')
            .attr('class', 'brush')
            .call(brush);

    }

    renderHighlight() {
        const {width, genome, chr, hoveredLocation} = this.props;
        if (!hoveredLocation) {
            return null;
        }

        const xScale = this.getXScale(width, genome, chr, this.implicitStart, this.implicitEnd);
        const implicitCoords = genome.getImplicitCoordinates(hoveredLocation);
        const start = xScale(implicitCoords.start);
        const boxWidth = Math.ceil((xScale(implicitCoords.end) || 0) - (start || 0));
        return <div style={{
            position: "absolute",
            left: start,
            width: boxWidth,
            height: "100%",
            backgroundColor: "rgba(255,255,0,0.2)",
            border: "1px solid rgba(255,255,0,0.7)",
            zIndex: -1
        }} />
    }

    handleMouseMove(event: React.MouseEvent) {
        const {width, genome, chr, onLocationHovered} = this.props;
        const xScale = this.getXScale(width, genome, chr, this.implicitStart, this.implicitEnd);
        const range = xScale.range();
        const mouseX = getRelativeCoordinates(event).x;
        if (mouseX < range[0] || mouseX > range[1]) { // Count mouse events outside the range as mouseleaves
            this.handleMouseLeave();
            return;
        }
        const implicitLocation = xScale.invert(mouseX);
        onLocationHovered(genome.getChromosomeLocation(implicitLocation));
    }

    handleMouseLeave() {
        this.props.onLocationHovered(null);
    }

    render() {
        const {width, height, displayMode, dataKeyToPlot} = this.props;
        return <div
            className="LinearPlot"
            style={{position: "relative"}}
            onMouseMove={this.handleMouseMove}
            onMouseLeave={this.handleMouseLeave}
        >   
            
            
            {this.renderHighlight()}
            <canvas
                ref={node => this._canvas = node}
                width={width}
                height={height}
                style={{position: "absolute", zIndex: -1}} />
            
            <svg ref={node => this._svg = node} width={width} height={height} />
            <div className="LinearPlot-tools">
                {((displayMode==DisplayMode.zoom 
                || displayMode==DisplayMode.boxzoom) && (dataKeyToPlot === "RD" || dataKeyToPlot === "logRD"))
                && <button onClick={() => {
                    this.implicitStart = null;
                    this.implicitEnd = null;
                    this.props.onLinearPlotZoom(null);
                    this.redraw();

                }}>Reset View</button>}
            </div>
        </div>;
    }
}
