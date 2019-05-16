import { getMinDistanceIndex } from "../util";

export interface RdBaf {
    rd: number;
    baf: number;
}

export interface CopyNumberState {
    aCopies: number;
    bCopies: number;
}

const copyNumStateForRdBaf = new Map<RdBaf, CopyNumberState>();
for (let aCopies = 0; aCopies < 8; aCopies++) {
    for (let bCopies = 0; bCopies < 8; bCopies++) {
        const totalCopies = aCopies + bCopies;
        if (totalCopies === 0) {
            continue;
        }
        const rdBaf = {
            rd: Math.log2(totalCopies) - 1,
            baf: bCopies / totalCopies
        };
        copyNumStateForRdBaf.set(rdBaf, {aCopies, bCopies});
    }
}

export function getCopyNumCandidates() {
    return Array.from(copyNumStateForRdBaf.keys());
}

export function getCopyStateFromRdBaf(rdBaf: RdBaf): CopyNumberState {
    const candidates = getCopyNumCandidates()
    const minIndex = getMinDistanceIndex(rdBaf, candidates, "rd", "baf");
    const closestRdBaf = candidates[minIndex];
    return copyNumStateForRdBaf.get(closestRdBaf)!;
}

export function copyStateToString(state: CopyNumberState) {
    return `${state.aCopies} | ${state.bCopies}`;
}
