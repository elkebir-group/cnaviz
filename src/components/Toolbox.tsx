import "./Toolbar.css";
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
            <div>Tools</div>
            <Tool 
                iconElement={<FiZoomIn color={this.props.currentDisplayMode === DisplayMode.boxzoom ? "red" : "black"} />}
                label="Zoom"
                onClick={() => this.props.setDisplayMode(DisplayMode.boxzoom)}
            />
            <Tool 
                iconElement={<IoHandRight color={this.props.currentDisplayMode === DisplayMode.zoom ? "red" : "black"} />}
                label="Pan"
                onClick={() => this.props.setDisplayMode(DisplayMode.zoom)}
            />
            <Tool 
                iconElement={<BiMessageSquareAdd color={this.props.currentDisplayMode === DisplayMode.select ? "red" : "black"} />}
                label="Select"
                onClick={() => this.props.setDisplayMode(DisplayMode.select)}
            />
            <Tool 
                iconElement={<BiEraser color={this.props.currentDisplayMode === DisplayMode.erase ? "red" : "black"} />}
                label="Erase"
                onClick={() => this.props.setDisplayMode(DisplayMode.erase)}
            />
        </div>
    }
}  


interface ToolProps {
    iconElement: JSX.Element,
    label: string,
    onClick: () => void
}

class Tool extends React.Component<ToolProps> {
    render() {
        return <div className="Toolbox-Tool" onClick={this.props.onClick}>
            {this.props.iconElement}
            <div className="Toolbox-Tool-label">{this.props.label}</div>
        </div>
    }
}
