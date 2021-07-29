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
    onBrushedBinsUpdated: (brushedBins: GenomicBin[]) => void;
    brushedBins: GenomicBin[];
    customColor: string;
    colors: string[];
    yScale: [number, number] | null;
    xScale: [number, number] | null;
    clusterTableData: any;
}

export function RDLinearPlot(props: Props & {rdRange: [number, number]}) {
    const {data, chr, rdRange, hoveredLocation, onLocationHovered, onBrushedBinsUpdated, brushedBins, customColor, colors, yScale, clusterTableData} = props;
    return <LinearPlot
        data={data}
        dataKeyToPlot="RD"
        genome={genome}
        chr={chr}
        hoveredLocation={hoveredLocation}
        onLocationHovered={onLocationHovered}
        onBrushedBinsUpdated={onBrushedBinsUpdated}
        yMin={yScale ? yScale[0] : rdRange[0]}
        yMax={yScale ? yScale[1] : rdRange[1]}
        yLabel={"RDR"}
        brushedBins={brushedBins}
        customColor={customColor}
        colors={colors}
        clusterTableData={clusterTableData}/>
}

export function BAFLinearPlot(props: Props) {
    const {data, chr, hoveredLocation, onLocationHovered, onBrushedBinsUpdated, brushedBins, customColor, colors, xScale, clusterTableData} = props;
    return <LinearPlot
        data={data}
        chr={chr}
        dataKeyToPlot="reverseBAF"
        genome={genome}
        hoveredLocation={hoveredLocation}
        onLocationHovered={onLocationHovered}
        onBrushedBinsUpdated= {onBrushedBinsUpdated}
        yMin={xScale ? xScale[0] : 0}
        yMax={xScale ? xScale[1] : 0.5}
        yLabel={"0.5 - BAF"}
        brushedBins={brushedBins}
        customColor={customColor}
        colors={colors} 
        clusterTableData={clusterTableData}/>;
}
