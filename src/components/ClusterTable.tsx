import React from "react"
import _ from "lodash";
import DataTable from 'react-data-table-component';
import {BlockPicker} from "react-color";
import "./ClusterTable.css"

const UNCLUSTERED_COLOR = "#999999";

interface Props {
    data : any;
    onClusterRowsChange : any;
    onClusterColorChange: any;
    currentFilters: String[];
    selectable ?: boolean;
    expandable ?: boolean;
    colOneName : string;
    colTwoName: string;
    colThreeName?: string;
    colFourName?: string;
    cols: any;
    centroidTable?: boolean;
    colors : string[];
    updatedClusterTable?: () => void;
}

export class ClusterTable extends React.Component<Props> {
    private readonly table_data : any;
    
    constructor(props: Props) {
        super(props);
        this.table_data = props.data;
        this.handleColorChange = this.handleColorChange.bind(this);
    }

    shouldComponentUpdate(nextProps: Props) {
        return this.props["data"] !== nextProps["data"] ||  this.props["colors"] !== nextProps["colors"];
    }

    handleColorChange(color : any, index: any) {
        this.props.colors[index] = color.hex;
        const tempColors = _.cloneDeep(this.props.colors);
        this.props.onClusterColorChange(tempColors);
        this.forceUpdate();
    }
    
    componentDidUpdate(prevProps: Props) {
        if(this.props.updatedClusterTable)
            this.props.updatedClusterTable();
    }

    render() {
        const {colOneName, colTwoName, colThreeName, colFourName, data, expandable, selectable, colors, centroidTable} = this.props;
        const ExpandedComponent =(data:any) => 
        <div> 
            <BlockPicker 
                width="100%"
                color={this.props.colors[data.data.key]}
                onChangeComplete={c => this.handleColorChange(c, data.data.key)} 
            />
        </div>;

        type styleType  = {when: (row:any) => any, style: (row:any) => object}
        const conditionalRowStyles : styleType[] = [
            {
              when: (row:any) => row,
              style: (row:any) => ({
                backgroundColor: (Number(row.key) === -1) ? UNCLUSTERED_COLOR : colors[Number(row.key) % colors.length],
                alignItems: 'center',
                justifyContent: 'center',
                innerWidth: 50,
                outerWidth: 50

              }),
            }
        ];

        const columns = [
            {
              name: colOneName,
              selector: 'key',
              sortable: true,
              compact: true,
              wrap: true,
              innerWidth: 40,
              outerWidth: 40,
              width: "50",
              center: true
            },
            {
              name: colTwoName,
              selector: 'value',
              sortable: true,
              right: true,
              compact: true,
              wrap: true,
              innerWidth: 40,
              outerWidth: 40,
              width: "50",
              center: true
            },
        ];

        const columns3 = [
            {
                name: colOneName,
                selector: 'key',
                sortable: true,
                compact: true,
                wrap: true,
                center: true
                // width: "50"
            },
            {
                name: colTwoName,
                selector: 'value',
                sortable: true,
                right: true,
                compact: true,
                wrap: true,
                center: true
                // width: "50"
            },
            {
                name: colThreeName,
                selector: 'selectPerc',
                sortable: true,
                right: true,
                compact: true,
                wrap: true,
                center: true
                // width: "50"
            },
            {
                name: colFourName,
                selector: 'binPerc',
                sortable: true,
                right: true,
                compact: true,
                wrap: true,
                center: true
            }
        ];

        if(centroidTable) {
            let colNames : any[] = [];
            
            if(data !== null && data !== undefined && data.length > 0) {
                colNames.push({name: "Cluster ID", type: "key"})
                for(const s of Object.keys(data[0].sample)) {
                    colNames.push({name: s, type: "sample."+s});
                }
            }
        
            const centroidColumns = [];
            for(const name of colNames) {
                let centroidCol = {
                    name: name.name,
                    selector: name.type,
                    sortable: true,
                    compact: true,
                    wrap: true,
                    center: true
                }
                centroidColumns.push(centroidCol);
            }
            
            return (
                <DataTable
                    columns={centroidColumns}
                    data={data}
                    pagination={true}
                    dense={true}
                    paginationPerPage={5}
                    paginationComponentOptions={{rowsPerPageText: '', selectAllRowsItem: true}}
                    paginationRowsPerPageOptions={[5, 10, 15, 20]}
                    noContextMenu={true}
                    noHeader={true}
                    conditionalRowStyles={conditionalRowStyles}
                />
            )

        }
        
        if(!expandable && !selectable) { // selection table
            return (
                <DataTable
                    columns={columns3}
                    data={data}
                    pagination={true}
                    dense={true}
                    paginationPerPage={3}
                    paginationComponentOptions={{rowsPerPageText: '', selectAllRowsItem: true}}
                    paginationRowsPerPageOptions={[3, 5, 10, 20]}
                    noContextMenu={true}
                    noHeader={true}
                    noDataComponent={<div style={{padding: 10}}>No Records Selected</div>}
                    conditionalRowStyles={conditionalRowStyles}
                />
            )
        }

        return (
            <div className="scroll">
                <DataTable
                    columns={columns}
                    data={data}
                    selectableRows
                    onSelectedRowsChange={this.props.onClusterRowsChange}
                    selectableRowSelected={row => {
                        if(this.props.currentFilters.includes(String(row.key))) {
                            return row;
                        }
                    }}
                    expandableRows
                    expandableRowsComponent={<ExpandedComponent/>}
                    expandableRowDisabled={row => row.key === -1 || row.key === -2}
                    pagination={true}
                    dense={true}
                    paginationPerPage={5}
                    paginationComponentOptions={{rowsPerPageText: '', selectAllRowsItem: true}}
                    paginationRowsPerPageOptions={[5, 10, 15, 20]}
                    noContextMenu={true}
                    noHeader={true}
                    conditionalRowStyles={conditionalRowStyles}
                />
            </div>

            
        )
    }
};

