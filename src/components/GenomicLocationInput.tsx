import React from "react";
import { ChromosomeInterval } from "../model/ChromosomeInterval";

interface Props {
    label: string;
    onNewLocation?: (location: ChromosomeInterval) => void;
}

interface State {
    value: string;
    inputError: boolean;
}

export class GenomicLocationInput extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            value: "",
            inputError: false
        };
        this.handleLocationInputChanged = this.handleLocationInputChanged.bind(this);
        this.handleSetPressed = this.handleSetPressed.bind(this);
    }

    handleLocationInputChanged(event: React.ChangeEvent<HTMLInputElement>) {
        this.setState({value: event.target.value});
    }

    handleSetPressed() {
        if (this.props.onNewLocation) {
            let parsed = null;
            try {
                parsed = ChromosomeInterval.parse(this.state.value);
            } catch (error) {
                this.setState({inputError: true});
                return;
            }
            this.props.onNewLocation(parsed);
            this.setState({inputError: false});
        }
    }

    render() {
        const {value, inputError} = this.state;
        return <div>
            {this.props.label}<input
                type="text"
                size={30}
                value={value}
                onChange={this.handleLocationInputChanged} />
            <button onClick={this.handleSetPressed}>Set</button>
            {inputError && <span style={{color: "red", marginLeft: 5}}>Enter a valid region</span>}
        </div>;
    }
}
