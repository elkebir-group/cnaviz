import React, { Component } from "react";
import { DisplayMode } from "../App";

import "./toggleButton.css";

interface Props {
    displayMode : DisplayMode;
    setDisplayMode : () => void;
}

export class ToggleButton extends Component<Props> {
  constructor(props : Props) {
    super(props);
    this.state = {};
  }

  render() {
    const { displayMode, setDisplayMode } = this.props;
    return (
      <div className="toggle-container" onClick={setDisplayMode}>
        <div className={`dialog-button ${displayMode == DisplayMode.select ? "" : "disabled"}`}>
          {displayMode==DisplayMode.select ? "Select" : "Zoom"}
        </div>
      </div>
    );
  }
}