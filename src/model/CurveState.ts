import { CopyNumberState, RdBaf } from "./CopyNumberState";

export enum CurvePickStatus {
    none,
    pickingNormalLocation,
    pickingState1,
    pickingState2,
    picked
}

export interface CurveState {
    normalLocation: RdBaf;
    hoveredP: number;
    state1: CopyNumberState | null;
    state2: CopyNumberState | null;
    pickStatus: CurvePickStatus;
}

export const INITIAL_CURVE_STATE: CurveState = {
    pickStatus: CurvePickStatus.none,
    normalLocation: {
        rd: 0,
        baf: 0.5
    },
    hoveredP: -1,
    state1: null,
    state2: null,
}
