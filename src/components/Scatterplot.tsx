import React from "react";
import * as d3 from "d3";
import _ from "lodash";
import memoizeOne from "memoize-one";

import { CopyNumberCurveDrawer } from "./CopyNumberCurveDrawer";
import { MergedGenomicBin } from "../model/BinMerger";
import { ChromosomeInterval } from "../model/ChromosomeInterval";
import { CurveState, CurvePickStatus } from "../model/CurveState";
import { CopyNumberCurve } from "../model/CopyNumberCurve";
import { getCopyStateFromRdBaf, copyStateToString } from "../model/CopyNumberState";
import { niceBpCount, getRelativeCoordinates } from "../util";

import "./Scatterplot.css";

const PADDING = { // For the SVG
    left: 60,
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
    data: MergedGenomicBin[];
    rdRange: [number, number];
    hoveredLocation?: ChromosomeInterval;
    width: number;
    height: number;
    curveState: CurveState;
    invertAxis: boolean;
    onNewCurveState: (state: Partial<CurveState>) => void;
    onRecordsHovered: (record: MergedGenomicBin | null) => void;
}

export class Scatterplot extends React.Component<Props> {
    static defaultProps = {
        width: 400,
        height: 350,
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
        this.handleCurveHovered = this.handleCurveHovered.bind(this);
    }

    handleMouseMove(event: React.MouseEvent<SVGSVGElement>) {
        const {rdRange, width, height, curveState, onNewCurveState} = this.props;
        if (curveState.pickStatus === CurvePickStatus.pickingNormalLocation ||
            curveState.pickStatus === CurvePickStatus.pickingState1 ||
            curveState.pickStatus === CurvePickStatus.pickingState2)
        {
            const {x, y} = getRelativeCoordinates(event);
            const {rdrScale, bafScale} = this.computeScales(rdRange, width, height);
            const hoveredRdBaf = {
                rd: rdrScale.invert(x),
                baf: bafScale.invert(y)
            };

            if (curveState.pickStatus === CurvePickStatus.pickingNormalLocation) {
                onNewCurveState({normalLocation: hoveredRdBaf});
                return;
            }

            const copyState = getCopyStateFromRdBaf(hoveredRdBaf, curveState.normalLocation);
            if (curveState.pickStatus === CurvePickStatus.pickingState1 && curveState.state1 !== copyState) {
                onNewCurveState({state1: copyState});
            } else if (curveState.pickStatus === CurvePickStatus.pickingState2 && curveState.state2 !== copyState) {
                onNewCurveState({state2: copyState});
            }
        }
    }

    handleClick() {
        const {curveState, onNewCurveState} = this.props;
        if (curveState.pickStatus === CurvePickStatus.pickingNormalLocation) {
            onNewCurveState({pickStatus: CurvePickStatus.pickingState1});
        } else if (curveState.pickStatus === CurvePickStatus.pickingState1) {
            onNewCurveState({pickStatus: CurvePickStatus.pickingState2});
        } else if (curveState.pickStatus === CurvePickStatus.pickingState2) {
            onNewCurveState({pickStatus: CurvePickStatus.picked});
        }
    }

    handleCurveHovered(p: number) {
        this.props.onNewCurveState({hoveredP: p});
    }

    renderTooltipAtRdBaf(rd: number, baf: number, contents: JSX.Element | null) {
        if (!contents) {
            return null;
        }

        const {rdRange, width, height} = this.props;
        const {bafScale, rdrScale} = this.computeScales(rdRange, width, height);
        return <div
            className="Scatterplot-tooltip"
            style={{
                position: "absolute",
                top: bafScale(baf) || 0 + TOOLTIP_OFFSET, // Alternatively, this could be 0.5 - baf
                left: rdrScale(rd) || 0 + TOOLTIP_OFFSET
            }}
        >
            {contents}
        </div>;
    }

    renderTooltip() {
        const {data, hoveredLocation, curveState} = this.props;
        if (curveState.pickStatus === CurvePickStatus.pickingNormalLocation) {
            const {rd, baf} = curveState.normalLocation;
            return this.renderTooltipAtRdBaf(rd, baf, <React.Fragment>
                <div>RD = {rd.toFixed(2)}</div>
                <div>BAF = {baf.toFixed(2)}</div>
                <i>Click to set location for 1|1 copy state</i>
            </React.Fragment>);
        }

        if (curveState.hoveredP >= 0 && curveState.state1 && curveState.state2) {
            const {hoveredP, state1, state2, normalLocation} = curveState;
            const curve = new CopyNumberCurve(state1, state2, normalLocation);
            const rd = curve.rdGivenP(hoveredP);
            const baf = curve.bafGivenP(hoveredP);
            return this.renderTooltipAtRdBaf(rd, baf, <React.Fragment>
                <b>Mix of:</b>
                <div>{Math.round(hoveredP * 100)}% {copyStateToString(state1)}</div>
                <div>{Math.round((1 - hoveredP) * 100)}% {copyStateToString(state2)}</div>
                <hr/>
                <b>Predicted RD/BAF:</b>
                <div>RD = {rd.toFixed(2)}</div>
                <div>BAF = {baf.toFixed(2)}</div>
            </React.Fragment>);
        }

        if (!hoveredLocation) {
            return null;
        }
        const hoveredRecords = data.filter(record => record.location.hasOverlap(hoveredLocation));
        if (hoveredRecords.length === 1) {
            const record = hoveredRecords[0];
            return this.renderTooltipAtRdBaf(record.averageRd, record.averageBaf, <React.Fragment>
                <p>
                    <b>{record.location.toString()}</b><br/>
                    ({niceBpCount(record.location.getLength())})
                </p>
                <div>Average RDR: {record.averageRd.toFixed(2)}</div>
                <div>Average BAF: {record.averageBaf.toFixed(2)}</div>
                <div>Cluster ID:{record.bins[0].CLUSTER}</div>
            </React.Fragment>);
        } else if (hoveredRecords.length > 1) {
            const minBaf = _.minBy(hoveredRecords, "averageBaf")!.averageBaf;
            const maxBaf = _.maxBy(hoveredRecords, "averageBaf")!.averageBaf;
            const meanBaf = _.meanBy(hoveredRecords, "averageBaf");
            const minRd = _.minBy(hoveredRecords, "averageRd")!.averageRd;
            const maxRd = _.maxBy(hoveredRecords, "averageRd")!.averageRd;
            const meanRd = _.meanBy(hoveredRecords, "averageRd");
            return this.renderTooltipAtRdBaf(maxRd, maxBaf, <React.Fragment>
                <p><b>{hoveredRecords.length} corresponding regions</b></p>
                <div>Average RDR: {meanRd.toFixed(2)}</div>
                <div>Average BAF: {meanBaf.toFixed(2)}</div>
                <div>RDR range: [{minRd.toFixed(2)}, {maxRd.toFixed(2)}]</div>
                <div>BAF range: [{minBaf.toFixed(2)}, {maxBaf.toFixed(2)}]</div>
            </React.Fragment>);
        }

        return null;
    }

    render() {
        const {width, height, curveState, rdRange} = this.props;
        const {rdrScale, bafScale} = this.computeScales(rdRange, width, height);
        return <div className="Scatterplot" style={{position: "relative"}}>
            <svg
                ref={node => this._svg = node}
                width={width} height={height}
                onMouseMove={this.handleMouseMove}
                onClick={this.handleClick}
            >
                <CopyNumberCurveDrawer
                    rdScale={rdrScale}
                    bafScale={bafScale}
                    curveState={curveState}
                    onLocationHovered={this.handleCurveHovered}
                    svgRef={this._svg || undefined} />
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
        if (this.propsDidChange(prevProps, ["data", "width", "height", "invertAxis"])) {
            this.redraw();
            this.forceHover(this.props.hoveredLocation);
        } else if (this.props.hoveredLocation !== prevProps.hoveredLocation) {
            this.forceHover(this.props.hoveredLocation);
            this.forceUnhover(prevProps.hoveredLocation);
        }
    }

    computeScales(rdRange: [number, number], width: number, height: number) {
        let bafScaleRange = (this.props.invertAxis) ?  [height - PADDING.bottom, PADDING.top] : [PADDING.left, width - PADDING.right];
        let rdrScaleRange = (this.props.invertAxis) ?  [PADDING.left, width - PADDING.right] :  [height - PADDING.bottom, PADDING.top];
        return {
            bafScale: d3.scaleLinear()
                .domain([0, 0.5])
                .range(bafScaleRange),
            rdrScale: d3.scaleLinear()
                .domain(rdRange)
                .range(rdrScaleRange)
        };
    }

    redraw() {
        if (!this._svg) {
            return;
        }

        const {data, width, height, onRecordsHovered} = this.props;
        const {bafScale, rdrScale} = this.computeScales(this.props.rdRange, width, height);
        const colorScale = d3.scaleOrdinal(d3.schemeDark2);

        const svg = d3.select(this._svg);
        
        let xScale = bafScale;
        let yScale = rdrScale;
        let xLabel = "B-Allele Frequency";
        let yLabel = "Read Depth Ratio";
        if (this.props.invertAxis) {
            [xScale, yScale, xLabel, yLabel] = [rdrScale, bafScale, "Read Depth Ratio", "B-Allele Frequency"];
        }
        
        // Remove any previous scales
        svg.selectAll("." + SCALES_CLASS_NAME).remove();

        // X axis stuff
        svg.append("g")
            .classed(SCALES_CLASS_NAME, true)
            .attr("transform", `translate(0, ${height - PADDING.bottom})`)
            .call(d3.axisBottom(xScale));
        svg.append("text")
            .classed(SCALES_CLASS_NAME, true)
            .attr("text-anchor", "middle")
            .attr("x", _.mean(xScale.range()))
            .attr("y", height - PADDING.bottom + 40)
            .style("text-anchor", "middle")
            .text(xLabel);

        // Y axis stuff
        svg.append("g")
            .classed(SCALES_CLASS_NAME, true)
            .attr("transform", `translate(${PADDING.left}, 0)`)
            .call(d3.axisLeft(yScale));
        svg.append("text")
            .classed(SCALES_CLASS_NAME, true)
            .attr("y", PADDING.left-40)//_.mean(yScale.range()))
            .attr("x", 0-_.mean(yScale.range()))
            .attr("transform", `rotate(-90)`)
            .style("text-anchor", "middle")
            .text(yLabel);
            

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
                    .attr("cx", d => xScale(rdOrBaf(d, this.props.invertAxis, true)) || 0)
                    .attr("cy", d => yScale(rdOrBaf(d, this.props.invertAxis, false)) || 0) // Alternatively, this could be 0.5 - baf
                    .attr("r", d => CIRCLE_R + Math.sqrt(d.bins.length))
                    .attr("fill", d => colorScale(String(d.bins[0].CLUSTER)))
                    .attr("fill-opacity", 0.8)
                    .on("mouseenter", onRecordsHovered)
                    .on("mouseleave", () => onRecordsHovered(null))
        
        function rdOrBaf(b : MergedGenomicBin, invert : boolean, xAxis : boolean) {
            if (xAxis) {
                return (invert) ? b.averageRd : b.averageBaf;
            } else {  
                return (invert) ?  b.averageBaf :  b.averageRd;
            }
        }
    }

    getElementsForGenomeLocation(hoveredLocation?: ChromosomeInterval): Element[] {
        if (!this._svg || !hoveredLocation) {
            return [];
        }
        const hoveredRecords = this.props.data.filter(record => record.location.hasOverlap(hoveredLocation));
        const results: Element[] = [];
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
