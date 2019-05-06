import React from 'react';
import './DivWithBullseye.css';

interface Coordinate {
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
function getRelativeCoordinates(event: React.MouseEvent, relativeTo?: Element): Coordinate {
    if (!relativeTo) {
        relativeTo = event.currentTarget as Element;
    }
    const targetBoundingRect = relativeTo.getBoundingClientRect();
    return {
        x: event.clientX - targetBoundingRect.left,
        y: event.clientY - targetBoundingRect.top
    };
}

interface State {
    mouseCoordinates: Coordinate | null;
}

/**
 * Like a <div> in every way, except it has "bullseye", dotted lines that track where the mouse is.
 * 
 * @author Silas Hsu
 */
export class DivWithBullseye extends React.Component<React.HTMLAttributes<HTMLDivElement>, State> {
    constructor(props: React.HTMLAttributes<HTMLDivElement>) {
        super(props);
        this.state = {
            mouseCoordinates: null
        };

        this.storeMouseCoordinates = this.storeMouseCoordinates.bind(this);
        this.clearMouseCoordinates = this.clearMouseCoordinates.bind(this);
    }

    /**
     * Stores a mouse event's coordinates in state.
     * 
     * @param {MouseEvent} event - mousemove event whose coordinates to store
     */
    storeMouseCoordinates(event: React.MouseEvent<HTMLDivElement>) {
        this.setState({mouseCoordinates: getRelativeCoordinates(event)});
        if (this.props.onMouseMove) {
            this.props.onMouseMove(event);
        }
    }

    /**
     * Clears stored mouse event coordinates.
     * 
     * @param {MouseEvent} event - mouseleave event that triggered this callback
     */
    clearMouseCoordinates(event: React.MouseEvent<HTMLDivElement>) {
        this.setState({mouseCoordinates: null});
        if (this.props.onMouseLeave) {
            this.props.onMouseLeave(event);
        }
    }

    /**
     * @inheritdoc
     */
    render() {
        const {onMouseMove, onMouseLeave, style, children, ...otherProps} = this.props;
        // Default `position: relative` so the bullseye looks right
        const mergedStyle = Object.assign({position: 'relative'}, style);
        return (
        <div
            onMouseMove={this.storeMouseCoordinates}
            onMouseLeave={this.clearMouseCoordinates}
            style={mergedStyle}
            {...otherProps}
        >
            {children}
            {this.state.mouseCoordinates && <Bullseye where={this.state.mouseCoordinates} />}
        </div>
        );
    }
}

/**
 * The actual intersecting lines that form the bullseye.  Uses prop `where`, an object with props `x` and `y`.
 * 
 * @param {Object} props - props as specified by React
 * @return {JSX.Element} - element to render
 */
function Bullseye(props: {where: Coordinate}) {
    const {x, y} = props.where;
    const horizontalLineStyle = {
        top: y - 1,
        willChange: "top",
    };
    const verticalLineStyle = {
        left: x - 1,
        willChange: "left",
    };
    return (
        <React.Fragment>
            <div className="Bullseye-horizontal-line" style={horizontalLineStyle} />
            <div className="Bullseye-vertical-line" style={verticalLineStyle} />
        </React.Fragment>
    );
}
