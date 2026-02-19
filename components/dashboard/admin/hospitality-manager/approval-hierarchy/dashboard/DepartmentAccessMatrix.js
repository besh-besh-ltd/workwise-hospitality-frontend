import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Collapse } from "react-bootstrap";
import {
  BsBuilding,
  BsShieldCheck,
  BsPeopleFill,
  BsPersonFill,
  BsChevronDown,
  BsChevronRight,
  BsCheck2,
  BsInfoCircle,
  BsArrowRepeat,
} from "react-icons/bs";
import { toast } from "react-toastify";
import { getDepartmentAccessMatrix, updateDepartmentAccessMatrix } from "@/services/rbac";
import { BRAND_TEAL, BRAND_TEAL_LIGHT } from "../constants";

const ACCESS_ALL = "ALL";
const ACCESS_INDIVIDUAL = "INDIVIDUAL";

const DepartmentAccessMatrix = ({ departments: initialDepartments, onRefresh }) => {
  const [open, setOpen] = useState(true);
  const [departments, setDepartments] = useState([]);
  const [originalMap, setOriginalMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Initialize from props or fetch
  const initializeFromData = useCallback((data) => {
    if (!data || !data.departments) return;
    setDepartments(data.departments);
    const map = {};
    data.departments.forEach((dept) => {
      map[dept.id] = dept.access_type;
    });
    setOriginalMap(map);
  }, []);

  useEffect(() => {
    if (initialDepartments && initialDepartments.departments) {
      initializeFromData(initialDepartments);
    } else {
      fetchMatrix();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchMatrix = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getDepartmentAccessMatrix();
      const data = response?.data || response;
      initializeFromData(data);
    } catch (err) {
      console.error("Error fetching department access matrix:", err);
      setError("Failed to load department access matrix. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Track which departments have been changed
  const dirtyIds = useMemo(() => {
    const changed = new Set();
    departments.forEach((dept) => {
      if (originalMap[dept.id] && originalMap[dept.id] !== dept.access_type) {
        changed.add(dept.id);
      }
    });
    return changed;
  }, [departments, originalMap]);

  const hasChanges = dirtyIds.size > 0;

  // Summary counts
  const summary = useMemo(() => {
    let allCount = 0;
    let individualCount = 0;
    departments.forEach((dept) => {
      if (dept.access_type === ACCESS_ALL) allCount++;
      else individualCount++;
    });
    return { allCount, individualCount };
  }, [departments]);

  const handleToggle = (deptId, newAccessType) => {
    setDepartments((prev) =>
      prev.map((dept) =>
        dept.id === deptId ? { ...dept, access_type: newAccessType } : dept
      )
    );
  };

  const handleSave = async () => {
    if (!hasChanges) return;
    setSaving(true);
    try {
      const payload = departments.map((dept) => ({
        id: dept.id,
        access_type: dept.access_type,
      }));
      const response = await updateDepartmentAccessMatrix(payload);
      const data = response?.data || response;
      initializeFromData(data);
      toast.success("Department access matrix updated successfully.");
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error("Error updating department access matrix:", err);
      toast.error("Failed to update department access matrix. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    setDepartments((prev) =>
      prev.map((dept) => ({
        ...dept,
        access_type: originalMap[dept.id] || dept.access_type,
      }))
    );
  };

  return (
    <div className="access-matrix-wrapper mb-4">
      <style jsx>{`
        /* ── Container ── */
        .access-matrix-wrapper {
          border-radius: 12px;
          overflow: hidden;
        }

        /* ── Header ── */
        .matrix-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          background: linear-gradient(135deg, ${BRAND_TEAL} 0%, #117a83 100%);
          cursor: pointer;
          user-select: none;
          transition: opacity 0.2s ease;
        }
        .matrix-header:hover {
          opacity: 0.95;
        }
        .matrix-header-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .matrix-header-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 34px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.18);
          color: #fff;
          flex-shrink: 0;
        }
        .matrix-header-title {
          font-size: 16px;
          font-weight: 700;
          color: #fff;
          letter-spacing: -0.01em;
        }
        .matrix-header-subtitle {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.75);
          margin-top: 1px;
        }
        .matrix-chevron {
          color: rgba(255, 255, 255, 0.8);
          transition: transform 0.25s ease;
        }

        /* ── Body ── */
        .matrix-body {
          background: linear-gradient(180deg, #f7fafa 0%, #fff 100%);
          border: 1px solid #e0eaeb;
          border-top: none;
          border-radius: 0 0 12px 12px;
          padding: 20px;
        }

        /* ── Summary bar ── */
        .matrix-summary-bar {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 12px 16px;
          background: ${BRAND_TEAL_LIGHT};
          border: 1px solid #c8e6e9;
          border-radius: 10px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }
        .summary-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 600;
          color: #374151;
        }
        .summary-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .summary-dot-all {
          background: #16a34a;
        }
        .summary-dot-individual {
          background: #2563eb;
        }
        .summary-divider {
          width: 1px;
          height: 20px;
          background: #b0d4d7;
        }
        .summary-info {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: #6b7280;
          font-weight: 400;
          margin-left: auto;
        }

        /* ── Grid ── */
        .matrix-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
        }
        @media (max-width: 991px) {
          .matrix-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 575px) {
          .matrix-grid {
            grid-template-columns: 1fr;
          }
        }

        /* ── Department card ── */
        .dept-card {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          padding: 16px;
          transition: all 0.2s ease;
          position: relative;
          overflow: hidden;
        }
        .dept-card::before {
          content: "";
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 4px;
          border-radius: 10px 0 0 10px;
          transition: background 0.25s ease;
        }
        .dept-card-all::before {
          background: #16a34a;
        }
        .dept-card-individual::before {
          background: #2563eb;
        }
        .dept-card:hover {
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.07);
          transform: translateY(-1px);
        }
        .dept-card-dirty {
          border-color: ${BRAND_TEAL};
          box-shadow: 0 0 0 1px ${BRAND_TEAL}33;
        }
        .dept-card-name {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 12px;
          line-height: 1.3;
        }
        .dept-card-name-icon {
          color: #9ca3af;
          flex-shrink: 0;
        }
        .dept-card-changed-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: ${BRAND_TEAL};
          flex-shrink: 0;
          margin-left: auto;
        }

        /* ── Segmented toggle ── */
        .access-toggle {
          display: flex;
          background: #f3f4f6;
          border-radius: 8px;
          padding: 3px;
          gap: 2px;
        }
        .access-toggle-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          padding: 7px 8px;
          font-size: 12px;
          font-weight: 600;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
          background: transparent;
          color: #6b7280;
          white-space: nowrap;
          position: relative;
          outline: none;
        }
        .access-toggle-btn:hover:not(.access-toggle-active) {
          background: #e5e7eb;
          color: #374151;
        }
        .access-toggle-btn.access-toggle-active-all {
          background: #16a34a;
          color: #fff;
          box-shadow: 0 1px 3px rgba(22, 163, 74, 0.3);
        }
        .access-toggle-btn.access-toggle-active-individual {
          background: #2563eb;
          color: #fff;
          box-shadow: 0 1px 3px rgba(37, 99, 235, 0.3);
        }
        .access-toggle-btn .toggle-check {
          display: none;
        }
        .access-toggle-btn.access-toggle-active-all .toggle-check,
        .access-toggle-btn.access-toggle-active-individual .toggle-check {
          display: inline-flex;
        }

        /* ── Actions bar ── */
        .matrix-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 20px;
          padding-top: 16px;
          border-top: 1px solid #e5e7eb;
        }
        .matrix-actions-info {
          font-size: 13px;
          color: #6b7280;
          margin-right: auto;
        }
        .matrix-actions-info strong {
          color: ${BRAND_TEAL};
        }
        .btn-discard {
          padding: 8px 20px;
          font-size: 13px;
          font-weight: 500;
          border: 1px solid #d1d5db;
          background: #fff;
          color: #374151;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .btn-discard:hover {
          background: #f9fafb;
          border-color: #9ca3af;
        }
        .btn-save-matrix {
          padding: 8px 24px;
          font-size: 13px;
          font-weight: 600;
          border: none;
          background: ${BRAND_TEAL};
          color: #fff;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.15s ease;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .btn-save-matrix:hover:not(:disabled) {
          background: #117a83;
          box-shadow: 0 2px 8px rgba(21, 137, 147, 0.3);
        }
        .btn-save-matrix:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* ── Loading state ── */
        .matrix-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 48px 20px;
          color: #9ca3af;
          gap: 12px;
        }
        .matrix-loading-spinner {
          animation: matrix-spin 1s linear infinite;
          color: ${BRAND_TEAL};
        }
        @keyframes matrix-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .matrix-loading-text {
          font-size: 14px;
          color: #6b7280;
        }

        /* ── Error state ── */
        .matrix-error {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          gap: 12px;
          text-align: center;
        }
        .matrix-error-text {
          font-size: 14px;
          color: #ef4444;
          font-weight: 500;
        }
        .btn-retry {
          padding: 7px 18px;
          font-size: 13px;
          font-weight: 500;
          border: 1px solid ${BRAND_TEAL};
          background: transparent;
          color: ${BRAND_TEAL};
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.15s ease;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .btn-retry:hover {
          background: ${BRAND_TEAL_LIGHT};
        }

        /* ── Empty state ── */
        .matrix-empty {
          text-align: center;
          padding: 40px 20px;
          color: #9ca3af;
          font-size: 14px;
        }
      `}</style>

      {/* ── Collapsible header ── */}
      <div className="matrix-header" onClick={() => setOpen(!open)}>
        <div className="matrix-header-left">
          <div className="matrix-header-icon">
            <BsShieldCheck size={17} />
          </div>
          <div>
            <div className="matrix-header-title">Department Access Matrix</div>
            <div className="matrix-header-subtitle">
              Configure which departments use shared or isolated approval workflows
            </div>
          </div>
        </div>
        <div className="matrix-chevron">
          {open ? <BsChevronDown size={16} /> : <BsChevronRight size={16} />}
        </div>
      </div>

      {/* ── Collapsible body ── */}
      <Collapse in={open}>
        <div>
          <div className="matrix-body">
            {/* Loading */}
            {loading && (
              <div className="matrix-loading">
                <BsArrowRepeat size={28} className="matrix-loading-spinner" />
                <span className="matrix-loading-text">Loading department access matrix...</span>
              </div>
            )}

            {/* Error */}
            {!loading && error && (
              <div className="matrix-error">
                <BsInfoCircle size={24} style={{ color: "#ef4444" }} />
                <span className="matrix-error-text">{error}</span>
                <button className="btn-retry" onClick={fetchMatrix}>
                  <BsArrowRepeat size={14} /> Retry
                </button>
              </div>
            )}

            {/* Empty */}
            {!loading && !error && departments.length === 0 && (
              <div className="matrix-empty">
                <BsBuilding size={28} style={{ marginBottom: "8px", display: "block", margin: "0 auto 8px" }} />
                No departments found. Please ensure departments are configured.
              </div>
            )}

            {/* Populated */}
            {!loading && !error && departments.length > 0 && (
              <>
                {/* Summary bar */}
                <div className="matrix-summary-bar">
                  <div className="summary-item">
                    <span className="summary-dot summary-dot-all" />
                    {summary.allCount} department{summary.allCount !== 1 ? "s" : ""} with ALL access
                  </div>
                  <div className="summary-divider" />
                  <div className="summary-item">
                    <span className="summary-dot summary-dot-individual" />
                    {summary.individualCount} department{summary.individualCount !== 1 ? "s" : ""} with INDIVIDUAL access
                  </div>
                  <div className="summary-info">
                    <BsInfoCircle size={12} />
                    Click toggles below to change access type
                  </div>
                </div>

                {/* Department cards grid */}
                <div className="matrix-grid">
                  {departments.map((dept) => {
                    const isAll = dept.access_type === ACCESS_ALL;
                    const isDirty = dirtyIds.has(dept.id);
                    return (
                      <div
                        key={dept.id}
                        className={`dept-card ${isAll ? "dept-card-all" : "dept-card-individual"}${isDirty ? " dept-card-dirty" : ""}`}
                      >
                        <div className="dept-card-name">
                          <BsBuilding size={14} className="dept-card-name-icon" />
                          <span>{dept.title}</span>
                          {isDirty && <span className="dept-card-changed-dot" title="Unsaved change" />}
                        </div>
                        <div className="access-toggle">
                          <button
                            type="button"
                            className={`access-toggle-btn${isAll ? " access-toggle-active-all" : ""}`}
                            onClick={() => handleToggle(dept.id, ACCESS_ALL)}
                            title="Approvers from any department can approve"
                          >
                            <BsCheck2 size={13} className="toggle-check" />
                            <BsPeopleFill size={13} />
                            ALL
                          </button>
                          <button
                            type="button"
                            className={`access-toggle-btn${!isAll ? " access-toggle-active-individual" : ""}`}
                            onClick={() => handleToggle(dept.id, ACCESS_INDIVIDUAL)}
                            title="Only department members can approve"
                          >
                            <BsCheck2 size={13} className="toggle-check" />
                            <BsPersonFill size={13} />
                            INDIVIDUAL
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Actions bar - only shown when dirty */}
                {hasChanges && (
                  <div className="matrix-actions">
                    <span className="matrix-actions-info">
                      <strong>{dirtyIds.size}</strong> department{dirtyIds.size !== 1 ? "s" : ""} modified
                    </span>
                    <button
                      type="button"
                      className="btn-discard"
                      onClick={handleDiscard}
                      disabled={saving}
                    >
                      Discard
                    </button>
                    <button
                      type="button"
                      className="btn-save-matrix"
                      onClick={handleSave}
                      disabled={saving}
                    >
                      {saving && <BsArrowRepeat size={14} className="matrix-loading-spinner" />}
                      {saving ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </Collapse>
    </div>
  );
};

export default DepartmentAccessMatrix;
