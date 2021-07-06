import React from "react";
import * as d3 from "d3";
import _ from "lodash";
import memoizeOne from "memoize-one";

import { GenomicBin, GenomicBinHelpers } from "../model/GenomicBin";
import { Genome } from "../model/Genome";
import { ChromosomeInterval } from "../model/ChromosomeInterval";
import { getRelativeCoordinates, applyRetinaFix, niceBpCount } from "../util";
import { MergedGenomicBin } from "../model/BinMerger";
import { brush } from "d3";
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
    data: MergedGenomicBin[];
    chr: string;
    dataKeyToPlot: keyof Pick<GenomicBin, "RD" | "BAF">;
    width: number;
    height: number;
    hoveredLocation?: ChromosomeInterval;
    onLocationHovered: (location: ChromosomeInterval | null) => void
    brushedBins: MergedGenomicBin[];
    onBrushedBinsUpdated: any;
    genome: Genome;
    yLabel?: string;
    yMin: number;
    yMax: number;
    customColor: string;
    colors: string[];
}

export class LinearPlot extends React.PureComponent<Props> {
    static defaultProps = {
        width: 800,
        height: 150,
        onLocationHovered: _.noop
    };

    private _svg: SVGSVGElement | null;
    private _canvas: HTMLCanvasElement | null;
    private _clusters: string[];
    private brushedNodes: Set<MergedGenomicBin>;
    constructor(props: Props) {
        super(props);
        this._svg = null;
        this._canvas = null;
        this.getXScale = memoizeOne(this.getXScale);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseLeave = this.handleMouseLeave.bind(this);
        this._clusters = this.initializeListOfClusters();
        this.brushedNodes = new Set();
    }

    initializeListOfClusters() : string[] {
        let collator = new Intl.Collator(undefined, {numeric: true, sensitivity: 'base'});
        let clusters = [...new Set(this.props.data.map(d => String(d.bins[0].CLUSTER)))].sort(collator.compare);
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
        if (this.propsDidChange(prevProps, ["yMin", "yMax", "brushedBins", "width", "height", "chr"])) {
            if(this.props["brushedBins"].length === 0)
                this._clusters = this.initializeListOfClusters();
            this.redraw();
        } else if(!(_.isEqual(this.props["data"], prevProps["data"]))) {
            console.log("Redrawing")
            this.redraw();
        }
    }

    getXScale(width: number, genome: Genome, chr?: string) {
        let domain = [0, 0];
        if (!chr) { // No chromosome specified: X domain is entire genome
            domain[1] = genome.getLength();
        } else { // Chromosome specified: X domain is length of one chromosome
            domain[0] = genome.getImplicitCoordinates(new ChromosomeInterval(chr, 0, 1)).start;
            domain[1] = domain[0] + genome.getLength(chr);
        }
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
        //console.time("Redraw Linear Plot");
        if (!this._svg) {
            return;
        }
        const {data, width, height, genome, chr, dataKeyToPlot, yMin, yMax, yLabel, customColor, brushedBins} = this.props;
        const colorScale = d3.scaleOrdinal(CLUSTER_COLORS).domain(this._clusters)

        const xScale = this.getXScale(width, genome, chr);
        const yScale = d3.scaleLinear()
            .domain([yMin, yMax])
            .range([height - PADDING.bottom, PADDING.top]);
        let xAxis;
        if (!chr) {
            const chromosomes = genome.getChromosomeList();
            xAxis = d3.axisBottom(xScale)
                .tickValues(genome.getChromosomeStarts())
                .tickFormat((unused, i) => findChrNumber(chromosomes[i].name));
        } else {
            const nonImplicitXScale = d3.scaleLinear()
                .domain([0, genome.getLength(chr)])
                .range(xScale.range())
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
        let previous : any = [];
        brushedBins.forEach(d => previous.push(String(d.location)));
        let previous_brushed_nodes = new Set(previous);

        applyRetinaFix(this._canvas);
        const ctx = this._canvas.getContext("2d")!;
        ctx.clearRect(0, 0, width, height); // Clearing an area larger than the canvas dimensions, but that's fine.
        
        for (const d of data) {
            const location = d.location;//GenomicBinHelpers.toChromosomeInterval(d);
            const range = genome.getImplicitCoordinates(location);
            const x = xScale(range.getCenter());
            const y = (dataKeyToPlot === "BAF") ? yScale(0.5-d.averageBaf) : yScale(d.averageRd);
            if(x && y && y < yScale.range()[0] && y > yScale.range()[1]) {
                if (previous_brushed_nodes.has(String(d.location))) {
                    ctx.fillStyle = customColor;
                } else {
                    ctx.fillStyle = (d.bins[0].CLUSTER == -1) ? UNCLUSTERED_COLOR : (this.props.colors[d.bins[0].CLUSTER] ? this.props.colors[d.bins[0].CLUSTER] : colorScale(String(d.bins[0].CLUSTER))); //color;
                }
                ctx.fillRect(x, y - 1, 2, 3);
            }
        }

        //this.createNewBrush();
       

        const brush = d3.brush()
        .keyModifiers(true)
        .extent([[PADDING.left, PADDING.top], 
                [this.props.width - PADDING.right, this.props.height - PADDING.bottom]])
                .on("end", () => {
                    svg.selectAll("." + "brush").remove();
                    try{
                        const { selection, currentTarget } = d3.event;
                        
                        let brushed = visutils.filterInRect(data, selection, 
                            function(d: MergedGenomicBin){
                                const location = d.location;
                                const range = genome.getImplicitCoordinates(location);
                                return xScale(range.getCenter());
                            }, 
                            function(d: MergedGenomicBin){
                                const location = d.location;//GenomicBinHelpers.toChromosomeInterval(d);
                                //const range = genome.getImplicitCoordinates(location);
                                return (dataKeyToPlot === "BAF") ? yScale(0.5-d.averageBaf) : yScale(d.averageRd);
                            });
                        this.brushedNodes = new Set(brushed);
                        this.props.onBrushedBinsUpdated([...this.brushedNodes]);
                        console.log("LINEAR PLOT BRUSHED: ", brushed);
                        //this.redraw();
                    }catch(error) {
                        console.log(error);
                    }
                });
                
        // attach the brush to the chart
        svg.append('g')
            .attr('class', 'brush')
            .call(brush);

        //console.timeEnd("Redraw Linear Plot");
    }

    renderHighlight() {
        const {width, genome, chr, hoveredLocation} = this.props;
        if (!hoveredLocation) {
            return null;
        }

        const xScale = this.getXScale(width, genome, chr);
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
            zIndex: 1
        }} />
    }

    handleMouseMove(event: React.MouseEvent) {
        const {width, genome, chr, onLocationHovered} = this.props;
        const xScale = this.getXScale(width, genome, chr);
        const range = xScale.range();
        const mouseX = getRelativeCoordinates(event).x;
        if (mouseX < range[0] || mouseX > range[1]) { // Count mouse events outside the range as mouseleaves
            this.handleMouseLeave();
            return;
        }

        const implicitLocation = xScale.invert(mouseX);
        //let test =  genome.getChromosomeLocation(implicitLocation);
        onLocationHovered(genome.getChromosomeLocation(implicitLocation));
    }

    handleMouseLeave() {
        this.props.onLocationHovered(null);
    }

    render() {
        const {width, height} = this.props;
        return <div
            className="LinearPlot"
            style={{position: "relative"}}
            onMouseMove={this.handleMouseMove}
            onMouseLeave={this.handleMouseLeave}
        >
            
            <canvas
                ref={node => this._canvas = node}
                width={width}
                height={height}
                style={{position: "absolute", zIndex: -1}} />
            {/* {this.renderHighlight()} */}
            <svg ref={node => this._svg = node} width={width} height={height} />
            
        </div>;
    }
}
