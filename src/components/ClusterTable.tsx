import React from "react"
import _ from "lodash";
import DataTable from 'react-data-table-component';
import {HuePicker} from "react-color";
import {CSVLink} from "react-csv"



interface Props {
    data : any;
    onClusterRowsChange : any;
    onClusterColorChange: any;
    currentFilters: String[];
    selectable ?: boolean;
    expandable ?: boolean;
    colOneName : string;
    colTwoName: string;
}

const ExpandedComponent =(data:any, initialColor: any, handleColorChnage: any) => <HuePicker width="100%" color={initialColor} onChange={handleColorChnage} />;//<pre>{JSON.stringify(data, null, 2)}</pre>;

export class ClusterTable extends React.Component<Props> {
    private readonly table_data : any;
    private colors : any;
    
    constructor(props: Props) {
        super(props);
        this.table_data = props.data;
        this.colors = [
            "#1b9e77", 
            "#d95f02", 
            "#7570b3", 
            "#e7298a", 
            "#66a61e", 
            "#e6ab02", 
            "#a6761d", 
            "#666666", 
            "#fe6794", 
            "#10b0ff", 
            "#ac7bff", 
            "#964c63", 
            "#cfe589", 
            "#fdb082", 
            "#28c2b5"
        ];

        this.handleColorChange = this.handleColorChange.bind(this);
    }

    shouldComponentUpdate(nextProps: Props) {
        return this.props["data"] !== nextProps["data"];
    }

    handleColorChange(color : any, index: any) {
        this.colors[index] = color.hex;
        const tempColors = _.cloneDeep(this.colors);
        this.colors = tempColors
        this.props.onClusterColorChange(tempColors);
        this.forceUpdate();
    }

    render() {
        const {colOneName, colTwoName, data, expandable, selectable} = this.props;
        const ExpandedComponent =(data:any) => <HuePicker width="100%" color={this.colors[data.data.key]} onChange={c => this.handleColorChange(c, data.data.key)} />;//<pre>{JSON.stringify(data, null, 2)}</pre>;
        // Cluster
        // Percent of total # of Bins(%)
        const columns = [
            {
              name: colOneName,
              selector: 'key',
              sortable: true,
              compact: true,
              wrap: true,
            },
            {
              name: colTwoName,
              selector: 'value',
              sortable: true,
              right: true,
              compact: true,
              wrap: true,
            },
        ];

        if(!expandable && !selectable) {
            return (
                <DataTable
                    columns={columns}
                    data={data}
                    pagination={true}
                    dense={true}
                    paginationPerPage={3}
                    paginationComponentOptions={{rowsPerPageText: '', selectAllRowsItem: true}}
                    paginationRowsPerPageOptions={[3, 5, 10, 20]}
                    noContextMenu={true}
                    noHeader={true}
                />
            )
        }

        return (
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
                pagination={true}
                dense={true}
                paginationPerPage={5}
                paginationComponentOptions={{rowsPerPageText: '', selectAllRowsItem: true}}
                paginationRowsPerPageOptions={[5, 10, 15, 20]}
                noContextMenu={true}
                noHeader={true}
            />
        )
    }
};

