import _ from "lodash";
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
        const data = this._getDataForFirstSample().getAllRecords();
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
    private readonly _original: GenomicBin[];
    private readonly _grouped: {[chr: string]: GenomicBin[]};
    private readonly _merged: {[chr: string]: MergedGenomicBin[]};

    constructor(bins: GenomicBin[], merger=new BinMerger()) {
        this._original = bins;
        this._grouped = _.groupBy(bins, "#CHR");
        this._merged = {};
        for (const chr in this._grouped) {
            this._merged[chr] = merger.doMerge(this._grouped[chr]);
        }
    }

    getChromosomes(): string[] {
        return Object.keys(this._grouped);
    }

    getAllRecords(): GenomicBin[] {
        return this._original;
    }

    getMergedRecords(): MergedGenomicBin[] {
        return _.flatten(Object.values(this._merged));
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
