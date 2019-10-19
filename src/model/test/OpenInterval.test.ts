import { OpenInterval } from "../OpenInterval";

describe("Constructor and properties", () => {
    it("can initialize and get start and end", () => {
        const interval = new OpenInterval(-10, 10);
        expect(interval.start).toBe(-10);
        expect(interval.end).toBe(10);
    });

    it("constructor errors if end is before start", () => {
        expect(() => new OpenInterval(10, 0)).toThrow(RangeError);
        expect(() => new OpenInterval(-10, -10)).not.toThrowError(); // Same is OK
    });
});

describe("Iteration (or spread operator)", () => {
    it("works", () => {
        const interval = new OpenInterval(0, 10);
        expect([...interval]).toEqual([0, 10]);
    });
});

describe("getLength()", () => {
    it("works", () => {
        expect(new OpenInterval(-10, 10).getLength()).toBe(20);
        expect(new OpenInterval(0, 0).getLength()).toBe(0);
    });
});

describe("getCenter()", () => {
    it("works", () => {
        expect(new OpenInterval(0, 20).getCenter()).toBe(10);
        expect(new OpenInterval(-13, -10).getCenter()).toBe(-11.5);
        expect(new OpenInterval(0, 0).getCenter()).toBe(0);
    });
});

describe("hasOverlap()", () => {
    it("returns true if there is an overlap", () => {
        // Right overlap
        const interval1 = new OpenInterval(0, 10);
        const interval2 = new OpenInterval(9, 20);
        expect(interval1.hasOverlap(interval2)).toBe(true);
        expect(interval2.hasOverlap(interval1)).toBe(true); // Switch arguments; answer should not change

        // Left overlap
        const interval3 = new OpenInterval(-20, -10);
        const interval4 = new OpenInterval(-25, -15);
        expect(interval3.hasOverlap(interval4)).toBe(true);
        expect(interval4.hasOverlap(interval3)).toBe(true);

        // Complete overlap
        const interval5 = new OpenInterval(-10, 10);
        const interval6 = new OpenInterval(-3, 3);
        expect(interval5.hasOverlap(interval6)).toBe(true);
        expect(interval6.hasOverlap(interval5)).toBe(true);
    });

    it("returns false if there is no overlap", () => {
        // Rightside nonoverlap
        const interval1 = new OpenInterval(0, 10);
        const interval2 = new OpenInterval(10, 20);
        expect(interval1.hasOverlap(interval2)).toBe(false);
        expect(interval2.hasOverlap(interval1)).toBe(false); // Switch arguments; answer should not change

        // Leftside nonoverlap
        const interval3 = new OpenInterval(-20, -10);
        const interval4 = new OpenInterval(-25, -21);
        expect(interval3.hasOverlap(interval4)).toBe(false);
        expect(interval4.hasOverlap(interval3)).toBe(false);
    });

    it("returns false for 0-length intervals", () => {
        const interval1 = new OpenInterval(0, 10);
        const zeroLength = new OpenInterval(5, 5);
        expect(interval1.hasOverlap(zeroLength)).toBe(false);
        expect(zeroLength.hasOverlap(interval1)).toBe(false);
        expect(zeroLength.hasOverlap(zeroLength)).toBe(false); // Overlapping 0-length with itself!
    });
});

describe("toString()", () => {
    it("works", () => {
        expect(new OpenInterval(-4, 8).toString()).toEqual("[-4, 8)");
    });
});
