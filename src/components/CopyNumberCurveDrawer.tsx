import React from "react";
import _ from "lodash";
import * as d3 from "d3";
import { Coordinate, getRelativeCoordinates } from "../util";
import {  CopyNumberCurve } from "../model/CopyNumberCurve";
import { CurveState, CurvePickStatus } from "../model/CurveState";
import { getCopyNumCandidates, copyStateToString, CopyNumberState } from "../model/CopyNumberState";

const GRID_INDICATOR_SIZE = 4;
const INDICATOR_SIZE = 6;
const INDICATOR_HIGHLIGHT_SIZE = 8;
const END_POINT_COLOR = "yellow";
const PICK_CAPTION_OFFSET = 10;

interface Props {
    curveState: CurveState;
    rdScale: d3.ScaleLinear<number, number>;
    bafScale: d3.ScaleLinear<number, number>;
    svgRef?: SVGSVGElement; // Needed to calculate p correctly
    onLocationHovered: (p: number) => void;
}

interface State {
    hoveredGridPoint: {
        coordinate: Coordinate,
        state: CopyNumberState
    } | null;
}

export class CopyNumberCurveDrawer extends React.Component<Props, State> {
    static defaultProps = {
        onLocationHovered: _.noop
    };

    constructor(props: Props) {
        super(props);
        this.state = {
            hoveredGridPoint: null
        };
        this.handlePathMouseMove = this.handlePathMouseMove.bind(this);
        this.handlePathMouseLeave = this.handlePathMouseLeave.bind(this);
    }

    handlePathMouseMove(event: React.MouseEvent<SVGPathElement>) {
        const {curveState, rdScale, bafScale, svgRef, onLocationHovered} = this.props;
        const {state1, state2, normalLocation} = curveState;
        if (!state1 || !state2) {
            return;
        }
        const {x, y} = getRelativeCoordinates(event, svgRef);
        const rd = rdScale.invert(x);
        const baf = bafScale.invert(y);
        const p = new CopyNumberCurve(state1, state2, normalLocation).getClosestPForLocation(rd, baf);
        if (curveState.hoveredP !== p) {
            onLocationHovered(p);
        }
    }

    handlePathMouseLeave() {
        this.props.onLocationHovered(-1);
    }

    getXY(rd: number, baf: number): Coordinate {
        const {rdScale, bafScale} = this.props;
        return {
            x: (rdScale(rd) || 0),
            y: bafScale(baf) || 0
        };
    }

    render() {
        const {curveState} = this.props;
        const {state1, state2, hoveredP, pickStatus, normalLocation} = curveState;

        let pointPath = null;
        let hoverCircle = null;
        let gridPointCaption = null;
        let copyGrid = [];
        if (state1 && !state2) {
            const curve = new CopyNumberCurve(state1, state1, normalLocation);
            const point = this.getXY(curve.rdGivenP(0), curve.bafGivenP(0));
            hoverCircle = <CopyStateIndicator
                cx={point.x} cy={point.y}
                size={INDICATOR_HIGHLIGHT_SIZE}
                fill={END_POINT_COLOR} />;
            gridPointCaption = <CopyStateCaption state={state1} coordinate={point} />;
        } else if (state1 && state2) {
            const curve = new CopyNumberCurve(state1, state2, normalLocation);
            const points = curve.sampleCurve().map(point => this.getXY(point.rd, point.baf));
            pointPath = <SvgPointPath
                points={points}
                onMouseMove={this.handlePathMouseMove}
                onMouseLeave={this.handlePathMouseLeave} />;
            if (pickStatus === CurvePickStatus.pickingState2) {
                const firstPoint = points[0]; // Because the first point is p=0, which means 100% state2.
                gridPointCaption = <CopyStateCaption state={state2} coordinate={firstPoint} />;
            }

            if (hoveredP >= 0) {
                const hoverPoint = this.getXY(curve.rdGivenP(hoveredP), curve.bafGivenP(hoveredP));
                hoverCircle = <CopyStateIndicator
                    cx={hoverPoint.x}
                    cy={hoverPoint.y}
                    size={INDICATOR_HIGHLIGHT_SIZE}
                    fill="black" />;
            }
        }

        if (pickStatus !== CurvePickStatus.none) { // Show copyGrid
            const cnStateForRdBaf = getCopyNumCandidates(curveState.normalLocation)
            for (const [rdBaf, state] of cnStateForRdBaf.entries()) {
                const xy = this.getXY(rdBaf.rd, rdBaf.baf);
                copyGrid.push(<CopyStateIndicator
                    key={`${rdBaf.rd} ${rdBaf.baf}`}
                    onMouseEnter={() => this.setState({hoveredGridPoint: {coordinate: xy, state}})}
                    onMouseLeave={() => this.setState({hoveredGridPoint: null})}
                    cx={xy.x} cy={xy.y}
                    size={GRID_INDICATOR_SIZE}
                    fill="black"
                />);
            }
            const hoveredGridPoint = this.state.hoveredGridPoint;
            if (hoveredGridPoint) {
                gridPointCaption = <CopyStateCaption
                    state={hoveredGridPoint.state}
                    coordinate={hoveredGridPoint.coordinate} />;
            }
        }

        return <g>
            {hoverCircle}
            {pointPath}
            {gridPointCaption}
            {copyGrid}
        </g>;
    }
}

interface PointPathProps {
    points: Coordinate[];
    onMouseMove?: (event: React.MouseEvent<SVGPathElement>) => void;
    onMouseLeave?: (event: React.MouseEvent<SVGPathElement>) => void;
}

function SvgPointPath(props: PointPathProps) {
    const {points, onMouseMove, onMouseLeave} = props;
    if (points.length === 0) {
        return null;
    }

    const firstPoint = points[0];
    const lastPoint = points[points.length - 1];
    let pathString = `M ${firstPoint.x} ${firstPoint.y} `;
    for (let i = 1; i < points.length; i++) {
        const {x, y} = points[i];
        pathString += `L ${x} ${y} `;
    }
    return <React.Fragment>
        <path d={pathString} fill="transparent" stroke="black" strokeWidth={2} strokeDasharray="4" />
        {/* A wider, invisible path for hover purposes */}
        <path d={pathString} fill="transparent" stroke="black" strokeWidth={10} strokeOpacity={0}
            onMouseMove={onMouseMove} onMouseLeave={onMouseLeave} />
        <CopyStateIndicator cx={firstPoint.x} cy={firstPoint.y} fill={END_POINT_COLOR} />
        <CopyStateIndicator cx={lastPoint.x} cy={lastPoint.y} fill={END_POINT_COLOR} />
    </React.Fragment>;
}

interface CopyStateIndicatorProps {
    cx: number;
    cy: number;
    size?: number;
    fill?: string;
    onMouseEnter?: (event: React.MouseEvent<SVGRectElement>) => void;
    onMouseLeave?: (event: React.MouseEvent<SVGRectElement>) => void;
}
function CopyStateIndicator(props: CopyStateIndicatorProps) {
    const {cx, cy, fill, onMouseEnter, onMouseLeave} = props;
    let size = props.size || INDICATOR_SIZE;
    return <rect 
        x={cx - 0.5 * size}
        y={cy - 0.5 * size}
        width={size}
        height={size}
        fill={fill || "black"}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
    />;
}

interface CopyStateCaptionProps {
    state?: CopyNumberState;
    coordinate: Coordinate;
}
function CopyStateCaption(props: CopyStateCaptionProps) {
    return <text x={props.coordinate.x + PICK_CAPTION_OFFSET} y={props.coordinate.y + PICK_CAPTION_OFFSET}>
        {props.state ? copyStateToString(props.state) : "unknown state"}
    </text>;
}
