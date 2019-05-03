import React from "react";
import _ from "lodash";
import memoizeOne from "memoize-one";
import * as d3 from "d3";
import { GenomicBin, GenomicBinHelpers } from "../GenomicBin";

import "./Scatterplot.css";

const PADDING = { // For the SVG
    left: 70,
    right: 20,
    top: 20,
    bottom: 60,
};
const SCALES_CLASS_NAME = "scatterplot-scale";

interface ScatterplotProps {
    dataBySample: {[sample: string]: GenomicBin[]};
    width: number;
    height: number;
}
interface ScatterplotState {
    selectedSample: string;
}

export class Scatterplot extends React.Component<ScatterplotProps, ScatterplotState> {
    static defaultProps = {
        width: 600,
        height: 500
    };

    private svgElement: SVGElement | null;

    constructor(props: ScatterplotProps) {
        super(props);
        this.state = {
            selectedSample: Object.keys(props.dataBySample)[0]
        }
        this.svgElement = null;
        this.handleSelectedSampleChanged = this.handleSelectedSampleChanged.bind(this);
        this.getScales = memoizeOne(this.getScales);
    }

    componentDidMount() {
        this.drawScales();
    }

    componentDidUpdate(prevProps: ScatterplotProps) {
        if (this.props.dataBySample !== prevProps.dataBySample) {
            this.drawScales();
        }
    }

    handleSelectedSampleChanged(event: React.ChangeEvent<HTMLSelectElement>) {
        this.setState({selectedSample: event.target.value});
    }

    getScales(data: GenomicBin[], width: number, height: number) {
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

    drawScales() {
        if (!this.svgElement) {
            return;
        }
        const {dataBySample, width, height} = this.props;
        const data = dataBySample[this.state.selectedSample];
        const {bafScale, rdrScale} = this.getScales(data, width, height);

        const svg = d3.select(this.svgElement);
        svg.selectAll(SCALES_CLASS_NAME).remove();

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
    }

    render() {
        const {dataBySample, width, height} = this.props;
        const selectedSample = this.state.selectedSample;
        const sampleOptions = Object.keys(dataBySample).map(sampleName =>
            <option key={sampleName} value={sampleName}>{sampleName}</option>
        );

        const data = dataBySample[selectedSample];
        const {rdrScale, bafScale} = this.getScales(data, width, height);
        const colorScale = d3.scaleOrdinal(d3.schemeDark2);
        const circles = data.map(d => 
            <circle
                key={GenomicBinHelpers.getCoordinates(d)}
                cx={rdrScale(d.RD)}
                cy={bafScale(0.5 - d.BAF)}
                r={3}
                fill={colorScale(String(d.CLUSTER))}
            />
        );
        return <div className="Scatterplot-container">
            <div>
                Select sample: <select value={selectedSample} onChange={this.handleSelectedSampleChanged}>
                    {sampleOptions}
                </select>
            </div>
            <svg ref={node => this.svgElement = node} width={width} height={height} >
                {circles}
            </svg>
        </div>;
    }
}
