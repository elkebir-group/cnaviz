import React from "react";
import _ from "lodash";
import * as d3 from "d3";
import { Coordinate, getRelativeCoordinates } from "../util";
import {  CopyNumberCurve } from "../model/CopyNumberCurve";
import { CurveState, CurvePickStatus } from "../model/CurveState";
import { getCopyNumCandidates } from "../model/CopyNumberState";

interface Props {
    curveState: CurveState;
    rdScale: d3.ScaleLinear<number, number>;
    bafScale: d3.ScaleLinear<number, number>;
    onLocationHovered: (p: number) => void;
}

export class CopyNumberCurveDrawer extends React.Component<Props> {
    static defaultProps = {
        onLocationHovered: _.noop
    };

    constructor(props: Props) {
        super(props);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseLeave = this.handleMouseLeave.bind(this);
    }

    handleMouseMove(event: React.MouseEvent<SVGPathElement>) {
        const {curveState, rdScale, bafScale, onLocationHovered} = this.props;
        const {state1, state2} = curveState;
        if (!state1 || !state2) {
            return;
        }
        const {x, y} = getRelativeCoordinates(event);
        const rd = rdScale.invert(x);
        const baf = bafScale.invert(y);
        const p = new CopyNumberCurve(state1, state2).getClosestPForLocation(rd, baf);
        onLocationHovered(p);
    }

    handleMouseLeave() {
        this.props.onLocationHovered(-1);
    }

    scaleRdBaf(rd: number, baf: number): Coordinate {
        return {
            x: this.props.rdScale(rd),
            y: this.props.bafScale(baf)
        };
    }

    render() {
        const {curveState, rdScale, bafScale} = this.props;
        const {state1, state2, hoveredP, pickStatus} = curveState;
        if (!state1 && !state2) {
            return null;
        }

        let pointPath = null;
        let hoverCircle = null;
        let copyGrid = [];
        if (state1 && !state2) {
            const curve = new CopyNumberCurve(state1, state1);
            const point = this.scaleRdBaf(curve.rdGivenP(0), curve.bafGivenP(0));
            hoverCircle = <circle cx={point.x} cy={point.y} r={3} fill="black" />;
        } else if (state1 && state2) {
            const curve = new CopyNumberCurve(state1, state2);
            pointPath = <SvgPointPath
                points={curve.sampleCurve().map(point => this.scaleRdBaf(point.rd, point.baf))}
                onMouseMove={this.handleMouseMove}
                onMouseLeave={this.handleMouseLeave} />;
            if (hoveredP >= 0) {
                const hoverPoint = this.scaleRdBaf(curve.rdGivenP(hoveredP), curve.bafGivenP(hoveredP));
                hoverCircle = <circle cx={hoverPoint.x} cy={hoverPoint.y} r={3} fill="yellow" />;
            }
        }

        if (pickStatus === CurvePickStatus.pickingState1 || pickStatus === CurvePickStatus.pickingState2) {
            for (const rdBaf of getCopyNumCandidates()) {
                const x = rdScale(rdBaf.rd);
                const y = bafScale(rdBaf.baf);
                copyGrid.push(<circle key={`${rdBaf.rd} ${rdBaf.baf}`} cx={x} cy={y} r={2} fill="grey" />);
            }
        }
    
        return <g>
            {pointPath}
            {hoverCircle}
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
    let pathString = `M ${points[0].x} ${points[0].y} `;
    for (let i = 1; i < points.length; i++) {
        const {x, y} = points[i];
        pathString += `L ${x} ${y} `;
    }
    return <React.Fragment>
        <path d={pathString} fill="transparent" stroke="black" strokeWidth={2} />
        <path d={pathString} fill="transparent" strokeOpacity={0} strokeWidth={4}
            onMouseMove={onMouseMove} onMouseLeave={onMouseLeave}/>
        <circle cx={firstPoint.x} cy={firstPoint.y} r={2} />
        <circle cx={lastPoint.x} cy={lastPoint.y} r={2} />
    </React.Fragment>;
}
