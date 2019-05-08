import OpenInterval from "./OpenInterval";

export class ChromosomeInterval {
    public readonly chr: string;
    private readonly _interval: OpenInterval

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
