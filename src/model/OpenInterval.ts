/**
 * A 0-indexed open interval.  Intervals are iterable, so code can take advantage of the spread operator:
 *     `myFunction(...interval)` is equivalent to `myFunction(interval.start, interval.end)`
 */
export default class OpenInterval {
    /**
     * Makes a new instance.  The input should represent a 0-indexed open interval.
     * 
     * @param {number} start - start of the interval, inclusive
     * @param {number} end - end of the interval, exclusive
     * @throws {RangeError} if the end is less than the start
     */
    constructor(public readonly start: number, public readonly end: number) {
        if (end < start) {
            throw new RangeError("End cannot be less than start");
        }
        this.start = start;
        this.end = end;
    }

    /**
     * Enables the spread operator for OpenIntervals.
     */
    *[Symbol.iterator] () {
        yield this.start;
        yield this.end;
    }

    /**
     * @return {number} the length of this interval
     */
    getLength(): number {
        return this.end - this.start;
    }

    /**
     * @return {number} the center of this interval
     */
    getCenter(): number {
        return 0.5 * (this.start + this.end);
    }

    /**
     * @return {string} human-readable representation of this instance
     */
    toString(): string {
        return `[${this.start}, ${this.end})`;
    }
}
