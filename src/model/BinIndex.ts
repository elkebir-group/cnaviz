import _ from "lodash";
import memoizeOne from "memoize-one";
import { GenomicBin } from "./GenomicBin";
import { ChromosomeInterval } from "./ChromosomeInterval";
import { BinMerger, MergedGenomicBin } from "./BinMerger";

export class SampleIndexedBins {
    private readonly _dataBySample: {[sample: string]: ChrIndexedBins};
    readonly rdRange: [number, number];
    
    constructor(bins: GenomicBin[]) {
        const grouped = _.groupBy(bins, "SAMPLE");
        this._dataBySample = {};
        for (const sample in grouped) {
            const binsForSample = grouped[sample];
            this._dataBySample[sample] = new ChrIndexedBins(binsForSample);
        }

        if (bins.length > 0) {
            this.rdRange = [_.minBy(bins, "RD")!.RD, _.maxBy(bins, "RD")!.RD];
        } else {
            this.rdRange = [0, 0];
        }
    }

    getSamples(): string[] {
        return Object.keys(this._dataBySample);
    }

    isEmpty(): boolean {
        return this.getSamples().length === 0;
    }

    getDataForSample(sample: string): ChrIndexedBins {
        return this._dataBySample[sample] || new ChrIndexedBins([]);
    }

    private _getDataForFirstSample() {
        const sample0 = this.getSamples()[0];
        return this.getDataForSample(sample0);
    }

    estimateBinSize() {
        const data = this._getDataForFirstSample().getRecords();
        if (data.length === 0) {
            return 0;
        }
        return data[0].END - data[0].START;
    }

    getChromosomes() {
        return this._getDataForFirstSample().getChromosomes();
    }
}

export class ChrIndexedBins {
    private _original: GenomicBin[];
    private _grouped: {[chr: string]: GenomicBin[]};
    private _merged: {[chr: string]: MergedGenomicBin[]};

    constructor(bins: GenomicBin[], merger=new BinMerger()) {
        this._original = bins;
        this._grouped = _.groupBy(bins, "#CHR");
        this._merged = {};
        for (const chr in this._grouped) {
            this._merged[chr] = merger.doMerge(this._grouped[chr]);
        }
        this.makeCopyWithJustChr = memoizeOne(this.makeCopyWithJustChr);
    }

    makeCopyWithJustChr(chr: string): ChrIndexedBins {
        const records = this.getRecords(chr);
        if (!records) {
            return new ChrIndexedBins([]);
        }
        const clone = _.clone(this);
        clone._original = records;
        clone._grouped = {[chr]: records};
        clone._merged = {[chr]: this._merged[chr]};
        return clone;
    }

    getChromosomes(): string[] {
        return Object.keys(this._grouped);
    }

    /**
     * Gets records for a chromosome.  If there is no chromosome specified, gets all of them.
     * @param chr 
     */
    getRecords(chr?: string): GenomicBin[] {
        if (!chr) {
            return this._original;
        } else {
            return this._grouped[chr];
        }
    }

    getMergedRecords(chr?: string): MergedGenomicBin[] {
        if (!chr) {
            return _.flatten(Object.values(this._merged));
        } else {
            return this._merged[chr];
        }
    }

    findOverlappingRecords(location: ChromosomeInterval): MergedGenomicBin[] {
        const candidates = this.getMergedRecords(location.chr);
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
