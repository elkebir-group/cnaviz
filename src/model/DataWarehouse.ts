import _, {memoize} from "lodash";
import { GenomicBin, GenomicBinHelpers } from "./GenomicBin";
import "crossfilter2";
import crossfilter, { Crossfilter } from "crossfilter2";
import memoizeOne from "memoize-one";
import {calculateEuclideanDist, calculatesilhouettescores, calculateoverallSilhouette, createNDCoordinate} from "../util"
import { DEFAULT_PLOIDY, CN_STATES, cn_pair, DEFAULT_PURITY, fractional_copy_number, START_CN, END_CN} from "../constants";

export function reformatBins(samples: string[], applyLog: boolean, allRecords: readonly GenomicBin[]) : Promise<{multiDimData: number[][], clusterToData : Map<Number, Number[][]>, labels: number[]}> {
    return new Promise<{multiDimData: number[][], clusterToData : Map<Number, Number[][]>, labels: number[]}>((resolve, reject) => {
        const multiDimData = []; 
        const labels : number[] = [];
        const clusterToData = new Map<Number, Number[][]>();
        const rdKey = (applyLog) ? "logRD" :  "RD";

        // Reformat data into multidimensional format for RDRs and BAFs
        // Assumption: length of data % number of samples == 0
        // Every genome range has the same number of samples
        for(let i = 0; i < allRecords.length; i += samples.length) {
            const row = [];
            const c = allRecords[i].CLUSTER;
            for(let j = i; j < i + samples.length; j++) {
                if(j < allRecords.length) {
                    const currentBin = allRecords[j];
                    if(j === i) {
                        labels.push(c);
                    }
                    row.push(currentBin.reverseBAF);
                    row.push(currentBin[rdKey]);
                } else {
                    throw Error("Out of Range Error. There are bins missing in the data (bin must exist across all samples).")
                }
            }

            multiDimData.push(row);
            if(clusterToData.has(c)) {
                let original = clusterToData.get(c);
                if(original !== undefined) {
                    original.push(row);
                    clusterToData.set(c, original);
                }
            } else {
                clusterToData.set(c, [row]);
            }
        }
         
        let returnVal = {multiDimData: multiDimData, clusterToData: clusterToData, labels: labels};
        resolve(returnVal);
    });
}

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

export type ClusterIndexedData<T> = {
    [cluster: string] : T
}

type SampleIndexedData<T> = {
    [sample: string] : T
}

type LogTableRow = {
    action: string
}

type clusterIdMap = {[id: string] : number}
type clusterTableRow =  {key: number, value: number}
type selectionTableRow =  {key: number, value: number, selectPerc: number, binPerc: number}
type centroidPoint = {cluster: number, point: [number, number]}
type newCentroidTableRow = {key: string, sample: {[sampleName: string] : string}}
export type heatMapElem = {cluster1: number, cluster2: number, dist: number}

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
    private readonly _rdRanges: SampleIndexedData<[number, number]>; // SampleIndexedData is a type we created (above) - map from sample to RD range
    private readonly _logRdRanges: SampleIndexedData<[number, number]>; // same, but logRD range
    private _locationGroupedData: LocationIndexedData<GenomicBin[]>; // with a specific location (chrm start end) - get bins across samples for this location range
    private brushedBins: GenomicBin[]; // bins currently selected
    private brushedCrossfilter: Crossfilter<GenomicBin>; // helpful for easily filtering across samples (external library) - set dimensions along which you want to filter 
    private brushedClusterDim: crossfilter.Dimension<GenomicBin, number>;
    private _ndx: Crossfilter<GenomicBin>; // for all the data, n dimensions
    private _sample_dim: crossfilter.Dimension<GenomicBin, string>; // different dimensions we want to sample across, sample, cluster, chr, genomic_pos
    private _cluster_dim: crossfilter.Dimension<GenomicBin, number>;
    private _chr_dim: crossfilter.Dimension<GenomicBin, string>;
    private _genomic_pos_dim: crossfilter.Dimension<GenomicBin, number>;
    private _samples: string[]; // list of samples
    private _clusters: string[]; // list of clusters
    private _chrs: string[];
    private _sampleGroupedData: SampleIndexedData<GenomicBin[]>; // map from each sample to each bin that's relevant 
    private clusterTableInfo: clusterTableRow[]; // info on each cluster (type defined above)
    private allRecords: readonly GenomicBin[]; // all the bins without the crossfilter
    private _cluster_filters: String[]; // current clusters that we're filtering by 
    private historyStack: GenomicBin[][]; // for when we undo 
    private _clusterAmounts: readonly crossfilter.Grouping<crossfilter.NaturallyOrderedValue, unknown>[];//ChrIndexedData<GenomicBin[]>; 
    private logOfActions: LogTableRow[]; // log table that we export
    private centroids: newCentroidTableRow[]; // one of these is for the centroids table we have
    private centroidPts: SampleIndexedData<ClusterIndexedData<centroidPoint[]>>; // for the actual points we want to filter by so we can plot it 
    private chrToClusters: {[chr: string] : Set<string>} // mapping chr to clusters
    private centroidDistances: SampleIndexedData<heatMapElem[]>; 
    private shouldCalculatesilhouettes: boolean;
    private currentsilhouettes: {cluster: number,  avg: number}[];
    private overallSilhouette: number;
    private clusterDistanceMatrix : Map<number, Map<number, number>>;
    private rdMeans: SampleIndexedData<number>;
    private _updateFractionalCopyNumbers: any;
    private currentDataKey: keyof Pick<GenomicBin, "RD" | "logRD" | "fractional_cn">; // not sure if still used
    private sampleToPloidy: SampleIndexedData<number>; // for each sample, there's a specific ploidy whenever user inputs into the box, make a call to this
    private sampleToBafTicks: SampleIndexedData<cn_pair[]>; // similar ^
    private sampleToFractionalTicks:  SampleIndexedData<number[]>; // ^
    private offset: number; 

    // private totalcnToState: CNIndexedData<number[][]>;

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
        // console.log(this._locationGroupedData)
        this._sampleGroupedData = {};
        this._rdRanges = {};
        this.rdMeans = {};
        this._logRdRanges = {};
        this._samples = [];
        this._chrs = [];
        this._clusters = [];
        this.brushedBins = [];
        this.brushedCrossfilter = crossfilter(this.brushedBins); 
        this.brushedClusterDim = this.brushedCrossfilter.dimension((d:GenomicBin) => d.CLUSTER); // set a dimension along cluster (from left sidebar)
        this._cluster_filters = []; 
        this.historyStack = [];
        this._ndx = crossfilter(rawData);
        this.logOfActions = [];
        this.centroidPts = {}; // used for plotting centroids
        this.centroids = []; // used for displaying centroids in centroid table
        this.chrToClusters = {};
        this.centroidDistances = {};
        this.shouldCalculatesilhouettes = true;
        this.currentsilhouettes = [];
        this.clusterDistanceMatrix = new Map<number, Map<number, number>>();
        this.overallSilhouette = 0;
        this.currentDataKey="RD";
        this.sampleToPloidy = {};
        this.sampleToBafTicks = {};
        this.sampleToFractionalTicks = {};
        this.offset = 0; // gc: add offset to the BAF lines


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
                const groupedByChr = _.groupBy(binsForCluster, "#CHR");
                this._chrs = _.union(this._chrs, Object.keys(groupedByChr));
            }
        }

        const groupedByCluster = _.groupBy(rawData, "CLUSTER");
        for (const [clus, binsForCluster] of Object.entries(groupedByCluster)) {
            const groupedBySample = _.groupBy(binsForCluster, "SAMPLE");
            let sampleDict : {[sampleName: string] : string} = {};
            for(const [sample, binsForSample] of Object.entries(groupedBySample)) {
                this.sampleToPloidy[sample] = DEFAULT_PLOIDY;
                
                const centroid = this.calculateCentroid(binsForSample, this.currentDataKey);
                let centroidPt : centroidPoint = {cluster: parseInt(clus), point: centroid};

                if(this.centroidPts[sample] && this.centroidPts[clus]) {
                    this.centroidPts[sample][clus].push(centroidPt);
                } else if(this.centroidPts[sample]) {
                    this.centroidPts[sample][clus] = [centroidPt];
                } else  { 
                    let dataKey : string = clus;
                    let tempMap : ClusterIndexedData<centroidPoint[]> = {};
                    tempMap[dataKey] = [centroidPt];
                    this.centroidPts[sample] = tempMap;
                }

                let centroidStr = "(" + centroid[0].toFixed(2) + "," + centroid[1].toFixed(2) + ")";
                sampleDict[sample] = centroidStr;
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
                this.rdMeans[sample] = _.meanBy(currentSampleBins, "RD");
                this._rdRanges[sample] = currentRdRange;
                this._logRdRanges[sample] = currentLogRdRange;
                
            }
        }

        for (const sample in groupedBySample) {
            this.getBAFLines(DEFAULT_PURITY, sample, this.offset);
            const max_cn = ((this._rdRanges[sample][1]+1) * DEFAULT_PLOIDY / this.rdMeans[sample] - 2*(1-DEFAULT_PURITY)) / DEFAULT_PURITY;
            this.getFractionalCNTicks(DEFAULT_PURITY, START_CN, END_CN, max_cn, sample);
        }

        this.initializeCentroidDistMatrix();
        this.allRecords = this._ndx.all();
        this.clusterTableInfo = this.calculateClusterTableInfo();
        this.filterRecordsByScales = memoizeOne(this.filterRecordsByScales);
        this.getBAFLines = memoizeOne(this.getBAFLines);

        this._updateFractionalCopyNumbers = memoize(this.updateFractionalCopyNumbers, (...args) => {
            return "" + args[0] + "_" + args[1] + "_" + args[2].length + "_" + args[3].join(".");
        });
    }

    setShouldRecalculatesilhouettes(shouldRecalculate: boolean) {
        this.shouldCalculatesilhouettes = shouldRecalculate;
    }

    getClusterDistanceMatrix() {
        return this.clusterDistanceMatrix;
    }

    getAvgSilhouette() {
        return this.overallSilhouette;
    }

    setSamplePloidy(sample: string, ploidy: number) {
        this.sampleToPloidy[sample] = ploidy;
    }

    getSampleToPloidy() {
        return this.sampleToPloidy;
    }

    async recalculatesilhouettes(applyLog: boolean) {
        if(this.shouldCalculatesilhouettes) {
            let contents = null;
            try {
                contents = await reformatBins(this._samples, applyLog, this.allRecords);
            } catch (error) {
                console.error(error);
                return;
            }
            
            const s = calculatesilhouettescores(contents.multiDimData, contents.clusterToData, contents.labels, this.clusterDistanceMatrix);
            this.overallSilhouette = Number(calculateoverallSilhouette(s).toFixed(3));
            this.currentsilhouettes = s;
            this.shouldCalculatesilhouettes = false;
        }
        return this.currentsilhouettes;
    }

    initializeCentroidDistMatrix() {
        for(const sample of this._samples) {
            this.centroidDistances[sample] = [];
            let sampleSpecificCentroids : centroidPoint[] = this.getCentroidPoints(sample);
            for(const c of sampleSpecificCentroids) {
                for(const c2 of sampleSpecificCentroids) {
                    const d : number = calculateEuclideanDist(c.point, c2.point);
                    this.centroidDistances[sample].push({cluster1: c.cluster, cluster2: c2.cluster, dist: d});
                }
            }
        }
    }

    getCentroidDistMatrix(sample: string) {
        return this.centroidDistances[sample];
    }

    calculateCentroid(points: GenomicBin[], yAxis: keyof Pick<GenomicBin, "RD" | "logRD" | "fractional_cn">):  [number, number] {
        return [_.meanBy(points, d => d.reverseBAF), _.meanBy(points, d => d[yAxis])];
    }

    getCentroidData() {
        return this.centroids;
    }

    getCentroidPoints(sample: string, chr?: string, scaleFactor?: number) {
        const samplePts = this.centroidPts[sample]; // Get centroids for a specific sample
        
        let clustersAssociatedWithChr = this._cluster_filters;
        let setOfClustersInChr;
        if(chr) {
            setOfClustersInChr = this.chrToClusters[chr]; // All clusters that appear when filtered by the given chr
        } else {
            setOfClustersInChr = new Set(clustersAssociatedWithChr);
        }
       
        let sampleSpecificCentroids : centroidPoint[] = [];
        for(const cluster of clustersAssociatedWithChr) { // Go through all filtered clusters
            if(setOfClustersInChr.has(cluster) && samplePts[cluster.valueOf()]) { // Check that the cluster appears when filtered by chr 
                sampleSpecificCentroids.push(samplePts[cluster.valueOf()][0]);
            }
        }

        if(scaleFactor && scaleFactor !== 1) {
            const copy = _.cloneDeep(sampleSpecificCentroids);
            copy.forEach(d => d.point[1] = d.point[1] * scaleFactor);
            return copy;
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
    getRdRange(sample : string, log?: boolean, ploidy?: number): [number, number] {
        const rdRange = (log) ? this._logRdRanges[sample] : this._rdRanges[sample];
        const scaleFactor = 1;//(ploidy && !log) ?  ploidy / this.rdMeans[sample] : 1;
        return [rdRange[0] * scaleFactor, rdRange[1] * scaleFactor];
    }

    getFractionCNRange(purity: number, startCN: number, endCN: number) : [number, number] {
        return [purity * (startCN) + 2*(1 - purity),  purity * (endCN) + 2*(1 - purity)]
    }

    getFractionalCNTicks(purity: number, startCN: number, endCN: number, maxCN: number, sample: string) : fractional_copy_number[] {
        const fractionalCNs : fractional_copy_number[] = [];
        
        for(let i = startCN; i <= endCN; i++) {
            const fractional_cn = {fractionalTick: purity * (i) + 2*(1 - purity), totalCN: i}
            fractionalCNs.push(fractional_cn);
        }
        
        
        this.sampleToFractionalTicks[sample] = fractionalCNs.map(d => d.fractionalTick);
        // console.log(fractionalCNs.length);
        if(endCN === maxCN) {
            return fractionalCNs;
        } else if(endCN < maxCN) {
            for(let i = endCN+1; i <= maxCN; i++) {
                const fractional_cn = {fractionalTick: purity * (i) + 2*(1 - purity), totalCN: i}
                fractionalCNs.push(fractional_cn);
            }
            return fractionalCNs;
        } else {
            return fractionalCNs.slice(0, maxCN+1);
        }
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
            this._chr_dim.filter(d => String(d) === String(chr));
        } else {
            this._chr_dim.filterAll();
        }
        
        this._sampleGroupedData = _.groupBy(this._ndx.allFiltered(), "SAMPLE");
    }

    setChrFilters(chrs?: string[]) {
        if(chrs && ((chrs.length === 1 && chrs[0] === DataWarehouse.ALL_CHRS_KEY))) {
            this._chr_dim.filterAll();
        } else if(chrs) {
            this._chr_dim.filterAll();
            this._chr_dim.filter(d => chrs.indexOf(String(d)) === -1 ? false : true);
        }
    }

    recalculateCentroids(key: keyof Pick<GenomicBin, "RD" | "logRD" | "fractional_cn">, data?: GenomicBin[]) {
        console.log("Recalculating Centroids....");
        this.centroids = [];
        this.centroidPts = {};
        const bins = (data) ? data : this.allRecords
        const groupedByCluster = _.groupBy(bins, "CLUSTER");
        for (const [clus, binsForCluster] of Object.entries(groupedByCluster)) {
            const groupedBySample = _.groupBy(binsForCluster, "SAMPLE");
            let sampleDict : {[sampleName: string] : string} = {};
            for(const [sample, binsForSample] of Object.entries(groupedBySample)) {
                let yAx = (key === "fractional_cn") ? "RD" : key;
                const centroid = this.calculateCentroid(binsForSample, yAx);
                
                let centroidPt : centroidPoint = {cluster: parseInt(clus), point: centroid};

                if(this.centroidPts[sample] && this.centroidPts[clus]) {
                    this.centroidPts[sample][clus].push(centroidPt);
                } else if(this.centroidPts[sample]) {
                    this.centroidPts[sample][clus] = [centroidPt];
                } else  { 
                    let dataKey : string = clus;
                    let tempMap : ClusterIndexedData<centroidPoint[]> = {};
                    tempMap[dataKey] = [centroidPt];
                    this.centroidPts[sample] = tempMap;
                }
                let centroidStr = "(" + centroid[0].toFixed(2) + "," + centroid[1].toFixed(2) + ")";
                sampleDict[sample] = centroidStr;
            }

            let centroidTableRow : newCentroidTableRow = {
                key: clus,
                sample: sampleDict
            };
            this.centroids.push(centroidTableRow);
        }
    }

    setClusterFilters(clusters?: String[]) {
        if(clusters && ((clusters.length === 1 && clusters[0] === DataWarehouse.ALL_CLUSTERS_KEY))) {
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
        
        // Create a description of the cluster update and store it
        let action = "Assigned to cluster " + cluster + " | ";
        action += "Clusters selected: ";
        for(const row of brushedTableData) {
            action += String(row.key) + " (" + String(row.value) + "%), ";
        }
        action += " | "
        let currentRdRange : [number, number] = [_.minBy(this.brushedBins, this.currentDataKey)![this.currentDataKey], _.maxBy(this.brushedBins, this.currentDataKey)![this.currentDataKey]];
        let currentBAFRange : [number, number] = [_.minBy(this.brushedBins, "reverseBAF")!.reverseBAF, _.maxBy(this.brushedBins, "reverseBAF")!.reverseBAF];
        
        action += this.currentDataKey + " Range of Selected: [" + currentRdRange[0].toFixed(2) + ", "+currentRdRange[1].toFixed(2) + "] | ";
        action += "Allelic Imbalance Range of Selected: [" + currentBAFRange[0].toFixed(2) + ", "+currentBAFRange[1].toFixed(2) + "]";
        this.logOfActions.unshift({action: action});
        
        // For each bin that was selected, update the cluster of that bin in every sample
        for(let i = 0; i < this.brushedBins.length; i++) {
            let locKey = GenomicBinHelpers.toChromosomeInterval(this.brushedBins[i]).toString();
            if(this._locationGroupedData[locKey]) {
                for(let j = 0; j < this._locationGroupedData[locKey].length; j++) {
                    this._locationGroupedData[locKey][j].CLUSTER = cluster;
                }
            }
        }

        const allBins : GenomicBin[][] = Object.values(this._locationGroupedData);
        let flattenNestedBins : GenomicBin[] = GenomicBinHelpers.flattenNestedBins(allBins);

        this.centroids = [];
        this.centroidPts = {};

        // Update the clusters that correspond to each chromosome
        this.chrToClusters = {};
        for(const d of flattenNestedBins) {
            if(this.chrToClusters[d["#CHR"]]) {
                this.chrToClusters[d["#CHR"]].add(String(d.CLUSTER));
                
            } else {
                this.chrToClusters[d["#CHR"]] = new Set([String(d.CLUSTER)]); 
            }   
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

        this.recalculateCentroids(this.currentDataKey, flattenNestedBins);

        this.initializeCentroidDistMatrix();

        this._ndx.remove();
        this._ndx = crossfilter(flattenNestedBins);
        this._sample_dim = this._ndx.dimension((d:GenomicBin) => d.SAMPLE);
        this._cluster_dim = this._ndx.dimension((d:GenomicBin) => d.CLUSTER);
        this._chr_dim = this._ndx.dimension((d:GenomicBin) => d["#CHR"]);
        this.brushedBins = [];
        this.brushedCrossfilter.remove();
        this._clusterAmounts = _.cloneDeep(this._cluster_dim.group().all());
        this.allRecords =  this._ndx.all(); 
        this.clusterTableInfo = this.calculateClusterTableInfo();
        this.allRecords = this.allRecords.filter((d: GenomicBin) => d.CLUSTER !== -2);

        if(!this._cluster_filters.includes(String(cluster))) {
            this._cluster_filters.push(String(cluster));
        }

        this.setClusterFilters(this._cluster_filters);
        this.shouldCalculatesilhouettes = true;

        this._updateFractionalCopyNumbers.cache = new _.memoize.Cache()
    }

    clearClustering() {
        this.brushedBins = [...this.allRecords];
        this.updateCluster(-1);
    }

    getMeanRD(selectedSample: string) {
        return this.rdMeans[selectedSample];
    }

    setDataKeyType(dataKey: keyof Pick<GenomicBin, "RD" | "logRD" | "fractional_cn">) {
        this.currentDataKey = dataKey;
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

        this.initializeCentroidDistMatrix();
        this._ndx.remove();
        this._ndx = crossfilter(flattenNestedBins);
        this._sample_dim = this._ndx.dimension((d:GenomicBin) => d.SAMPLE);
        this._cluster_dim = this._ndx.dimension((d:GenomicBin) => d.CLUSTER);
        this._chr_dim = this._ndx.dimension((d:GenomicBin) => d["#CHR"]);
        this.brushedBins = [];
        this.brushedCrossfilter.remove();
        this._clusterAmounts = _.cloneDeep(this._cluster_dim.group().all());
        this.allRecords =  this._ndx.all();
        this.clusterTableInfo = this.calculateClusterTableInfo();
        this.allRecords = this.allRecords.filter((d: GenomicBin) => d.CLUSTER !== -2);
        
        
        this.setClusterFilters(this._cluster_filters);
        this.setShouldRecalculatesilhouettes(true);
    }

    
    // Note clusters isn't used but is needed for the memoize to realize that the filters have changed
    updateFractionalCopyNumbers(ploidy: number, sample: string, data: GenomicBin[], clusters: String[]) { 
        const meanRD = this.rdMeans[sample];
        const scalingFactor = ploidy / meanRD;
        let sampleGroupedData = _.cloneDeep(data);
        sampleGroupedData.forEach(d => d.fractional_cn = d.RD * scalingFactor);
        // this.recalculateCentroids("fractional_cn");
        return sampleGroupedData;
    }

    getBAFLines(purity: number, sample: string, offset: number) {  // gc: add offset as a parameter
        const bafSeen = new Set<number>();
        const BAF_ticks : cn_pair[] = [];

        for(const state of CN_STATES) { // each CN state
            const A = state[0]; 
            const B = state[1];
            const BAF_Tick = 0.5-(B * purity + 1 * (1 - purity)) / ((A + B) * purity + 2 * (1 - purity)) + offset; // gc: add offset
            const originalLen = bafSeen.size;
            bafSeen.add(BAF_Tick);
            if(bafSeen.size !== originalLen) {
                const new_val : cn_pair = {tick: BAF_Tick, state: state};
                BAF_ticks.push(new_val);
            }
        }

        const sortedBafLines = _.sortBy(BAF_ticks, "tick");
        this.sampleToBafTicks[sample] = sortedBafLines;
        return sortedBafLines;
    }

    brushedTableData() {
        
        const sampleAmount = this._samples.length;
        const clusterInfo = this._clusterAmounts;
        // map each cluster to the amount of points in a single sample 
        // (Each sample contains the same amount of points so we divide by total amount of samples)
        let clusterIdToAmount : clusterIdMap = {};
        clusterInfo.forEach(row => clusterIdToAmount[Number(row.key)] = Number(row.value)/sampleAmount);
        const amountInSelection = this.brushedBins.length;
        const clusterTable = this.brushedClusterDim.group().all();

        const clusterTable2 : selectionTableRow[] = [];
        const totalBins = this._ndx.all().length;
        for(const row of clusterTable) {
            clusterTable2.push(
            {
                key: Number(row.key), 
                value: Number((Number(row.value)/Number(clusterIdToAmount[Number(row.key)]) * 100).toFixed(2)),
                selectPerc: Number((Number(row.value)/Number(amountInSelection) * 100).toFixed(2)),
                binPerc: Number((Number(row.value)/Number(totalBins / sampleAmount) * 100).toFixed(2))
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
    getRecords(sample: string, dataKey: keyof Pick<GenomicBin, "RD" | "logRD" | "fractional_cn">, implicitStart: number | null, implicitEnd: number | null, xScale: [number, number] | null, yScale: [number, number] | null, meanRD: number, ploidy: number): GenomicBin[] {
        if(sample in this._sampleGroupedData) {
            if(dataKey === "fractional_cn") {
                let fractionalSampleData = this._updateFractionalCopyNumbers(ploidy, sample, this._sampleGroupedData[sample], this._cluster_filters);
                return this.filterRecordsByScales(fractionalSampleData, dataKey, implicitStart, implicitEnd, xScale, yScale, meanRD, ploidy);
                
            } else {
                return this.filterRecordsByScales(this._sampleGroupedData[sample], dataKey, implicitStart, implicitEnd, xScale, yScale, meanRD, ploidy);
            }
        }
        return [];
    }

    filterRecordsByScales(records: GenomicBin[], dataKey: keyof Pick<GenomicBin, "RD" | "logRD" | "fractional_cn">, implicitStart: number | null, implicitEnd: number | null, xScale: [number, number] | null, yScale: [number, number] | null, meanRD: number, ploidy: number) : GenomicBin[] {
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
        this.brushedBins = [];
        this.brushedBins = brushedBins;
        this.brushedCrossfilter.remove();
        this.brushedCrossfilter = crossfilter(brushedBins);
        this.brushedClusterDim = this.brushedCrossfilter.dimension((d:GenomicBin) => d.CLUSTER);
    }

    getBrushedBins() {
        return this.brushedBins;
    }

    getClusterDim() {
        return this._cluster_dim;
    }

    calculateCopyNumbers() {
        for(let i = 0; i < this.allRecords.length; i++) {
            const sample = this.allRecords[i].SAMPLE;
            const ploidy = this.sampleToPloidy[sample];
            const meanRD = this.rdMeans[sample];
            const rd = this.allRecords[i].RD;
            this.allRecords[i].fractional_cn = rd * ploidy / meanRD; 
        }

        for(let i = 0; i < this.allRecords.length; i++) {
            const bin = this.allRecords[i];
            const binSample = bin.SAMPLE;
            const fractionalTicks = this.sampleToFractionalTicks[binSample];
            const bafTicks = this.sampleToBafTicks[binSample];
            const x = bin.reverseBAF;
            const y = bin.fractional_cn;
            const valuesToCompare : [number, number][] = [];
            let minDist : number = Infinity;
            let minState : [number, number] = [-1, -1];

            for(let j=0; j < bafTicks.length; j++) {
                const tickPair = bafTicks[j];
                const state = tickPair.state;
                const bafVal = tickPair.tick;
                const totalCN = state[0] + state[1];
                const correspondingFractional = fractionalTicks[totalCN];
                
                valuesToCompare.push([bafVal, correspondingFractional]);
                const dist = Math.pow(x - bafVal, 2) + Math.pow(y - correspondingFractional, 2);
                if(dist < minDist) {
                    minDist = dist;
                    minState = state;
                }
            }

            this.allRecords[i].CN = "("+minState[0]+","+minState[1]+")";
        }

    }

    // applies the same across all samples
    absorbUnassigned(thresh: number) {
        // for loop through all records
        for(let i = 0; i < this.allRecords.length; i++) {
            // if bin is unassigned (cluster = -1)
            const bin = this.allRecords[i];
            const sample = bin.SAMPLE;
            const c = bin.CLUSTER;

            let x : number = bin.reverseBAF;
            let y : number = bin.fractional_cn; 

            if (c === -1) {
                // for loop through all the active centroids (variable for this)

                // centroidPts : SampleIndexedData<ClusterIndexedData<centroidPoint[]>>;
                const samplePts = this.centroidPts[sample]; // Get centroids for a specific sample
                let minDistFromCentroid : number = Number.MAX_VALUE; 
                let minCluster : number = -2;

                for (const c_wrapper of [samplePts]) {
                    let c : centroidPoint[] = c_wrapper.cluster; 
                    for (const centroid of c) {
                        let cluster_name : number = centroid.cluster; 
                        let c_x : number = centroid.point[0]; //.toFixed(2);
                        let c_y : number = centroid.point[1]; // .toFixed(2);

                        // pick the centroid that's closest 
                        const dist = Math.sqrt((c_x - x)**2 + (c_y - y)**2);
                        if (dist < minDistFromCentroid) {
                            minCluster = cluster_name; 
                            minDistFromCentroid = dist; 
                        }
                    }
                }
                // assign bin to closest centroid if closer than threshold
                if (minDistFromCentroid < thresh) {
                    let locKey = GenomicBinHelpers.toChromosomeInterval(bin).toString(); // copied from line 575
                    if(this._locationGroupedData[locKey]) {
                        for(let j = 0; j < this._locationGroupedData[locKey].length; j++) {
                            this._locationGroupedData[locKey][j].CLUSTER = minCluster;
                        }
                    }
                }

            }

            // this.recalculateCentroids(this.currentDataKey, flattenNestedBins);
            // this.historyStack.push()
        }

    }

    // calculateCopyNumbers2() {
    //     if(this._samples.length === 0) {
    //         return;
    //     }

    //     for(let i = 0; i < this.allRecords.length; i++) {
    //         const sample = this.allRecords[i].SAMPLE;
    //         const ploidy = this.sampleToPloidy[sample];
    //         const meanRD = this.rdMeans[sample];
    //         const rd = this.allRecords[i].RD;
    //         this.allRecords[i].fractional_cn = rd * ploidy / meanRD; 
    //     }

    //     // Convert each bin to an ND coordinate across samples
    //     const locKeyToNDCoord : LocationIndexedData<number[]> = {};
    //     const firstSample = this._samples[0];
    //     const firstSampleData = this._sampleGroupedData[firstSample];


    //     for(const bin of firstSampleData) {
    //         const locKey = GenomicBinHelpers.toChromosomeInterval(bin).toString();
    //         const binAcrossSamples = this._locationGroupedData[locKey];
    //         const binCoords : [number, number][] = [];
    //         for(const bin2 of binAcrossSamples) {
    //             const sample = bin2.SAMPLE;
    //             const samplePloidy = this.sampleToPloidy[sample];
    //             const meanRD = this.rdMeans[sample];
    //             const cnBaf : [number, number] = [bin2.reverseBAF, bin2.RD * samplePloidy / meanRD];
    //             binCoords.push(cnBaf);
    //         }

    //         locKeyToNDCoord[locKey] = createNDCoordinate(binCoords);
    //     }

    //     type NDGridCoord = {state: [number, number], coord: number[]}

    //     const statesUsed = this.sampleToBafTicks[firstSample].map(d => d.state);
    //     const gridCoords : NDGridCoord[] = [];

    //     for(const [A, B] of statesUsed) {
    //         // Get the Baf ticks corresponding to the CN state [A, B] in each sample
    //         const sampleToABBaf : SampleIndexedData<number> = {};
    //         for(const sample of this._samples) {
    //             const bafTicks : cn_pair[] = this.sampleToBafTicks[sample];
    //             const foundABBAF = bafTicks.find(d => d.state[0] === A && d.state[1] === B);
    //             if(foundABBAF) {
    //                 sampleToABBaf[sample] = foundABBAF.tick;
    //             }
    //         }

    //         // Get the fractional CN tick that makes sense with the state [A, B] (the tick corresponding to state (A+B))

    //         const totalCN = A + B;
    //         const sampleToFracCN : SampleIndexedData<number> = {};
    //         for(const sample of this._samples) {
    //             const fracCNTicks : number[] = this.sampleToFractionalTicks[sample];
    //             const totalCNFracTick : number = fracCNTicks[totalCN];
    //             sampleToFracCN[sample] = totalCNFracTick;
    //         }

    //         // Create a n-dimensional cooordinate for state [A, B]
    //         const nDimGridCoordinate : number[] = []
    //         for(const sample of this._samples) {
    //             const x = sampleToABBaf[sample];
    //             const y = sampleToFracCN[sample];
    //             nDimGridCoordinate.push(x);
    //             nDimGridCoordinate.push(y);
    //         }

    //         gridCoords.push({state: [A, B], coord: nDimGridCoordinate});
    //     }


    //     // For bin (across samples) find closest nd gridCoord
    //     for(let i = 0; i < this.allRecords.length; i++) {
    //         const bin = this.allRecords[i];
    //         const locKey = GenomicBinHelpers.toChromosomeInterval(bin).toString();
    //         const ndCoord1 = locKeyToNDCoord[locKey];
    //         let minDist = Infinity;
    //         let minDistState = [-1, -1];
    //         for (const gridCoord of gridCoords) {
    //             const ndCoord2 = gridCoord.coord;
    //             const dist = calculateEuclideanDist(ndCoord1, ndCoord2);
    //             if (dist < minDist) {
    //                 minDist = dist;
    //                 minDistState = gridCoord.state;
    //             }
    //         }

    //         this.allRecords[i].CN = "("+minDistState[0]+","+minDistState[1]+")";
    //     }
        
    // }

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
