import React from "react";
import * as d3 from "d3";
import _ from "lodash";
import { ChrIndexedGenomicBins, GenomicBin, GenomicBinHelpers } from "../model/GenomicBin";
import { Genome } from "../model/Genome";
import { ChromosomeInterval } from "../model/ChromosomeInterval";

const SCALES_CLASS_NAME = "linearplot-scale";
const PADDING = { // For the SVG
    left: 50,
    right: 10,
    top: 10,
    bottom: 30,
};

interface Props {
    data: ChrIndexedGenomicBins;
    dataKeyToPlot: keyof Pick<GenomicBin, "RD" | "BAF">;
    hoveredLocation?: ChromosomeInterval;
    width: number;
    height: number;

    genome: Genome;
    yLabel?: string;
    yMin: number;
    yMax: number;
    color: string;
}

export class LinearPlot extends React.PureComponent<Props> {
    static defaultProps = {
        width: 600,
        height: 100,
        color: "blue"
    };

    private _svg: SVGSVGElement | null;
    private _canvas: HTMLCanvasElement | null;
    constructor(props: Props) {
        super(props);
        this._svg = null;
        this._canvas = null;
    }

    componentDidMount() {
        this.redraw();
    }

    propsDidChange(prevProps: Props, keys: (keyof Props)[]) {
        return keys.some(key => this.props[key] !== prevProps[key]);
    }

    componentDidUpdate(prevProps: Props) {
        if (this.propsDidChange(prevProps, ["data", "width", "height"])) {
            this.redraw();
        }
    }

    redraw() {
        if (!this._svg) {
            return;
        }
        const data = this.props.data.getAllRecords();
        const {width, height, genome, dataKeyToPlot, yMin, yMax, yLabel, color} = this.props;
        const chromosomes = genome.getChromosomeList();

        const svg = d3.select(this._svg);
        // Remove any previous scales
        svg.selectAll("." + SCALES_CLASS_NAME).remove();

        const xScale = d3.scaleLinear()
            .domain([0, genome.getLength()])
            .range([PADDING.left, width - PADDING.right]);
        const yScale = d3.scaleLinear()
            .domain([yMin, yMax])
            .range([height - PADDING.bottom, PADDING.top]);
        const xAxis = d3.axisBottom(xScale)
            .tickValues(genome.getChromosomeStarts())
            .tickFormat((unused, i) => chromosomes[i].name.substr(3));

        // X scale stuff
        svg.append("g")
            .classed(SCALES_CLASS_NAME, true)
            .attr("transform", `translate(0, ${height - PADDING.bottom})`)
            .call(xAxis);

        // Y scale stuff
        svg.append("g")
            .classed(SCALES_CLASS_NAME, true)
            .attr("transform", `translate(${PADDING.left}, 0)`)
            .call(d3.axisLeft(yScale));
        svg.append("text")
            .classed(SCALES_CLASS_NAME, true)
            .attr("transform", `rotate(90, ${PADDING.left - 40}, ${_.mean(yScale.range())})`)
            .text(yLabel || dataKeyToPlot)
            .attr("y", _.mean(yScale.range()));

        // Data
        if (!this._canvas) {
            return;
        }
        const ctx = this._canvas.getContext("2d")!;
        ctx.clearRect(0, 0, width, height); // Clearing an area larger than the canvas dimensions, but that's fine.
        ctx.fillStyle = color;
        for (const d of data) {
            const location = GenomicBinHelpers.toChromosomeInterval(d);
            const range = genome.getImplicitCoordinates(location);
            const x = 2 * xScale(range.getCenter());
            const y = 2 * yScale(d[dataKeyToPlot]);
            ctx.fillRect(x - 1, y - 2, 3, 5);
        }
    }

    renderTooltip() {
        return null;
    }

    render() {
        const {width, height} = this.props;
        return <div className="LinearPlot" style={{position: "relative"}}>
            <canvas
                ref={node => this._canvas = node}
                width={2 * width}
                height={2 * height}
                style={{position: "absolute", width, height, zIndex: -1}} />
            <svg ref={node => this._svg = node} width={width} height={height} />
            {this.renderTooltip()}
        </div>;
    }
}
