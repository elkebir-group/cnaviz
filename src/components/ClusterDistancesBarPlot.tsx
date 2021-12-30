import React from "react"
import * as d3 from "d3";
import "./BarPlot.css";
import _ from "lodash"

const margins = {top: 0, right: 0, bottom: 0, left: 0};
const margin = { left: 10, top: 0, right: 0, bottom: 50};
const UNCLUSTERED_COLOR = "#999999";

type clusterAvg = {
    cluster: number,
    avg: number
};

interface Props {
    data: Map<number, number> | undefined;
    width: number;
    height: number;
    colors: string[];
    selectedCluster: number;
}


export class ClusterDistancesBarPlot extends React.Component<Props> {

    private _svg: SVGSVGElement | null;

    constructor(props: Props) {
        super(props);
        this._svg = null;
    }

    shouldComponentUpdate(nextProps: Props) {
        return true;
    }

    componentDidUpdate(prevProps: Props) {
        if(this.propsDidChange(prevProps, ["selectedCluster"])) {
            this.redraw();
        }
    }

    propsDidChange(prevProps: Props, keys: (keyof Props)[]) {
        return keys.some(key => this.props[key] !== prevProps[key]);
    }

    componentDidMount() { 
        this.redraw();
    }

    render() {
        const {width, height} = this.props;
        const marginRatio = {
            left: margins.left / width * 100 + "%",//getRatio('left'),
            top: margins.top / width * 100 + "%",
            right: margins.right / width * 100 + "%",
            bottom: margins.bottom / width * 100 + "%"
        }
        return (
            <div id="chart-container2">
                <svg 
                    ref={node => this._svg = node}
                    style={{padding: marginRatio.top + ' ' + marginRatio.right + ' ' + marginRatio.bottom + ' ' + marginRatio.left + ' '}}
                    preserveAspectRatio="xMinYMin meet"
                    viewBox={'0 0 ' + (width + margin.left + margin.right) + ' ' + (height + margin.top + margin.bottom)}
                    
                ></svg>
            </div>
        )
    }

    redraw() {
        const {width, height, data, colors} = this.props;

        if(!this._svg) {
            return;
        }

        let dataObjectArr : any[] = [];
        if(data !== undefined) {
            dataObjectArr = Array.from(data, function (item) {
                return { key: item[0], value: item[1] }
            });          
        }
        
        dataObjectArr = _.sortBy(dataObjectArr, "value");
        const marginRatio = {
            left: margins.left / width * 100 + "%",
            top: margins.top / width * 100 + "%",
            right: margins.right / width * 100 + "%",
            bottom: margins.bottom / width * 100 + "%"
        }

        var svg = d3.select(this._svg)
        svg.selectAll(".scales").remove();

        // Add X axis
        let max = _.maxBy(dataObjectArr, "value");
        
        var x = d3.scaleLinear()
        .domain([0,  (max) ? max.value : 1])
        .range([30, width-10]);


        svg.append("text")
            .classed("scales", true)
            .attr("text-anchor", "middle")
            .attr("font-size", 14)
            .attr("x", _.mean([0, width]))
            .attr("y", height + 40)
            .text("Approximate Average Euclidean Distance");

        svg.append("g")
            .classed("scales", true)
            .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom(x))
            .selectAll("text")
                .attr("transform", "translate(-10,0)rotate(-45)")
                .style("text-anchor", "end");

        // Y axis
        var y = d3.scaleBand()
            .range([ 0, height])
            .domain(dataObjectArr.map(d => String(d.key)))
            .padding(.1);
        

        // Bars
        svg.selectAll(".bar").remove();
        svg.selectAll("myRect")
            .classed("bars", true)
            .data(dataObjectArr)
            .enter()
            .append("rect")
            .attr("class", function(d) { return "bar bar--" + (d.value < 0 ? "negative" : "positive"); })
            .attr("x", function(d) { return x(Math.min(0, d.value)) || 0; })
            .attr("y", function(d) { return y(String(d.key)) || 0; })
            .attr("width", function(d) { return Math.abs((x(d.value) || 0) - (x(0) || 0)); })
            .attr("height", y.bandwidth())
            .attr("fill", row => (row.key === -1) ? UNCLUSTERED_COLOR : colors[row.key % colors.length]);
            
        svg.append("g")
            .classed("scales", true)
            .call(d3.axisLeft(y).tickSize(0).tickPadding(6))
            .attr("transform", "translate(" + x.range()[0] + ",0)")
    }
 }
