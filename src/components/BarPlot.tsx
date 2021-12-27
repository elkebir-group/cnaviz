import React from "react"
import * as d3 from "d3";
import "./BarPlot.css";

// const margins = {top: 10, right: 40, bottom: 40, left: 40};
const margins = {top: 0, right: 0, bottom: 0, left: 0};
// const margin = { left: 100, top: 50, right: 50, bottom: 30 };
const margin = { left: 0, top: 0, right: 0, bottom: 30};
const UNCLUSTERED_COLOR = "#999999";

type clusterAvg = {
    cluster: number,
    avg: number
};

interface Props {
    data: clusterAvg[];
    width: number;
    height: number;
    colors: string[];
}


export class BarPlot extends React.Component<Props> {

    private _svg: SVGSVGElement | null;

    constructor(props: Props) {
        super(props);
        this._svg = null;
    }

    shouldComponentUpdate(nextProps: Props) {
        return true;
    }

    componentDidUpdate(prevProps: Props) {
        if(this.propsDidChange(prevProps, [])) {
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
        return (
            <div id="chart-container">
            </div>
        )
    }

    redraw() {
        const {width, height, data, colors} = this.props;

        const marginRatio = {
            left: margins.left / width * 100 + "%",//getRatio('left'),
            top: margins.top / width * 100 + "%",
            right: margins.right / width * 100 + "%",
            bottom: margins.bottom / width * 100 + "%"
        }

        var svg = d3.select('div#chart-container')
            .append('svg')
            .style(
                'padding',
                    marginRatio.top +
                    ' ' +
                    marginRatio.right +
                    ' ' +
                    marginRatio.bottom +
                    ' ' +
                    marginRatio.left +
                    ' '
            )
        .attr('preserveAspectRatio', 'xMinYMin meet')
        .attr(
          'viewBox',
          '0 0 ' +
            (width + margin.left + margin.right) +
            ' ' +
            (height + margin.top + margin.bottom)
        )

       
        // Add X axis
        var x = d3.scaleLinear()
        .domain([-1, 1])
        .range([15, width-10]);

        svg.append("g")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom(x))
            .selectAll("text")
                .attr("transform", "translate(-10,0)rotate(-45)")
                .style("text-anchor", "end");

        // Y axis
        var y = d3.scaleBand()
            .range([ 0, height])
            .domain(data.map(d => String(d.cluster)))
            .padding(.1);
        

        //Bars
        svg.selectAll("myRect")
            .data(data)
            .enter()
            .append("rect")
            .attr("class", function(d) { return "bar bar--" + (d.avg < 0 ? "negative" : "positive"); })
            .attr("x", function(d) { return x(Math.min(0, d.avg)) || 0; })
            .attr("y", function(d) { return y(String(d.cluster)) || 0; })
            .attr("width", function(d) { return Math.abs((x(d.avg) || 0) - (x(0) || 0)); })
            .attr("height", y.bandwidth())
            .attr("fill", row => (row.cluster === -1) ? UNCLUSTERED_COLOR : colors[row.cluster % colors.length]);
            
        svg.append("g")
            .call(d3.axisLeft(y).tickSize(0).tickPadding(6))
            .attr("transform", "translate(" + x(0) + ",0)")
    }
 }