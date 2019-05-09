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

export const GenomicBinHelpers = {
    toChromosomeInterval: function(bin: GenomicBin): ChromosomeInterval {
        return new ChromosomeInterval(bin["#CHR"], bin.START, bin.END);
    },

    estimateBinSize: function(bins: GenomicBin[]): number {
        if (bins.length === 0) {
            return 0;
        }
        return bins[0].END - bins[0].START;
    }
}
