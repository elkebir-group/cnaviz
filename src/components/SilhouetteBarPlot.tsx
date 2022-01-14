import React from "react"
import * as d3 from "d3";
import "./BarPlot.css";
import _ from "lodash";

const margins = {top: 0, right: 0, bottom: 0, left: 0};
const margin = { left: 0, top: 0, right: 0, bottom: 50};
const UNCLUSTERED_COLOR = "#999999";

export type clusterAvg = {
    cluster: number,
    avg: number
};

interface Props {
    data: clusterAvg[];
    avgClusterSilhouette: number;
    width: number;
    height: number;
    colors: string[];
}

interface State {
    showTooltip: boolean;
    tooltipX: number;
    tooltipY: number;
}

export class SilhouetteBarPlot extends React.Component<Props, State> {

    private _svg: SVGSVGElement | null;

    constructor(props: Props) {
        super(props);
        this.state = {
            showTooltip: false,
            tooltipX: 0,
            tooltipY: 0
        }
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

    renderTooltipContent(contents: JSX.Element | null) {
        const {width, height} = this.props;
        const {showTooltip, tooltipX, tooltipY} = this.state;
        if (!contents) {
            return null;
        }

        if(!showTooltip) {
            return null;
        }

        const x = tooltipX;
        const y = tooltipY;
        const OFFSET = 0;
        const OFFSETY = 30;
        return <div
            className="Scatterplot-tooltip"
            style={{
                position: "absolute",
                top: "90%",
                left: "1%",
                pointerEvents: "none"
            }}
        >
            {contents}
        </div>;
    }
    
    renderTooltip() {
        return this.renderTooltipContent(<React.Fragment><div>Note: The Silhouette coefficient ranges from -1 to 1 where the larger the number the more tightly grouped the cluster </div></React.Fragment>)
    }

    render() {
        return (
            <div id="chart-container">
                {this.renderTooltip()}
            </div>
        )
    }

    redraw() {
        const {width, height, data, colors} = this.props;
        let sortedData = _.sortBy(data, "avg");
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

        svg.append("text")
            .classed("scale", true)
            .attr("text-anchor", "middle")
            .attr("font-size", 20)
            .attr("x", _.mean([15, width-10]))
            .attr("y", height + 40)
            .text("Approximate Average Silhouette Coefficient")
            .on("mouseover", () => {
                this.setState({showTooltip: true});
                this.setState({tooltipX: d3.event.offsetX, tooltipY: d3.event.offsetY});
            })
            .on("mouseleave", () => {
                this.setState({showTooltip: false});
            });

        svg.append("g")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom(x))
            .selectAll("text")
                .attr("transform", "translate(-10,0)rotate(-45)")
                .style("text-anchor", "end")

        // Y axis
        var y = d3.scaleBand()
            .range([ 0, height])
            .domain(sortedData.map(d => String(d.cluster)))
            .padding(.1);
        

        //Bars
        svg.selectAll("myRect")
            .data(sortedData)
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
