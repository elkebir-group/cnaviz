import _, { sample } from "lodash";
import { GenomicBin, GenomicBinHelpers } from "./GenomicBin";
import { MergedGenomicBin, BinMerger, MergedBinHelpers } from "./BinMerger";
import { group } from "d3-array";
import { cluster } from "d3-hierarchy";
import { ChromosomeInterval } from "./ChromosomeInterval";
import "crossfilter2";
import crossfilter from "crossfilter2";

/**
 * Nested dictionary type.  First level key is the sample name; second level key is cluster in that sample; third level key is the chromosome in the given sample with the given cluster.
 * 
 * @typeParam T type of value stored
 */
type IndexedBioData<T> = {
    [sample: string]: {
        [cluster: string] : {
            [chr: string]: T
        }
    }
};

type LocationIndexedData<T> = {
    [loc : string]: T
};

type ClusterIndexedData<T> = {
    [cluster: string] : T
}

type SampleIndexedData<T> = {
    [sample: string] : T
}

/**
 * A container that stores metadata for a list of GenomicBin and allows fast queries first by sample, and then by
 * chromosome.  For applications that want a limited amount of data, pre-aggregates GenomicBin and allows fast queries
 * of that data too.
 * 
 * @author Silas Hsu
 */
export class DataWarehouse {
    /** The special chromosome name that signifies a query for the entire genome (all chromosomes). */
    public static readonly ALL_CHRS_KEY : string = ""; 
    public static readonly ALL_CLUSTERS_KEY : string = "";

    /** Indexed GenomicBin for supporting fast queries. */
    //private _indexedData: IndexedBioData<GenomicBin[]>;
    /** Indexed, pre-aggregated GenomicBin for supporting fast queries. */
    //private _indexedMergedData: IndexedBioData<MergedGenomicBin[]>;
    /** The range of read depth ratios represented in this data set.  First number is min, second is max. */
    private readonly _rdRange: [number, number];
    private _locationGroupedData: LocationIndexedData<GenomicBin[]>;
    private _clusterGroupedData: ClusterIndexedData<GenomicBin[]>;
    private brushedBins: MergedGenomicBin[];
    private readonly _merged_ndx: any;
    private readonly _ndx: any;

    private _sample_dim: any;
    private _cluster_dim: any;
    private _chr_dim: any;

    private _merged_sample_dim: any;
    private _merged_cluster_dim: any;
    private _merged_chr_dim: any;

    private _samples: string[];
    private _clusters: string[];
    private _chrs: string[];

    private _sampleGroupedData: SampleIndexedData<GenomicBin[]>;
    private _sampleGroupedMergedData: SampleIndexedData<MergedGenomicBin[]>;

    /**
     * Indexes, pre-aggregates, and gathers metadata for a list of GenomicBin.  Note that doing this inspects the entire
     * data set, and could be computationally costly if the data set is large.
     * 
     * @param rawData the data to process
     * @param merger aggregator to use
     * @throws {Error} if the data contains chromosome(s) with the reserved name of `DataWarehouse.ALL_CHRS_KEY`
     */
    constructor(rawData: GenomicBin[], applyClustering: boolean, merger=new BinMerger()) {
        console.time("test2");
        this._locationGroupedData = {};
        this.initializeLocationGroupedData(rawData);
        
        this._sampleGroupedData = {};
        this._sampleGroupedMergedData = {};

        this._clusterGroupedData = {};
        this._ndx = crossfilter(rawData);
        this._rdRange = [0, 0];
        
        this._samples = [];
        this._chrs = [];
        this._clusters = [];

        this.brushedBins = [];
      
        let mergedArr : MergedGenomicBin[] = [];
        const groupedBySample = _.groupBy(rawData, "SAMPLE");
        for (const [sample, binsForSample] of Object.entries(groupedBySample)) {
            this._samples.push(sample);
            const groupedByCluster = _.groupBy(binsForSample, "CLUSTER");
            this._clusters = _.union(this._clusters, Object.keys(groupedByCluster));
            for (const binsForCluster of Object.values(groupedByCluster)) {
                const groupedByChr = _.groupBy(binsForCluster, "#CHR");
                this._chrs = _.union(this._chrs, Object.keys(groupedByChr));
                mergedArr = mergedArr.concat( _.flatten(Object.values(_.mapValues(groupedByChr, merger.doNeighboringBinsMerge))));
            }
        }

        this._merged_ndx = crossfilter(mergedArr);
        
        this._sample_dim = this._ndx.dimension((d:GenomicBin) => d.SAMPLE);
        this._cluster_dim = this._ndx.dimension((d:GenomicBin) => d.CLUSTER);
        this._chr_dim = this._ndx.dimension((d:GenomicBin) => d["#CHR"]);

        this._merged_sample_dim = this._merged_ndx.dimension((d:MergedGenomicBin) => d.bins[0].SAMPLE);
        this._merged_cluster_dim = this._merged_ndx.dimension((d:MergedGenomicBin) => d.bins[0].CLUSTER);
        this._merged_chr_dim = this._merged_ndx.dimension((d:MergedGenomicBin) => d.location.chr);
        
        this._sampleGroupedData = _.groupBy(this._ndx.allFiltered(), "SAMPLE");
        this._sampleGroupedMergedData = _.groupBy(this._merged_ndx.allFiltered(), d => d.bins[0].SAMPLE);
        
        
        
        if (rawData.length > 0) {
            this._rdRange = [_.minBy(rawData, "RD")!.RD, _.maxBy(rawData, "RD")!.RD];
        }

        console.timeEnd("test2");
        
        //this.getChromosomeList = this.getChromosomeList.bind(this); // Needed for getAllChromosomes() to work
        //this.getClusterList = this.getClusterList.bind(this);
    }

    initializeLocationGroupedData(rawData: GenomicBin[]) {
        this._locationGroupedData = {};
        for(const bin of rawData) {
            if(this._locationGroupedData[GenomicBinHelpers.getLocationKey(bin)]) {
                this._locationGroupedData[GenomicBinHelpers.getLocationKey(bin)].push(bin);
            } else {
                this._locationGroupedData[GenomicBinHelpers.getLocationKey(bin)] = [bin];
            }
        }
    }

    // initializeBins(rawData:GenomicBin[], applyClustering: boolean, merger=new BinMerger()) {
    //     console.time("initializing bins");
    //     this._indexedData = {};
    //     this._indexedMergedData = {};

    //     const groupedBySample = _.groupBy(rawData, "SAMPLE");
    //     this._clusterGroupedData = _.groupBy(rawData, "CLUSTER");
        
    //     for (const [sample, binsForSample] of Object.entries(groupedBySample)) {
    //         const groupedByCluster = _.groupBy(binsForSample, "CLUSTER");
    //         const sampleGroupedByChr = _.groupBy(binsForSample, "#CHR");

    //         if (DataWarehouse.ALL_CLUSTERS_KEY in  groupedByCluster) {
    //             throw new Error(`Data contains reserved cluster name '${DataWarehouse.ALL_CLUSTERS_KEY}'.` +
    //                 "Please remove or rename this chromosome from the data and try again.");
    //         }

    //         let clusterChrDict : {[cl : string] : {[chr : string] : GenomicBin[]}} = {};
    //         let mergedClusterChrDict : {[cl : string] : {[chr : string] : MergedGenomicBin[]}} = {};
            
    //         if(applyClustering) {
    //             for (const [cluster, binsForCluster] of Object.entries(groupedByCluster)) {
    //                 const groupedByChr = _.groupBy(binsForCluster, "#CHR");
                    
    //                 if (DataWarehouse.ALL_CHRS_KEY in groupedByChr) {
    //                     throw new Error(`Data contains reserved chromosome name '${DataWarehouse.ALL_CHRS_KEY}'.` +
    //                         "Please remove or rename this chromosome from the data and try again.");
    //                 }

    //                 clusterChrDict[cluster] = groupedByChr;
    //                 mergedClusterChrDict[cluster] = _.mapValues(groupedByChr, merger.doMerge);
    //                 clusterChrDict[cluster][DataWarehouse.ALL_CHRS_KEY] = _.flatten(Object.values(groupedByChr));
    //                 mergedClusterChrDict[cluster][DataWarehouse.ALL_CHRS_KEY] = _.flatten(Object.values(mergedClusterChrDict[cluster]));
    //             }
    //         }

    //         this._indexedData[sample] = clusterChrDict;
    //         this._indexedMergedData[sample] = mergedClusterChrDict;
    //         this._indexedData[sample][DataWarehouse.ALL_CLUSTERS_KEY] = sampleGroupedByChr;
    //         this._indexedMergedData[sample][DataWarehouse.ALL_CLUSTERS_KEY] = _.mapValues(sampleGroupedByChr, merger.doMerge);
    //         this._indexedData[sample][DataWarehouse.ALL_CLUSTERS_KEY][DataWarehouse.ALL_CHRS_KEY] = _.flatten(Object.values(sampleGroupedByChr));
    //         this._indexedMergedData[sample][DataWarehouse.ALL_CLUSTERS_KEY][DataWarehouse.ALL_CHRS_KEY] = _.flatten(
    //             Object.values(this._indexedMergedData[sample][DataWarehouse.ALL_CLUSTERS_KEY])
    //         );
    //     }
    //     console.timeEnd("initializing bins");
    // }
    
    /**
     * @return whether this instance stores any data
     */
    isEmpty(): boolean {
        return this.getSampleList().length === 0;
    }

    /**
     * Gets the range of read depth ratios represented in this data set.  Returns the result as a 2-tuple; the first
     * number is the min, and the second is the max.
     * 
     * @return the range of read depth ratios represented in this data set
     */
    getRdRange(): [number, number] {
        return [this._rdRange[0], this._rdRange[1]]; // Make a copy
    }

    /**
     * @return a list of sample names represented in this data set
     */
    getSampleList(): string[] {
        return this._samples;
    }

    /**
     * @return a list of chromosome names represented in this data set
     */
    getAllChromosomes(): string[] {
        return this._chrs;
    }

    getAllClusters(): string[] {
        return this._clusters;
    }

    setFilters(sample?: string, chr?: string, clusters?: string[]) {
        // if(sample) {
        //     this._sample_dim.filter((d:string) => d === sample);
        //     this._merged_sample_dim.filter((d:string) => d === sample);
        // }

        if(chr) {
            this._chr_dim.filter((d:string) => d === chr);
            this._merged_chr_dim.filter((d:string) => d === chr);
        }

        if(clusters) {
            this._cluster_dim.filter((d:string) => clusters.indexOf(d) === -1 ? false : true);
            this._merged_cluster_dim.filter((d:string) => clusters.indexOf(d) === -1 ? false : true);
        }
    }

    // setSampleFilter(sample?: string) {
    //     if(sample) {
    //         console.log("setting sample to: ", sample);
    //         this._sample_dim.filterAll();
    //         this._merged_sample_dim.filterAll();
    //         this._sample_dim.filter((d:string) => d === sample);
    //         this._merged_sample_dim.filter((d:string) => d === sample);
    //     }
    // }

    setChrFilter(chr?: string) {
        if(chr) {
            this._chr_dim.filterAll();
            this._merged_chr_dim.filterAll();
            this._chr_dim.filter((d:string) => d === chr);
            this._merged_chr_dim.filter((d:string) => d === chr);
        } else {
            this._chr_dim.filterAll();
            this._merged_chr_dim.filterAll();
        }
        
        this._sampleGroupedData = _.groupBy(this._ndx.allFiltered(), "SAMPLE");
        this._sampleGroupedMergedData = _.groupBy(this._merged_ndx.allFiltered(), d => d.bins[0].SAMPLE);
    }

    setClusterFilters(clusters?: String[]) {
        if(clusters && clusters.length == 1 && clusters[0] == DataWarehouse.ALL_CLUSTERS_KEY) {
            this._cluster_dim.filterAll();
            this._merged_cluster_dim.filterAll();
        } else if(clusters && clusters.length > 0) {
            this._cluster_dim.filterAll();
            this._merged_cluster_dim.filterAll();   
            this._cluster_dim.filter((d:Number) => clusters.indexOf(String(d)) === -1 ? false : true);
            this._merged_cluster_dim.filter((d:Number) => clusters.indexOf(String(d)) === -1 ? false : true);
        }

        this._sampleGroupedData = _.groupBy(this._ndx.allFiltered(), "SAMPLE");
        this._sampleGroupedMergedData = _.groupBy(this._merged_ndx.allFiltered(), d => d.bins[0].SAMPLE);
    }

    clearAllFilters() {
        this._sample_dim.filterAll();
        this._merged_sample_dim.filterAll();
        this._cluster_dim.filterAll();
        this._merged_cluster_dim.filterAll();
        this._chr_dim.filterAll();
        this._merged_chr_dim.filterAll();
        this._sampleGroupedData = _.groupBy(this._ndx.allFiltered(), "SAMPLE");
        this._sampleGroupedMergedData = _.groupBy(this._merged_ndx.allFiltered(), d => d.bins[0].SAMPLE);
    }
    // getClusterList(sample: string): string[] {
    //     const nameList = Object.keys(this._indexedData[sample] || {});
    //     return nameList.filter(name => name !== DataWarehouse.ALL_CLUSTERS_KEY); // Remove the special ALL_CHRS_KEY
    // }

    updateCluster(cluster: number) {
        // for (let i = 0; i < this.brushedBins.length; i++) {
        //     const currKey = GenomicBinHelpers.getLocationKey(this.brushedBins[i].bins[0])
        //     if(this._locationGroupedData[currKey]) {
        //         for(let j = 0; j < this._locationGroupedData[currKey].length; j++) {
        //             const currBin = this._locationGroupedData[currKey][j]
        //             this._locationGroupedData[currKey][j] = {
        //                 "#CHR": currBin["#CHR"],
        //                 "START": currBin["START"],
        //                 "END": currBin["END"],
        //                 "SAMPLE": currBin["SAMPLE"],
        //                 "RD": currBin["RD"],
        //                 "#SNPS": currBin["#SNPS"],
        //                 "COV": currBin["COV"],
        //                 "ALPHA": currBin["ALPHA"],
        //                 "BETA": currBin["BETA"],
        //                 "BAF": currBin["BAF"],
        //                 "CLUSTER": cluster
        //             };
        //         }
        //     }
        // }
        
        // this.brushedBins = [];
        // const allBins = Object.values(this._locationGroupedData);
        // this.initializeBins(GenomicBinHelpers.flattenNestedBins(allBins), true);
    }

    deleteCluster(cluster: number) {
        // if(this._clusterGroupedData[cluster]) {
        //     delete this._clusterGroupedData[cluster];
        //     const allBins = Object.values(this._clusterGroupedData);
        //     const allFlattenedBins = GenomicBinHelpers.flattenNestedBins(allBins);
        //     this.initializeLocationGroupedData(allFlattenedBins);
        //     this.initializeBins(allFlattenedBins, true);
        // }
    }

    /**
     * Gets a list of chromosome names found in one sample.  If the sample is not in this data set, returns an empty
     * list.
     * 
     * @param sample the sample to query
     * @return a list of chromosome names represented in the query sample
     */
    // getChromosomeList(sample: string): string[] {
    //     const nameList = Object.keys(this._indexedData[sample][DataWarehouse.ALL_CLUSTERS_KEY] || {});
    //     return nameList.filter(name => name !== DataWarehouse.ALL_CHRS_KEY); // Remove the special ALL_CHRS_KEY
    // }

    /**
     * Gets the bin size in bases of an arbitrary data point in this data set.  Most useful if it is known that all data
     * have the same bin size.
     * 
     * @return a guess of the bin size in bases of data points in this data set.
     */
    guessBinSize(): number {
        if (this.isEmpty()) {
            return 0;
        }
        const firstSample = this.getSampleList()[0];
        const firstRecord = this.getRecords(firstSample, DataWarehouse.ALL_CHRS_KEY, DataWarehouse.ALL_CLUSTERS_KEY)[0];
        return firstRecord.END - firstRecord.START;
    }

    // getMergedRecords() {

    // }

    /**
     * Performs a query for records matching a sample and a chromosome.  To get all records matching a sample,
     * regardless of chromosome, use the special chromosome name `DataWarehouse.ALL_CHRS_KEY`.  If either sample or
     * chromosome are not present in the data, returns an empty list.
     * 
     * @param sample sample name for which to find matching records
     * @param chr chromosome name for which to find matching records
     * @return a list of matching records
     */
    getRecords(sample: string, chr: string, cluster: string): GenomicBin[] {
        //return this._getData(this._indexedData, sample, chr, cluster);
        
        return this._sampleGroupedData[sample]; //this._ndx.allFiltered();
    }

    // getRecords(): GenomicBin[] {
    //     return this._sample_dim.top(Infinity);
    // }

    /**
     * Performs a query for aggregated records matching a sample and a chromosome.  To get all records matching a
     * sample, regardless of chromosome, use the special chromosome name `DataWarehouse.ALL_CHRS_KEY`.  If either sample
     * or chromosome are not present in the data, returns an empty list.
     * 
     * @param sample sample name for which to find matching records
     * @param chr chromosome name for which to find matching records
     * @return a list of matching records
     */
    getMergedRecords(sample: string, chr: string, cluster: string): MergedGenomicBin[] {
        //return this._getData(this._indexedMergedData, sample, chr, cluster);
        return this._sampleGroupedMergedData[sample]; //this._merged_ndx.allFiltered();//this._merged_sample_dim.top(Infinity);
    }

    // getRawData() : GenomicBin[] {
    //     let rawData : GenomicBin[] = []
    //     for(const sample of this.getSampleList()) {
    //         const binArr = this._indexedData[sample][DataWarehouse.ALL_CLUSTERS_KEY][DataWarehouse.ALL_CHRS_KEY];
    //         rawData = rawData.concat(binArr);
    //     }
        
    //     return rawData;
    // }

    // getRawDataFilteredByCluster(chr: string) : GenomicBin[] {
    //     let rawData : GenomicBin[] = []
    //     for(const sample of this.getSampleList()) {
    //         const binArr = this._indexedData[sample][DataWarehouse.ALL_CLUSTERS_KEY][chr];
    //         rawData = rawData.concat(binArr);
    //     }
        
    //     return rawData;
    // }

    setbrushedBins(brushedBins: MergedGenomicBin[]) {
        this.brushedBins = brushedBins;
    }

    getBrushedBins() {
        return this.brushedBins;
    }

    /**
     * Helper function for performing queries.
     * 
     * @typeParam T type of value stored in the index
     * @param index the index to query
     * @param sample sample name for which to find matching records
     * @param chr chromosome name for which to find matching records
     * @return a list of matching records
     */
    private _getData<T>(index: IndexedBioData<T[]>, sample: string, chr: string, cluster: string): T[] {
        const dataForSample = index[sample][cluster] || {};
        return dataForSample[chr] || [];
    }
}
