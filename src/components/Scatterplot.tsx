import React from "react";
import * as d3 from "d3";
import _, { assign } from "lodash";
import memoizeOne from "memoize-one";

import { CopyNumberCurveDrawer } from "./CopyNumberCurveDrawer";
import { MergedGenomicBin } from "../model/BinMerger";
import { ChromosomeInterval } from "../model/ChromosomeInterval";
import { CurveState, CurvePickStatus } from "../model/CurveState";
import { CopyNumberCurve } from "../model/CopyNumberCurve";
import { getCopyStateFromRdBaf, copyStateToString } from "../model/CopyNumberState";
import { niceBpCount, getRelativeCoordinates } from "../util";
import {GenomicBinHelpers} from "../model/GenomicBin";
import "./Scatterplot.css";
import { brush, cluster } from "d3";
const visutils = require('vis-utils');

const PADDING = { // For the SVG
    left: 60,
    right: 20,
    top: 20,
    bottom: 60,
};

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
const HIGHLIGHT_COLOR = "red";

const SCALES_CLASS_NAME = "scatterplot-scale";
const CIRCLE_GROUP_CLASS_NAME = "circles";
const CIRCLE_R = 1;
const SELECTED_CIRCLE_R_INCREASE = 2;
const TOOLTIP_OFFSET = 10; // Pixels
let nextCircleIdPrefix = 0;

interface Props {
    parentCallBack: any;
    data: MergedGenomicBin[];
    rdRange: [number, number];
    hoveredLocation?: ChromosomeInterval;
    width: number;
    height: number;
    curveState: CurveState;
    invertAxis: boolean;
    onNewCurveState: (state: Partial<CurveState>) => void;
    onRecordsHovered: (record: MergedGenomicBin | null) => void;
    customColor: string;
    assignCluster: boolean;
}

interface State {
    brushedNodes: MergedGenomicBin[];
}

export class Scatterplot extends React.Component<Props, State> {
    static defaultProps = {
        width: 400,
        height: 350,
        onNewCurveState: _.noop,
        onRecordHovered: _.noop,
        customColor: CLUSTER_COLORS[0]
    };

    private _svg: SVGSVGElement | null;
    private _circleIdPrefix: number;
    private _clusters : string[];

    constructor(props: Props) {
        super(props);
        this._svg = null;
        this._circleIdPrefix = nextCircleIdPrefix;
        nextCircleIdPrefix++;
        this.computeScales = memoizeOne(this.computeScales);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleClick = this.handleClick.bind(this);
        this.handleCurveHovered = this.handleCurveHovered.bind(this);
        this.onTrigger = this.onTrigger.bind(this);
        this._clusters = this.initializeListOfClusters();
        this.state = {
            brushedNodes: []
        }
    }

    initializeListOfClusters() : string[] {
        let collator = new Intl.Collator(undefined, {numeric: true, sensitivity: 'base'});
        return [...new Set(this.props.data.map(d => String(d.bins[0].CLUSTER)))].sort(collator.compare);  
    }

    handleMouseMove(event: React.MouseEvent<SVGSVGElement>) {
        const {rdRange, width, height, curveState, onNewCurveState, invertAxis} = this.props;
        if (curveState.pickStatus === CurvePickStatus.pickingNormalLocation ||
            curveState.pickStatus === CurvePickStatus.pickingState1 ||
            curveState.pickStatus === CurvePickStatus.pickingState2)
        {
            const {x, y} = getRelativeCoordinates(event);
            const {rdrScale, bafScale} = this.computeScales(rdRange, width, height);
            const hoveredRdBaf = {
                rd: invertAxis ? rdrScale.invert(x) : rdrScale.invert(y),
                baf: invertAxis ? bafScale.invert(y) : bafScale.invert(x)
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

        const {rdRange, width, height, invertAxis} = this.props;
        const {bafScale, rdrScale} = this.computeScales(rdRange, width, height);
        const top = invertAxis ? bafScale(baf) : rdrScale(rd);
        const left = invertAxis ? rdrScale(rd) : bafScale(baf);
        return <div
            className="Scatterplot-tooltip"
            style={{
                position: "absolute",
                top:   top || 0 + TOOLTIP_OFFSET, // Alternatively, this could be 0.5 - baf
                left:  left || 0 + TOOLTIP_OFFSET
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
        if (this.propsDidChange(prevProps, ["data", "width", "height", "invertAxis", "customColor", "assignCluster"])) {
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
                .domain([0.5, 0])
                .range(bafScaleRange),
            rdrScale: d3.scaleLinear()
                .domain(rdRange)
                .range(rdrScaleRange)
        };
    }

    onTrigger = (brushedNodes : MergedGenomicBin[]) => {
        this.props.parentCallBack(brushedNodes);
    }

    redraw() {
        if (!this._svg) {
            return;
        }

        const {width, height, onRecordsHovered, curveState, customColor, assignCluster} = this.props;
        let {data} = this.props
        const {bafScale, rdrScale} = this.computeScales(this.props.rdRange, width, height);
        const colorScale = d3.scaleOrdinal(CLUSTER_COLORS).domain(this._clusters)
        const svg = d3.select(this._svg);
        
        let xScale = bafScale;
        let yScale = rdrScale;
        let xLabel = "0.5 - B-Allele Frequency";
        let yLabel = "Read Depth Ratio";
        if (this.props.invertAxis) {
            [xScale, yScale, xLabel, yLabel] = [rdrScale, bafScale, "Read Depth Ratio", "0.5 - B-Allele Frequency"];
        }

        // Remove previous brush
        svg.selectAll("." + "brush").remove();

        let brushNodes : MergedGenomicBin[] = []; //this.state.brushedNodes;
        if (!curveState.pickStatus) { // prevents brush from interefering with picking 1|1 state
            // Create brush and limit it to the scatterplot region
            const brush = d3.brush()
            .keyModifiers(false)
            //.filter(() => d3.event.shiftKey)
            .extent([[PADDING.left - 2*CIRCLE_R, PADDING.top - 2*CIRCLE_R], 
                    [width - PADDING.right + 2*CIRCLE_R , height - PADDING.bottom + 2*CIRCLE_R]])
                    .on("brush end", function() {
                        updatePoints(d3.event.shiftKey)
                    });

            // attach the brush to the chart
            const gBrush = svg.append('g')
            .attr('class', 'brush')
            .call(brush);
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
            .attr("y", PADDING.left-40)
            .attr("x", 0-_.mean(yScale.range()))
            .attr("transform", `rotate(-90)`)
            .style("text-anchor", "middle")
            .text(yLabel);
            

        // Circles: remove any previous
        svg.select("." + CIRCLE_GROUP_CLASS_NAME).remove();

        let highlight = function (m : MergedGenomicBin) {
            if(m.bins[0].CLUSTER != -1) {
                let selected_cluster = String(m.bins[0].CLUSTER);
                
                d3.selectAll(".test" + selected_cluster)
                    .transition()
                    .duration(400)
                    .style("fill", customColor)

                let col = colorScale(selected_cluster);
                for (let i = 0; i < CLUSTER_COLORS.length; i++) {
                    if (CLUSTER_COLORS[i] == col) {
                        CLUSTER_COLORS[i] = customColor
                    }
                }
            }
        }

        let previous_brushed_nodes = this.state.brushedNodes;
        
        // Add circles
        svg.append("g")
            .classed(CIRCLE_GROUP_CLASS_NAME, true)
            .selectAll("circle")
                .data(data)
                .enter()
                .append("circle")
                    .attr("id", d => this._circleIdPrefix + d.location.toString())
                    .attr("class", function(d : MergedGenomicBin) : string {
                        return "dot " + "test" + String(d.bins[0].CLUSTER);})
                    .attr("cx", d => xScale(rdOrBaf(d, this.props.invertAxis, true)) || 0)
                    .attr("cy", d => yScale(rdOrBaf(d, this.props.invertAxis, false)) || 0) // Alternatively, this could be 0.5 - baf
                    .attr("r", d => CIRCLE_R + Math.sqrt(d.bins.length))
                    .attr("fill", function(d:MergedGenomicBin) : string {
                        if (previous_brushed_nodes.some(n => (n.location.chr === d.location.chr) && (n.location.start === d.location.start) && (n.location.end === d.location.end))) {
                            return customColor;
                        }
                        return (d.bins[0].CLUSTER == -1) ? UNCLUSTERED_COLOR : colorScale(String(d.bins[0].CLUSTER));
                    })
                    .attr("fill-opacity", 0.8)
                    .on("mouseenter", onRecordsHovered)
                    .on("mouseleave", () => onRecordsHovered(null))
                    .on("click", function(d) {
                        // if(d3.event.shiftKey) {
                        //     highlight(d);
                        //     //console.log("SHIFT: ", d3.event.shiftKey)
                        // } else {
                        //     console.log("shiftKey not pressed")
                        // };
                    });
        
        /**
         * Based on which values are on the x/y axes and which axis the caller is requesting, 
         * gives the relevant data (rdr or baf)
         * @param m Data that the average read depth ratio and average baf are taken from
         * @param invert Indicates which value is on the x-axis and which is on the y (True: baf is on the x-axis)
         * @param xAxis True if it should return the x-axis value
         * @returns Either the averageRd or averageBaf
         */
        function rdOrBaf(m : MergedGenomicBin, invert : boolean, xAxis : boolean) {
            if (xAxis) {
                return (invert) ? m.averageRd : m.averageBaf;
            } else {  
                return (invert) ?  m.averageBaf :  m.averageRd;
            }
        }

        const circleId = this._circleIdPrefix;
        const plot = this._svg;
        const invert = this.props.invertAxis;
        let self = this;
        var shiftKey : boolean;
        d3.select(window).on("keydown", function() {
            shiftKey = d3.event.shiftKey;
        });
        function updatePoints(event : any) {
            if (data) {
                try {
                    const { selection, key } = d3.event;
                    brushNodes = visutils.filterInRect(data, selection, (d : MergedGenomicBin) => xScale(rdOrBaf(d, invert, true)), (d : MergedGenomicBin)  => yScale(rdOrBaf(d, invert, false)));
                    if (brushNodes) {
                        for (const node of brushNodes) {
                            const id = circleId + node.location.toString();
                            const element = plot.getElementById(id);
                            if (element) {
                                element.setAttribute("fill", customColor);      
                            }
                        }
                        
                        if(shiftKey) {
                            brushNodes = brushNodes.concat(self.state.brushedNodes)
                        }

                        self.setState({brushedNodes: brushNodes});                   
                    } 
                } catch (error) {
                    console.log(error);
                }
            }
        }

        if(assignCluster) {
            this.onTrigger(this.state.brushedNodes);
            this.setState({brushedNodes: []})
            this._clusters = this.initializeListOfClusters();
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
            if(r) {
                const parent = element.parentElement!;
                element.remove();
                element.setAttribute("r", String(r - SELECTED_CIRCLE_R_INCREASE));
                element.removeAttribute("stroke");
                parent.insertBefore(element, parent.firstChild); // Move the element to the very back
            }
        }
    }
}
