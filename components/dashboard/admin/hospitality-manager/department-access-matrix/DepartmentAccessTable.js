import React from "react";

const BRAND_TEAL = "#158993";

const DepartmentAccessTable = ({ departments, summary }) => {
  if (!departments || departments.length === 0) {
    return (
      <div className="card border-0 shadow-sm" style={{ borderRadius: "12px" }}>
        <div className="card-body text-center py-5">
          <p className="text-muted mb-0">No departments found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card border-0 shadow-sm" style={{ borderRadius: "12px", overflow: "hidden" }}>
      {/* Summary bar */}
      <div
        className="d-flex gap-4 px-4 py-2"
        style={{ backgroundColor: "#f9fafb", borderBottom: "1px solid #e5e7eb", fontSize: "12px" }}
      >
        <span>
          <strong style={{ color: "#166534" }}>{summary.all_count || 0}</strong>{" "}
          <span className="text-muted">ALL departments</span>
        </span>
        <span>
          <strong style={{ color: "#1e40af" }}>{summary.individual_count || 0}</strong>{" "}
          <span className="text-muted">INDIVIDUAL departments</span>
        </span>
        <span>
          <strong>{departments.length}</strong>{" "}
          <span className="text-muted">total</span>
        </span>
      </div>

      <div className="table-responsive">
        <table className="table table-hover mb-0" style={{ fontSize: "13px" }}>
          <thead>
            <tr style={{ backgroundColor: "#f9fafb" }}>
              <th style={{ width: 60, padding: "10px 16px", fontWeight: 600, color: "#6b7280", fontSize: "11px", textTransform: "uppercase" }}>
                Sr.
              </th>
              <th style={{ padding: "10px 16px", fontWeight: 600, color: "#6b7280", fontSize: "11px", textTransform: "uppercase" }}>
                Department Name
              </th>
              <th style={{ width: 180, padding: "10px 16px", fontWeight: 600, color: "#6b7280", fontSize: "11px", textTransform: "uppercase" }}>
                Access Type
              </th>
              <th style={{ padding: "10px 16px", fontWeight: 600, color: "#6b7280", fontSize: "11px", textTransform: "uppercase" }}>
                Description
              </th>
            </tr>
          </thead>
          <tbody>
            {departments.map((dept, index) => (
              <tr key={dept.id}>
                <td style={{ padding: "12px 16px", color: "#9ca3af" }}>{index + 1}</td>
                <td style={{ padding: "12px 16px", fontWeight: 500, color: "#374151" }}>
                  {dept.title}
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "3px 12px",
                      borderRadius: "12px",
                      fontSize: "11px",
                      fontWeight: 700,
                      backgroundColor: dept.access_type === "ALL" ? "#dcfce7" : "#dbeafe",
                      color: dept.access_type === "ALL" ? "#166534" : "#1e40af",
                    }}
                  >
                    {dept.access_type}
                  </span>
                </td>
                <td style={{ padding: "12px 16px", color: "#6b7280", fontSize: "12px" }}>
                  {dept.access_type === "ALL"
                    ? "Approvers from any department can approve"
                    : "Only department members can approve"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DepartmentAccessTable;
