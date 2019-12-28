import _, { Dictionary } from "lodash";
import { GenomicBin } from "./GenomicBin";

/**
 * A function that converts a list of GenomicBin to an arbitrary type.
 * 
 * @typeParam T the type to convert to
 */
type BinConverter<T> = (bins: GenomicBin[]) => T;

/**
 * An indexer of GenomicBins; i.e. creator of a key-value dictionary specially suited to GenomicBins, which may be used
 * to look up bins that have a certain property.  Keys are data values of GenomicBin, and values are lists of bins that
 * have that data value, which may have been converted to another type or format.
 * 
 * @typeParam T the type of the values in created indices
 * @author Silas Hsu
 */
export class BinIndexer<T> {
    /**
     * Callback used to do conversion or aggregation of GenomicBins during index creation.
     */
    private readonly _convertIndexedValues: BinConverter<T>;

    /**
     * Creates a new instance.  The behavior of `index` may be customized by providing a callback function here.
     * Whatever the callback returns will then be found inside the values of indices this object creates.
     * 
     * @param convertIndexedValues callback for conversion or aggregation of GenomicBins during index creation
     */
    constructor(convertIndexedValues: BinConverter<T> = _.identity) {
        this._convertIndexedValues = convertIndexedValues;
    }

    /**
     * Creates a key-value dictionary that which may be used to look up GenomicBins that have a certain property.  Bins
     * that have the same data stored inside the `propName` field are considered to have a "common property" and will be
     * grouped together.  Bins that are grouped together are then passed to the converter/aggregator which finally
     * decides the mapped values.
     * 
     * @example
     * // Given these inputs...
     * bins = [{chr: "chr1", rd: 0}, {chr: "chr2", rd: 1}, {chr: "chr1", rd: 2}];
     * propName = "chr";
     * // The output might look like
     * {"chr1": [{chr: "chr1", rd: 0}, {chr: "chr1", rd: 2}], "chr2": {chr: "chr2", rd: 1}}
     * 
     * @param bins data to group
     * @param propName the property in the data to inspect to perform the grouping.
     * @return mapping from data values to values determined by the callback passed during this instance's creation
     */
    index(bins: GenomicBin[], propName: keyof GenomicBin): Dictionary<T> {
        const grouped = _.groupBy(bins, propName);
        const result: Dictionary<T> = {};
        for (const [key, indexedValues] of Object.entries(grouped)) {
            result[key] = this._convertIndexedValues(indexedValues);
        }
        return result;
    }
}
