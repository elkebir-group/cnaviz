import React from "react";
import Circos, { SCATTER } from "react-circos";
import * as d3 from "d3";
import { hg38 } from "../model/Genome";

function convertGenomeToCircosLayout(genome) {
    const colorScale = d3.scaleOrdinal(d3.schemeDark2);
    const layout = [];
    for (const chr of hg38.getChromosomeList()) {
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
    outerRadius: 170,
    labels: {
        radialOffset: -10,
        size: 10
    },
    ticks: {
        display: true,
        color: "grey",
        spacing: 10000000,
        labels: true,
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

export class RdrBafCircosPlot extends React.PureComponent {
    shouldComponentUpdate(nextProps) {
        return this.props.data !== nextProps.data;
    }

    render() {
        const records = this.props.data.getRecords();
        const rdData = records.map(record => {
            return {
                block_id: record["#CHR"],
                position: record.START,
                value: record.RD
            };
        });
        console.log(rdData);

        return <Circos 
            size={400}
            layout={LAYOUT}
            config={CONFIG}
            tracks={[
                {
                    type: SCATTER,
                    data: rdData,
                    config: {
                        min: this.props.rdRange[0],
                        max: this.props.rdRange[1]
                    }
                },
                {
                    type: SCATTER,
                    data: [],
                    config: {
                        min: 0,
                        max: 0.5
                    }
                }
            ]}
        />;
    }
}
