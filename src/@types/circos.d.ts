declare module "circos" {
    export default Circos;
};

type TrackMethod<D> = (id: string, data: D[], config: object) => void;

class Circos {
    constructor(config: Circos.MainConfig);
    layout(data: Circos.LayoutRegion[], config: Circos.LayoutConfig);
    scatter: TrackMethod<Circos.PointDatum>;
    line: TrackMethod<Circos.IntervalDatum>;
    highlight: TrackMethod<Circos.IntervalDatum>;
    render(): void;
}

declare namespace Circos {
    interface MainConfig {
        container: HTMLElement;
        width: number;
        height: number;
    }

    interface LayoutRegion {
        len: number;
        id: string;
        label?: string;
        color?: string;
    }

    interface LayoutConfig extends Partial<{
        innerRadius: number;
        outerRadius: number;
        cornerRadius: number;
        gap: number; // Radians
        labels: object;
        ticks: object;
        events: object;
    }> {}

    interface IntervalDatum {
        block_id: string;
        start: number;
        end: number;
    }

    interface PointDatum {
        block_id: string;
        position: number;
        value: number;
    }
}
