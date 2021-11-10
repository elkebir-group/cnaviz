import { ChromosomeInterval } from "./ChromosomeInterval";

export interface Gene {
    readonly location: ChromosomeInterval;
    readonly symbol: string;
    readonly name: string;
    readonly chrBand: number;
    readonly roleInCancer: string;
}