import _, { first, sample } from "lodash";
import { GenomicBin, GenomicBinHelpers } from "./GenomicBin";
import { MergedGenomicBin, BinMerger, MergedBinHelpers } from "./BinMerger";
import { cross, group } from "d3-array";
import { cluster } from "d3-hierarchy";
import { ChromosomeInterval } from "./ChromosomeInterval";
import "crossfilter2";
import crossfilter, { Crossfilter } from "crossfilter2";
import memoizeOne from "memoize-one";
import { visitNode } from "typescript";

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

type ChrIndexedData<T> = {
    [sample: string] : T
}

type LogTableRow = {
    action: string
}

type clusterIdMap = {[id: string] : number}
type clusterTableRow =  {key: number, value: number}
type selectionTableRow =  {key: number, value: number, selectPerc: number}
type centroidTableRow = {key: number, sample: string, centroid: string}
type centroidPoint = {cluster: number, point: [number, number]}
type newCentroidTableRow = {key: string, sample: {[sampleName: string] : string}}//string, centroid: string}

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
    private _genomic_pos_dim: crossfilter.Dimension<GenomicBin, number>;
    private _samples: string[];
    private _clusters: string[];
    private _chrs: string[];
    private _sampleGroupedData: SampleIndexedData<GenomicBin[]>;
    private clusterTableInfo: clusterTableRow[]; 
    private allRecords: readonly GenomicBin[];
    private _cluster_filters: String[];
    private historyStack: GenomicBin[][];
    private _clusterAmounts: readonly crossfilter.Grouping<crossfilter.NaturallyOrderedValue, unknown>[];//ChrIndexedData<GenomicBin[]>;
    private logOfActions: LogTableRow[];
    private centroids: newCentroidTableRow[];
    private centroidPts: SampleIndexedData<ClusterIndexedData<centroidPoint[]>>;
    private chrToClusters: {[chr: string] : Set<string>}

    /**
     * Indexes, pre-aggregates, and gathers metadata for a list of GenomicBin.  Note that doing this inspects the entire
     * data set, and could be computationally costly if the data set is large.
     * 
     * @param rawData the data to process
     * @param merger aggregator to use
     * @throws {Error} if the data contains chromosome(s) with the reserved name of `DataWarehouse.ALL_CHRS_KEY`
     */
    constructor(rawData: GenomicBin[]) {
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
        this.logOfActions = [];
        this.centroidPts = {}; // used for plotting centroids
        this.centroids = []; // used for displaying centroids in centroid table
        this.chrToClusters = {};

        for(const d of rawData) {
            if(this.chrToClusters[d["#CHR"]])
                this.chrToClusters[d["#CHR"]].add(String(d.CLUSTER));
            else
                this.chrToClusters[d["#CHR"]] = new Set([String(d.CLUSTER)]);
        }

        const groupedBySample = _.groupBy(rawData, "SAMPLE");
        for (const [sample, binsForSample] of Object.entries(groupedBySample)) {
            this._samples.push(sample);
            const groupedByCluster = _.groupBy(binsForSample, "CLUSTER");
            this._clusters = _.union(this._clusters, Object.keys(groupedByCluster));
            for (const binsForCluster of Object.values(groupedByCluster)) {
                this.initializeCentroidOfCluster(binsForCluster[0].CLUSTER, sample, binsForCluster, "RD");
                const groupedByChr = _.groupBy(binsForCluster, "#CHR");
                this._chrs = _.union(this._chrs, Object.keys(groupedByChr));
            }
        }


        const groupedByCluster = _.groupBy(rawData, "CLUSTER");
        for (const [clus, binsForCluster] of Object.entries(groupedByCluster)) {
            const groupedBySample = _.groupBy(binsForCluster, "SAMPLE");
            let sampleDict : {[sampleName: string] : string} = {};
            for(const [sample, binsForSample] of Object.entries(groupedBySample)) {
                const centroid = this.calculateCentroid(binsForSample, "RD");
                let centroidPt : centroidPoint = {cluster: parseInt(clus), point: centroid};

                if(this.centroidPts[sample] && this.centroidPts[clus]) {
                    this.centroidPts[sample][clus].push(centroidPt);
                } else if(this.centroidPts[sample]) {
                    this.centroidPts[sample][clus] = [centroidPt];
                } else  { 
                    let dataKey : string = clus; //.toString();
                    let tempMap : ClusterIndexedData<centroidPoint[]> = {};
                    tempMap[dataKey] = [centroidPt];
                    this.centroidPts[sample] = tempMap;
                }

                let centroidStr = "(" + centroid[0].toFixed(2) + "," + centroid[1].toFixed(2) + ")";
                sampleDict[sample] = centroidStr;
                // this.initializeCentroidOfAllSamples(clus, sample, binsForCluster, "RD");
            }

            let centroidTableRow : newCentroidTableRow = {
                key: clus,
                sample: sampleDict
            };
            this.centroids.push(centroidTableRow);
        }

        this._cluster_filters = this._clusters;
        this._sample_dim = this._ndx.dimension((d:GenomicBin) => d.SAMPLE);
        this._cluster_dim = this._ndx.dimension((d:GenomicBin) => d.CLUSTER);
        this._chr_dim = this._ndx.dimension((d:GenomicBin) => d["#CHR"]);
        this._genomic_pos_dim = this._ndx.dimension((d:GenomicBin) => d.genomicPosition);
        this._sampleGroupedData = _.groupBy(this._ndx.allFiltered(), "SAMPLE");
        this._clusterAmounts = _.cloneDeep(this._cluster_dim.group().all());
        
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
        this.filterRecordsByScales = memoizeOne(this.filterRecordsByScales);
    }

    initializeCentroidOfCluster(cluster: number, sample: string, points: GenomicBin[], yaxis: keyof Pick<GenomicBin, "RD" | "logRD">) {
        // let centroid =  this.calculateCentroid(points, yaxis);
        // let centroidPt : centroidPoint = {cluster: cluster, point: centroid};

        // if(this.centroidPts[sample] && this.centroidPts[cluster]) {
        //     this.centroidPts[sample][cluster].push(centroidPt);
        // } else if(this.centroidPts[sample]) {
        //     this.centroidPts[sample][cluster] = [centroidPt];
        // } else  { 
        //     let dataKey : string = cluster.toString();
        //     let tempMap : ClusterIndexedData<centroidPoint[]> = {};
        //     tempMap[dataKey] = [centroidPt];
        //     this.centroidPts[sample] = tempMap;
        // }
        // console.log("CENTROID PTS: ", this.centroidPts);
        // let centroidStr = "(" + centroid[0].toFixed(2) + "," + centroid[1].toFixed(2) + ")";
        // let row : centroidTableRow = {key: cluster, sample: sample, centroid: centroidStr};
        // this.centroids.push(row);
    }

    initializeCentroidOfAllSamples(cluster: string, sample: string, points: GenomicBin[], yaxis: keyof Pick<GenomicBin, "RD" | "logRD">) {

    }

    calculateCentroid(points: GenomicBin[], yAxis: keyof Pick<GenomicBin, "RD" | "logRD">):  [number, number] {
        return [_.meanBy(points, d => d.reverseBAF), _.meanBy(points, d => d[yAxis])];
    }

    getCentroidData() {
        return this.centroids;
    }

    getCentroidPoints(sample: string, chr?: string) {
        const samplePts = this.centroidPts[sample];
        let clustersAssociatedWithChr = this._cluster_filters;
        let setOfClustersInChr;
        if(chr) {
            setOfClustersInChr = this.chrToClusters[chr];
        } else {
            setOfClustersInChr = new Set(clustersAssociatedWithChr);
        }
       


        let sampleSpecificCentroids : centroidPoint[] = [];
        for(const cluster of clustersAssociatedWithChr) {
            if(setOfClustersInChr.has(cluster) && samplePts[cluster.valueOf()]) {
                sampleSpecificCentroids.push(samplePts[cluster.valueOf()][0]);
            }
        }

        return sampleSpecificCentroids;
    }

    calculateClusterTableInfo() : clusterTableRow[] {
        const clusterInfo = this._cluster_dim.group().all();
        const clusterTable : clusterTableRow[] = [];
        for(const row of clusterInfo) {
            let value = Number(((Number(row.value)/this.allRecords.length) * 100).toFixed(2));
            clusterTable.push(
            {
                key: Number(row.key), 
                value: value
            });
        }
        return clusterTable;
    }

    calculateSelectTableInfo() : selectionTableRow[] {
        const clusterInfo = this._cluster_dim.group().all();
        const clusterTable : selectionTableRow[] = [];
        for(const row of clusterInfo) {
            let value = Number(((Number(row.value)/this.allRecords.length) * 100).toFixed(2));
            let selectPerc = Number(((Number(row.value)/this.allRecords.length) * 100).toFixed(2));
            clusterTable.push(
            {
                key: Number(row.key), 
                value: value,
                selectPerc: selectPerc
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
        if(chr) { this._chr_dim.filter(d => d === chr); }

        if(clusters) {
            this._cluster_dim.filter(d => clusters.indexOf(String(d)) === -1 ? false : true);
        }
    }

    setChrFilter(chr?: string) {
        if(chr) {
            this._chr_dim.filterAll();
            this._chr_dim.filter(d => d === chr);
        } else {
            this._chr_dim.filterAll();
        }
        
        this._sampleGroupedData = _.groupBy(this._ndx.allFiltered(), "SAMPLE");
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
        } else if(clusters) {
            this._cluster_dim.filterAll();
            this._cluster_dim.filter(d => clusters.indexOf(String(d)) === -1 ? false : true);
        }
        if(clusters) {
            this._cluster_filters = clusters;
        }
        
        this._sampleGroupedData = _.groupBy(this._ndx.allFiltered(), "SAMPLE");
    }

    setGenomicPositionFilter(genomeRange: [number, number]) {
        this._genomic_pos_dim.filterAll();
        this._genomic_pos_dim.filter(d => d > genomeRange[0] && d < genomeRange[1]);

        this._sampleGroupedData = _.groupBy(this._ndx.allFiltered(), "SAMPLE");
    }

    clearAllFilters() {
        this._sample_dim.filterAll();
        this._cluster_dim.filterAll();
        this._chr_dim.filterAll();
        this._sampleGroupedData = _.groupBy(this._ndx.allFiltered(), "SAMPLE");
    }

    getActions() {
        return this.logOfActions;
    }

    updateCluster(cluster: number) {
        if(!this.brushedBins || this.brushedBins.length === 0) {
            return;
        }

        this.historyStack.push(JSON.parse(JSON.stringify(this.brushedBins)));
        let brushedTableData  = this.brushedTableData();
        let brushedTableDataKeys = Object.keys(brushedTableData);
        let brushedTableDataValues = Object.values(brushedTableData);
        let action = "Assigned to cluster " + cluster + " | ";
        action += "Clusters selected: ";
        for(let i = 0; i < brushedTableData.length; i++) {
            action += brushedTableDataKeys[i] + " (" + Number(brushedTableDataValues[i].value) + "%)";
            if(i != brushedTableData.length-1) { 
                action+= ", ";
            } else {
                action += " | ";
            }
        }

        let currentRdRange : [number, number] = [_.minBy(this.brushedBins, "RD")!.RD, _.maxBy(this.brushedBins, "RD")!.RD];
        let currentBAFRange : [number, number] = [_.minBy(this.brushedBins, "reverseBAF")!.reverseBAF, _.maxBy(this.brushedBins, "reverseBAF")!.reverseBAF];
        
        action += "RD Range of Selected: [" + currentRdRange[0].toFixed(2) + ", "+currentRdRange[1].toFixed(2) + "] | ";

        action += "Allelic Imbalance Range of Selected: [" + currentBAFRange[0].toFixed(2) + ", "+currentBAFRange[1].toFixed(2) + "]";

        this.logOfActions.unshift({action: action});
        
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
        this.centroids = [];
        this.centroidPts = {};
        this.chrToClusters = {};
        for(const d of flattenNestedBins) {
            if(this.chrToClusters[d["#CHR"]])
                this.chrToClusters[d["#CHR"]].add(String(d.CLUSTER));
            else
                this.chrToClusters[d["#CHR"]] = new Set([String(d.CLUSTER)]);
        }

        // Steps to find centroids (in a format that can be displayed in the table properly)
        // 1. group by cluster
        // 2. Get each group of points with all matching cluster
        // 3. Group by sample
        // 4. Find centroid for that group of points
        // 5. Create a Sample dictionary with each sample name mapped to centroid
        // 6. Add dictionary to table row
        // 7. Push table row into list of table rows
        // 8. Move on to next cluster and repeat
        const groupedByCluster = _.groupBy(flattenNestedBins, "CLUSTER");
        for (const [clus, binsForCluster] of Object.entries(groupedByCluster)) {
            const groupedBySample = _.groupBy(binsForCluster, "SAMPLE");
            let sampleDict : {[sampleName: string] : string} = {};
            for(const [sample, binsForSample] of Object.entries(groupedBySample)) {
                const centroid = this.calculateCentroid(binsForSample, "RD");
                let centroidPt : centroidPoint = {cluster: parseInt(clus), point: centroid};

                if(this.centroidPts[sample] && this.centroidPts[clus]) {
                    this.centroidPts[sample][clus].push(centroidPt);
                } else if(this.centroidPts[sample]) {
                    this.centroidPts[sample][clus] = [centroidPt];
                } else  { 
                    let dataKey : string = clus; //.toString();
                    let tempMap : ClusterIndexedData<centroidPoint[]> = {};
                    tempMap[dataKey] = [centroidPt];
                    this.centroidPts[sample] = tempMap;
                }
                let centroidStr = "(" + centroid[0].toFixed(2) + "," + centroid[1].toFixed(2) + ")";
                sampleDict[sample] = centroidStr;
                // this.initializeCentroidOfAllSamples(clus, sample, binsForCluster, "RD");
            }

            let centroidTableRow : newCentroidTableRow = {
                key: clus,
                sample: sampleDict
            };
            this.centroids.push(centroidTableRow);
        }
        

        // const groupedBySample = _.groupBy(flattenNestedBins, "SAMPLE");
        // for (const [sample, binsForSample] of Object.entries(groupedBySample)) {
        //     const groupedByCluster = _.groupBy(binsForSample, "CLUSTER");
        //     for (const binsForCluster of Object.values(groupedByCluster)) {
        //         this.initializeCentroidOfCluster(binsForCluster[0].CLUSTER, sample, binsForCluster, "RD");
        //     }
        // }

        this._ndx.remove();
        this._ndx = crossfilter(flattenNestedBins);
        this._sample_dim = this._ndx.dimension((d:GenomicBin) => d.SAMPLE);
        this._cluster_dim = this._ndx.dimension((d:GenomicBin) => d.CLUSTER);
        this._chr_dim = this._ndx.dimension((d:GenomicBin) => d["#CHR"]);
        this.brushedBins = [];
        this.brushedCrossfilter.remove();
        this._clusterAmounts = _.cloneDeep(this._cluster_dim.group().all());
        this.allRecords =  this._ndx.all(); 
        let test = this.calculateClusterTableInfo();
        this.clusterTableInfo = test;
        this.allRecords = this.allRecords.filter((d: GenomicBin) => d.CLUSTER !== -2);

        if(!this._cluster_filters.includes(String(cluster))) {
            this._cluster_filters.push(String(cluster));
        }
        this.setClusterFilters(this._cluster_filters);
    }

    undoClusterUpdate() {
        if(this.historyStack.length === 0) {
            return;
        }

        let newRecords = this.historyStack[this.historyStack.length-1];  
        this.historyStack.pop();
        for(let i = 0; i < newRecords.length; i++) {
            let currentBin = newRecords[i];
            let locKey = GenomicBinHelpers.toChromosomeInterval(currentBin).toString();
            let cluster = currentBin.CLUSTER;
            if(!this._cluster_filters.includes(String(cluster))) {
                this._cluster_filters.push(String(cluster));
            }
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
        this._clusterAmounts = _.cloneDeep(this._cluster_dim.group().all());
        this.allRecords =  this._ndx.all(); 
        let test = this.calculateClusterTableInfo();
        this.clusterTableInfo = test;
        this.allRecords = this.allRecords.filter((d: GenomicBin) => d.CLUSTER !== -2);
        
        
        this.setClusterFilters(this._cluster_filters);
    }

    brushedTableData() {
        
        const sampleAmount = this._samples.length;
        const clusterInfo = this._clusterAmounts;//this._cluster_dim.group().all();
        // map each cluster to the amount of points in a single sample 
        // (Each sample contains the same amount of points so we divide by total amount of samples)
        let clusterIdToAmount : clusterIdMap = {};
        clusterInfo.forEach(row => clusterIdToAmount[Number(row.key)] = Number(row.value)/sampleAmount);
        const amountInSelection = this.brushedBins.length;
        const clusterTable = this.brushedClusterDim.group().all();
        //clusterTable.forEach(d => d.value = (Number(d.value)/Number(clusterIdToAmount[Number(d.key)]) * 100).toFixed(2));
        
        const clusterTable2 : selectionTableRow[] = [];
        for(const row of clusterTable) {
            clusterTable2.push(
            {
                key: Number(row.key), 
                value: Number((Number(row.value)/Number(clusterIdToAmount[Number(row.key)]) * 100).toFixed(2)),
                selectPerc: Number((Number(row.value)/Number(amountInSelection) * 100).toFixed(2))
            });
        }

        
        return clusterTable2;
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
    getRecords(sample: string, applyLog: boolean, implicitStart: number | null, implicitEnd: number | null, xScale: [number, number] | null, yScale: [number, number] | null): GenomicBin[] {
        if(sample in this._sampleGroupedData) {
            return this.filterRecordsByScales(this._sampleGroupedData[sample], applyLog, implicitStart, implicitEnd, xScale, yScale);
        }
        return [];
    }

    filterRecordsByScales(records: GenomicBin[], applyLog: boolean, implicitStart: number | null, implicitEnd: number | null, xScale: [number, number] | null, yScale: [number, number] | null) : GenomicBin[]{
       
       let dataKey : keyof Pick<GenomicBin, "RD" | "logRD"> = (applyLog) ? "logRD" : "RD"
        if((implicitStart && implicitEnd) && xScale && yScale) {
            return records.filter(record => record.genomicPosition > implicitStart 
                && record.genomicPosition < implicitEnd 
                && record.reverseBAF > xScale[0] 
                && record.reverseBAF < xScale[1]
                && record[dataKey] > yScale[0] 
                && record[dataKey] < yScale[1]
                )
        } else if((implicitStart && implicitEnd) && xScale) {
            return records.filter(record => record.genomicPosition > implicitStart 
                && record.genomicPosition < implicitEnd 
                && record.reverseBAF > xScale[0] 
                && record.reverseBAF < xScale[1]
                )
        } else if((implicitStart && implicitEnd) && yScale) {
             return records.filter(record => record.genomicPosition > implicitStart 
                 && record.genomicPosition < implicitEnd 
                 && record[dataKey] > yScale[0] 
                && record[dataKey] < yScale[1]
                 )
         } else if(xScale && yScale) {
            return records.filter(record => 
                record.reverseBAF > xScale[0] 
                && record.reverseBAF < xScale[1]
                && record[dataKey] > yScale[0] 
                && record[dataKey] < yScale[1]
                )
         } else if (xScale) {
            return records.filter(record => 
                record.reverseBAF > xScale[0] 
                && record.reverseBAF < xScale[1]
                )
        } else if(yScale) {
            return records.filter(record => 
                record[dataKey] > yScale[0] 
                && record[dataKey] < yScale[1]
                )
        }

        return records;
        
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
