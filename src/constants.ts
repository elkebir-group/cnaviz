export const DEFAULT_PURITY = 0.5
export const DEFAULT_PLOIDY = 2
export const CN_STATES : [number, number][] = [[1, 1], [1, 0], [2, 0], [2, 1], [3, 1], [4, 2], [3, 2]];

export const START_CN = 0;
export const END_CN = 6; // highest total copy number from CN_STATES
export const UNCLUSTERED_ID = "-1";
export const DELETED_ID = "-2";
export const MAX_PLOIDY = 12;
export const MIN_PLOIDY = 1;
export const MAX_PURITY = 1;
export const MIN_PURITY = 0;
export type cn_pair = {tick: number, state:[number, number]};
export type fractional_copy_number = {fractionalTick: number, totalCN: number}
export const TEMPORARY_COLUMNS : Set<string> = new Set<string>(["reverseBAF", "genomicPosition", "fractional_cn", "logRD"]);
export const REQUIRED_COLS : string[] = ["#CHR", "START", "END", "CLUSTER", "SAMPLE", "RD", "BAF"]
export const REQUIRED_DRIVER_COLS : string[] = ["symbol", "Genome Location"];
