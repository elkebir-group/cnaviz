import { getMinDistanceIndex } from "../util";
import { CopyNumberCurve } from "./CopyNumberCurve";

export interface RdBaf {
    rd: number;
    baf: number;
}

export interface CopyNumberState {
    aCopies: number;
    bCopies: number;
}

export function getCopyNumCandidates(normalLocation: RdBaf) {
    const copyNumStateForRdBaf = new Map<RdBaf, CopyNumberState>();
    const {rdModifier, bafModifier} = CopyNumberCurve.getCurveModifiers(normalLocation);
    for (let aCopies = 0; aCopies < 8; aCopies++) {
        for (let bCopies = 0; bCopies < 8; bCopies++) {
            const totalCopies = aCopies + bCopies;
            if (totalCopies === 0) {
                continue;
            }
            const rdBaf = {
                rd:  rdModifier(Math.log2(totalCopies) - 1),
                baf: bafModifier(bCopies / totalCopies)
            };
            copyNumStateForRdBaf.set(rdBaf, {aCopies, bCopies});
        }
    }
    return copyNumStateForRdBaf;
}

export function getCopyStateFromRdBaf(rdBaf: RdBaf, normalLocation: RdBaf): CopyNumberState {
    const cnStateForRdBaf = getCopyNumCandidates(normalLocation);
    const candidatesList = Array.from(cnStateForRdBaf.keys());
    const minIndex = getMinDistanceIndex(rdBaf, candidatesList, "rd", "baf");
    const closestRdBaf = candidatesList[minIndex];
    return cnStateForRdBaf.get(closestRdBaf)!;
}

export function copyStateToString(state: CopyNumberState) {
    return `${state.aCopies} | ${state.bCopies}`;
}
