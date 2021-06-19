import React from "react"
import DataTable from 'react-data-table-component';

const data = [{ id: 1, cluster: '2', percent: 100 }, { id: 2, cluster: '1', percent: 20 }, { id: 3, cluster: '3', percent: 30 }, { id: 4, cluster: '4', percent: 10 }];
const customStyles = {
    rows: {
      style: {
        minHeight: '72px', // override the row height
      }
    },
    headCells: {
      style: {
        paddingLeft: '8px', // override the cell padding for head cells
        paddingRight: '8px',
      },
    },
    cells: {
      style: {
        paddingLeft: '8px', // override the cell padding for data cells
        paddingRight: '8px',
      },
    },
};

const columns = [
  {
    name: 'Cluster',
    selector: 'key',
    sortable: false,
    compact: true,
    wrap: true,
    width: "100"
  },
  {
    name: 'Percent of total # of Bins(%)',
    selector: 'value',
    sortable: true,
    right: true,
    compact: true,
    wrap: true,
    width: "100"
  },
];

interface Props {
    test : any;
    onClusterRowsChange : any;
}


const handleChange = (state:any) => {
    console.log('Selected rows: ', state.selectedRows);
}

export class MyComponent extends React.Component<Props> {
    private readonly table_data : any;

    constructor(props: Props) {
        super(props);
        this.table_data = props.test;
        //console.log(this.props.test);
    }

    componentDidMount() { 
    }

    shouldComponentUpdate() {
        return false;
    }

    render() {
        console.log("Re rendering");
        return (
            <DataTable
                title="Clusters"
                columns={columns}
                data={this.table_data}
                selectableRows
                onSelectedRowsChange={this.props.onClusterRowsChange}
                customStyles={customStyles}
                pagination={true}
                dense={true}
            />
        )
    }
};