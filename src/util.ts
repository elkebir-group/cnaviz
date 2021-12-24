import * as d3 from "d3";
import { GenomicBin } from "./model/GenomicBin";
import _ from "lodash";

export interface Coordinate {
    x: number;
    y: number;
}

interface Window {
    webkitURL?: any;
}

declare var window2: Window;

/**
 * Gets the x and y coordinates of a mouse event *relative to the top left corner of an element*.  By default, the
 * element is the event's `currentTarget`, the element to which the event listener has been attached.
 * 
 * For example, if the top left corner of the element is at screen coordinates (10, 10) and the event's screen
 * coordinates are (11, 12), then this function will return `{x: 1, y: 2}`.
 * 
 * @param {React.MouseEvent} event - the event for which to get relative coordinates
 * @param {Element} [relativeTo] - calculate coordinates relative to this element.  Default is event.currentTarget.
 * @return {Coordinate} object with props x and y that contain the relative coordinates
 */
export function getRelativeCoordinates(event: React.MouseEvent, relativeTo?: Element): Coordinate {
    if (!relativeTo) {
        relativeTo = event.currentTarget as Element;
    }
    const targetBoundingRect = relativeTo.getBoundingClientRect();
    return {
        x: event.clientX - targetBoundingRect.left,
        y: event.clientY - targetBoundingRect.top
    };
}

/**
 * Gets the device's pixel ratio.  Guaranteed to be a number greater than 0.
 * 
 * @return {number} this device's pixel ratio
 */
function getPixelRatioSafely(): number {
    const pixelRatio = window.devicePixelRatio;
    if (Number.isFinite(pixelRatio) && pixelRatio > 0) {
        return pixelRatio;
    } else {
        return 1;
    }
}

/**
 * Applies a fix for Retina (i.e. high pixel density) displays, to prevent a canvas from being blurry.
 * 
 * @param {HTMLCanvasElement} canvas - canvas to modify
 */
export function applyRetinaFix(canvas: HTMLCanvasElement) {
    const pixelRatio = getPixelRatioSafely();
    if (pixelRatio !== 1) {
        const width = canvas.width;
        const height = canvas.height;

        canvas.width = width * pixelRatio;
        canvas.height = height * pixelRatio;
        canvas.style.width = width + "px";
        canvas.style.height = height + "px";
        const ctx = canvas.getContext('2d')!;
        ctx.scale(pixelRatio, pixelRatio);
    }
}

/**
 * @param {number} bases - number of bases
 * @param {number} [sigFigs] - number of digits after the decimal point.  Default = 1
 * @return {string} human-readable string representing that number of bases
 */
export function niceBpCount(bases: number, sigFigs=1, sub?: number) {
    
    let basesAmnt = bases;
    if(sub) {
        basesAmnt = basesAmnt - sub;
    }

    if(basesAmnt < 0) {
      return '';
    }

    const rounded = Math.floor(basesAmnt);
    if (rounded >= 750000) {
        return `${(rounded/1000000).toFixed(sigFigs)} Mb`;
    } else if (rounded >= 10000) {
        return `${(rounded/1000).toFixed(sigFigs)} kb`;
    } else {
        return `${rounded} bp`;
    }
}

/**
 * Finds the object in `searchPoints` that is "closest" to `queryPoint`, and returns its index.  Returns -1 if given an
 * empty list. Uses euclidean distance.  Takes any type of object, but the object must contain keys that point to number
 * values.
 * 
 * @param {T} queryPoint - the point for which to find the closest point in `searchPoints`
 * @param {T[]} searchPoints - points to search
 * @param {keyof T} xKey - key of the input objects, which should have a number value, to use as a "x" coordinate
 * @param {keyof T} yKey - key of the input objects, which should have a number value, to use as a "y" coordinate
 * @return {number} the index in `searchPoints` that contains the object closest to `queryPoint`
 */
export function getMinDistanceIndex<T>(queryPoint: T, searchPoints: T[], xKey: keyof T, yKey: keyof T): number {
    let minDistance = Number.MAX_VALUE;
    let minIndex = -1;
    for (let i = 0; i < searchPoints.length; i++) {
        const distance = squaredDistance(searchPoints[i], queryPoint);
        if (distance < minDistance) {
            minDistance = distance;
            minIndex = i;
        }
    }
    return minIndex;

    function squaredDistance(a: T, b: T) {
        const xDiff = (a[xKey] as any) - (b[xKey] as any);
        const yDiff = (a[yKey] as any) - (b[yKey] as any);
        return xDiff * xDiff + yDiff * yDiff;
    }
}

export function calculateEuclideanDist(pointOne: number[] | string[] | Number[], pointTwo: number[] | string[] | Number[], sqrt?: boolean) : number {
    if(pointOne.length !== pointTwo.length) {
      throw Error("Calculate Euclidean Distance - pointOne dim does not match pointTwo dim");
    }

    let result = 0;
    for(let i = 0; i < pointOne.length; i++) {
      const currentDiff = Number(pointOne[i]) - Number(pointTwo[i]);
      result += currentDiff * currentDiff;
    }

    return (sqrt === true) ? Math.sqrt(result): result;
}



/**
 * Samples `numSamples` items from the input list by selecting equally-spaced elements.  If the list is shorter than the
 * desired number of samples, returns the entire list.  Note that if the input is sorted, the output will be sorted as
 * well.
 * 
 * @param {T[]} list - list for which to sample
 * @param {number} numSamples - number of samples
 * @return {T[]} items sampled from the list
 */
export function sampleWithEqualSpacing<T>(list: T[], numSamples: number): T[] {
    if (list.length <= numSamples) {
        return list;
    }

    const samples: T[] = [];
    for (let i = 0; i < numSamples; i++) {
        const fractionIterated = i / numSamples;
        const selectedIndex = Math.ceil(fractionIterated * list.length);
        samples.push(list[selectedIndex]);
    }
    return samples;
}

export const trunc = (str : string, len : number) =>
  str.length > len ? str.substr(0, len - 1) + "..." : str;

export const webglColor = (color : string) => {
    let col = d3.color(color);
    if(col !== null) {  
        const { r, g, b, opacity } = col.rgb();
        return [r / 255, g / 255, b / 255, opacity];
    }

    return;
}

export const iterateElements = (selector : any, fn : any) =>
  [].forEach.call(document.querySelectorAll(selector), fn);

/**
 * calculates the average Euclidean distance from p to every point in other_cluster
 * @param p point from which distances will be calculated
 * @param other_cluster a cluster that p is NOT a part of
 */
export const calculateInterClusterDist1D = (p: GenomicBin, other_cluster: GenomicBin[]) : number => {
  let pointOne : [number, number] = [p.reverseBAF, p.RD];
  let dists = [];
  for(const bin of other_cluster) {
    dists.push(calculateEuclideanDist(pointOne, [bin.reverseBAF, bin.RD], true));
  }

  return _.mean(dists);
}


/**
 * calculates the average Euclidean distance from p to every point in other_cluster
 * @param p point from which distances will be calculated
 * @param other_cluster a cluster that p is NOT a part of
 */
 export const calculateInterClusterDist2 = (p: number[] | Number[], other_cluster: number[][] | Number[][]) : number => {
  let dists = [];
  for(const bin of other_cluster) {
    dists.push(calculateEuclideanDist(p, bin, true));
  }

  return _.mean(dists);
}

/**
 * calculates the average Euclidean distance from every point in cluster to p
 * @param p a single point within cluster
 * @param cluster cluster from which the distances from p will be calculated
 */
export const calculateIntraClusterDist1D = (p: GenomicBin, cluster: GenomicBin[]) => {
  let pointOne : [number, number] = [p.BAF, p.RD];
  let dists = [];
  if(cluster.length === 1) {
    return 0;
  }

  for(const bin of cluster) {
    let pointTwo : [number, number] = [bin.BAF, bin.RD];
    const dist = calculateEuclideanDist(pointOne, pointTwo, true);
    if(dist !== 0) {
      dists.push(dist);
    }
  }

  return _.mean(dists)
}


/**
 * calculates the average Euclidean distance from every point in cluster to p
 * @param p a single point within cluster
 * @param cluster cluster from which the distances from p will be calculated
 */
 export const calculateIntraClusterDist2 = (p: number[], cluster: number[][] | Number[][]) => {
  let dists = [];
  if(cluster.length === 1) {
    return 0;
  }

  for(const bin of cluster) {
    const dist = calculateEuclideanDist(p, bin, true);
    if(dist !== 0) {
      dists.push(dist);
    }
  }

  return _.mean(dists)
}

export function distanceMatrix(data : any, distanceFn : any) {
  const result = getMatrix(data.length);

  // Compute upper distance matrix
  for (let i = 0; i < data.length; i++) {
    for (let j = 0; j <= i; j++) {
      const bin1 = [data[i][0], data[i][1]];
      const bin2 = [data[j][0], data[j][1]];
      result[i][j] = distanceFn(bin1, bin2, true);
      result[j][i] = result[i][j];
    }
  }

  return result;
}

function getMatrix(size : number) {
  const matrix = [];
  for (let i = 0; i < size; i++) {
    const row : number[] = [];
    matrix.push(row);
    for (let j = 0; j < size; j++) {
      row.push(0);
    }
  }
  return matrix;
}

export const calculateSilhoutteScores = (rawData: number[][], clusteredData: Map<Number, Number[][]>,  labels: number[]) => {
  let possible_clusters = [...clusteredData.keys()];
  let clusterToSilhoutte = new Map<number, number[] | undefined>();
  if(possible_clusters.length === 1) {
    return [];
  }
  
  const downSamplePercent = (rawData.length > 0) ? .01 : 1;
  for(let i = 0; i < rawData.length; i++) {
      const bin1 = rawData[i];
      const c = labels[i];

      const binsInCluster = clusteredData.get(c);
      if(binsInCluster) {
        if(binsInCluster.length === 1) {
          if(clusterToSilhoutte.has(c)) {
            const previousSilhouttes = clusterToSilhoutte.get(c);
            if(previousSilhouttes) {
              previousSilhouttes.push(0);
              clusterToSilhoutte.set(c, previousSilhouttes);
            }
          } else {
            clusterToSilhoutte.set(c, [0]);
          }

          continue;
        }

        // downsample both bins_in_clust er and bins_not_in_cluster
        const downSampledBinsInCluster = downSample(binsInCluster, downSamplePercent);

        const a = calculateIntraClusterDist2(bin1, downSampledBinsInCluster);
        let minB = Infinity;
        for(let c2 of possible_clusters) {
          if(c2 !== c) {
            const otherCluster = clusteredData.get(c2);
            if(otherCluster) {
              const downSampledOtherCluster = downSample(otherCluster, downSamplePercent);
              const b = calculateInterClusterDist2(bin1, downSampledOtherCluster);
              if(b < minB) {
                minB = b;
              }

            } else {
              throw new Error("Key error: Cluster not found");
            }
          }
        }

        let maxAB = _.max([minB, a]);
        if(maxAB) {
          const s = (minB - a) / maxAB;

          if(clusterToSilhoutte.has(c)) {
            const previousSilhouttes = clusterToSilhoutte.get(c);
            if(previousSilhouttes) {
              previousSilhouttes.push(s);
              clusterToSilhoutte.set(c, previousSilhouttes);
            }
          } else {
            clusterToSilhoutte.set(c, [s]);
          }
        }
      } else {
        throw new Error("Key error: Cluster not found");
      }
  }

  const avg_cluster_silhouttes = [];
  for(const c of possible_clusters) {
    const val = clusterToSilhoutte.get(Number(c));
    if(val !== undefined) {
      const avg = {cluster: Number(c), avg : _.mean(val)};
      avg_cluster_silhouttes.push(avg);
    }
  }

  return avg_cluster_silhouttes;
}



/**
 * Calculate Silhouette Coefficient
 * @param {Array<Array<number>>} data - list of input data samples
 * @param {Array<number>} labels - label values for each sample
 * @returns {number} score - Silhouette Score for input clustering
 */
 export default function silhouetteScore2(data: any, labels : any) {
  /*
	TODO: Check X and Y for consistent length - enforce X to be 2D and Y 1D.
		The length of Y should equal the number of rows in X, which in turn
		should be non-empty and should contain only finite values - no NaN-s
		and Inf-s allowed. The same goes for Y. Check that number of labels
		(number of distinct values in Y) is valid. Valid values are from 2 to
		data.length - 1 (inclusive)".
 	*/
  let dist = distanceMatrix(data, calculateEuclideanDist);
  let result = silhouetteSamples(dist, labels, silhouetteReduce);
  return result.reduce((p : any, c : any, i : any) => p + (c - p) / (i + 1), 0);
}

/**
 * Calculate Silhouette for each data sample
 * @param {Array<Array<number>>} data - list of input data samples
 * @param {Array<number>} labels - label values for each sample
 * @param {Function|Mock} reduceFunction - reduce function to apply on samples
 * @returns {Array<number>} arr - Silhouette Coefficient for each sample
 */
function silhouetteSamples(data : any, labels : any, reduceFunction : any) {
  /*
	TODO: Check X and Y for consistent length - enforce X to be 2D and Y 1D.
		The length of Y should equal the number of rows in X, which in turn
		should be non-empty and should contain only finite values - no NaN-s
		and Inf-s allowed. The same goes for Y. Check that number of labels
		(number of distinct values in Y) is valid. Valid values are from 2 to
		data.length - 1 (inclusive)".
	 */
  let labelsFreq = countBy(labels); // # of points in each cluster
  let samples = reduceFunction(data, labels, labelsFreq);
  let denom = labels.map((val : any) => labelsFreq[val] - 1);
  let intra = samples.intraDist.map((val : any, ind : any) => val / denom[ind]);
  let inter = samples.interDist;
  return inter
    .map((val : any, ind : any) => val - intra[ind])
    .map((val : any, ind : any) => val / Math.max(intra[ind], inter[ind]));
}

/**
 * Count the number of occurrences of each value in array.
 * @param {Array<number>} arr - Array of positive Integer values
 * @return {Array<number>} out - number of occurrences of each value starting from
 * 0 to max(arr).
 */
function countBy(arr : any) {
  let valid = arr.every((val : any) => {
    if (typeof val !== 'number') return false;
    return val >= 0.0 && Math.floor(val) === val && val !== Infinity;
  });
  if (!valid) throw new Error('Array must contain only natural numbers');

  let out = Array.from({ length: Math.max(...arr) + 1 }, () => 0);
  arr.forEach((value : any) => {
    out[value]++;
  });
  return out;
}

function silhouetteReduce(dataChunk : any, labels : any, labelFrequencies : any) {
  // datachunk: # of data points x # of data points in size

  // clusterDistances is # of data points x # of clusters
  // gives distance from each data point to every cluster
  let clusterDistances : number[][] = dataChunk.map((row : any) => {
      let ar = labelFrequencies.map((_ : any, mInd : any) => // mInd represents cluster we are going to run the function on
        {
          let test = labels.reduce(
            (acc : any, val : any, rInd : any) => {
              return (val === mInd ? acc + row[rInd] : acc + 0)
            }, 0
          )
          return test;
        }
      )
      return ar;
    }
  );

  // Each row in clusterDistances represents a bin and its distances to each cluster
  // So we for each bin we get the distance of that bin to the cluster that the bin is a part of
  let intraDist = clusterDistances.map((val : any, ind : any) => val[labels[ind]]);

  let interDist = clusterDistances
    .map((mVal : any, mInd : any) => {
      mVal[labels[mInd]] += Infinity; // don't want to pick the cluster that the current bin is a part of when taking the min so add infinity
      labelFrequencies.forEach((fVal : any, fInd : any) => (mVal[fInd] /= fVal)); // avg distances in the row
      return mVal;
    })
    .map((val : any) => Math.min(...val)); // take the (avg) distance to the closest cluster

  return {
    intraDist: intraDist,
    interDist: interDist,
  };
}

// function xmur3(str : string) {
//   for(var i = 0, h = 1779033703 ^ str.length; i < str.length; i++) {
//       h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
//       h = h << 13 | h >>> 19;
//   }

//   return function() {
//       h = Math.imul(h ^ h >>> 16, 2246822507);
//       h = Math.imul(h ^ h >>> 13, 3266489909);
//       return (h ^= h >>> 16) >>> 0;
//   }
// }

// function mulberry32(a : any) {
//   return function() {
//     var t = a += 0x6D2B79F5;
//     t = Math.imul(t ^ t >>> 15, t | 1);
//     t ^= t + Math.imul(t ^ t >>> 7, t | 61);
//     return ((t ^ t >>> 14) >>> 0) / 4294967296;
//   }
// }

export function downSample<T>(data: T[], percent: number) : T[] {
  let downSampledData = new Set<T>();
  const original_len = data.length;
  const new_len = percent * original_len;
  // var seed = xmur3("testseed");
  while(downSampledData.size < new_len) {
    const rand_idx = Math.floor(Math.random() * original_len);
    // const rand_idx = Math.floor(mulberry32(seed())() * original_len);
    const bin = data[rand_idx];
    downSampledData.add(bin);
  }
  
  return [...downSampledData];
}


/**
MIT License

Copyright (c) 2019 react-csv

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
*/
  /**
 * Simple safari detection based on user agent test
 */
export const isSafari = () => /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

export const isJsons = ((array: any) => Array.isArray(array) && array.every(
 row => (typeof row === 'object' && !(row instanceof Array))
));

export const isArrays = ((array: any) => Array.isArray(array) && array.every(
 row => Array.isArray(row)
));

export const jsonsHeaders = ((array: any) => Array.from(
 array.map((json: any) => Object.keys(json))
 .reduce((a: any, b: any) => new Set([...a, ...b]), [])
));

export const jsons2arrays = (jsons: any, headers: any) => {
  headers = headers || jsonsHeaders(jsons);

  // allow headers to have custom labels, defaulting to having the header data key be the label
  let headerLabels = headers;
  let headerKeys = headers;
  if (isJsons(headers)) {
    headerLabels = headers.map((header: any) => header.label);
    headerKeys = headers.map((header: any) => header.key);
  }

  const data = jsons.map((object: any) => headerKeys.map((header: any) => getHeaderValue(header, object)));
  return [headerLabels, ...data];
};

export const getHeaderValue = (property: any, obj: any) => {
  const foundValue = property
    .replace(/\[([^\]]+)]/g, ".$1")
    .split(".")
    .reduce(function(o: any, p: any, i: any, arr: any) {
      // if at any point the nested keys passed do not exist, splice the array so it doesnt keep reducing
      if (o[p] === undefined) {
        arr.splice(1);
        return null;
      } else {
        return o[p];
      }
    }, obj);
  // if at any point the nested keys passed do not exist then looks for key `property` in object obj
  return (foundValue === undefined) ? ((property in obj) ? obj[property] : '') : foundValue;
}

export const elementOrEmpty = (element : any) => {
  return (typeof element === 'undefined' || element === null) ? '' : element;
};

export const joiner = ((data : any, separator = ',', enclosingCharacter = '') => {
  return data
    .filter((e : any) => e)
    .map(
      (row: any) => row
        .map((element : any) => elementOrEmpty(element))
        .map((column: any) => `${column}`)
        .join(separator)
    )
    .join(`\n`);
});

export const arrays2csv = ((data: any, headers: any, separator: any, enclosingCharacter: any) =>
 joiner(headers ? [headers, ...data] : data, separator, enclosingCharacter)
);

export const jsons2csv = ((data: any, headers: any, separator: any, enclosingCharacter: any) =>
 joiner(jsons2arrays(data, headers), separator, enclosingCharacter)
);

export const string2csv = ((data: any, headers: any, separator: any, enclosingCharacter: any) =>
  (headers) ? `${headers.join(separator)}\n${data}`: data
);

export const toCSV = (data: any, headers: any, separator: any, enclosingCharacter: any) => {
 if (isJsons(data)) return jsons2csv(data, headers, separator, enclosingCharacter);
 if (isArrays(data)) return arrays2csv(data, headers, separator, enclosingCharacter);
 if (typeof data ==='string') return string2csv(data, headers, separator, enclosingCharacter);
 throw new TypeError(`Data should be a "String", "Array of arrays" OR "Array of objects" `);
};

export const buildURI = ((data : any, uFEFF: any, headers: any, separator: any, enclosingCharacter: any) => {
  const csv = toCSV(data, headers, separator, enclosingCharacter);
  const type = isSafari() ? 'application/csv' : 'text/csv';
  const blob = new Blob([uFEFF ? '\uFEFF' : '', csv], {type});
  const dataURI = `data:${type};charset=utf-8,${uFEFF ? '\uFEFF' : ''}${csv}`;

  const URL = window.URL || window2.webkitURL;

  return (typeof URL.createObjectURL === 'undefined')
    ? dataURI
    : URL.createObjectURL(blob);
});






