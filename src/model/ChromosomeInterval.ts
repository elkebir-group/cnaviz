import OpenInterval from "./OpenInterval";

export class ChromosomeInterval extends OpenInterval {
    public readonly chr: string;

    constructor(chr: string, start: number, end: number) {
        if (start < 0) {
            throw new RangeError("Start cannot be negative");
        }
        super(start, end);
        this.chr = chr;
    }

    /**
     * @override
     * @return {string} human-readable representation of this interval
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
