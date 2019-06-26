import { OpenInterval } from "./OpenInterval";

export class ChromosomeInterval {
    public readonly chr: string;
    private readonly _interval: OpenInterval;

    /**
     * Parses a string representing a ChromosomeInterval, such as those produced by the toString() method.  Throws an
     * error if parsing fails.
     * 
     * @param {string} str - interval to parse
     * @return {ChromosomeInterval} parsed instance
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

    constructor(chr: string, start: number, end: number) {
        if (start < 0) {
            throw new RangeError("Start cannot be negative");
        }
        this.chr = chr;
        this._interval = new OpenInterval(start, end);
    }

    get start() {
        return this._interval.start;
    }

    get end() {
        return this._interval.end;
    }

    getLength() {
        return this._interval.getLength();
    }

    getCenter() {
        return this._interval.getCenter();
    }

    /**
     * 
     */
    hasOverlap(other: ChromosomeInterval) {
        return this.chr === other.chr && this._interval.hasOverlap(other._interval);
    }

    /**
     * @return {string} human-readable representation of this instance
     */
    toString(): string {
        return `${this.chr}:${this.start}-${this.end}`;
    }

    /**
     * Gets a copy of this instance, with the start coordinate rounded down to the nearest multiple of `multiple` and
     * the end coordinate rounded up to the nearest multiple of `multiple`.  Used for binning purposes.
     * 
     * @param {number} multiple - the multiple to round to
     * @return {ChromosomeInterval} new instance with rounded end coordinates
     */
    endsRoundedToMultiple(multiple: number) {
        return new ChromosomeInterval(
            this.chr,
            Math.floor(this.start / multiple) * multiple,
            Math.ceil(this.end / multiple) * multiple
        );
    }
}
