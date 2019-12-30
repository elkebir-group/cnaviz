import { DataWarehouse } from "../DataWarehouse";
import { BinMerger, MergedGenomicBin } from "../BinMerger";
import { ChromosomeInterval } from "../ChromosomeInterval";
import { GenomicBin } from "../GenomicBin";

const DATA_OTHER_PROPS = {
    START: 0,
    END: 0,
    RD: 0,
    BAF: 0,
    "#SNPS": 0,
    COV: 0,
    ALPHA: 0,
    BETA: 0,
    CLUSTER: 0
};

/**
 * Test input: six records with two unqiue samples and three unique chromosomes.
 */
const INPUT_DATA: GenomicBin[] = [
    { SAMPLE: "sample1", "#CHR": "chr1", ...DATA_OTHER_PROPS, RD: -5 }, // Special RD for testing getRdRange()
    { SAMPLE: "sample1", "#CHR": "chr1", ...DATA_OTHER_PROPS },
    { SAMPLE: "sample1", "#CHR": "chr2", ...DATA_OTHER_PROPS },
    { SAMPLE: "sample2", "#CHR": "chr1", ...DATA_OTHER_PROPS },
    { SAMPLE: "sample2", "#CHR": "chr1", ...DATA_OTHER_PROPS },
    { SAMPLE: "sample2", "#CHR": "chr3", ...DATA_OTHER_PROPS, RD: 5 },
];

/**
 * This data aggregator simply aggregates everything without exception.
 */
class DummyMerger extends BinMerger {
    /**
     * @override
     */
    doMerge(bins: GenomicBin[]): MergedGenomicBin[] {
        return [{
            location: new ChromosomeInterval("chr1", 0, 0),
            averageRd: 0,
            averageBaf: 0,
            bins: bins
        }];
    }
}

function makeTestInstance() {
    return new DataWarehouse(INPUT_DATA, new DummyMerger());
}

function expectListInAnyOrder<T>(actual: T[], expected: T[]) {
    expect(actual).toHaveLength(expected.length);
    for (const element of expected) {
        expect(actual).toContain(element);
    }
}

describe("isEmpty()", () => {
    it("returns true when there is no data", () => {
        expect(new DataWarehouse([]).isEmpty()).toBe(true);
    });

    it("returns false when there is data", () => {
        expect(makeTestInstance().isEmpty()).toBe(false);
    });
});

describe("getRdRange()", () => {
    it("returns the min and max rd of all the data", () => {
        expect(makeTestInstance().getRdRange()).toEqual([-5, 5]);
    });
});

describe("getSampleList()", () => {
    it("returns all samples in the data", () => {
        const sampleList = makeTestInstance().getSampleList();
        expectListInAnyOrder(sampleList, ["sample1", "sample2"]);
    });
});

describe("getAllChromosomes()", () => {
    it("returns all unique chromosomes in the data", () => {
        const chrList = makeTestInstance().getAllChromosomes();
        expectListInAnyOrder(chrList, ["chr1", "chr2", "chr3"]);
    });
});

describe("getChromosomeList()", () => {
    it("returns all unique chromosomes in the data", () => {
        const instance = makeTestInstance();
        const listSample1 = instance.getChromosomeList("sample1");
        const listSample2 = instance.getChromosomeList("sample2");
        expectListInAnyOrder(listSample1, ["chr1", "chr2"]);
        expectListInAnyOrder(listSample2, ["chr1", "chr3"]);
    });

    it("returns an empty list when querying a nonexistent sample", () => {
        expect(makeTestInstance().getChromosomeList("what sample?")).toHaveLength(0);
    });
});

describe("guessBinSize()", () => {
    it("returns 0, since all the test data has a bin size of 0", () => {
        expect(makeTestInstance().guessBinSize()).toBe(0);
    });
});

describe("getRecords()", () => {
    it("gets all records that match a sample and chromosome query", () => {
        const sampleQuery = "sample1";
        const chrQuery = "chr1";
        const result = makeTestInstance().getRecords(sampleQuery, chrQuery);

        expect(result).toHaveLength(2);
        for (const bin of result) {
            expect(bin.SAMPLE).toBe(sampleQuery);
            expect(bin["#CHR"]).toBe(chrQuery);
        }
    });

    it("gets all records that match a sample and whole-genome query", () => {
        const sampleQuery = "sample2";
        const result = makeTestInstance().getRecords(sampleQuery, DataWarehouse.ALL_CHRS_KEY);

        expect(result).toHaveLength(3);
        for (const bin of result) {
            expect(bin.SAMPLE).toBe(sampleQuery);
        }
    });

    it("returns an empty list if sample or chromosome are not in the data", () => {
        expect(makeTestInstance().getRecords("what sample?", "chr1")).toHaveLength(0);
        expect(makeTestInstance().getRecords("sample1", "what chr?")).toHaveLength(0);
    });
});

describe("getMergedRecords()", () => {
    it("gets all records that match a sample and chromosome query", () => {
        const sampleQuery = "sample1";
        const chrQuery = "chr1";
        const result = makeTestInstance().getMergedRecords(sampleQuery, chrQuery);

        expect(result).toHaveLength(1);
        expect(result[0].bins).toHaveLength(2);
        for (const bin of result[0].bins) {
            expect(bin.SAMPLE).toBe(sampleQuery);
            expect(bin["#CHR"]).toBe(chrQuery);
        }
    });

    it("gets all records that match a sample and whole-genome query", () => {
        const sampleQuery = "sample2";
        const result = makeTestInstance().getMergedRecords(sampleQuery, DataWarehouse.ALL_CHRS_KEY);
        expect(result).toHaveLength(2); // There are two chromosomes in sample2, aggregated separately.
    });

    it("returns an empty list if sample or chromosome are not in the data", () => {
        expect(makeTestInstance().getMergedRecords("what sample?", "chr1")).toHaveLength(0);
        expect(makeTestInstance().getMergedRecords("sample1", "what chr?")).toHaveLength(0);
    });
});
