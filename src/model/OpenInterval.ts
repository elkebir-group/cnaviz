/**
 * A 0-indexed open interval; e.g. [0, 3).  Intervals are iterable, so code can take advantage of the spread operator:
 * `myFunction(...interval)` is equivalent to `myFunction(interval.start, interval.end)`
 * 
 * @author Silas Hsu
 */
export class OpenInterval {
    /**
     * Makes a new instance.  The input should represent a 0-indexed open interval.
     * 
     * @param start - start of the interval, inclusive
     * @param end - end of the interval, exclusive
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
     * @return the length of this interval
     */
    getLength(): number {
        return this.end - this.start;
    }

    /**
     * @return the center of this interval
     */
    getCenter(): number {
        return 0.5 * (this.start + this.end);
    }

    /**
     * Gets whether this interval overlaps or intersects with another one.
     * 
     * @param other other OpenInterval with which to check for overlap
     * @return whether this and the other interval overlap
     */
    hasOverlap(other: OpenInterval): boolean {
        const intersectionStart = Math.max(this.start, other.start);
        const intersectionEnd = Math.min(this.end, other.end);
        return intersectionStart < intersectionEnd;
    }

    /**
     * @return human-readable representation of this instance
     */
    toString(): string {
        return `[${this.start}, ${this.end})`;
    }
}
