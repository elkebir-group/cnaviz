import { ChromosomeInterval } from "./ChromosomeInterval";

export interface Gene {
    readonly location: ChromosomeInterval;
    readonly symbol: string;
    readonly Name: string;
    readonly chrBand: number;
    readonly roleInCancer: string;
}