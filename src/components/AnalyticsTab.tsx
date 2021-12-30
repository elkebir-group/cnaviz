import React from "react";
import {clusterAvg} from "./SilhouetteBarPlot";
import { SilhouetteBarPlot } from "./SilhouetteBarPlot";
import {FiX} from "react-icons/fi";
import {ClusterDistancesBarPlot} from "./ClusterDistancesBarPlot";
import "./AnalyticsTab.css"

const UNCLUSTERED_ID = "-1";
const DELETED_ID = "-2";

interface Props {
    silhoutteData: clusterAvg[],
    clusterDistances: Map<number, Map<number, number>>,
    clusterTableData: any,
    colors: string[],
    onToggleSilhoutteBarPlot: () => void;
}

interface State {
    selectedCluster: string;
}

export class AnalyticsTab extends React.Component<Props, State> {
    private _clusters : string[];
    constructor(props: Props) {
        super(props);
        this._clusters = this.initializeListOfClusters(); 
        this.state = {
            selectedCluster: this._clusters[0]
        }
         

    }

    initializeListOfClusters() : string[] {
        let clusterTableData : any = this.props.clusterTableData;

        this._clusters = [];
        for(const obj of clusterTableData) {
            this._clusters.push(obj.key);
        }

        while(this._clusters.length > 0 
            && (Number(this._clusters[0]) === Number(UNCLUSTERED_ID)
            || Number(this._clusters[0]) === Number(DELETED_ID))) {
            this._clusters.shift();
        }
        
        return this._clusters;
    }

    componentDidUpdate(prevProps: Props) {
        if(this.props.clusterTableData !== prevProps.clusterTableData) {
            this.initializeListOfClusters();
        }
    }
    
    render() {
        const {silhoutteData, clusterDistances, colors} = this.props;
        
        let clusterOptions = this._clusters.map((clusterName) =>
            <option key={clusterName} value={clusterName} >{clusterName}</option>
        );

        return <div className="Directions2">
            <h2 className="pop-up-window-header"> Cluster Analytics </h2>
            <div className="Exit-Popup" onClick={this.props.onToggleSilhoutteBarPlot}> 
                <FiX/>
            </div>
            <div className="BarPlots">
                <SilhouetteBarPlot
                    width={700}
                    height={360}
                    data={silhoutteData}
                    colors={colors}
                ></SilhouetteBarPlot> 
                <span > Cluster: </span>
                <select
                    name="Select Cluster" 
                    title="Cluster"
                    className="Sampleviz-cluster-select"
                    value={this.state.selectedCluster}
                    onChange={(event: React.ChangeEvent<HTMLSelectElement>) => {this.setState({selectedCluster: event.target.value})}} >
                    {clusterOptions}
                </select>
                <ClusterDistancesBarPlot
                    data={clusterDistances.get(Number(this.state.selectedCluster))}
                    selectedCluster={Number(this.state.selectedCluster)}
                    width={700}
                    height={360}
                    colors={colors}
                ></ClusterDistancesBarPlot>
            </div>
        </div>
    }
}