import React from "react";
import * as d3 from "d3";
import _ from "lodash";
import memoizeOne from "memoize-one";

import { ChrIndexedBins } from "../model/BinIndex";
import { GenomicBin, GenomicBinHelpers } from "../model/GenomicBin";
import { Genome } from "../model/Genome";
import { ChromosomeInterval } from "../model/ChromosomeInterval";
import { getRelativeCoordinates, applyRetinaFix, niceBpCount } from "../util";

const SCALES_CLASS_NAME = "linearplot-scale";
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
    data: ChrIndexedBins;
    chr?: string;
    dataKeyToPlot: keyof Pick<GenomicBin, "RD" | "BAF">;
    width: number;
    height: number;
    hoveredLocation?: ChromosomeInterval;
    onLocationHovered: (location: ChromosomeInterval | null) => void

    genome: Genome;
    yLabel?: string;
    yMin: number;
    yMax: number;
    color: string;
}

export class LinearPlot extends React.PureComponent<Props> {
    static defaultProps = {
        width: 800,
        height: 200,
        color: "blue",
        onLocationHovered: _.noop
    };

    private _svg: SVGSVGElement | null;
    private _canvas: HTMLCanvasElement | null;
    constructor(props: Props) {
        super(props);
        this._svg = null;
        this._canvas = null;
        this.getXScale = memoizeOne(this.getXScale);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseLeave = this.handleMouseLeave.bind(this);
    }

    componentDidMount() {
        this.redraw();
    }

    propsDidChange(prevProps: Props, keys: (keyof Props)[]) {
        return keys.some(key => this.props[key] !== prevProps[key]);
    }

    componentDidUpdate(prevProps: Props) {
        if (this.propsDidChange(prevProps, ["data", "width", "height", "chr"])) {
            this.redraw();
        }
    }

    getXScale(width: number, genome: Genome, chr?: string) {
        let domain = [0, 0];
        if (!chr) {
            domain[1] = genome.getLength();
        } else {
            domain[0] = genome.getImplicitCoordinates(new ChromosomeInterval(chr, 0, 1)).start;
            domain[1] = domain[0] + genome.getLength(chr);
        }
        return d3.scaleLinear()
            .domain(domain)
            .range([PADDING.left, width - PADDING.right]);
    }

    redraw() {
        if (!this._svg) {
            return;
        }
        const data = this.props.data.getRecords();
        const {width, height, genome, chr, dataKeyToPlot, yMin, yMax, yLabel, color} = this.props;

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
            .attr("transform", `rotate(90, ${PADDING.left - 40}, ${_.mean(yScale.range())})`)
            .text(yLabel || dataKeyToPlot)
            .attr("y", _.mean(yScale.range()));

        // Data
        if (!this._canvas) {
            return;
        }
        applyRetinaFix(this._canvas);
        const ctx = this._canvas.getContext("2d")!;
        ctx.clearRect(0, 0, width, height); // Clearing an area larger than the canvas dimensions, but that's fine.
        ctx.fillStyle = color;
        for (const d of data) {
            const location = GenomicBinHelpers.toChromosomeInterval(d);
            const range = genome.getImplicitCoordinates(location);
            const x = xScale(range.getCenter());
            const y = yScale(d[dataKeyToPlot]);
            ctx.fillRect(x, y - 1, 2, 3);
        }
    }

    renderHighlight() {
        const {width, genome, chr, hoveredLocation} = this.props;
        if (!hoveredLocation) {
            return null;
        }

        const xScale = this.getXScale(width, genome, chr);
        const implicitCoords = genome.getImplicitCoordinates(hoveredLocation);
        const start = xScale(implicitCoords.start);
        const boxWidth = Math.ceil(xScale(implicitCoords.end) - start);
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
        onLocationHovered(genome.getGenomicCoordinates(implicitLocation));
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
            {this.renderHighlight()}
            <canvas
                ref={node => this._canvas = node}
                width={width}
                height={height}
                style={{position: "absolute", zIndex: -1}} />
            <svg ref={node => this._svg = node} width={width} height={height} />
        </div>;
    }
}
