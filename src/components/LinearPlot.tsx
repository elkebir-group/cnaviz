import React from "react";
import * as d3 from "d3";
// @ts-ignore: Unreachable code error
import * as fc from "d3fc";
import _ from "lodash";
import memoizeOne from "memoize-one";

import { GenomicBin, GenomicBinHelpers } from "../model/GenomicBin";
import { Genome, Chromosome } from "../model/Genome";
import { ChromosomeInterval } from "../model/ChromosomeInterval";
import {webglColor, getRelativeCoordinates, niceBpCount } from "../util";
import { DisplayMode } from "../App";
import "./LinearPlot.css";
import { Gene } from "../model/Gene";

const visutils = require('vis-utils');
const SCALES_CLASS_NAME = "linearplot-scale";
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
    onLocationHovered: (location: ChromosomeInterval | null) => void;
    brushedBins: GenomicBin[];
    onBrushedBinsUpdated: (brushedBins: GenomicBin[]) => void;
    genome: Genome;
    yLabel?: string;
    yMin: number;
    yMax: number;
    implicitStart : number | null;
    implicitEnd : number | null;
    customColor: string;
    colors: string[];
    clusterTableData: any;
    displayMode: DisplayMode;
    onLinearPlotZoom: (genomicRange: [number, number] | null, yscale: [number, number] | null, key: boolean, reset?: boolean) => void;
    onZoom: (newScales: any) => void;
    driverGenes: Gene[] | null;
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
    private _currXScale: d3.ScaleLinear<number, number>;
    private _currYScale: d3.ScaleLinear<number, number>;
    private _original_XScale: d3.ScaleLinear<number, number>;
    private _original_YScale: d3.ScaleLinear<number, number>;
    private previewDriver: Gene | null;
    private lockedDrivers: Set<Gene>;

    constructor(props: Props) {
        super(props);
        this._svg = null;
        this._canvas = null;
        this.getXScale = memoizeOne(this.getXScale);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseLeave = this.handleMouseLeave.bind(this);
        this._clusters = this.initializeListOfClusters();
        this.brushedNodes = new Set();
        this._currXScale = this.getXScale(props.width, props.genome, props.chr, this.props.implicitStart, this.props.implicitEnd);
        this._currYScale = d3.scaleLinear()
            .domain([this.props.yMin, this.props.yMax])
            .range([this.props.height - PADDING.bottom, PADDING.top]);
        this._original_XScale = this._currXScale;
        this._original_YScale = this._currYScale;
        this.previewDriver = null;
        this.lockedDrivers = new Set();
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
            if(this.props["dataKeyToPlot"] === "RD" || this.props["dataKeyToPlot"] === "logRD") {
                this.props.onLinearPlotZoom(null, null, true);
            } else {
                this.props.onLinearPlotZoom(null, null, false);
            }

        } else if (this.propsDidChange(prevProps, ["driverGenes", "displayMode", "implicitEnd", "implicitStart", "yMin", "yMax", "colors", "brushedBins", "width", "height", "chr"])) {
            if(this.props["brushedBins"].length === 0)
                this._clusters = this.initializeListOfClusters();
            this.redraw();
        } else if(!(_.isEqual(this.props["data"], prevProps["data"])) || this.props["dataKeyToPlot"] !== prevProps["dataKeyToPlot"]) {
            this.redraw();
        }
    }

    getXScale(width: number, genome: Genome, chr?: string, implicitStart ?: number | null, implicitEnd ?: number | null) {
        let domain = [0, 0];
        if(implicitStart != null && implicitEnd != null) {
            domain[0] = implicitStart;
            domain[1] = implicitEnd;
        } else if (!chr) { // No chromosome specified: X domain is entire genome
            domain[1] = genome.getLength();
        } else { // Chromosome specified: X domain is length of one chromosome
            domain[0] = genome.getChrStartMap()[chr];
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
                    svg.selectAll(".brush").remove();
                    
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
            yMin, yMax, yLabel, customColor, brushedBins, colors, displayMode, driverGenes} = this.props;

        const xScale = this.getXScale(width, genome, chr, this.props.implicitStart, this.props.implicitEnd); // Full genome implicit scale
        const yScale =
            d3.scaleLinear()
            .domain([yMin, yMax])
            .range([height - PADDING.bottom, PADDING.top]);

        const chromosomes = genome.getChromosomeList();
        let chrs: Chromosome[]= [];
        let chrStarts = genome.getChrStartMap();
        for(let chr of chromosomes) {
            let start = chrStarts[chr.name];
            if(start >= xScale.domain()[0] && start <= xScale.domain()[1]) {
                chrs.push(chr);
            }
        }

        const svg = d3.select(this._svg);

        // Remove any previous scales
        svg.selectAll("." + SCALES_CLASS_NAME).remove();
        svg.append("text")
            .classed(SCALES_CLASS_NAME, true)
            .attr("text-anchor", "middle")
            .attr("font-size", 11)
            .attr("x", _.mean(xScale.range()))
            .attr("y", height - PADDING.bottom + 30)
            .text(chr || genome.getName());

        // Y axis stuff
        svg.append("text")
            .classed(SCALES_CLASS_NAME, true)
            .attr("transform", `rotate(-90, ${PADDING.left- 30}, ${_.mean(yScale.range())})`)
            .text(yLabel || dataKeyToPlot)
            .attr("y", _.mean(yScale.range()));

        let xAx = (g : any, scale : any) => g
            .classed(SCALES_CLASS_NAME, true)
            .attr("transform", `translate(0, ${height - PADDING.bottom})`)
            .call(d3.axisBottom(scale)
                    .tickValues(genome.getChromosomeStarts2(chrs, scale.domain()[0], scale.domain()[1]))
                    .tickFormat((unused, i) => findChrNumber(chrs[i].name)))
        
        let xAx2 = (g : any, scale : any) => g
            .classed(SCALES_CLASS_NAME, true)
            .attr("transform", `translate(0, ${height - PADDING.bottom})`)
            .call(d3.axisBottom(scale)
                    .tickFormat(baseNum => {
                        return niceBpCount(Number(baseNum.valueOf()), 0, chrStarts[chr])
                    }))
        

        let yAx = (g : any, scale : any) => g
                    .classed(SCALES_CLASS_NAME, true)
                    .attr("transform", `translate(${PADDING.left}, 0)`)
                    .call(d3.axisLeft(scale).ticks((scale.range()[0] - scale.range()[1]) / 15))
                    
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
                if(this.props["dataKeyToPlot"] === "RD" || this.props["dataKeyToPlot"] === "logRD") {
                    self.props.onLinearPlotZoom([self._currXScale.domain()[0], self._currXScale.domain()[1]], [self._currYScale.domain()[0], self._currYScale.domain()[1]], true);
                } else {
                    self.props.onLinearPlotZoom([self._currXScale.domain()[0], self._currXScale.domain()[1]], [self._currYScale.domain()[0], self._currYScale.domain()[1]], false);
                }
            }

        );

        function center(event : any) {
            if (event.sourceEvent) {
                return [event.sourceEvent.layerX, event.sourceEvent.layerY];
            }
            return [width / 2, height / 2];
        }

        if (!this._canvas) {
            return;
        }

        this._canvas.width = 800;
        this._canvas.height = 150;
        let previous : string[] = [];
        brushedBins.forEach(d => previous.push(GenomicBinHelpers.toChromosomeInterval(d).toString()));
        let previous_brushed_nodes = new Set(previous);
        
        const gl = this._canvas.getContext("webgl")!;
        gl.clearColor(0,0,0,1);
        let colorFill = (d:any) => {
            return webglColor(chooseColor(d));
        };
        let fillColor = fc.webglFillColor().value(colorFill).data(this.props.data);
        let pointSeries = fc
                .seriesWebglPoint()
                .size(3)
                .crossValue((d : any) => genome.getImplicitCoordinates(GenomicBinHelpers.toChromosomeInterval(d)).getCenter())
                .mainValue((d : any) => d[dataKeyToPlot])
                .context(gl);
        pointSeries.decorate((program:any) => fillColor(program));

        svg
            .append("clipPath")
            .attr("id", "clip2")
            .append("rect")
                .attr("x", PADDING.left)
                .attr("y", PADDING.top)
                .attr("width", width)
                .attr("height", height)
                .attr("fill", "red");

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
                .attr("clip-path", "url(#clip2)");

        var mouseover = function(d : Gene) {
            self.previewDriver = d;
        }

        var mouseleave = function(d : Gene) {
            self.previewDriver = null;
        }


        function redraw() {
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.clearColor(255,255,255,1);
            const yr = ty().rescaleY(yScale);
        
            gy.call(yAx, yr);
            self._currYScale = yr;
            if(!chr) {
                const xr = tx().rescaleX(xScale);
                gx.call(xAx , xr);
                self._currXScale = xr;
                pointSeries.xScale(xr).yScale(yr);
            } else {
                const xr = tx().rescaleX(xScale);
                gx.call(xAx2 , xr);
                self._currXScale = xr;
                pointSeries.xScale(xr).yScale(yr);
            }
            
            pointSeries(data);
            if(driverGenes) {
                
                svg.select(".Drivers").remove();
                svg.select(".eventrect")
                        .append("g")
                        .attr("clip-path", "url(#clip2)")
                        .classed("Drivers", true)
                        .selectAll("circle")
                        // .selectAll("path")
                            .data(driverGenes)
                            .enter()
                            .append("circle")
                            // .append("path")
                            .attr("class", "point")
                            .attr("d", d3.symbol().type(d3.symbolCircle))
                            .attr("fill", "red")
                            .attr("fill-opacity", 1)
                            .attr("stroke-width", 2)
                            .attr("r", 2)
                            // .attr("stroke", "black") 
                            .attr("transform", function(d) {
                                return "translate(" + self._currXScale(genome.getImplicitCoordinates(d.location).getCenter()) + "," + self._currYScale(yr.domain()[0]) + ")"; 
                            })
                            .on("mouseover", mouseover)
                            .on("mouseleave", mouseleave )
                            .on("click", d => (self.lockedDrivers.has(d)) ? self.lockedDrivers.delete(d) : self.lockedDrivers.add(d))   
            }
        }

        redraw();

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

        let brush : any = null;
        if(displayMode === DisplayMode.select || displayMode === DisplayMode.erase) {
            brush = d3.brush()
                .keyModifiers(false)
                .extent([[PADDING.left, PADDING.top], 
                        [this.props.width, this.props.height - PADDING.bottom]])
                .on("start brush", () => {
                    const {selection} = d3.event;
                    if(selection && selection[0][0] !== selection[1][0] && selection[0][1] !== selection[1][1]) {
                        let brushed : GenomicBin[] = visutils.filterInRect(data, selection, 
                            function(d: GenomicBin){
                                const location = GenomicBinHelpers.toChromosomeInterval(d);
                                const range = genome.getImplicitCoordinates(location);
                                return xScale(range.getCenter());
                            }, 
                            function(d: GenomicBin){
                                return yScale(d[dataKeyToPlot]);
                            });

                        if (brushed) {
                            if(displayMode === DisplayMode.select) {
                                brushed = _.uniq(_.union(brushed, brushedBins));  
                            } else if(displayMode === DisplayMode.erase) {
                                brushed = _.difference(brushedBins, brushed);
                            }
        
                            this.brushedNodes = new Set(brushed);                  
                        }
                    } else {
                        this.brushedNodes = new Set([]);
                    }
                })
                .on("end", () => {
                    svg.selectAll(".brush").remove();
                    this.props.onBrushedBinsUpdated([...this.brushedNodes]);
                });

                svg.append('g')
                    .attr('class', 'brush')
                    .call(brush);
        } else if(displayMode === DisplayMode.boxzoom || displayMode === DisplayMode.zoom) {
            brush = d3.brushX()
                .extent([[PADDING.left, PADDING.top], 
                        [this.props.width, this.props.height - PADDING.bottom]])
                .on("end", () => {
                    svg.selectAll(".brush").remove();
                    const {selection} = d3.event;
                    try {
                        const startEnd = {
                            start: selection[0],
                            end: selection[1]
                        };
                        const implicitStart = xScale.invert(startEnd.start);
                        const implicitEnd = xScale.invert(startEnd.end);
                    
                        if(this.props["dataKeyToPlot"] === "RD" || this.props["dataKeyToPlot"] === "logRD") {
                            this.props.onLinearPlotZoom([implicitStart, implicitEnd], [self._currYScale.domain()[0], self._currYScale.domain()[1]], true);
                        } else {
                            this.props.onLinearPlotZoom([implicitStart, implicitEnd], [self._currYScale.domain()[0], self._currYScale.domain()[1]], false);
                        }
                    } catch (error) {}
                })

            svg.append('g')
                .attr('class', 'brush')
                .call(brush);
        }
        svg.call(zoom).call(zoom.transform, d3.zoomIdentity.scale(1.0));
    }

    renderHighlight() {
        const {width, genome, chr, hoveredLocation} = this.props;
        if (!hoveredLocation) {
            return null;
        }

        const xScale = this.getXScale(width, genome, chr, this.props.implicitStart, this.props.implicitEnd);
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
        const xScale = this.getXScale(width, genome, chr, this.props.implicitStart, this.props.implicitEnd);
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
        const {width, height, dataKeyToPlot} = this.props;
        return <div
                className="LinearPlot"
                style={{position: "relative"}}
                onMouseMove={this.handleMouseMove}
                onMouseLeave={this.handleMouseLeave}
            >
            {this.renderHighlight()}
            {this.renderTooltip()}
            {this.renderLockedDrivers()}
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
                        height: height-PADDING.top-PADDING.bottom}} />
            
            <svg ref={node => this._svg = node} width={width} height={height}/>
            <div className="LinearPlot-tools">
                {(dataKeyToPlot === "RD" || dataKeyToPlot === "logRD")
                && <button onClick={() => {
                    this.props.onLinearPlotZoom(null, null, true, true);
                }}
                >Reset View</button>}
            </div>
        </div>;
    }

    renderLockedDrivers() {
        const {width, genome, chr, height} = this.props;
        const drivers = [...this.lockedDrivers];

        return (
            drivers.map(
                driver => {
                    const xScale = this.getXScale(width, genome, chr, this.props.implicitStart, this.props.implicitEnd);
                    const implicitCoords = genome.getImplicitCoordinates(driver.location);
                    const start = xScale(implicitCoords.start) || 0;
                    const boxWidth = Math.ceil((xScale(implicitCoords.end) || 0) - (start || 0));
                    const driverSymbol = driver.symbol;
                    const contents = <React.Fragment>
                                        <div> {driverSymbol} </div>
                                    </React.Fragment>;
                    if(start > PADDING.left && start < width - PADDING.right) {
                        return (
                            <div>
                                <div style={{
                                    position: "absolute",
                                    left: start-20,
                                    bottom: height,
                                    border: "1px solid rgba(0,0,0,0)",
                                    zIndex: 0
                                }}>
                                    {contents}
                                </div>
                                <div style={{
                                    position: "absolute",
                                    left: start,
                                    width: boxWidth,
                                    height: "75%",
                                    backgroundColor: "red",
                                    border: "1px solid rgba(255,255,0,0.7)",
                                    zIndex: 0
                                }} />   
                        </div>
                        )
                    } else {
                        return null;
                    }
                }
            ))
    }

    renderTooltip() {
        const {driverGenes, hoveredLocation, width, genome, chr, height} = this.props;

        if (!hoveredLocation) {
            return null;
        }

        if(!driverGenes) {
            return null;
        }

        if(!this.previewDriver) {
            return null;
        }

        const xScale = this.getXScale(width, genome, chr, this.props.implicitStart, this.props.implicitEnd);
        const implicitCoords = genome.getImplicitCoordinates(this.previewDriver.location);
        const start = xScale(implicitCoords.start) || 0;
        const boxWidth = Math.ceil((xScale(implicitCoords.end) || 0) - (start || 0));
        const driverSymbol = this.previewDriver.symbol;
        console.log(driverSymbol)
        const contents = <React.Fragment>
                            <div> {driverSymbol} </div>
                        </React.Fragment>

        return (
            <div>
                <div style={{
                    position: "absolute",
                    left: start-20,
                    bottom: height,
                    border: "1px solid rgba(0,0,0,0)",
                    zIndex: 0
                }}>
                    {contents}
                </div>
                <div style={{
                    position: "absolute",
                    left: start,
                    width: boxWidth,
                    height: "75%",
                    backgroundColor: "red",
                    border: "1px solid rgba(255,255,0,0.7)",
                    zIndex: 0
                }} />   
            </div>
        )
    }
}
