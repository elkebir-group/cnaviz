import React from "react";

import { ChromosomeInterval } from "../model/ChromosomeInterval";
import { hg38 } from "../model/Genome";
import { ChrIndexedBins } from "../model/BinIndex";
import { LinearPlot } from "./LinearPlot";

interface Props {
    data: ChrIndexedBins;
    chr?: string;
    hoveredLocation?: ChromosomeInterval;
    onLocationHovered?: (location: ChromosomeInterval | null) => void
}

export function RDLinearPlot(props: Props & {rdRange: [number, number]}) {
    const {data, chr, rdRange, hoveredLocation, onLocationHovered} = props;

    return <LinearPlot
        data={data}
        dataKeyToPlot="RD"
        genome={hg38}
        chr={chr}
        hoveredLocation={hoveredLocation}
        onLocationHovered={onLocationHovered}
        yMin={rdRange[0]}
        yMax={rdRange[1]}
        color="blue" />;
}

export function BAFLinearPlot(props: Props) {
    const {data, chr, hoveredLocation, onLocationHovered} = props;
    return <LinearPlot
        data={data}
        chr={chr}
        dataKeyToPlot="BAF"
        genome={hg38}
        hoveredLocation={hoveredLocation}
        onLocationHovered={onLocationHovered}
        yMin={0}
        yMax={0.5}
        color="red" />;
}
