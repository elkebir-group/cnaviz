import _ from "lodash";
import { GenomicBin } from "./GenomicBin";
import { ChromosomeInterval } from "./ChromosomeInterval";

export interface MergedGenomicBin {
    location: ChromosomeInterval;
    averageRd: number;
    averageBaf: number;
    bins: GenomicBin[];
}

export class BinMerger {
    // eslint-disable-next-line no-useless-constructor
    constructor(public readonly rdThreshold=0.2, public readonly bafThreshold=0.05) {

    }

    /**
     * 
     * @param bins - bins sorted by genomic coordinate
     * @param rdThreshold 
     * @param bafThreshold 
     */
    doMerge(bins: GenomicBin[]) {
        const merged: MergedGenomicBin[] = [];
        let i = 0;
        while (i < bins.length) {
            const firstBinOfMerge = bins[i];
            const rd = firstBinOfMerge.RD;
            const baf = firstBinOfMerge.BAF;
            const binsInCurrentMerge = [firstBinOfMerge];

             // Find the end of the current merge.  Everything has to be similar to the first bin of the merge.
            let j = i + 1;
            for (; j < bins.length; j++) {
                const thisBin = bins[j];
                const rdDiff = Math.abs(rd - thisBin.RD);
                const bafDiff = Math.abs(baf - thisBin.BAF);
                if (firstBinOfMerge["#CHR"] === thisBin["#CHR"] &&
                    rdDiff < this.rdThreshold &&
                    bafDiff < this.bafThreshold
                ) {
                    binsInCurrentMerge.push(thisBin); // Similar enough, add to merge
                } else {
                    break;
                }
            }

            merged.push({
                location: new ChromosomeInterval(firstBinOfMerge["#CHR"], firstBinOfMerge.START, bins[j - 1].END),
                averageRd: _.meanBy(binsInCurrentMerge, "RD"),
                averageBaf: _.meanBy(binsInCurrentMerge, "BAF"),
                bins: binsInCurrentMerge
            });
            i = j;
        }
        return merged;
    }
}
