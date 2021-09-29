import React from "react"
import _ from "lodash";
import DataTable from 'react-data-table-component';
import {HuePicker, SliderPicker, GithubPicker, BlockPicker} from "react-color";
import {CSVLink} from "react-csv"
import "./ClusterTable.css";

interface Props {
    data : any;
    onClusterRowsChange : any;
    onClusterColorChange: any;
    colName : string;
    updatedClusterTable?: () => void;
}

export class LogTable extends React.Component<Props> {
    private readonly table_data : any;

    constructor(props: Props) {
        super(props);
        this.table_data = props.data;
    }

    shouldComponentUpdate(nextProps: Props) {
        return this.props["data"] !== nextProps["data"];
    }

    render() {
        const {colName, data} = this.props;

        const columns = [
            {
              name: colName,
              selector: "action",
              compact: true,
              wrap: true,
            }
        ];
        let newData = [];
        for(let s of data) {
            newData.push(s);
        }
        return <div>
            <DataTable
                columns={columns}
                data={newData}
                pagination={true}
                paginationPerPage={5}
                paginationComponentOptions={{rowsPerPageText: '', selectAllRowsItem: true}}
                paginationRowsPerPageOptions={[5, 10, 15, 20]}
                noContextMenu={true}
                noHeader={true}
            ></DataTable>
        </div>


    }

}   