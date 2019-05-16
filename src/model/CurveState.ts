import { CopyNumberState } from "./CopyNumberState";

export enum CurvePickStatus {
    none,
    pickingState1,
    pickingState2,
    picked
}

export interface CurveState {
    hoveredP: number;
    state1: CopyNumberState | null;
    state2: CopyNumberState | null;
    pickStatus: CurvePickStatus;
}
