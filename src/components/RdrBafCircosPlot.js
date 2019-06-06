import React from "react";
import * as Circos from "circos";
import * as d3 from "d3";
import { hg38 } from "../model/Genome";
import { sampleWithEqualSpacing } from "../util";

function convertGenomeToCircosLayout(genome) {
    const colorScale = d3.scaleOrdinal(d3.schemeDark2);
    const layout = [];
    for (const chr of genome.getChromosomeList()) {
        layout.push({
            id: chr.name,
            label: chr.name.substr(3),
            len: chr.length,
            color: colorScale(chr.name)
        });
    }
    return layout;
}

const LAYOUT = convertGenomeToCircosLayout(hg38);
const CONFIG = {
    innerRadius: 160,
    outerRadius: 175,
    labels: {
        radialOffset: 2,
        size: 10,
        position: "center",
    },
    ticks: {
        display: true,
        color: "grey",
        spacing: 10000000,
        labelSpacing: 10,
        labelSuffix: "Mb",
        labelDenominator: 1000000,
        labelDisplay0: true,
        labelColor: "black",
        majorSpacing: 5,
        size: {
            minor: 2,
            major: 5,
        }
    },
};
const MAX_RECORDS = 5000;

export class RdrBafCircosPlot extends React.PureComponent {
    static nextId = 0;
    constructor(props) {
        super(props);
        this._containerNode = null;
        RdrBafCircosPlot.nextId++;
    }

    componentDidMount() {
        this.drawCircos();
    }

    componentDidUpdate() {
        this.drawCircos();
    }

    render() {
        return <div ref={node => this._containerNode = node} />;
    }

    drawCircos() {
        if (!this._containerNode) {
            return;
        }

        const records = this.props.data.getRecords();
        const {rdRange, hoveredRegion} = this.props;

        let rdData = [];
        let bafData = [];
        for (const record of records) {
            const blockAndPosition = {
                block_id: record["#CHR"],
                position: record.START
            };
            rdData.push({...blockAndPosition, value: record.RD});
            bafData.push({...blockAndPosition, value: record.BAF});
        }
        rdData = sampleWithEqualSpacing(rdData, MAX_RECORDS);
        bafData = sampleWithEqualSpacing(bafData, MAX_RECORDS);

        d3.select(this._containerNode).select("g").remove();

        const circos = new Circos({
            container: this._containerNode,
            width: 400,
            height: 400
        });
        circos.layout(LAYOUT, CONFIG);
        if (hoveredRegion) {
            circos.highlight(
                "hoveredRegion",
                [{
                    block_id: hoveredRegion.chr,
                    start: hoveredRegion.start,
                    end: hoveredRegion.end
                }],
                {
                    innerRadius: 0.70,
                    outerRadius: 1,
                    color: "yellow",
                    strokeWidth: 2,
                    strokeColor: "yellow",
                    opacity: 0.5
                }
            )
        }

        circos.scatter(
            "rdr", rdData, {
                innerRadius: 0.85,
                outerRadius: 1,
                min: rdRange[0],
                max: rdRange[1],
                strokeWidth: 0,
                size: 3,
                color: "blue",
                axes: [{color: "black", position: rdRange[0]}, {color: "black", position: rdRange[1]}]
            }
        );
        circos.scatter(
            "baf", bafData, {
                innerRadius: 0.70,
                outerRadius: 0.85,
                min: 0,
                max: 0.5,
                strokeWidth: 0,
                size: 3,
                color: "red",
                axes: [{color: "black", position: 0}, {color: "black", position: 0.5}]
            }
        );

        circos.render();
    }
}
