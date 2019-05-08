import React from "react";
import _ from "lodash";
import memoizeOne from "memoize-one";
import { LinearPlot } from "./LinearPlot";
import { ChromosomeInterval } from "../model/ChromosomeInterval";
import { ChrIndexedGenomicBins, GenomicBin } from "../model/GenomicBin";
import { hg38 } from "../model/Genome";

interface Props {
    data: ChrIndexedGenomicBins;
    hoveredLocation?: ChromosomeInterval;
    onLocationHovered?: (location: ChromosomeInterval | null) => void
}

export class RDLinearPlot extends React.Component<Props> {
    constructor(props: Props) {
        super(props);
        this.findMinMaxRd = memoizeOne(this.findMinMaxRd);
    }

    findMinMaxRd(data: GenomicBin[]) {
        let min = 0, max = 0;
        if (data.length !== 0) {
            min = (_.minBy(data, "RD") as GenomicBin).RD;
            max = (_.maxBy(data, "RD") as GenomicBin).RD;
        }
        return {min, max};
    }

    render() {
        const {data, hoveredLocation, onLocationHovered} = this.props;
        const {min, max} = this.findMinMaxRd(data.getAllRecords());

        return <LinearPlot
            data={data}
            dataKeyToPlot="RD"
            genome={hg38}
            hoveredLocation={hoveredLocation}
            onLocationHovered={onLocationHovered}
            yMin={min}
            yMax={max}
            color="blue" />;
    }
}

export function BAFLinearPlot(props: Props) {
    const {data, hoveredLocation, onLocationHovered} = props;
    return <LinearPlot
        data={data}
        dataKeyToPlot="BAF"
        genome={hg38}
        hoveredLocation={hoveredLocation}
        onLocationHovered={onLocationHovered}
        yMin={0}
        yMax={0.5}
        color="red" />;
}
