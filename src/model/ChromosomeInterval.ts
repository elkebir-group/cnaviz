import OpenInterval from "./OpenInterval";

export class ChromosomeInterval extends OpenInterval {
    public readonly chr: string;

    constructor(chr: string, start: number, end: number) {
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
}
