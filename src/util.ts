export interface Coordinate {
    x: number;
    y: number;
}

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
