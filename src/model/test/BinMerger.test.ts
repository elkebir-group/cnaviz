import { BinMerger, MergedGenomicBin } from "../BinMerger";
import { GenomicBin } from "../GenomicBin";
import { ChromosomeInterval } from "../ChromosomeInterval";

const DATA_OTHER_PROPS = {
    SAMPLE: "",
    "#SNPS": 0,
    COV: 0,
    ALPHA: 0,
    BETA: 0,
    CLUSTER: 0
};

test("similar bins should be merged", () => {
    const merger = new BinMerger(1, 1);
    const data: GenomicBin[] = [
        {
            "#CHR": "chr1",
            START: 0,
            END: 2,
            RD: 0.49,
            BAF: 0.49,
            ...DATA_OTHER_PROPS
        },
        {
            "#CHR": "chr1",
            START: 2,
            END: 4,
            RD: 0,
            BAF: 0,
            ...DATA_OTHER_PROPS
        },
        {
            "#CHR": "chr1",
            START: 4,
            END: 6,
            RD: -0.49,
            BAF: -0.49,
            ...DATA_OTHER_PROPS
        },
    ];
    const expected: MergedGenomicBin[] = [{
        location: new ChromosomeInterval("chr1", 0, 6),
        averageRd: 0,
        averageBaf: 0,
        bins: data
    }];
    expect(merger.doMerge(data)).toEqual(expected);
});

test("dissimilar bins should not be merged", () => {
    const merger = new BinMerger(1, 1);
    const data: GenomicBin[] = [
        {
            "#CHR": "chr1",
            START: 0,
            END: 2,
            RD: 0,
            BAF: 1,
            ...DATA_OTHER_PROPS
        },
        {
            "#CHR": "chr1",
            START: 2,
            END: 4,
            RD: 3,
            BAF: 1,
            ...DATA_OTHER_PROPS
        }
    ];
    const expected: MergedGenomicBin[] = [
        {
            location: new ChromosomeInterval("chr1", 0, 2),
            averageRd: data[0].RD,
            averageBaf: data[0].BAF,
            bins: [data[0]]
        },
        {
            location: new ChromosomeInterval("chr1", 2, 4),
            averageRd: data[1].RD,
            averageBaf: data[1].BAF,
            bins: [data[1]]
        }
    ];
    expect(merger.doMerge(data)).toEqual(expected);
});

test("bins from different chromosomes should not be merged", () => {
    const merger = new BinMerger(1, 1);
    const data: GenomicBin[] = [
        {
            "#CHR": "chr1",
            START: 0,
            END: 2,
            RD: 0,
            BAF: 0,
            ...DATA_OTHER_PROPS
        },
        {
            "#CHR": "chr2",
            START: 0,
            END: 2,
            RD: 0,
            BAF: 0,
            ...DATA_OTHER_PROPS
        }
    ];
    const expected: MergedGenomicBin[] = [
        {
            location: new ChromosomeInterval("chr1", 0, 2),
            averageRd: data[0].RD,
            averageBaf: data[0].BAF,
            bins: [data[0]]
        },
        {
            location: new ChromosomeInterval("chr2", 0, 2),
            averageRd: data[1].RD,
            averageBaf: data[1].BAF,
            bins: [data[1]]
        }
    ];
    expect(merger.doMerge(data)).toEqual(expected);
});
