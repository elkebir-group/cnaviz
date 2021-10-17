import React from "react"
import _ from "lodash";
import DataTable from 'react-data-table-component';
import {HuePicker, SliderPicker, GithubPicker, BlockPicker} from "react-color";
import {CSVLink} from "react-csv"
import "./ClusterTable.css"

const UNCLUSTERED_COLOR = "#999999";
const DELETED_COLOR = "rgba(232, 232, 232, 1)";

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
    centroidTable?: boolean;
    colors : string[];
    updatedClusterTable?: () => void;
}

const ExpandedComponent =(data:any, initialColor: any, handleColorChnage: any) => <HuePicker width="100%" color={initialColor} onChange={handleColorChnage} />;//<pre>{JSON.stringify(data, null, 2)}</pre>;

export class ClusterTable extends React.Component<Props> {
    private readonly table_data : any;
    //private colors : any;
    
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
        //this.colors = tempColors
        this.props.onClusterColorChange(tempColors);
        this.forceUpdate();
    }
    
    componentDidUpdate(prevProps: Props) {
        if(this.props.updatedClusterTable)
            this.props.updatedClusterTable();
    }

    render() {
        const {colOneName, colTwoName, colThreeName, data, expandable, selectable, colors, centroidTable} = this.props;
        const ExpandedComponent =(data:any) => 
        <div> 
            <BlockPicker 
                width="100%"
                color={this.props.colors[data.data.key]}
                onChangeComplete={c => this.handleColorChange(c, data.data.key)} 
            />
        </div>;

        const conditionalRowStyles : any = [
            {
              when: (row:any) => row,
              style: (row:any) => ({
                backgroundColor: (Number(row.key)===-1) ? UNCLUSTERED_COLOR : colors[Number(row.key) % colors.length],
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
        ];

        if(centroidTable) {
            console.log("CENTROID DATA: ", data);
            const centroidColumns = [
                {
                    name: colOneName,
                    selector: 'key',
                    sortable: true,
                    compact: true,
                    wrap: true,
                    center: true
                },
                {
                    name: colTwoName,
                    selector: 'sample',
                    sortable: true,
                    right: true,
                    compact: true,
                    wrap: true,
                    center: true
                },
                {
                    name: colThreeName,
                    selector: 'centroid',
                    sortable: true,
                    right: true,
                    compact: true,
                    wrap: true,
                    center: true
                },
            ];
            
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
        
        if(!expandable && !selectable) {
            // console.log(data);
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
                    conditionalRowStyles={conditionalRowStyles}
                    noDataComponent={<div style={{padding: 10}}>No Records Selected</div>}
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

