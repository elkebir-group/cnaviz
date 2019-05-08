import _ from "lodash";
import { ChromosomeInterval } from "./ChromosomeInterval";

export interface GenomicBin {
    readonly "#CHR": string;
    readonly START: number;
    readonly END: number;
    readonly SAMPLE: string;
    readonly RD: number;
    readonly "#SNPS": number;
    readonly COV: number;
    readonly ALPHA: number;
    readonly BETA: number;
    readonly BAF: number;
    readonly CLUSTER: number;
}

export interface MergedGenomicBin {
    location: ChromosomeInterval;
    averageRd: number;
    averageBaf: number;
    bins: GenomicBin[];
}

export class ChrIndexedGenomicBins {
    private readonly _original: GenomicBin[];
    private readonly _grouped: {[chr: string]: GenomicBin[]};
    private readonly _merged: {[chr: string]: MergedGenomicBin[]};

    constructor(bins: GenomicBin[]) {
        this._original = bins;
        this._grouped = _.groupBy(bins, "#CHR");
        this._merged = {};
        for (const chr in this._grouped) {
            this._merged[chr] = GenomicBinHelpers.mergeBins(this._grouped[chr]);
        }
    }

    getAllRecords(): GenomicBin[] {
        return this._original;
    }

    getMergedRecords(): MergedGenomicBin[] {
        return _.flatten(Object.values(this._merged));
    }

    findRecord(genomicLocation: ChromosomeInterval): GenomicBin | null {
        const recordsForChr = this._grouped[genomicLocation.chr] || [];
        return recordsForChr.find(record =>
            record.START === genomicLocation.start && record.END === genomicLocation.end
        ) || null;
    }

    findOverlappingRecords(location: ChromosomeInterval): MergedGenomicBin[] {
        const candidates = this._merged[location.chr];
        if (!candidates) {
            return [];
        }

        const results = [];
        for (const candidate of candidates) {
            if (candidate.location.hasOverlap(location)) {
                results.push(candidate);
            }
        }
        return results;
    }
}

export type IndexedGenomicBins = {
    [sample: string]: ChrIndexedGenomicBins;
}

export const GenomicBinHelpers = {
    toChromosomeInterval: function(bin: GenomicBin): ChromosomeInterval {
        return new ChromosomeInterval(bin["#CHR"], bin.START, bin.END);
    },

    indexBins: function(bins: GenomicBin[]): IndexedGenomicBins {
        const grouped = _.groupBy(bins, "SAMPLE");
        const result: IndexedGenomicBins = {};
        for (const sample in grouped) {
            const binsForSample = grouped[sample];
            result[sample] = new ChrIndexedGenomicBins(binsForSample);
        }
        return result;
    },

    estimateBinSize: function(bins: GenomicBin[]): number {
        if (bins.length === 0) {
            return 0;
        }
        return bins[0].END - bins[0].START;
    },

    /**
     * 
     * @param bins - bins sorted by genomic coordinate
     * @param rdThreshold 
     * @param bafThreshold 
     */
    mergeBins(bins: GenomicBin[], rdThreshold=0.2, bafThreshold=0.05) {
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
                if (firstBinOfMerge["#CHR"] === thisBin["#CHR"] && rdDiff < rdThreshold && bafDiff < bafThreshold) {
                    // Similar enough, add to merge
                    binsInCurrentMerge.push(thisBin);
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
