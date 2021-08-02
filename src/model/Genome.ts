import _ from "lodash";
import { OpenInterval } from "./OpenInterval";
import { ChromosomeInterval } from "./ChromosomeInterval";

/**
 * Container to hold the name and length of a chromosome in bases.
 */
export interface Chromosome {
    /** Name of the chromosome. */
    readonly name: string;
    /** Length of the chromosome, in bases. */
    readonly length: number;
}

/**
 * A named set of chromosomes.  Because a single number system is easier to work with for visualization, instances
 * assign a unique base number to every location in the genome.  We term these unique base numbers as members of an 
 * "implicit" coordinate system.  In contrast, locations specified by a set of base numbers in a specific chromosome,
 * for example "chr1:0-1000", are termed "chromosome" locations.
 * 
 * You may assume that if bases are adjacent in chromosomes, they are also adjacent in the implicit coordinate system.
 * For instance, if the first base of chr10 maps to an implicit coordinate of 1000, and chr10 is five hundred bases
 * long, then it is safe to assume that chr10 maps to implicit bases 10000 to 10499.
 * 
 * @author Silas Hsu
 */
export class Genome {
    /** The name of this genome. */
    private _name: string;

    /** Ordered list of chromosomes in the genome. */
    private _chromosomes: Chromosome[];

    /**
     * Mapping from chromosome name to the implicit coordinate of the chromosome's first base (see class description).
     */
    private _chrStarts: {[chrName: string]: number};

    /** Total number of bases in the genome. */
    private _length: number;

    private nameToChr: {[chr: string]: Chromosome}

    /**
     * Makes a new instance, with name and list of chromosomes.  Chromosomes *must* have unique names.
     * 
     * @param name - name of the genome
     * @param chromosomes - list of chromosomes in the genome
     * @throws {Error} if there are duplicate chromosome names
     */
    constructor(chromosomes: Chromosome[], name?: string) {
        this._name = name ? name : "";
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
        
        this.nameToChr = {};
        for (const chr of this._chromosomes) {
            this.nameToChr[chr.name] = chr;
        }
        //console.log("CHR STARTS: ", this._chrStarts);
    }

    /**
     * @return this genome's name
     */
    getName(): string {
        return this._name;
    }

    /**
     * Returns the list of Chromosome objects backing this instance.  Caution: modifying this list or objects in the
     * list will modify this instance.
     * 
     * @return the list of Chromosome objects backing this instance.
     */
    getChromosomeList(): Chromosome[] {
        return this._chromosomes;
    }

    /**
     * Gets a list of implicit coordinates of each chromosome's 0th base.  This list is in the same order as the list of
     * chromosomes returned by `getChromosomeList()`.
     * 
     * @return list of implicit coordinates of each chromosome's 0th base
     */
    getChromosomeStarts(): number[] {
        return this._chromosomes.map(chr => this._chrStarts[chr.name]);
    }


    getChromosomeStarts2(chrs: Chromosome[]): number[] {
        return chrs.map(chr => this._chrStarts[chr.name]);
    }

    /**
     * Gets a length of a chromosome in base pairs, or the entire genome if the chromosome is unspecified.  Returns 0
     * if the chromosome does not exist.
     * 
     * @param chrName - the name of the chromosome to query, or `undefined` to query the entire genome's length
     * @return length of the chromosome or genome.
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

    getLength2(chrs: Chromosome[]) : number {
        let length = 0;
        for(const chr of chrs) {
            length += chr.length;
        }
        return length
    }

    /**
     * Converts a chromosome location into this instance's implicit coordinates.  See class description for more about
     * implicit coordinates.
     * 
     * @param location the genomic location to convert into implicit coordinates
     * @return implicit base numbers in this instance that represent the genomic location
     * @throws {Error} if the chromosome in the genomic location does not exist in this instance
     */
    getImplicitCoordinates(location: ChromosomeInterval): OpenInterval {
        const {chr, start, end} = location;
        if ( !(chr in this._chrStarts) ) {
            throw new Error(`Chromosome "${chr}" not in this genome`);
        }
        const chrStart = this._chrStarts[chr];
        return new OpenInterval(chrStart + start, chrStart + end);
    }

    /**
     * Converts an implicit base number into a base number of a specific chromosome.  The result is returned in a
     * ChromosomeInterval that has a length of 1.
     * 
     * Input base numbers will be clamped to be a valid implicit coordinate before conversion takes place.  More
     * formally, inputs will be clamped to be between [0, this.getLength() - 1].
     * 
     * @param implicit the implicit base number to convert
     * @return base number in a specific chromosome
     */
    getChromosomeLocation(implicit: number): ChromosomeInterval {
        // Clamp the input
        if (implicit < 0) {
            implicit = 0;
        } else if (implicit >= this.getLength()) {
            implicit = this.getLength() - 1;
        }

        const sortedChrStarts = Object.values(this._chrStarts).sort((a, b) => a - b); // Sorted smallest to largest
        const index = _.sortedLastIndex(sortedChrStarts, implicit) - 1;
        const chrCoordinate = implicit - sortedChrStarts[index];
        return new ChromosomeInterval(this._chromosomes[index].name, chrCoordinate, chrCoordinate + 1);
    }

    getChrs(chrs : string[]) {
       // console.log("CHRS: ", chrs);
        //console.log("NAME TO CHR: ", this.nameToChr);
        let filteredChrs : Chromosome[] = [];
        //console.log("INPUT CHRS: ", chrs);
        for(const chr of chrs) {
            filteredChrs.push(this.nameToChr[chr]);
            //console.log(this.nameToChr[chr]);
        }
        
        //console.log("Filtered CHRS: ", filteredChrs);
        return filteredChrs;
    }
}

export const hg38 = new Genome([
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
], "hg38");
