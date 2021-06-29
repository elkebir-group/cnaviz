import React from "react";

import { ChromosomeInterval } from "../model/ChromosomeInterval";
import { hg38 } from "../model/Genome";
import { LinearPlot } from "./LinearPlot";
import { GenomicBin } from "../model/GenomicBin";
import { MergedGenomicBin } from "../model/BinMerger";

interface Props {
    data: GenomicBin[];
    chr: string;
    hoveredLocation?: ChromosomeInterval;
    onLocationHovered?: (location: ChromosomeInterval | null) => void
    brushedBins: MergedGenomicBin[];
    customColor: string;
    colors: string[];
}

export function RDLinearPlot(props: Props & {rdRange: [number, number]}) {
    const {data, chr, rdRange, hoveredLocation, onLocationHovered, brushedBins, customColor, colors} = props;

    return <LinearPlot
        data={data}
        dataKeyToPlot="RD"
        genome={hg38}
        chr={chr}
        hoveredLocation={hoveredLocation}
        onLocationHovered={onLocationHovered}
        yMin={rdRange[0]}
        yMax={rdRange[1]}
        brushedBins={brushedBins}
        customColor={customColor}
        colors={colors}/>
}

export function BAFLinearPlot(props: Props) {
    const {data, chr, hoveredLocation, onLocationHovered, brushedBins, customColor, colors} = props;
    return <LinearPlot
        data={data}
        chr={chr}
        dataKeyToPlot="BAF"
        genome={hg38}
        hoveredLocation={hoveredLocation}
        onLocationHovered={onLocationHovered}
        yMin={0}
        yMax={0.5}
        brushedBins={brushedBins}
        customColor={customColor}
        colors={colors} />;
}
