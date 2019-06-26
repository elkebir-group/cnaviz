import _ from "lodash";
import { OpenInterval } from "./OpenInterval";
import { ChromosomeInterval } from "./ChromosomeInterval";

interface Chromosome {
    readonly name: string;
    readonly length: number;
}

/**
 * A named set of chromosomes.
 * 
 * @author Silas Hsu
 */
export class Genome {
    private _name: string;
    private _chromosomes: Chromosome[];
    private _chrStarts: {[chrName: string]: number};
    private _length: number;

    /**
     * Makes a new instance, with name and list of chromosomes.  For best results, chromosomes should have unique names.
     * 
     * @param {string} name - name of the genome
     * @param {Chromosome[]} chromosomes - list of chromosomes in the genome
     */
    constructor(name: string, chromosomes: Chromosome[]) {
        this._name = name;
        this._chromosomes = chromosomes;
        this._chrStarts = {};
        this._length = 0;
        for (const chromosome of chromosomes) {
            const chrName = chromosome.name;
            if (this._chrStarts[chrName] !== undefined) {
                throw new Error(`Duplicate chromosome name "${chrName}" in genome "${name}"`);
            }
            this._chrStarts[chrName] = this._length;
            this._length += chromosome.length;
        }
    }

    /**
     * @return {string} this genome's name
     */
    getName(): string {
        return this._name;
    }

    getChromosomeList(): Chromosome[] {
        return this._chromosomes;
    }

    getChromosomeStarts() {
        return this._chromosomes.map(chr => this._chrStarts[chr.name]);
    }

    /**
     * Gets a length of a chromosome in base pairs, or the entire genome if the chromosome is unspecified.  Returns 0
     * if the chromosome does not exist.
     * 
     * @param chrName - the chromosome for which to get the length of, or undefined to query the entire genome's length
     * @return {number} length of the chromosome or genome.
     */
    getLength(chrName?: string): number {
        if (!chrName) {
            return this._length;
        } else {
            if ( !(chrName in this._chrStarts) ) {
                return 0; // Chr not in this genome
            }
            return this._chromosomes.find(chr => chr.name === chrName)!.length;
        }
    }

    getImplicitCoordinates(location: ChromosomeInterval): OpenInterval {
        const {chr, start, end} = location;
        if ( !(chr in this._chrStarts) ) {
            throw new Error(`Chromosome "${chr}" not in this genome`);
        }
        const chrStart = this._chrStarts[chr];
        return new OpenInterval(chrStart + start, chrStart + end);
    }

    getGenomicCoordinates(implicit: number, ensureInGenome=true) {
        if (ensureInGenome) {
            if (implicit < 0) {
                implicit = 0;
            } else if (implicit >= this.getLength()) {
                implicit = this.getLength() - 1;
            }
        }

        const sortedChrStarts = Object.values(this._chrStarts).sort((a, b) => a - b); // Sorted smallest to largest
        const index = _.sortedLastIndex(sortedChrStarts, implicit) - 1;
        const chrCoordinate = implicit - sortedChrStarts[index];
        return new ChromosomeInterval(this._chromosomes[index].name, chrCoordinate, chrCoordinate + 1);
    }
}

export const hg38 = new Genome("hg38", [
    {name: "chr1", length: 248956422},
    {name: "chr2", length: 242193529},
    {name: "chr3", length: 198295559},
    {name: "chr4", length: 190214555},
    {name: "chr5", length: 181538259},
    {name: "chr6", length: 170805979},
    {name: "chr7", length: 159345973},
    {name: "chr8", length: 145138636},
    {name: "chr9", length: 138394717},
    {name: "chr10", length: 133797422},
    {name: "chr11", length: 135086622},
    {name: "chr12", length: 133275309},
    {name: "chr13", length: 114364328},
    {name: "chr14", length: 107043718},
    {name: "chr15", length: 101991189},
    {name: "chr16", length: 90338345},
    {name: "chr17", length: 83257441},
    {name: "chr18", length: 80373285},
    {name: "chr19", length: 58617616},
    {name: "chr20", length: 64444167},
    {name: "chr21", length: 46709983},
    {name: "chr22", length: 50818468}
]);
