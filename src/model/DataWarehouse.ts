import _, { sample } from "lodash";
import { GenomicBin, GenomicBinHelpers } from "./GenomicBin";
import { MergedGenomicBin, BinMerger, MergedBinHelpers } from "./BinMerger";
import { cross, group } from "d3-array";
import { cluster } from "d3-hierarchy";
import { ChromosomeInterval } from "./ChromosomeInterval";
import "crossfilter2";
import crossfilter, { Crossfilter } from "crossfilter2";

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
type clusterIdMap = {[id: string] : number}
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
    private readonly _rdRanges: SampleIndexedData<[number, number]>;
    private readonly _logRdRanges: SampleIndexedData<[number, number]>;
    private _locationGroupedData: LocationIndexedData<GenomicBin[]>;
    private brushedBins: GenomicBin[];
    private brushedCrossfilter: Crossfilter<GenomicBin>;
    private brushedClusterDim: crossfilter.Dimension<GenomicBin, number>;
    private _ndx: Crossfilter<GenomicBin>;
    private _sample_dim: crossfilter.Dimension<GenomicBin, string>;
    private _cluster_dim: crossfilter.Dimension<GenomicBin, number>;
    private _chr_dim: crossfilter.Dimension<GenomicBin, string>;
    private _start_dim: crossfilter.Dimension<GenomicBin, number>;
    private _samples: string[];
    private _clusters: string[];
    private _chrs: string[];
    private _sampleGroupedData: SampleIndexedData<GenomicBin[]>;
    private clusterTableInfo: clusterTableRow[]; 
    private allRecords: readonly GenomicBin[];
    private _cluster_filters: String[];
    private historyStack: GenomicBin[][];

    /**
     * Indexes, pre-aggregates, and gathers metadata for a list of GenomicBin.  Note that doing this inspects the entire
     * data set, and could be computationally costly if the data set is large.
     * 
     * @param rawData the data to process
     * @param merger aggregator to use
     * @throws {Error} if the data contains chromosome(s) with the reserved name of `DataWarehouse.ALL_CHRS_KEY`
     */
    constructor(rawData: GenomicBin[]) {
        console.time("Initializing DataWarehouse");
        this._locationGroupedData = {};
        this.initializeLocationGroupedData(rawData);
        this._sampleGroupedData = {};
        this._rdRanges = {};
        this._logRdRanges = {};
        this._samples = [];
        this._chrs = [];
        this._clusters = [];
        this.brushedBins = [];
        this.brushedCrossfilter = crossfilter(this.brushedBins);
        this.brushedClusterDim = this.brushedCrossfilter.dimension((d:GenomicBin) => d.CLUSTER);
        
        this._cluster_filters = [];
        this.historyStack = [];

        this._ndx = crossfilter(rawData);

        const groupedBySample = _.groupBy(rawData, "SAMPLE");
        for (const [sample, binsForSample] of Object.entries(groupedBySample)) {
            this._samples.push(sample);
            const groupedByCluster = _.groupBy(binsForSample, "CLUSTER");
            this._clusters = _.union(this._clusters, Object.keys(groupedByCluster));
            for (const binsForCluster of Object.values(groupedByCluster)) {
                const groupedByChr = _.groupBy(binsForCluster, "#CHR");
                this._chrs = _.union(this._chrs, Object.keys(groupedByChr));
            }
        }

        this._cluster_filters = this._clusters;
        this._sample_dim = this._ndx.dimension((d:GenomicBin) => d.SAMPLE);
        this._cluster_dim = this._ndx.dimension((d:GenomicBin) => d.CLUSTER);
        this._chr_dim = this._ndx.dimension((d:GenomicBin) => d["#CHR"]);
        this._start_dim = this._ndx.dimension((d:GenomicBin) => d.START);
        //let dim =  this._ndx.dimension((d:GenomicBin) => d.SAMPLE);

        this._sampleGroupedData = _.groupBy(this._ndx.allFiltered(), "SAMPLE");
        
        if (rawData.length > 0) {
            for(const sample of this._samples) {
                let currentSampleBins = this._sampleGroupedData[sample];
                let currentRdRange : [number, number] = [_.minBy(currentSampleBins, "RD")!.RD, _.maxBy(currentSampleBins, "RD")!.RD];
                let currentLogRdRange : [number, number] = [_.minBy(currentSampleBins, "logRD")!.logRD, _.maxBy(currentSampleBins, "logRD")!.logRD];
                this._rdRanges[sample] = currentRdRange;
                this._logRdRanges[sample] = currentLogRdRange;
            }
        }

        this.allRecords = this._ndx.all();
        this.clusterTableInfo = this.calculateClusterTableInfo();

        
        console.timeEnd("Initializing DataWarehouse");
    }

    calculateClusterTableInfo() : clusterTableRow[] {
        const clusterInfo = this._cluster_dim.group().all();
        const clusterTable : clusterTableRow[] = [];
        for(const row of clusterInfo) {
            let value = Number(((Number(row.value)/this.allRecords.length) * 100).toFixed(2));
            clusterTable.push(
            {
                key: String(row.key), 
                value: value
            });
        }
        return clusterTable;
    }

    initializeLocationGroupedData(rawData: GenomicBin[]) {
        this._locationGroupedData = {};
        for(const bin of rawData) {
            const binLocation = GenomicBinHelpers.toChromosomeInterval(bin).toString();
            if(this._locationGroupedData[binLocation]) {
                this._locationGroupedData[binLocation].push(bin);
            } else {
                this._locationGroupedData[binLocation] = [bin];
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
    getRdRange(sample : string, log?: boolean): [number, number] {
        const rdRange = (log) ? this._logRdRanges[sample] : this._rdRanges[sample];
        return [rdRange[0], rdRange[1]];
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
            this._chr_dim.filter(d => d === chr);
            //this._merged_chr_dim.filter((d:string) => d === chr);
        }

        if(clusters) {
            this._cluster_dim.filter(d => clusters.indexOf(String(d)) === -1 ? false : true);
            //this._merged_cluster_dim.filter((d:string) => clusters.indexOf(d) === -1 ? false : true);
        }
    }

    setChrFilter(chr?: string) {
        if(chr) {
            this._chr_dim.filterAll();
            //this._merged_chr_dim.filterAll();
            this._chr_dim.filter(d => d === chr);
           // this._merged_chr_dim.filter((d:string) => d === chr);
        } else {
            this._chr_dim.filterAll();
            //this._merged_chr_dim.filterAll();
        }
        
        this._sampleGroupedData = _.groupBy(this._ndx.allFiltered(), "SAMPLE");
        //this._sampleGroupedMergedData = _.groupBy(this._merged_ndx.allFiltered(), d => d.bins[0].SAMPLE);
    }

    setChrFilters(chrs?: string[]) {
        if(chrs && ((chrs.length === 1 && chrs[0] == DataWarehouse.ALL_CHRS_KEY))) {
            this._chr_dim.filterAll();
        } else if(chrs) {
            this._chr_dim.filterAll();
            this._chr_dim.filter(d => chrs.indexOf(String(d)) === -1 ? false : true);
        }
    }

    setClusterFilters(clusters?: String[]) {
        if(clusters && ((clusters.length === 1 && clusters[0] == DataWarehouse.ALL_CLUSTERS_KEY))) {
            this._cluster_dim.filterAll();
            //this._merged_cluster_dim.filterAll();
        } else if(clusters) {
            this._cluster_dim.filterAll();
            //this._merged_cluster_dim.filterAll();
            this._cluster_dim.filter(d => clusters.indexOf(String(d)) === -1 ? false : true);
           // this._merged_cluster_dim.filter((d:Number) => clusters.indexOf(String(d)) === -1 ? false : true);
        }
        if(clusters) {
            this._cluster_filters = clusters;
        }
        
        this._sampleGroupedData = _.groupBy(this._ndx.allFiltered(), "SAMPLE");
        //this._sampleGroupedMergedData = _.groupBy(this._merged_ndx.allFiltered(), d => d.bins[0].SAMPLE); 
    }


    clearAllFilters() {
        this._sample_dim.filterAll();
        this._cluster_dim.filterAll();
        this._chr_dim.filterAll();
        this._sampleGroupedData = _.groupBy(this._ndx.allFiltered(), "SAMPLE");
    }

    updateCluster(cluster: number) {
        console.time("Updating Clusters");
        if(!this.brushedBins || this.brushedBins.length === 0) {
            return;
        }
       
        let previousRecords = this._ndx.all();
        let deepCopy = JSON.parse(JSON.stringify(previousRecords));
        this.historyStack.push(deepCopy);
        
        for(let i = 0; i < this.brushedBins.length; i++) {
            let locKey = GenomicBinHelpers.toChromosomeInterval(this.brushedBins[i]).toString();
            if(this._locationGroupedData[locKey]) {
                for(let j = 0; j < this._locationGroupedData[locKey].length; j++) {
                    this._locationGroupedData[locKey][j].CLUSTER = cluster;
                }
            }
        }
       
        const allMergedBins : GenomicBin[][] = Object.values(this._locationGroupedData);
        let flattenNestedBins : GenomicBin[] = GenomicBinHelpers.flattenNestedBins(allMergedBins);
        this._ndx.remove();
        this._ndx = crossfilter(flattenNestedBins);
        this._sample_dim = this._ndx.dimension((d:GenomicBin) => d.SAMPLE);
        this._cluster_dim = this._ndx.dimension((d:GenomicBin) => d.CLUSTER);
        this._chr_dim = this._ndx.dimension((d:GenomicBin) => d["#CHR"]);
        this.brushedBins = [];
        this.brushedCrossfilter.remove();

        // Get all records prior to filtering out deleted points, 
        // so that cluster table calculation uses all points including the deleted
        this.allRecords =  this._ndx.all(); 
        this.clusterTableInfo = this.calculateClusterTableInfo();
        this.allRecords = this.allRecords.filter((d: GenomicBin) => d.CLUSTER !== -2);
        //this.allRecords =  this._ndx.all().filter((d: GenomicBin) => d.CLUSTER !== -2);
        
        if(!this._cluster_filters.includes(String(cluster))) {
            this._cluster_filters.push(String(cluster));
        }

        console.log(this.historyStack);
        console.timeEnd("Updating Clusters");
    }

    undoClusterUpdate() {
        if(this.historyStack.length === 0) {
            return;
        }
        console.time("Undoing cluster");
        console.log(this.historyStack);
        let newRecords = this.historyStack[this.historyStack.length-1];
        this.historyStack.pop();
        this.initializeLocationGroupedData(newRecords);
        
        this._ndx = crossfilter(newRecords);
        this._sample_dim = this._ndx.dimension((d:GenomicBin) => d.SAMPLE);
        this._cluster_dim = this._ndx.dimension((d:GenomicBin) => d.CLUSTER);
        this._chr_dim = this._ndx.dimension((d:GenomicBin) => d["#CHR"]);
        
        // const clusterTable : clusterTableRow[] = this._cluster_dim.group().all();
        
        // clusterTable.forEach(d => d.value = Number(((d.value/newRecords.length) * 100).toFixed(2)));

        // let clone : clusterTableRow[] = [];
        // for(const row of clusterTable){
        //     let rowClone : clusterTableRow = {key: "", value: 0};
        //     rowClone.key = row.key;
        //     rowClone.value = row.value;
        //     clone.push(rowClone);
        // }
        
        this.clusterTableInfo = this.calculateClusterTableInfo();
        this.allRecords =  this._ndx.all().filter((d: GenomicBin) => d.CLUSTER !== -2);
        
        if(!this._cluster_filters.includes(String(cluster))) {
            this._cluster_filters.push(String(cluster));
        }

        this._sampleGroupedData = _.groupBy(this._ndx.allFiltered(), "SAMPLE");
        console.timeEnd("Undoing cluster");
    }

    brushedTableData() {
        
        const sampleAmount = this._samples.length;
        const clusterInfo = this._cluster_dim.group().all();

        // map each cluster to the amount of points in a single sample 
        // (Each sample contains the same amount of points so we divide by total amount of samples)
        let clusterIdToAmount : clusterIdMap = {};
        clusterInfo.forEach(row => clusterIdToAmount[Number(row.key)] = Number(row.value)/sampleAmount);

        const clusterTable = this.brushedClusterDim.group().all();
        clusterTable.forEach(d => d.value = (Number(d.value)/clusterIdToAmount[Number(d.key)] * 100).toFixed(2));
        return clusterTable;
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
        // if(sample in this._sampleGroupedMergedData) {
        //     return this._sampleGroupedMergedData[sample];
        // }
        //console.log(sample + " " + chr + " " + cluster);
        return []; //this._merged_ndx.allFiltered();//this._merged_sample_dim.top(Infinity);
    }

    setbrushedBins(brushedBins: GenomicBin[]) {
        this.brushedBins = brushedBins;
        this.brushedCrossfilter = crossfilter(brushedBins);
        this.brushedClusterDim = this.brushedCrossfilter.dimension((d:GenomicBin) => d.CLUSTER);
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
