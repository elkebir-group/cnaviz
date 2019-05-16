import { RdBaf, CopyNumberState } from "./CopyNumberState";
import { getMinDistanceIndex } from "../util";

const DEFAULT_SAMPLES = 20;

export class CopyNumberCurve {
    readonly state1: CopyNumberState;
    readonly state2: CopyNumberState;

    constructor(state1: CopyNumberState, state2: CopyNumberState) {
        this.state1 = state1;
        this.state2 = state2;
    }

    getTotalCopies() {
        return {
            total1: this.state1.aCopies + this.state1.bCopies,
            total2: this.state2.aCopies + this.state2.bCopies
        };
    }

    rdGivenP(p: number): number {
        const {total1, total2} = this.getTotalCopies();
        return Math.log2(p * (total1 - total2) + total2) - 1;
    }

    bafGivenP(p: number): number {
        const {total1, total2} = this.getTotalCopies();
        const demoninator = p * total1 + (1 - p) * total2;
        if (demoninator === 0) {
            return 0;
        }
        const numerator = p * this.state1.bCopies + (1 - p) * this.state2.bCopies;
        return numerator / demoninator; // Alternatively, this could be 0.5 - baf
    }

    sampleCurve(samples=DEFAULT_SAMPLES): RdBaf[] {
        const points = [];
        const pIncrement = 1/samples;
        for (let p = 0; p <= 1; p += pIncrement) {
            points.push({
                rd: this.rdGivenP(p),
                baf: this.bafGivenP(p)
            });
        }
        return points;
    }

    getClosestPForLocation(rd: number, baf: number, samples=DEFAULT_SAMPLES): number {
        const queryRdBaf = {rd, baf};
        const curve = this.sampleCurve(samples);
        const minIndex = getMinDistanceIndex(queryRdBaf, curve, "rd", "baf");
        return minIndex / samples;
    }
}
