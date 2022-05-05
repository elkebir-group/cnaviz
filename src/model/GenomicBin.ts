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
    RD: number;
    readonly logRD: number;
    readonly "#SNPS": number;
    readonly COV: number;
    readonly ALPHA: number;
    readonly BETA: number;
    
    /** B allele frequency */
    readonly BAF: number;

    /** Cluster ID */
    CLUSTER: number;

    readonly cn_normal: number;
    readonly u_normal: number;
    readonly cn_clone1: number;
    readonly u_clone1: number;
    readonly cn_clone2: number;
    readonly u_clone2: number;
    
    readonly reverseBAF: number;
    readonly genomicPosition: number;
    fractional_cn: number;
    
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
    },

    flattenNestedBins: function(arr : any, result : any[] = []) : any[] {
        for (let i = 0, length = arr.length; i < length; i++) {
          const value = arr[i];
          if (Array.isArray(value)) {
            this.flattenNestedBins(value, result);
          } else {
            result.push(value);
          }
        }
        
        return result;
    }
}
