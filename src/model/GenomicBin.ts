import { ChromosomeInterval } from "./ChromosomeInterval";

export interface GenomicBin {
    readonly "#CHR": string; // Despite this key implying that it is a number, it actually contains values like "chr3"
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
    /**
     * Converts a GenomicBin to a ChromosomeInterval.  Only considers genomic location; other data will not be
     * converted.
     * 
     * @param bin the GenomicBin to convert
     * @return ChromosomeInterval representing the genomic region of the GenomicBin
     */
    toChromosomeInterval: function(bin: GenomicBin): ChromosomeInterval {
        return new ChromosomeInterval(bin["#CHR"], bin.START, bin.END);
    }
}
