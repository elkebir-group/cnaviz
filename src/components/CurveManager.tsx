import React from "react";
import _ from "lodash";
import { CurveState, CurvePickStatus, INITIAL_CURVE_STATE } from "../model/CurveState";

interface Props {
    curveState: CurveState;
    onNewCurveState: (newState: Partial<CurveState>) => void;
}

interface State {
    rdInputValue: number;
    bafInputValue: number;
}

export class CurveManager extends React.Component<Props, State> {
    static defaultProps = {
        onNewCurveState: _.noop
    };

    private _rdInput: HTMLInputElement | null;
    private _bafInput: HTMLInputElement | null;

    constructor(props: Props) {
        super(props);
        this._rdInput = null;
        this._bafInput = null;

        this.toggleCurveDrawing = this.toggleCurveDrawing.bind(this);
        this.handleNormalStateSet = this.handleNormalStateSet.bind(this);
        this.enableSetNormalState = this.enableSetNormalState.bind(this);
    }

    toggleCurveDrawing() {
        const {curveState, onNewCurveState} = this.props;
        if (curveState.pickStatus === CurvePickStatus.none) {
            onNewCurveState({pickStatus: CurvePickStatus.pickingState1});
        } else { // Any other state than the initial one: reset to the initial
            onNewCurveState(INITIAL_CURVE_STATE);
        }
    }

    handleNormalStateSet() {
        let parsedRd = Number(this._rdInput!.value);
        let parsedBaf = Number(this._bafInput!.value);
        if (!Number.isFinite(parsedRd)) {
            parsedRd = INITIAL_CURVE_STATE.normalLocation.rd;
        }

        if (!Number.isFinite(parsedBaf)) {
            parsedBaf = INITIAL_CURVE_STATE.normalLocation.baf;
        }

        this.props.onNewCurveState({
            pickStatus: CurvePickStatus.pickingState1,
            normalLocation: {
                rd: parsedRd,
                baf: parsedBaf,
            }
        });
    }

    enableSetNormalState() {
        this.props.onNewCurveState({pickStatus: CurvePickStatus.pickingNormalLocation});
    }

    render() {
        const curveState = this.props.curveState;
        return <div>
            {curveState.pickStatus === CurvePickStatus.none ? 
                <button onClick={this.toggleCurveDrawing}>
                    Draw curve <i className="fas fa-pencil-alt" />
                </button>
                :
                <button onClick={this.toggleCurveDrawing}>
                    Clear curve <i className="fas fa-times" />
                </button>
            }
            {curveState.pickStatus === CurvePickStatus.pickingNormalLocation ?
                <div>
                    <div>
                        Location for 1|1 state: <button onClick={this.handleNormalStateSet}>Set</button>
                    </div>
                    RD <input
                        type="number"
                        ref={input => this._rdInput = input}
                        style={{marginRight: 20}}
                        defaultValue={String(curveState.normalLocation.rd)} 
                        min={-8} max={8} step={0.1} />
                    BAF <input
                        type="number"
                        ref={input => this._bafInput = input}
                        defaultValue={String(curveState.normalLocation.baf)}
                        min={0.05} max={1} step={0.05} />
                </div>
                :
                <button onClick={this.enableSetNormalState} >Set location for 1|1 state</button>
            }
        </div>
    }
}
