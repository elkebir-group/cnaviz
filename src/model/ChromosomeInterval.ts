import { OpenInterval } from "./OpenInterval";

/**
 * A genomic region or position represented by a chromosome name and an open interval of 0-indexed base numbers.  For
 * example, "chr1:0-3" would represent the first, second and third bases of the chromosome called "chr1".
 * 
 * Note that instances are immutable; they cannot be modified.  Create new instances to "modify" them.
 * 
 * @author Silas Hsu
 */
export class ChromosomeInterval {
    /** The chromosome's name. */
    public readonly chr: string;

    /** 0-indexed open interval of base numbers. */
    private readonly _interval: OpenInterval;

    /**
     * Parses a string representing a ChromosomeInterval, such as those produced by the toString() method.  Throws an
     * error if parsing fails.
     * 
     * @param str interval to parse
     * @return parsed instance
     * @throws {RangeError} if parsing fails
     */
    static parse(str: string): ChromosomeInterval {
        const regexMatch = str.match(/([\w:]+)\W+(\d+)\W+(\d+)/);
        if (regexMatch) {
            const chr = regexMatch[1];
            const start = Number.parseInt(regexMatch[2], 10);
            const end = Number.parseInt(regexMatch[3], 10);
            return new ChromosomeInterval(chr, start, end);
        } else {
            throw new RangeError("Could not parse interval");
        }
    }

    /**
     * Makes a new instance.  The input interval should be 0-indexed and open; i.e [start, end)
     * 
     * @param chr name of the chromosome
     * @param start start base number of the region, inclusive
     * @param end end base number of the region, exclusive
     */
    constructor(chr: string, start: number, end: number) {
        if (start < 0) {
            throw new RangeError("Start cannot be negative");
        }
        this.chr = chr;
        this._interval = new OpenInterval(start, end);
    }

    /**
     * @return the start base number of this instance
     */
    get start(): number {
        return this._interval.start;
    }

    /**
     * Gets the end base number of this instance.  Since instances are represented as open intervals, note the base
     * number returned by this method is not actually inside of the genomic region represented by this instance.
     * 
     * @return the end base number of this instance
     */
    get end(): number {
        return this._interval.end;
    }

    /**
     * @return the number of bases represented by this instance
     */
    getLength(): number {
        return this._interval.getLength();
    }

    /**
     * Checks if this genomic region overlaps or intersects with another one.
     * 
     * @param other other ChromosomeInterval with which to check for overlap
     * @return whether this genomic region overlaps with another one
     */
    hasOverlap(other: ChromosomeInterval): boolean {
        return this.chr === other.chr && this._interval.hasOverlap(other._interval);
    }

    /**
     * @return human-readable representation of this instance
     */
    toString(): string {
        return `${this.chr}:${this.start}-${this.end}`;
    }

    /**
     * Gets a copy of this instance, with the start coordinate rounded down to the nearest multiple of `multiple` and
     * the end coordinate rounded up to the nearest multiple of `multiple`.  Used for binning purposes.
     * 
     * @param multiple - the multiple to round to
     * @return new instance with rounded end coordinates
     */
    endsRoundedToMultiple(multiple: number): ChromosomeInterval {
        if (multiple <= 0) {
            throw new RangeError(`Cannot round to a multiple <= 0 (got ${multiple})`);
        }
        return new ChromosomeInterval(
            this.chr,
            Math.floor(this.start / multiple) * multiple,
            Math.ceil(this.end / multiple) * multiple
        );
    }
}
