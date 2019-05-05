import React from "react";
import * as d3 from "d3";
import _ from "lodash";
import memoizeOne from "memoize-one";
import { GenomicBin, ChrIndexedGenomicBins, GenomicBinHelpers } from "../GenomicBin";
import { ChromosomeInterval } from "../ChromosomeInterval";

const PADDING = { // For the SVG
    left: 70,
    right: 20,
    top: 20,
    bottom: 60,
};
const SCALES_CLASS_NAME = "scatterplot-scale";
const CIRCLE_GROUP_CLASSNAME = "circles";
const CIRCLE_R = 3;
let nextCircleIdPrefix = 0;

interface Props {
    data: ChrIndexedGenomicBins;
    hoveredLocation?: ChromosomeInterval;
    width: number;
    height: number;
    onRecordHovered: (record: GenomicBin | null) => void;
}

export class Scatterplot extends React.Component<Props> {
    static defaultProps = {
        width: 600,
        height: 500,
        onRecordHovered: _.noop
    };

    private _svg: SVGSVGElement | null;
    private _circleIdPrefix: number;
    constructor(props: Props) {
        super(props);
        this._svg = null;
        this._circleIdPrefix = nextCircleIdPrefix;
        nextCircleIdPrefix++;
        this.computeScales = memoizeOne(this.computeScales);
    }

    render() {
        const {width, height} = this.props;
        return <svg ref={node => this._svg = node} width={width} height={height} />
    }

    componentDidMount() {
        this.redraw();
        this.forceHover(this.props.hoveredLocation);
    }

    propsDidChange(prevProps: Props, keys: (keyof Props)[]) {
        return keys.some(key => this.props[key] !== prevProps[key]);
    }

    componentDidUpdate(prevProps: Props) {
        if (this.propsDidChange(prevProps, ["data", "width", "height"])) {
            this.redraw();
            this.forceHover(this.props.hoveredLocation);
        } else if (this.props.hoveredLocation !== prevProps.hoveredLocation) {
            this.forceHover(this.props.hoveredLocation);
            this.forceUnhover(prevProps.hoveredLocation);
        }
    }

    computeScales(data: GenomicBin[], width: number, height: number) {
        let min = 0, max = 0;
        if (data.length !== 0) {
            min = (_.minBy(data, "RD") as GenomicBin).RD;
            max = (_.maxBy(data, "RD") as GenomicBin).RD;
        }

        return {
            bafScale: d3.scaleLinear() // Note that the raw data is BAF.  We want to plot 0.5 - BAF.
                .domain([0, 0.5])
                .range([height - PADDING.bottom, PADDING.top]),
            rdrScale: d3.scaleLinear()
                .domain([min - 0.5, max + 0.5])
                .range([PADDING.left, width - PADDING.right])
        };
    }

    redraw() {
        if (!this._svg) {
            return;
        }

        const data = this.props.data.getAllRecords();
        const onRecordHovered = this.props.onRecordHovered;
        const svg = d3.select(this._svg);
        const width = Number(svg.attr("width"));
        const height = Number(svg.attr("height"));
        const {bafScale, rdrScale} = this.computeScales(data, width, height);
        const colorScale = d3.scaleOrdinal(d3.schemeDark2);

        // Remove any previous scales
        svg.selectAll("." + SCALES_CLASS_NAME).remove();

        // X scale stuff
        svg.append("g")
            .classed(SCALES_CLASS_NAME, true)
            .attr("transform", `translate(0, ${height - PADDING.bottom})`)
            .call(d3.axisBottom(rdrScale));
        svg.append("text")
            .classed(SCALES_CLASS_NAME, true)
            .attr("text-anchor", "middle")
            .attr("x", _.mean(rdrScale.range()))
            .attr("y", height - PADDING.bottom + 40)
            .text("Read depth ratio");

        // Y scale stuff
        svg.append("g")
            .classed(SCALES_CLASS_NAME, true)
            .attr("transform", `translate(${PADDING.left}, 0)`)
            .call(d3.axisLeft(bafScale));
        svg.append("text")
            .classed(SCALES_CLASS_NAME, true)
            .attr("transform", `rotate(90, ${PADDING.left - 60}, ${_.mean(bafScale.range())})`)
            .text("0.5 - BAF")
            .attr("y", _.mean(bafScale.range()));

        // Circles: remove any previous
        svg.select("." + CIRCLE_GROUP_CLASSNAME).remove();

        // Add circles
        svg.append("g")
            .classed(CIRCLE_GROUP_CLASSNAME, true)
            .selectAll("circle")
                .data(data)
                .enter()
                .append("circle")
                    .attr("id", d => this._circleIdPrefix + GenomicBinHelpers.toChromosomeInterval(d).toString())
                    .attr("cx", d => rdrScale(d.RD))
                    .attr("cy", d => bafScale(0.5 - d.BAF))
                    .attr("r", CIRCLE_R)
                    .attr("fill", d => colorScale(String(d.CLUSTER)))
                    .on("mouseenter", onRecordHovered)
                    .on("mouseleave", () => onRecordHovered(null))
    }

    getCircleForGenomeLocation(hoveredLocation?: ChromosomeInterval): SVGCircleElement | null {
        if (!this._svg || !hoveredLocation) {
            return null;
        }
        const circle = this._svg.getElementById(this._circleIdPrefix + hoveredLocation.toString());
        return circle ? circle as unknown as SVGCircleElement : circle; // Yea, this cast is ugly.  Thanks TypeScript.
    }

    forceHover(genomeLocation?: ChromosomeInterval) {
        const circle = this.getCircleForGenomeLocation(genomeLocation);
        if (!circle) {
            return;
        }
        const parent = circle.parentElement!;
        circle.remove();
        circle.setAttribute("r", String(CIRCLE_R + 1));
        circle.setAttribute("stroke", "black");
        parent.appendChild(circle); // Readd the circle, which moves it to the top.
    }

    forceUnhover(genomeLocation?: ChromosomeInterval) {
        const circle = this.getCircleForGenomeLocation(genomeLocation);
        if (!circle) {
            return;
        }
        circle.setAttribute("r", String(CIRCLE_R));
        circle.removeAttribute("stroke");
    }
}
