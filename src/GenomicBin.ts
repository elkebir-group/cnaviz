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
    getCoordinates: function(bin: GenomicBin) {
        return `${bin["#CHR"]}:${bin.START}-${bin.END}}`;
    }
}
