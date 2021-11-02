import React from "react";
import * as d3 from "d3";
// @ts-ignore: Unreachable code error
import * as fc from "d3fc";
import _ from "lodash";

const PADDING = { // For the SVG
    left: 60,
    right: 20,
    top: 35,
    bottom: 60,
};

interface Props {
    width: number;
    height: number;
    data: {cluster1: number, cluster2: number, dist: number}[];
}

export class HeatMap extends React.Component<Props> {

    static defaultProps = {
    }

    private _svg: SVGSVGElement | null;

    constructor(props: Props) {
        super(props); 
        this._svg = null;
    }

    render() {
        const {width, height} = this.props;
        return <svg
            ref={node => this._svg = node}
            width={width + 30 + 30} height={height + 30 + 30}
            style={{zIndex: 100}}
        ></svg>
    }

    componentDidMount() { 
        this.redraw();
    }

    propsDidChange(prevProps: Props, keys: (keyof Props)[]) {
        return keys.some(key => this.props[key] !== prevProps[key]);
    }

    componentDidUpdate(prevProps: Props) {

    }

    redraw() {
        if (!this._svg) {
            return;
        }
        
        const {width, height, data} = this.props;
        const svg = d3.select(this._svg).append("g")
            .attr("transform", "translate(" + 30 + "," + 30 + ")");;

        var clusters = data.flatMap(d => d.cluster1);
        let distRange : [number, number] = [_.minBy(data, "dist")!.dist, _.maxBy(data, "dist")!.dist];

        svg.selectAll(".scales").remove();
        var x = d3.scaleBand<number>()
            .range([0, width])
            .domain(clusters).padding(0.01);;
        svg.append("g")
            .attr("transform", `translate(0, ${height})`)
            .call(d3.axisBottom(x))

        var y = d3.scaleBand<number>()
            .range([height, 0])
            .domain(clusters).padding(0.01);

        svg.append("g")
            .call(d3.axisLeft(y));

        var myColor = d3.scaleSequential()
            .interpolator( d3.interpolateRdYlBu)
            .domain([distRange[1], distRange[0]])
        
        // create a tooltip
        var tooltip = svg
            .append("div")
            .style("opacity", 0)
            .attr("class", "tooltip")
            .style("background-color", "white")
            .style("border", "solid")
            .style("border-width", "2px")
            .style("border-radius", "5px")
            .style("padding", "5px")


        svg.selectAll()
            .data(data)
            .enter()
                .append("rect")
                .attr("x", function(d : any) { return x(d.cluster1) || 0})
                .attr("y", function(d : any) { return y(d.cluster2) || 0 })
                .attr("width", x.bandwidth() )
                .attr("height", y.bandwidth() )
                .style("fill", function(d : any) { return myColor(d.dist) || "white"} )
    }


    
}