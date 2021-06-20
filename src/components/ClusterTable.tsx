import React from "react"
import _ from "lodash";
import DataTable from 'react-data-table-component';

const columns = [
  {
    name: 'Cluster',
    selector: 'key',
    sortable: true,
    compact: true,
    wrap: true,
  },
  {
    name: 'Percent of total # of Bins(%)',
    selector: 'value',
    sortable: true,
    right: true,
    compact: true,
    wrap: true,
  },
];

interface Props {
    test : any;
    onClusterRowsChange : any;
    
}

export class MyComponent extends React.Component<Props> {
    private readonly table_data : any;

    constructor(props: Props) {
        super(props);
        this.table_data = props.test;
        //console.log(this.props.test);
    }


    render() {
        console.log("Re-rendering", this.props.test)
        return (
            <DataTable
                columns={columns}
                data={this.props.test}
                selectableRows
                onSelectedRowsChange={this.props.onClusterRowsChange}
                pagination={true}
                dense={true}
                paginationPerPage={5}
                paginationComponentOptions={{rowsPerPageText: 'Rows'}}
                paginationRowsPerPageOptions={[5, 10, 15, 20]}
                noContextMenu={true}
                noHeader={true}
            />
        )
    }
};