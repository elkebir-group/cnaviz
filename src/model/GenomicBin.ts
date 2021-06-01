import { ChromosomeInterval } from "./ChromosomeInterval";

/**
 * Represents one data point, or one row from a HATCHet .bbc file.  Called a "bin" because during data processing, the
 * genome is binned into equal sized chunks.
 */
export interface GenomicBin {
    readonly "#CHR": string; // Despite this key implying that it is a number, it can contain values like "chr3"
    readonly START: number;
    readonly END: number;
    readonly SAMPLE: string;
    /** Read depth ratio */
    readonly RD: number;
    readonly "#SNPS": number;
    readonly COV: number;
    readonly ALPHA: number;
    readonly BETA: number;
    /** B allele frequency */
    readonly BAF: number;
    /** Cluster ID */
    CLUSTER: number;
}

export const GenomicBinHelpers = {
    /**
     * Converts a GenomicBin to a ChromosomeInterval.
     * 
     * @param bin the GenomicBin to convert
     * @return ChromosomeInterval representing the genomic region of the GenomicBin
     */
    toChromosomeInterval: function(bin: GenomicBin): ChromosomeInterval {
        return new ChromosomeInterval(bin["#CHR"], bin.START, bin.END);
    }
}
