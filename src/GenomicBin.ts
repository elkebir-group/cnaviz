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

export class ChrIndexedGenomicBins {
    private readonly _original: GenomicBin[]
    private readonly _grouped: {[chr: string]: GenomicBin[]}

    constructor(bins: GenomicBin[]) {
        this._original = bins;
        this._grouped = _.groupBy(bins, "#CHR");
    }

    getAllRecords(): GenomicBin[] {
        return this._original;
    }

    findIndex(genomicLocation: ChromosomeInterval) {
        const recordsForChr = this._grouped[genomicLocation.chr] || [];
        const index = recordsForChr.findIndex(record =>
            record.START === genomicLocation.start && record.END === genomicLocation.end
        );
        return index;
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
    }
}
