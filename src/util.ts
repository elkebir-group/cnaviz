import * as d3 from "d3";

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

export function calculateEuclideanDist(pointOne: [number | string, number | string], pointTwo: [number | string, number | string]) : number {
  const xDiff = Number(pointOne[0]) - Number(pointTwo[0]);
  const yDiff = Number(pointOne[1]) - Number(pointTwo[1]);
  return xDiff * xDiff + yDiff * yDiff;
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
    //console.log("COLOR: ",color);
    let col = d3.color(color);
    if(col !== null) {  
        const { r, g, b, opacity } = col.rgb();
        //if(color !== "blue")
            //return [r / 255, g / 255, b / 255, 0.5];
        return [r / 255, g / 255, b / 255, opacity];
    }

    return;
}

export const iterateElements = (selector : any, fn : any) =>
  [].forEach.call(document.querySelectorAll(selector), fn);



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
  //console.log(csv);
  const type = isSafari() ? 'application/csv' : 'text/csv';
  const blob = new Blob([uFEFF ? '\uFEFF' : '', csv], {type});
  const dataURI = `data:${type};charset=utf-8,${uFEFF ? '\uFEFF' : ''}${csv}`;

  const URL = window.URL || window2.webkitURL;

  return (typeof URL.createObjectURL === 'undefined')
    ? dataURI
    : URL.createObjectURL(blob);
});