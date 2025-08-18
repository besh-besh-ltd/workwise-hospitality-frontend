import React, { useState } from "react";
import { Table, Button, FormControl } from "react-bootstrap";
import { saveAs } from "file-saver";
import { addCommasToNumber } from "@/utils/sharedFunctions";

const CostEstimationTable = ({ fileName, data, persistence }) => {
    const [tableData, setTableData] = useState(
    data.map((row) => ({
      ...row,
      serviceCharge: row.serviceCharge || 0,
      additionalCharges: row.additionalCharges || 0,
    }))
  );

  // Handle input change for service/additional charges
  const handleInputChange = (index, field, value) => {
    const updatedData = [...tableData];
    updatedData[index][field] = parseFloat(value) || 0; // keep numeric
    setTableData(updatedData);
  };

  const exportToCSV = () => {
    const headers = [
      "Sr. No.",
      "Product Name",
      "Lowest Quote",
      "Average Quote",
      "Highest Quote",
      "Service Charge",
      "Additional Charges",
      "Total"
    ];

    const rows = tableData.map((row, index) => [
      index + 1,
      row.productName,
      row.lowest_price,
      row.average_price,
      row.highest_price,
      row.serviceCharge,
      row.additionalCharges,
      row.total
    ]);

    const csvContent =
      [headers, ...rows]
        .map(e => e.join(","))
        .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, `${fileName || "cost_estimation"}.csv`);
  };

  const getCellStyle = (type) => {
    if (type === "lowest") return { backgroundColor: "#d4edda", fontWeight: 600 };  // light green
    if (type === "average") return { backgroundColor: "#fff3cd", fontWeight: 600 }; // light yellow
    if (type === "highest") return { backgroundColor: "#f8d7da", fontWeight: 600 }; // light red
    return {};
  };

  return (
    <div className="container-fluid mt-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="m-0">
          Cost Estimation for <strong>{fileName}</strong>
        </h4>
        <button className="btn btn-success btn-sm p-2" style={{ width: 210 }} variant="success" onClick={exportToCSV}>
          Export as Excel (CSV)
        </button>
      </div>

      <Table bordered hover responsive className="shadow-sm align-middle text-center">
        <thead className="table-light">
          <tr>
            <th>Sr. No.</th>
            <th style={{ width: 350 }}>Product Name</th>
            <th>Lowest Quote</th>
            <th>Average Quote</th>
            <th>Highest Quote</th>
            <th>Service Charge</th>
            <th>Additional Charges</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {tableData.map((row, index) => {
            const total = row.average_price + (row.serviceCharge ?? 0) + (row.additionalCharges ?? 0);
            return (
              <tr key={index}>
                <td>{index + 1}</td>
                <td className="fw-semibold fs-6">{row.product_name}</td>
                <td style={getCellStyle("lowest")}>{row.lowest_price ? `₹${addCommasToNumber(row.lowest_price)}` : '-'}</td>
                <td style={getCellStyle("average")}>{row.average_price ? `₹${addCommasToNumber(row.average_price)}` : '-'}</td>
                <td style={getCellStyle("highest")}>{row.highest_price ? `₹${addCommasToNumber(row.highest_price)}` : '-'}</td>
                <td style={{width: 210}}>
                  <FormControl
                    type="number"
                    min={0}
                    style={{maxWidth: '100%'}}
                    value={row.serviceCharge}
                    onChange={(e) => handleInputChange(index, "serviceCharge", e.target.value)}
                  />
                </td>
                <td style={{ width: 210 }}>
                  <FormControl
                    type="number"
                    min={0}
                    style={{maxWidth: '100%'}}
                    value={row.additionalCharges}
                    onChange={(e) => handleInputChange(index, "additionalCharges", e.target.value)}
                  />
                </td>
                <td style={{minWidth: 150}}>
                  <strong>₹{addCommasToNumber(total)}</strong>
                  <small className="d-block">(Using Avg. Price)</small>
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </div>
  );
};

export default CostEstimationTable;
