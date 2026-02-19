import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { BsInfoCircle } from "react-icons/bs";
import { getDepartmentAccessMatrix } from "@/services/rbac";
import DepartmentAccessTable from "./DepartmentAccessTable";

const BRAND_TEAL = "#158993";

const DepartmentAccessMatrix = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await getDepartmentAccessMatrix();
        setData(response?.data?.data || null);
      } catch (error) {
        console.error("Error loading access matrix:", error);
        toast.error("Failed to load department access matrix");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  return (
    <section className="buyer-sec-1">
      <div className="container-fluid">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <h4 className="mb-1" style={{ fontWeight: 600 }}>
              Department Access Matrix
            </h4>
            <p className="text-muted mb-0" style={{ fontSize: "13px" }}>
              How departments interact with the approval hierarchy
            </p>
          </div>
        </div>

        {/* Info Banner */}
        <div
          className="d-flex align-items-start gap-3 mb-4 p-3"
          style={{
            backgroundColor: "#f0fdfa",
            border: `1px solid ${BRAND_TEAL}30`,
            borderRadius: "10px",
          }}
        >
          <BsInfoCircle size={20} style={{ color: BRAND_TEAL, flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: "13px", lineHeight: 1.6 }}>
            <strong style={{ color: BRAND_TEAL }}>How access types work:</strong>
            <br />
            <span style={{ color: "#166534" }}>
              <strong>ALL</strong> — Approvers from <em>any</em> department can approve items for these departments (e.g., Corporate, Purchase &amp; Store).
            </span>
            <br />
            <span style={{ color: "#1e40af" }}>
              <strong>INDIVIDUAL</strong> — Only approvers who <em>belong to</em> the specific department can approve its items.
            </span>
            <br />
            <small className="text-muted">
              These access types are system-defined and cannot be changed by administrators.
            </small>
          </div>
        </div>

        {loading ? (
          <div className="d-flex justify-content-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : (
          <DepartmentAccessTable
            departments={data?.departments || []}
            summary={data?.summary || {}}
          />
        )}
      </div>
    </section>
  );
};

export default DepartmentAccessMatrix;
