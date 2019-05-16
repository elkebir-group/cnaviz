import React from "react";
import * as d3 from "d3";
import _ from "lodash";
import memoizeOne from "memoize-one";

import { CopyNumberCurveDrawer } from "./CopyNumberCurveDrawer";
import { ChrIndexedBins } from "../model/BinIndex";
import { MergedGenomicBin } from "../model/BinMerger";
import { ChromosomeInterval } from "../model/ChromosomeInterval";
import { CurveState, CurvePickStatus } from "../model/CurveState";
import { getCopyStateFromRdBaf } from "../model/CopyNumberState";
import { niceBpCount, getRelativeCoordinates } from "../util";

import "./Scatterplot.css";

const PADDING = { // For the SVG
    left: 70,
    right: 20,
    top: 20,
    bottom: 60,
};
const SCALES_CLASS_NAME = "scatterplot-scale";
const CIRCLE_GROUP_CLASS_NAME = "circles";
const CIRCLE_R = 1;
const SELECTED_CIRCLE_R_INCREASE = 2;
const TOOLTIP_OFFSET = 10; // Pixels
let nextCircleIdPrefix = 0;

interface Props {
    data: ChrIndexedBins;
    rdRange: [number, number];
    hoveredLocation?: ChromosomeInterval;
    width: number;
    height: number;
    curveState: CurveState;
    onNewCurveState: (state: CurveState) => void;
    onRecordsHovered: (record: MergedGenomicBin | null) => void;
}

export class Scatterplot extends React.Component<Props> {
    static defaultProps = {
        width: 600,
        height: 500,
        onNewCurveState: _.noop,
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
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleClick = this.handleClick.bind(this);
    }

    handleMouseMove(event: React.MouseEvent<SVGSVGElement>) {
        const {rdRange, width, height, curveState, onNewCurveState} = this.props;
        if (curveState.pickStatus === CurvePickStatus.pickingState1 ||
            curveState.pickStatus === CurvePickStatus.pickingState2)
        {
            const {x, y} = getRelativeCoordinates(event);
            const {rdrScale, bafScale} = this.computeScales(rdRange, width, height);
            const copyState = getCopyStateFromRdBaf({
                rd: rdrScale.invert(x),
                baf: bafScale.invert(y)
            });
            if (curveState.pickStatus === CurvePickStatus.pickingState1 && curveState.state1 !== copyState) {
                onNewCurveState({
                    ...curveState,
                    state1: copyState
                });
            } else if (curveState.state2 !== copyState) { // We know for sure that pick status is pickingState2
                onNewCurveState({
                    ...curveState,
                    state2: copyState
                });
            }
        }
    }

    handleClick() {
        const {curveState, onNewCurveState} = this.props;
        if (curveState.pickStatus === CurvePickStatus.pickingState1) {
            onNewCurveState({...curveState, pickStatus: CurvePickStatus.pickingState2});
        } else if (curveState.pickStatus === CurvePickStatus.pickingState2) {
            onNewCurveState({...curveState, pickStatus: CurvePickStatus.picked});
        }
    }

    renderTooltip() {
        const {data, rdRange, width, height, hoveredLocation} = this.props;
        if (!hoveredLocation) {
            return null;
        }
        const records = data.findOverlappingRecords(hoveredLocation);
        const {bafScale, rdrScale} = this.computeScales(rdRange, width, height);
        if (records.length === 1) {
            const record = records[0];
            return <div
                className="Scatterplot-tooltip"
                style={{
                    position: "absolute",
                    top: bafScale(record.averageBaf) + TOOLTIP_OFFSET, // Alternatively, this could be 0.5 - baf
                    left: rdrScale(record.averageRd) + TOOLTIP_OFFSET
                }}>
                    <p>
                        <b>{record.location.toString()}</b><br/>
                        ({niceBpCount(record.location.getLength())})
                    </p>
                    <div>Average RDR: {record.averageRd.toFixed(2)}</div>
                    <div>Average BAF: {record.averageBaf.toFixed(2)}</div>
                    <div>Cluster ID:{record.bins[0].CLUSTER}</div>
            </div>;
        } else if (records.length > 1) {
            const minBaf = _.minBy(records, "averageBaf")!.averageBaf;
            const maxBaf = _.maxBy(records, "averageBaf")!.averageBaf;
            const meanBaf = _.meanBy(records, "averageBaf");
            const minRd = _.minBy(records, "averageRd")!.averageRd;
            const maxRd = _.maxBy(records, "averageRd")!.averageRd;
            const meanRd = _.meanBy(records, "averageRd");
            return <div
                className="Scatterplot-tooltip"
                style={{
                    position: "absolute",
                    top: bafScale(maxBaf) + TOOLTIP_OFFSET, // Alternatively, this could be 0.5 - baf
                    left: rdrScale(maxRd) + TOOLTIP_OFFSET
                }}>
                    <p><b>{records.length} corresponding regions</b></p>
                    <div>Average RDR: {meanRd.toFixed(2)}</div>
                    <div>Average BAF: {meanBaf.toFixed(2)}</div>
                    <div>RDR range: [{minRd.toFixed(2)}, {maxRd.toFixed(2)}]</div>
                    <div>BAF range: [{minBaf.toFixed(2)}, {maxBaf.toFixed(2)}]</div>
            </div>;
        }

        return null;
    }

    render() {
        const {width, height, curveState} = this.props;
        const {rdrScale, bafScale} = this.computeScales(this.props.rdRange, width, height);
        return <div className="Scatterplot" style={{position: "relative"}}>
            <svg
                ref={node => this._svg = node}
                width={width} height={height}
                onMouseMove={this.handleMouseMove}
                onClick={this.handleClick}
            >
                <CopyNumberCurveDrawer rdScale={rdrScale} bafScale={bafScale} curveState={curveState} />
            </svg>
            {this.renderTooltip()}
        </div>;
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

    computeScales(rdRange: [number, number], width: number, height: number) {
        return {
            bafScale: d3.scaleLinear()
                .domain([0, 0.5])
                .range([height - PADDING.bottom, PADDING.top]),
            rdrScale: d3.scaleLinear()
                .domain(rdRange)
                .range([PADDING.left, width - PADDING.right])
        };
    }

    redraw() {
        if (!this._svg) {
            return;
        }

        const data = this.props.data.getMergedRecords();
        const onRecordsHovered = this.props.onRecordsHovered;
        const {width, height} = this.props;
        const {bafScale, rdrScale} = this.computeScales(this.props.rdRange, width, height);
        const colorScale = d3.scaleOrdinal(d3.schemeDark2);

        const svg = d3.select(this._svg);
        // Remove any previous scales
        svg.selectAll("." + SCALES_CLASS_NAME).remove();

        // X axis stuff
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

        // Y axis stuff
        svg.append("g")
            .classed(SCALES_CLASS_NAME, true)
            .attr("transform", `translate(${PADDING.left}, 0)`)
            .call(d3.axisLeft(bafScale));
        svg.append("text")
            .classed(SCALES_CLASS_NAME, true)
            .attr("transform", `rotate(90, ${PADDING.left - 60}, ${_.mean(bafScale.range())})`)
            .text("BAF")
            .attr("y", _.mean(bafScale.range()));

        // Circles: remove any previous
        svg.select("." + CIRCLE_GROUP_CLASS_NAME).remove();

        // Add circles
        svg.append("g")
            .classed(CIRCLE_GROUP_CLASS_NAME, true)
            .selectAll("circle")
                .data(data)
                .enter()
                .append("circle")
                    .attr("id", d => this._circleIdPrefix + d.location.toString())
                    .attr("cx", d => rdrScale(d.averageRd))
                    .attr("cy", d => bafScale(d.averageBaf)) // Alternatively, this could be 0.5 - baf
                    .attr("r", d => CIRCLE_R + Math.sqrt(d.bins.length))
                    .attr("fill", d => colorScale(String(d.bins[0].CLUSTER)))
                    .attr("fill-opacity", 0.8)
                    .on("mouseenter", onRecordsHovered)
                    .on("mouseleave", () => onRecordsHovered(null))
    }

    getElementsForGenomeLocation(hoveredLocation?: ChromosomeInterval): Element[] {
        if (!this._svg || !hoveredLocation) {
            return [];
        }
        const records = this.props.data.findOverlappingRecords(hoveredLocation);
        const results: Element[] = [];
        for (const record of records) {
            const id = this._circleIdPrefix + record.location.toString();
            const element = this._svg.getElementById(id);
            if (element) {
                results.push(element);
            }
        }
        return results;
    }

    forceHover(genomeLocation?: ChromosomeInterval) {
        const elements = this.getElementsForGenomeLocation(genomeLocation);
        if (elements.length === 0) {
            return;
        }
        for (const element of elements) {
            const parent = element.parentElement!;
            const r = Number(element.getAttribute("r"));
            element.remove();
            element.setAttribute("r", String(r + SELECTED_CIRCLE_R_INCREASE));
            element.setAttribute("stroke", "black");
            element.setAttribute("stroke-width", "2");
            parent.appendChild(element); // Re-add the circle, which moves it to the top.
        }
    }

    forceUnhover(genomeLocation?: ChromosomeInterval) {
        const elements = this.getElementsForGenomeLocation(genomeLocation);
        if (elements.length === 0) {
            return;
        }
        for (const element of elements) {
            const r = Number(element.getAttribute("r"));
            const parent = element.parentElement!;
            element.remove();
            element.setAttribute("r", String(r - SELECTED_CIRCLE_R_INCREASE));
            element.removeAttribute("stroke");
            parent.insertBefore(element, parent.firstChild); // Move the element to the very back
        }
    }
}
