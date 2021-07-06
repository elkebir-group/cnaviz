import React from "react";

import { ChromosomeInterval } from "../model/ChromosomeInterval";
import { hg38 } from "../model/Genome";
import {genome} from "../App";
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
    yScale: [number, number] | null;
}

export function RDLinearPlot(props: Props & {rdRange: [number, number]}) {
    const {data, chr, rdRange, hoveredLocation, onLocationHovered, brushedBins, customColor, colors, yScale} = props;
    return <LinearPlot
        data={data}
        dataKeyToPlot="RD"
        genome={genome}
        chr={chr}
        hoveredLocation={hoveredLocation}
        onLocationHovered={onLocationHovered}
        yMin={yScale ? yScale[0] : rdRange[0]}
        yMax={yScale ? yScale[1] : rdRange[1]}
        yLabel={"RDR"}
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
        genome={genome}
        hoveredLocation={hoveredLocation}
        onLocationHovered={onLocationHovered}
        yMin={0}
        yMax={0.5}
        yLabel={"0.5 - BAF"}
        brushedBins={brushedBins}
        customColor={customColor}
        colors={colors} />;
}
