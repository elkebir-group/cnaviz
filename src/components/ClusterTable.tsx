import React from "react"
import _ from "lodash";
import DataTable from 'react-data-table-component';
import {HuePicker} from "react-color";

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
    onClusterColorChange: any;
    
}
const ExpandedComponent =(data:any, initialColor: any, handleColorChnage: any) => <HuePicker width="100%" color={initialColor} onChange={handleColorChnage} />;//<pre>{JSON.stringify(data, null, 2)}</pre>;

export class MyComponent extends React.Component<Props> {
    private readonly table_data : any;
    private colors : any;
    
    constructor(props: Props) {
        super(props);
        this.table_data = props.test;
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
        this.getTest = this.getTest.bind(this);
        //console.log(this.props.test);
    }

    shouldComponentUpdate(nextProps: Props) {
        return this.props["test"] !== nextProps["test"];
    }

    handleColorChange(color : any, index: any) {
       console.log(index);
        this.colors[index] = color.hex;
        console.log(this.colors)
        this.props.onClusterColorChange(this.colors);
        this.forceUpdate();
        
        console.log(this.colors[index])
    }

    getTest(data : any) {
        console.log(data.data.key);
        console.log(data["key"]);
        console.log(Object.values(data));
        return <pre>{JSON.stringify(data, null, 2)}</pre>;
    }

    render() {
        const ExpandedComponent =(data:any) => <HuePicker width="100%" color={this.colors[data.data.key]} onChange={c => this.handleColorChange(c, data.data.key)} />;//<pre>{JSON.stringify(data, null, 2)}</pre>;

        return (
            <DataTable
                columns={columns}
                data={this.props.test}
                selectableRows
                onSelectedRowsChange={this.props.onClusterRowsChange}
                selectableRowSelected={row => row}
                expandableRows
                expandableRowsComponent={<ExpandedComponent/>}//(data:any) => <HuePicker width="100%" />}//color={this.colors[data.key]} onChange={c => this.handleColorChange(c, data.key)} />}
            //     {<div className = "row">
            //     <HuePicker width="100%" color={this.colors[0]} onChange={this.handleColorChange} />
            // </div> }
                pagination={true}
                dense={true}
                paginationPerPage={5}
                paginationComponentOptions={{rowsPerPageText: 'Rows', selectAllRowsItem: true}}
                paginationRowsPerPageOptions={[5, 10, 15, 20]}
                noContextMenu={true}
                noHeader={true}
            />
            
        )
    }
};

