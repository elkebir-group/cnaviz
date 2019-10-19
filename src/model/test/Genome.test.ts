import { Genome } from "../Genome";
import { ChromosomeInterval } from "../ChromosomeInterval";
import { OpenInterval } from "../OpenInterval";

const CHROMOSOMES = [
    {name: "chr1", length: 10},
    {name: "chr2", length: 30},
    {name: "chr3", length: 20},
];
function makeBasicInstance(): Genome {
    return new Genome("test", CHROMOSOMES);
}

describe("constructor", () => {
    it("runs without errors", () => {
        expect(makeBasicInstance).not.toThrow();
    });

    it("is ok with an empty chromosome list", () => {
        expect(() => new Genome("test", [])).not.toThrow();
    });

    it("errors if there are duplicate chromosome names", () => {
        expect(() => new Genome("test", [
            {name: "chr1", length: 10},
            {name: "chr2", length: 30},
            {name: "chr1", length: 20},
        ])).toThrow(Error);
    });
});

describe("basic getters", () => {
    const instance = makeBasicInstance();

    it("getName() works", () => {
        expect(instance.getName()).toBe("test");
    });

    it("getChromosomeList() works", () => {
        expect(instance.getChromosomeList()).toEqual(CHROMOSOMES);
    });

    it("getChromosomeStarts() works", () => {
        expect(instance.getChromosomeStarts()).toEqual([0, 10, 40]);
    });
});

describe("getLength()", () => {
    const instance = makeBasicInstance();

    it("returns the length of the entire genome when given no arguments", () => {
        expect(instance.getLength()).toBe(60);
    });

    it("returns 0 with an empty chromosome list", () => {
        const zeroLength = new Genome("test", []);
        expect(zeroLength.getLength()).toBe(0);
    });

    it("returns the length of a chromosome when requested", () => {
        expect(instance.getLength("chr1")).toBe(10);
        expect(instance.getLength("chr2")).toBe(30);
        expect(instance.getLength("chr3")).toBe(20);
    });


    it("returns 0 when given a nonexistent chromosome name", () => {
        expect(instance.getLength("wat is this")).toBe(0);
    });
});

describe("getImplicitCoordinates()", () => {
    const instance = makeBasicInstance();

    it("is correct", () => {
        const location1 = new ChromosomeInterval("chr1", 0, 5);
        expect(instance.getImplicitCoordinates(location1)).toEqual(new OpenInterval(0, 5));

        const location2 = new ChromosomeInterval("chr3", 10, 20);
        expect(instance.getImplicitCoordinates(location2)).toEqual(new OpenInterval(50, 60));
    });

    it("errors if the chromosome is not in the genome", () => {
        const nonexistent = new ChromosomeInterval("what is this", 0, 10);
        expect(() => instance.getImplicitCoordinates(nonexistent)).toThrow(Error);
    });
});

describe("getChromosomeLocation()", () => {
    const instance = makeBasicInstance();

    it("is correct for locations corresponding to the middle of chromosomes", () => {
        expect(instance.getChromosomeLocation(5)).toEqual(new ChromosomeInterval("chr1", 5, 6));
        expect(instance.getChromosomeLocation(20)).toEqual(new ChromosomeInterval("chr2", 10, 11));
        expect(instance.getChromosomeLocation(50)).toEqual(new ChromosomeInterval("chr3", 10, 11));
    });

    it("is correct for locations corresponding to the starts of chromosomes", () => {
        expect(instance.getChromosomeLocation(0)).toEqual(new ChromosomeInterval("chr1", 0, 1));
        expect(instance.getChromosomeLocation(10)).toEqual(new ChromosomeInterval("chr2", 0, 1));
        expect(instance.getChromosomeLocation(40)).toEqual(new ChromosomeInterval("chr3", 0, 1));
    });

    it("is correct for locations corresponding to the ends of chromosomes", () => {
        expect(instance.getChromosomeLocation(9)).toEqual(new ChromosomeInterval("chr1", 9, 10));
        expect(instance.getChromosomeLocation(39)).toEqual(new ChromosomeInterval("chr2", 29, 30));
        expect(instance.getChromosomeLocation(59)).toEqual(new ChromosomeInterval("chr3", 19, 20));
    });

    it("clamps inputs outside the genome", () => {
        expect(instance.getChromosomeLocation(-1000)).toEqual(new ChromosomeInterval("chr1", 0, 1));
        expect(instance.getChromosomeLocation(1000)).toEqual(new ChromosomeInterval("chr3", 19, 20));
    })
});
