import { RdBaf, CopyNumberState } from "./CopyNumberState";
import { getMinDistanceIndex } from "../util";

const DEFAULT_SAMPLES = 25;

interface RdBafModifiers {
    rdModifier: (rd: number) => number;
    bafModifier: (baf: number) => number;
}

export class CopyNumberCurve {
    static getCurveModifiers(normalRdBaf: RdBaf): RdBafModifiers {
        return {
            rdModifier: rd => rd + normalRdBaf.rd,
            bafModifier: baf => normalRdBaf.baf !== 0 ? baf * (normalRdBaf.baf / 0.5) : 0
        };
    }

    readonly state1: CopyNumberState;
    readonly state2: CopyNumberState;
    private readonly _rdBafModifiers: RdBafModifiers;

    constructor(state1: CopyNumberState, state2: CopyNumberState, normalRdBaf: RdBaf) {
        this.state1 = state1;
        this.state2 = state2;
        this._rdBafModifiers = CopyNumberCurve.getCurveModifiers(normalRdBaf);
    }

    getTotalCopies() {
        return {
            total1: this.state1.aCopies + this.state1.bCopies,
            total2: this.state2.aCopies + this.state2.bCopies
        };
    }

    rdGivenP(p: number): number {
        const {total1, total2} = this.getTotalCopies();
        return this._rdBafModifiers.rdModifier(Math.log2(p * (total1 - total2) + total2) - 1);
    }

    bafGivenP(p: number): number {
        const {total1, total2} = this.getTotalCopies();
        const demoninator = p * total1 + (1 - p) * total2;
        if (demoninator === 0) {
            return 0;
        }
        const numerator = p * this.state1.bCopies + (1 - p) * this.state2.bCopies;
        return this._rdBafModifiers.bafModifier(numerator / demoninator); // Alternatively, this could be 0.5 - baf
    }

    sampleCurve(samples=DEFAULT_SAMPLES): RdBaf[] {
        if (samples <= 0) {
            return [];
        }
    
        const points = [];
        for (let i = 0; i <= samples; i++) {
            const p = i / samples;
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
