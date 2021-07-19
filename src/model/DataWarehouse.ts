import _, { sample } from "lodash";
import { GenomicBin, GenomicBinHelpers } from "./GenomicBin";
import { MergedGenomicBin, BinMerger, MergedBinHelpers } from "./BinMerger";
import { cross, group } from "d3-array";
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

type clusterTableRow =  {key: string, value: number}
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
    private readonly _rdRanges: [[number, number]];
    private _locationGroupedData: LocationIndexedData<GenomicBin[]>;
    private _locationGroupedMergedData: LocationIndexedData<MergedGenomicBin[]>;
    private _clusterGroupedData: ClusterIndexedData<GenomicBin[]>;
    private brushedBins: MergedGenomicBin[];
    private _merged_ndx: any;
    private _ndx: any;

    private _sample_dim: any;
    private _cluster_dim: any;
    private _chr_dim: any;
    private _baf_dim: any;
    private _rd_dim: any;

    private _merged_sample_dim: any;
    private _merged_cluster_dim: any;
    private _merged_chr_dim: any;
    private _merged_baf_dim: any;
    private _merged_rd_dim: any;


    private _samples: string[];
    private _clusters: string[];
    private _chrs: string[];

    private _sampleGroupedData: SampleIndexedData<GenomicBin[]>;
    private _sampleGroupedMergedData: SampleIndexedData<MergedGenomicBin[]>;

    private clusterTableInfo: any; 

    private allRecords: GenomicBin[];
    
    private _cluster_filters: String[];
    /**
     * Indexes, pre-aggregates, and gathers metadata for a list of GenomicBin.  Note that doing this inspects the entire
     * data set, and could be computationally costly if the data set is large.
     * 
     * @param rawData the data to process
     * @param merger aggregator to use
     * @throws {Error} if the data contains chromosome(s) with the reserved name of `DataWarehouse.ALL_CHRS_KEY`
     */
    constructor(rawData: GenomicBin[], merger=new BinMerger()) {
        console.time("Initializing DataWarehouse");
        this._locationGroupedData = {};
        this.initializeLocationGroupedData(rawData);
        
        this._sampleGroupedData = {};
        this._sampleGroupedMergedData = {};
        this._clusterGroupedData = {};
        
        this._rdRange = [0, 0];
        this._rdRanges = [[0,0]];
        this._samples = [];
        this._chrs = [];
        this._clusters = [];
        this.brushedBins = [];

        this._cluster_filters = [];

        this._ndx = crossfilter(rawData);
        
        // For bins with the same sample, cluster, and chromsome, 
        // merges together X amount of bins where X is set by the 
        // binsPerMergeThreshold in the BinMerger constructor
        // Note: If clustering is not applied, then it just considers all the points as part of the same cluster
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

        //console.log(_.groupBy(mergedArr, "bins"));
        console.log("MERGED BINS: ", mergedArr);
        this._locationGroupedMergedData = _.groupBy(mergedArr, "location")

        this._merged_ndx = crossfilter(mergedArr);
        
        this._sample_dim = this._ndx.dimension((d:GenomicBin) => d.SAMPLE);
        this._cluster_dim = this._ndx.dimension((d:GenomicBin) => d.CLUSTER);
        this._chr_dim = this._ndx.dimension((d:GenomicBin) => d["#CHR"]);
        this._baf_dim = this._ndx.dimension((d:GenomicBin) => d.BAF);
        this._rd_dim = this._ndx.dimension((d:GenomicBin) => d.RD);

        this._merged_sample_dim = this._merged_ndx.dimension((d:MergedGenomicBin) => d.bins[0].SAMPLE);
        this._merged_cluster_dim = this._merged_ndx.dimension((d:MergedGenomicBin) => d.bins[0].CLUSTER);
        this._merged_chr_dim = this._merged_ndx.dimension((d:MergedGenomicBin) => d.location.chr);
        
        this._merged_baf_dim = this._merged_ndx.dimension((d:MergedGenomicBin) => d.bins[0].BAF);
        this._merged_rd_dim = this._merged_ndx.dimension((d:MergedGenomicBin) => d.bins[0].RD);

        this._sampleGroupedData = _.groupBy(this._ndx.allFiltered(), "SAMPLE");
        this._sampleGroupedMergedData = _.groupBy(this._merged_ndx.allFiltered(), d => d.bins[0].SAMPLE); 
        
        if (rawData.length > 0) {
            this._rdRange = [_.minBy(rawData, "RD")!.RD, _.maxBy(rawData, "RD")!.RD];
            this._rdRanges.pop();
            for(const sample of this._samples) {
                let currentSampleBins = this._sampleGroupedData[sample];
                let currentRdRange : [number, number] = [_.minBy(currentSampleBins, "RD")!.RD, _.maxBy(currentSampleBins, "RD")!.RD];
                this._rdRanges.push(currentRdRange);
            }
        }
        console.log("SAMPLE GROUPED DATA: ", this._sampleGroupedData);
        console.log("SAMPLE GROUPED DATA: ", this._samples);
        console.log("RD RANGES: ", this._rdRanges);

        const clusterTable : clusterTableRow[] = this._cluster_dim.group().all();
        //console.log("Normal values: ", arr);
        clusterTable.forEach(d => d.value = Number(((d.value/rawData.length) * 100).toFixed(2)));

        let clone : clusterTableRow[] = [];
        for(const row of clusterTable){
            let rowClone : clusterTableRow = {key: "", value: 0};
            rowClone.key = row.key;
            rowClone.value = row.value;
            clone.push(rowClone);
        }
        
        
        this.clusterTableInfo = clone;

        this.allRecords = this._ndx.all();
        for(let i=0; i < this.allRecords.length; i++) {
            this.allRecords[i].BAF = 0.5-this.allRecords[i].BAF;
        }
        console.log("RECORDS LENGTH: ", this.allRecords.length);
        console.timeEnd("Initializing DataWarehouse");
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
    getRdRange(plotId?:number): [number, number] {
        if(typeof plotId !== 'undefined') {
            return [this._rdRanges[plotId][0], this._rdRanges[plotId][1]];
        }
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

    setRDFilter(rdRange: [number, number]) {
        this._rd_dim.filterAll();
        this._rd_dim.filter((d: number) => d > rdRange[0] && d < rdRange[1]);

        this._merged_rd_dim.filterAll();
        this._merged_rd_dim.filter((d: number) => d > rdRange[0] && d < rdRange[1]);
        this._sampleGroupedData = _.groupBy(this._ndx.allFiltered(), "SAMPLE");
        this._sampleGroupedMergedData = _.groupBy(this._merged_ndx.allFiltered(), d => d.bins[0].SAMPLE);
    }

    setClusterFilters(clusters?: String[]) {
        if(clusters && ((clusters.length === 1 && clusters[0] == DataWarehouse.ALL_CLUSTERS_KEY))) {
            this._cluster_dim.filterAll();
            this._merged_cluster_dim.filterAll();
        } else if(clusters) {
            this._cluster_dim.filterAll();
            this._merged_cluster_dim.filterAll();
            this._cluster_dim.filter((d:Number) => clusters.indexOf(String(d)) === -1 ? false : true);
            this._merged_cluster_dim.filter((d:Number) => clusters.indexOf(String(d)) === -1 ? false : true);
        }
        if(clusters) {
            this._cluster_filters = clusters;
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
        if(!this.brushedBins || this.brushedBins.length === 0) {
            return;
        }
        
        //console.time("Updating Clusters");
        //this.clearAllFilters();
        
        for(let i = 0; i < this.brushedBins.length; i++) {
            let locKey = this.brushedBins[i].location.toString();
            if(this._locationGroupedMergedData[locKey]) {
                for(let j = 0; j < this._locationGroupedMergedData[locKey].length; j++) {
                    for(let k =0; k < this._locationGroupedMergedData[locKey][j].bins.length; k++) {
                        this._locationGroupedMergedData[locKey][j].bins[k].CLUSTER = cluster
                    }
                }
            }
        }

        const allMergedBins : MergedGenomicBin[][] = Object.values(this._locationGroupedMergedData);
        let flattenNestedBins : MergedGenomicBin[] = GenomicBinHelpers.flattenNestedBins(allMergedBins);
        //this._merged_ndx.remove();
        //this._merged_ndx.add(flattenNestedBins);
        this._merged_ndx = crossfilter(flattenNestedBins);
        this._merged_sample_dim = this._merged_ndx.dimension((d:MergedGenomicBin) => d.bins[0].SAMPLE);
        this._merged_cluster_dim = this._merged_ndx.dimension((d:MergedGenomicBin) => d.bins[0].CLUSTER);
        this._merged_chr_dim = this._merged_ndx.dimension((d:MergedGenomicBin) => d.location.chr);

        this.brushedBins = [];

        let allBins : GenomicBin[][] = [];
        flattenNestedBins.forEach(d => allBins.push(d.bins));
        const flattenedBins : GenomicBin[] = GenomicBinHelpers.flattenNestedBins(allBins);
        console.log("TEST1: ", flattenedBins[0]["#CHR"].substr(3));
        flattenedBins.sort((binOne : GenomicBin, binTwo : GenomicBin) => {
            let chrNumb = Number(binOne["#CHR"].substr(3));
            let chrNumb2 = Number(binTwo["#CHR"].substr(3));
            
            if(chrNumb > chrNumb2) return 1;
            if(chrNumb < chrNumb2) return -1;

            if(binOne.START > binTwo.START) return 1;
            if(binOne.START < binTwo.START) return -1;

            return 0;
        })
        
        //this._ndx.remove();
        //this._ndx.add(flattenedBins);
        this._ndx = crossfilter(flattenedBins);
        this._sample_dim = this._ndx.dimension((d:GenomicBin) => d.SAMPLE);
        this._cluster_dim = this._ndx.dimension((d:GenomicBin) => d.CLUSTER);
        this._chr_dim = this._ndx.dimension((d:GenomicBin) => d["#CHR"]);

        const clusterTable : clusterTableRow[] = this._cluster_dim.group().all();
        clusterTable.forEach(d => d.value = Number(((d.value/flattenedBins.length) * 100).toFixed(2)));

        let clone : clusterTableRow[] = [];
        for(const row of clusterTable){
            let rowClone : clusterTableRow = {key: "", value: 0};
            rowClone.key = row.key;
            rowClone.value = row.value;
            clone.push(rowClone);
        }
        
        this.clusterTableInfo = clone;
        this.allRecords =  this._ndx.all().filter((d: GenomicBin) => d.CLUSTER !== -2);
        console.log("RECORDS LENGTH: ", this.allRecords.length);
        //console.timeEnd("Updating Clusters");
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
    getRecords(sample: string, chr?: string, cluster?: string): GenomicBin[] {
        //return this._getData(this._indexedData, sample, chr, cluster);
        if(sample in this._sampleGroupedData) {
            return this._sampleGroupedData[sample];
        }
        //console.log(sample + " " + chr + " " + cluster);
        return []; //this._ndx.allFiltered();
    }

    getAllRecords() {
        return this.allRecords;
    }

    getClusterTableInfo() {
        return this.clusterTableInfo;
    }

    getFilteredClusters() {

        return this._cluster_filters;
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
    getMergedRecords(sample: string, chr?: string, cluster?: string): MergedGenomicBin[] {
        //return this._getData(this._indexedMergedData, sample, chr, cluster);
        if(sample in this._sampleGroupedMergedData) {
            return this._sampleGroupedMergedData[sample];
        }
        //console.log(sample + " " + chr + " " + cluster);
        return []; //this._merged_ndx.allFiltered();//this._merged_sample_dim.top(Infinity);
    }

    setbrushedBins(brushedBins: MergedGenomicBin[]) {
        this.brushedBins = brushedBins;
    }

    getBrushedBins() {
        return this.brushedBins;
    }

    getClusterDim() {
        return this._cluster_dim;
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
