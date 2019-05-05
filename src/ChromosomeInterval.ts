export class ChromosomeInterval {
    // eslint-disable-next-line no-useless-constructor
    constructor(public readonly chr: string, public readonly start: number, public readonly end: number) {

    }

    /**
     * @return {string} human-readable representation of this interval
     */
    toString(): string {
        return `${this.chr}:${this.start}-${this.end}`;
    }
}
