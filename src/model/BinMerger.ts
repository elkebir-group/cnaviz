import _ from "lodash";
import { GenomicBin } from "./GenomicBin";
import { ChromosomeInterval } from "./ChromosomeInterval";

/**
 * Output of BinMerger -- an aggregation of GenomicBins that are adjacent in the genome.
 */
export interface MergedGenomicBin {
    /** The genomic region that all the bins span. */
    location: ChromosomeInterval;

    /** Average read depth ratio of all the bins. */
    averageRd: number;

    /** Average B allele frequency of all the bins. */
    averageBaf: number;

    /** The original data that comprises this aggregation. */
    bins: GenomicBin[];
}

/**
 * Aggregator of GenomicBin.
 * 
 * @author Silas Hsu
 */
export class BinMerger {
    private readonly _rdThreshold: number;
    private readonly _bafThreshold: number;

    /**
     * Makes a new instance with parameters that represent the extent to which data points must be similar in order for
     * them to be aggregated.
     * 
     * @param rdThreshold similarity threshold for read depth ratio
     * @param bafThreshold similarity threshold for b allele frequency
     */
    constructor(rdThreshold=0.4, bafThreshold=0.1) {
        this._rdThreshold = rdThreshold;
        this._bafThreshold = bafThreshold;
        this.doMerge = this.doMerge.bind(this);
    }

    /**
     * Aggregates those bins that are similar enough, according to the configuration specified in the constructor.
     * Only data points from the same chromosome will be considered for aggregation.  The input MUST be sorted by
     * genomic coordinates.
     * 
     * @param bins - data sorted by genomic coordinates
     * @return list of aggregated data
     */
    doMerge(bins: GenomicBin[]): MergedGenomicBin[] {
        const merged: MergedGenomicBin[] = [];
        let i = 0;
        while (i < bins.length) {
            const firstBinOfMerge = bins[i];
            const binsInCurrentMerge = [firstBinOfMerge];
            // Keep track of the rd and baf ranges in the current merge
            const rdMinMax = new MinMax(firstBinOfMerge.RD, firstBinOfMerge.RD);
            const bafMinMax = new MinMax(firstBinOfMerge.BAF, firstBinOfMerge.BAF);

            // Find the end of the current merge.  The RD and BAF ranges cannot exceed the thresholds. 
            let j = i + 1;
            for (; j < bins.length; j++) {
                const thisBin = bins[j];
                rdMinMax.update(thisBin.RD);
                bafMinMax.update(thisBin.BAF);
                if (firstBinOfMerge["#CHR"] === thisBin["#CHR"] &&
                    rdMinMax.getRange() < this._rdThreshold &&
                    bafMinMax.getRange() < this._bafThreshold
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

/**
 * Simple tracker for the min and max of a list of values.
 */
class MinMax {
    private _min: number;
    private _max: number;

    /**
     * Makes a new instance with initial min and max values.
     * 
     * @param min initial min value
     * @param max initial max value
     */
    constructor(min: number, max: number) {
        this._min = min;
        this._max = max;
    }

    /**
     * @return the current range; max value - min value
     */
    getRange(): number {
        return this._max - this._min;
    }

    /**
     * Adds another number to this range of values, updating the max or min as necessary.
     * 
     * @param num the number to add
     */
    update(num: number) {
        if (num > this._max) {
            this._max = num;
        } else if (num < this._min) {
            this._min = num;
        }
    }
}
