import { ChromosomeInterval } from "../ChromosomeInterval";

describe("Constructor and properties", () => {
    it("can initialize and get chr, start, and end", () => {
        const newInterval = new ChromosomeInterval("myChr", 0, 100);
        expect(newInterval.chr).toBe("myChr");
        expect(newInterval.start).toBe(0);
        expect(newInterval.end).toBe(100);
    });

    it("constructor throws error if given end less than start", () => {
        expect(() => new ChromosomeInterval("uhoh", 10, 0)).toThrow(RangeError);
    });

    it("constructor throws error if given negative start", () => {
        expect(() => new ChromosomeInterval("negativeStart", -10, 10)).toThrow(RangeError);
    });
});

describe("parse()", () => {
    it("parses input with a colon correctly", () => {
        expect(ChromosomeInterval.parse("myChr:1-10")).toEqual(new ChromosomeInterval("myChr", 1, 10));
    });

    it("parses input with spaces correctly", () => {
        expect(ChromosomeInterval.parse("myChr \t 1 \t 10")).toEqual(new ChromosomeInterval("myChr", 1, 10));
    });

    it("throws an error on malformed input", () => {
        expect(() => ChromosomeInterval.parse("sad3*#$c)")).toThrow(RangeError);
        expect(() => ChromosomeInterval.parse("chr1:AAA-BBB")).toThrow(RangeError);
    });
});

describe("getLength()", () => {
    it("works", () => {
        expect(new ChromosomeInterval("test", 0, 100).getLength()).toBe(100);
        expect(new ChromosomeInterval("test", 0, 0).getLength()).toBe(0);
    }); 
});

describe("hasOverlap()", () => {
    it("returns true if there is an overlap", () => {
        const interval1 = new ChromosomeInterval("chr1", 0, 10);
        const interval2 = new ChromosomeInterval("chr1", 5, 15);
        expect(interval1.hasOverlap(interval2)).toBe(true);
    });

    it("returns false if the chromosomes don't match", () => {
        const interval1 = new ChromosomeInterval("chr1", 0, 10);
        const interval2 = new ChromosomeInterval("chr2", 5, 15);
        expect(interval1.hasOverlap(interval2)).toBe(false);
    });

    it("returns false if the coordinates don't overlap", () => {
        const interval1 = new ChromosomeInterval("chr1", 0, 10);
        const interval2 = new ChromosomeInterval("chr1", 10, 15);
        expect(interval1.hasOverlap(interval2)).toBe(false);
    });
});

describe("toString()", () => {
    it("works", () => {
        expect(new ChromosomeInterval("chr1", 0, 10).toString()).toBe("chr1:0-10");
    });
});

describe("endsRoundedToMultiple()", () => {
    it("rounds correctly", () => {
        const toRound = new ChromosomeInterval("chr1", 2, 9);
        expect(toRound.endsRoundedToMultiple(10)).toEqual(new ChromosomeInterval("chr1", 0, 10));
    });

    it("errors if given a number <= 0", () => {
        const toRound = new ChromosomeInterval("chr1", 2, 9);
        expect(() => toRound.endsRoundedToMultiple(0)).toThrow(RangeError);
        expect(() => toRound.endsRoundedToMultiple(-5)).toThrow(RangeError);
    });
});
