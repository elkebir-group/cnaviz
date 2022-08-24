import "./Toolbox.css";
import React from "react";
import {FiArrowLeftCircle, FiArrowRightCircle, FiZoomIn, FiUpload, FiDownload} from "react-icons/fi";
import {IoHandRight} from "react-icons/io5"
import {BiEraser, BiMessageSquareAdd} from "react-icons/bi";
import _ from "lodash";
import { DisplayMode } from "../App";

interface Props {
    currentDisplayMode: DisplayMode;
    setDisplayMode: (mode: DisplayMode) => void;
}

export class Toolbox extends React.Component<Props> {

    render () {
        return <div className="Toolbox">
            <div>Modes:</div>
            <Tool 
                iconElement={<FiZoomIn color={this.props.currentDisplayMode === DisplayMode.boxzoom ? "red" : "black"} />}
                label="Zoom"
		        label2="(z)"
                onClick={() => this.props.setDisplayMode(DisplayMode.boxzoom)}
            />
            <Tool 
                iconElement={<IoHandRight color={this.props.currentDisplayMode === DisplayMode.zoom ? "red" : "black"} />}
                label="Pan"
		        label2="(p)"
                onClick={() => this.props.setDisplayMode(DisplayMode.zoom)}
            />
            <Tool 
                iconElement={<BiMessageSquareAdd color={this.props.currentDisplayMode === DisplayMode.select ? "red" : "black"} />}
                label="Select"
                label2="(b)"
		onClick={() => this.props.setDisplayMode(DisplayMode.select)}
            />
            <Tool 
                iconElement={<BiEraser color={this.props.currentDisplayMode === DisplayMode.erase ? "red" : "black"} />}
                label="Deselect"
		label2="(d)"
                onClick={() => this.props.setDisplayMode(DisplayMode.erase)}
            />
        </div>
    }
}  


interface ToolProps {
    iconElement: JSX.Element,
    label: string,
    label2: string,
    onClick: () => void
}

class Tool extends React.Component<ToolProps> {
    render() {
        return <div className="Toolbox-Tool" title={this.props.label} onClick={this.props.onClick}>
            {this.props.iconElement}
            <div className="Toolbox-Tool-label">{this.props.label}</div>
	    <div className="Toolbox-Tool-label2">{this.props.label2}</div>
        </div>
    }
}
