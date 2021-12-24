import React from "react"
import * as d3 from "d3";

var margins = {top: 20, right: 30, bottom: 40, left: 90};

type clusterAvg = {
    cluster: number,
    avg: number
};

interface Props {
    data: clusterAvg[];
    width: number;
    height: number;
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
            console.log("Component updated");
            this.redraw();
        }
    }

    propsDidChange(prevProps: Props, keys: (keyof Props)[]) {
        return keys.some(key => this.props[key] !== prevProps[key]);
    }


    componentDidMount() { 
        console.log("Remounting");
        this.redraw();
    }

    render() {
        const {width, height} = this.props;
        return (
            <div>
                <svg 
                    ref={node => this._svg = node}
                    width={width + margins.left + margins.right} 
                    height={height + margins.top + margins.bottom}
                ></svg>
            </div>)
    }

    redraw() {
        const {width, height, data} = this.props;
        if(this._svg == null) {
            return;
        }

        var svg = d3.select(this._svg);
        
        // Add X axis
        var x = d3.scaleLinear()
        .domain([-1, 1])
        .range([0, width]);

        svg.append("g")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom(x))
            .selectAll("text")
                .attr("transform", "translate(-10,0)rotate(-45)")
                .style("text-anchor", "end");

        // Y axis
        var y = d3.scaleBand()
            .range([ 0, height ])
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
            .attr("fill", "#69b3a2");
            // .attr("x", x(0) || 0 )
            // .attr("y", d => y(String(d.cluster)) || 0)
            // .attr("width",d => x(d.avg) || 0)
            // .attr("height", y.bandwidth() )
            
        svg.append("g")
            .call(d3.axisLeft(y).tickSize(0).tickPadding(6))
            .attr("transform", "translate(" + x(0) + ",0)")
    }
 }
