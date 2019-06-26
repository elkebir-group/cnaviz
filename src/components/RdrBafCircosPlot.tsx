import React from "react";
import Circos from "circos";
import * as d3 from "d3";
import _ from "lodash";

import { Genome } from "../model/Genome";
import { ChrIndexedBins } from "../model/BinIndex";
import { OpenInterval } from "../model/OpenInterval";
import { ChromosomeInterval } from "../model/ChromosomeInterval";
import { sampleWithEqualSpacing, niceBpCount } from "../util";

const SIZE = 800;
const INNER_RADIUS = 300;
const MAX_RECORDS = 7500;
const RDR_COLOR = "blue";
const BAF_COLOR = "red";

const CONFIG: Circos.LayoutConfig = {
    innerRadius: INNER_RADIUS,
    outerRadius: 315,
    labels: {
        radialOffset: 2,
        size: 10,
        position: "center",
    },
    ticks: {
        display: true,
        color: "grey",
        spacing: 10000000,
        labelSpacing: 10,
        labelSuffix: "Mb",
        labelDenominator: 1000000,
        labelDisplay0: true,
        labelColor: "black",
        majorSpacing: 5,
        size: {
            minor: 2,
            major: 5,
        }
    },
};
const CONFIG_NO_DISPLAY: Circos.LayoutConfig = {
    innerRadius: 300,
    outerRadius: 315,
    labels: {
        display: false
    },
    ticks: {
        display: false
    }
};

interface Props {
    data: ChrIndexedBins;
    genome: Genome;
    chr?: string;
    hoveredLocation?: ChromosomeInterval;
    rdRange: [number, number];
    onLocationHovered: (location: ChromosomeInterval | null) => void;
}

export class RdrBafCircosPlot extends React.PureComponent<Props> {
    static defaultProps = {
        onLocationHovered: _.noop
    };
    static nextId = 0;

    private _mainContainer: HTMLDivElement | null;
    private _highlightContainer: HTMLDivElement | null;
    private _hoverMapContainer: HTMLDivElement | null;
    private _idSuffix: number;

    constructor(props: Props) {
        super(props);
        this._mainContainer = null;
        this._highlightContainer = null;
        this._hoverMapContainer = null;
        this._idSuffix = RdrBafCircosPlot.nextId;
        RdrBafCircosPlot.nextId++;
    }

    componentDidMount() {
        this.drawCircos();
        this.drawHoverMap();
    }

    componentDidUpdate(prevProps: Props) {
        if (this.props.data !== prevProps.data) {
            this.drawCircos();
        } else if (this.props.hoveredLocation !== prevProps.hoveredLocation) {
            this.drawHighlight();
        }

        if (this.props.chr !== prevProps.chr) {
            this.drawHoverMap();
        }
    }

    render() {
        return <div style={{position: "relative"}}>
            {this.props.hoveredLocation && this.renderLocationDetails(this.props.hoveredLocation)}
            <div ref={node => this._highlightContainer = node} style={{position: "absolute"}} />
            <div ref={node => this._mainContainer = node} style={{position: "absolute"}} />
            <div ref={node => this._hoverMapContainer = node} style={{position: "absolute"}} />
        </div>;
    }

    renderLocationDetails(location: ChromosomeInterval): JSX.Element {
        const records = this.props.data.findOverlappingRecords(location);

        let contents: JSX.Element;
        if (records.length === 0) {
            contents = <div style={{color: "grey"}}>No data</div>;
        } else {
            const meanRd = _.meanBy(records, "averageRd");
            const meanBaf = _.meanBy(records, "averageBaf");
            contents = <React.Fragment>
                <div style={{color: RDR_COLOR}}>Average RDR: {meanRd.toFixed(2)}</div>
                <div style={{color: BAF_COLOR}}>Average BAF: {meanBaf.toFixed(2)}</div>
            </React.Fragment>;
        }
        return <div className="flex-center" style={{position: "absolute", width: SIZE, height: SIZE}}>
            <p>
                {location.toString()}<br/>
                ({niceBpCount(location.getLength())})
            </p>
            {contents}
        </div>;
    }

    makeId(baseName: string): string {
        return baseName + this._idSuffix;
    }

    _replaceSubContainer(mainContainer: HTMLDivElement): HTMLDivElement {
        if (mainContainer.firstChild) {
            mainContainer.firstChild.remove();
        }
        const subContainer = document.createElement("div");
        mainContainer.append(subContainer);
        return subContainer;
    }

    _convertGenomeToCircosLayout(genome: Genome, chrFilter?: string): Circos.LayoutRegion[] {
        const colorScale = d3.scaleOrdinal(d3.schemeDark2);
        const layout: Circos.LayoutRegion[] = [];
        for (const chr of genome.getChromosomeList()) {
            if (chrFilter && chr.name !== chrFilter) {
                continue;
            }
            layout.push({
                id: chr.name,
                label: chr.name.substr(3),
                len: chr.length,
                color: colorScale(chr.name)
            });
        }
        return layout;
    }

    makeLaidOutCircos(container: HTMLDivElement, isDisplayLayout=true): Circos {
        const { genome, chr } = this.props;
        const circos = new Circos({
            container: container,
            width: SIZE,
            height: SIZE
        });
        const layoutConfig = isDisplayLayout ? CONFIG : CONFIG_NO_DISPLAY;
        circos.layout(this._convertGenomeToCircosLayout(genome, chr), layoutConfig);
        return circos;
    }

    drawCircos() {
        if (!this._mainContainer) {
            return;
        }

        // Convert to circos-readable format
        const records = this.props.data.getRecords();
        const {rdRange} = this.props;

        let rdData: Circos.PointDatum[] = [];
        let bafData: Circos.PointDatum[] = [];
        for (const record of records) {
            const blockAndPosition = {
                block_id: record["#CHR"],
                position: record.START
            };
            rdData.push({...blockAndPosition, value: record.RD});
            bafData.push({...blockAndPosition, value: record.BAF});
        }
        rdData = sampleWithEqualSpacing(rdData, MAX_RECORDS);
        bafData = sampleWithEqualSpacing(bafData, MAX_RECORDS);

        // Configure Circos
        const circos = this.makeLaidOutCircos(this._replaceSubContainer(this._mainContainer));

        circos.scatter(
            this.makeId("rdr"), rdData, {
                innerRadius: 0.85,
                outerRadius: 1,
                min: rdRange[0],
                max: rdRange[1],
                strokeWidth: 0,
                size: 3,
                color: RDR_COLOR,
                axes: [{color: "black", position: rdRange[0]}, {color: "black", position: rdRange[1]}]
            }
        );
        circos.scatter(
            this.makeId("baf"), bafData, {
                innerRadius: 0.70,
                outerRadius: 0.85,
                min: 0,
                max: 0.5,
                strokeWidth: 0,
                size: 3,
                color: BAF_COLOR,
                axes: [{color: "black", position: 0}, {color: "black", position: 0.5}]
            }
        );

        this.drawHighlight();
        circos.render();
    }

    drawHighlight() {
        if (!this._highlightContainer) {
            return;
        }

        const subContainer = this._replaceSubContainer(this._highlightContainer);

        const hoveredLocation = this.props.hoveredLocation;
        if (!hoveredLocation) {
            subContainer.remove();
            return;
        }

        const data: Circos.IntervalDatum[] = [{
            block_id: hoveredLocation.chr,
            start: hoveredLocation.start,
            end: hoveredLocation.end
        }];

        const circos = this.makeLaidOutCircos(subContainer, false);
        circos.highlight(this.makeId("hoveredLocation"), data, {
            innerRadius: 0.70,
            outerRadius: 1,
            color: "gold",
            strokeWidth: 2,
            strokeColor: "gold",
            opacity: 0.5
        });
        circos.render();
    }

    drawHoverMap() {
        if (!this._hoverMapContainer) {
            return;
        }

        // Set up the genomic coordinates covered by the hover map
        const {genome, chr, onLocationHovered} = this.props;
        let basesInMap: OpenInterval;
        if (chr) {
            basesInMap = genome.getImplicitCoordinates(new ChromosomeInterval(chr, 0, genome.getLength(chr)));
        } else {
            basesInMap = new OpenInterval(0, genome.getLength());
        }

        const circumference = Math.PI * INNER_RADIUS * 2;
        const basesPerSlice = Math.floor(basesInMap.getLength() / circumference);

        const slices: Circos.IntervalDatum[] = [];
        for (let base = basesInMap.start; base < basesInMap.end; base += basesPerSlice) {
            const sliceLocation = genome.getGenomicCoordinates(base);
            // Make the slice basesPerSlice long, but for sliceEnd, ensure we don't go past the end of the chromosome
            const sliceEnd = Math.min(sliceLocation.start + basesPerSlice, genome.getLength(sliceLocation.chr));
            slices.push({
                block_id: sliceLocation.chr,
                start: sliceLocation.start,
                end: sliceEnd
            });
        }
        
        // Set up hover events
        const binSize = this.props.data.estimateBinSize()
        const eventConfig = {
            mouseenter: (slice: Circos.IntervalDatum) => onLocationHovered(
                new ChromosomeInterval(slice.block_id, slice.start, slice.start + binSize)
            )
        };

        const circos = this.makeLaidOutCircos(this._replaceSubContainer(this._hoverMapContainer), false);
        circos.highlight(this.makeId("hoverMap"), slices, {
            innerRadius: 0.70,
            outerRadius: 1,
            opacity: 0,
            events: eventConfig
        });
        circos.render();
    }
}
