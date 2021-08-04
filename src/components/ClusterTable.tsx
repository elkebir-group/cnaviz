import React from "react"
import _ from "lodash";
import DataTable from 'react-data-table-component';
import {HuePicker, SliderPicker, GithubPicker, BlockPicker} from "react-color";
import {CSVLink} from "react-csv"

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
    colors : string[];
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

    render() {
        const {colOneName, colTwoName, data, expandable, selectable, colors} = this.props;
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
                backgroundColor: (Number(row.key)===-1) ? UNCLUSTERED_COLOR : colors[Number(row.key) % colors.length]
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
                    conditionalRowStyles={conditionalRowStyles}
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
            
        )
    }
};

