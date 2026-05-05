import React, { useMemo, useState } from "react";
import { toast } from "react-toastify";

// Phase 3 FE — committee matrix view.
//
// Renders rows = products, expanding into per-vendor cells (one cell
// per arc_item). Each cell shows the committed unit price + Approve /
// Reject buttons. Per-cell remarks captured inline; submit fans out
// per-cell calls to performArcAction with arc_item_id.
//
// Bespoke styling, no Bootstrap. Bridges seamlessly with the existing
// arc-committee page — drop into the StageArcReview slot.
//
// Props:
//   items          — array of arc_items as returned by getTenderLifecycle.data.arcApproval.items
//                    (each has: id, arc_id, rfq_product_id, product_variant_id,
//                     vendor_id, vendor_name, product_name, unit_price, status,
//                     approval_instance_id, approval_status)
//   rfq            — current RFQ (for department context if needed)
//   onAction(arc_item_id, action, comment) → Promise<{ success, error? }>
//   onRefresh()    — re-fetch lifecycle after actions

const STATUS_COLORS = {
  PENDING:  { bg: "#fef3c7", color: "#92400e", label: "Pending" },
  APPROVED: { bg: "#dcfce7", color: "#15803d", label: "Approved" },
  REJECTED: { bg: "#fee2e2", color: "#991b1b", label: "Rejected" },
};

const ProductArcMatrix = ({ items = [], rfq, onAction, onRefresh, readOnly = false }) => {
  // Group items by rfq_product_id for the row/cell layout.
  const rowsByProduct = useMemo(() => {
    const map = new Map();
    for (const it of items) {
      const key = it.rfq_product_id;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(it);
    }
    // Stable order: by rfq_product_id ASC, vendor_name ASC.
    return Array.from(map.entries()).map(([rfqProductId, cells]) => ({
      rfq_product_id: rfqProductId,
      product_name: cells[0]?.product_name || `Product #${rfqProductId}`,
      cells: [...cells].sort((a, b) =>
        (a.vendor_name || "").localeCompare(b.vendor_name || "")
      ),
    }));
  }, [items]);

  const [openProducts, setOpenProducts] = useState(() => new Set(rowsByProduct.map((r) => r.rfq_product_id)));
  const [busyCells, setBusyCells] = useState(() => new Set());
  const [draftRemarks, setDraftRemarks] = useState({}); // arc_item_id → remarks

  const toggleProduct = (id) => {
    setOpenProducts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCellAction = async (cell, action) => {
    const remarks = (draftRemarks[cell.id] || "").trim();
    if (action === "REJECT" && remarks.length === 0) {
      toast.warn("A remark is required when rejecting a contract item.");
      return;
    }
    setBusyCells((prev) => new Set(prev).add(cell.id));
    try {
      const res = await onAction(cell.id, action, remarks || null);
      if (res?.success) {
        toast.success(action === "APPROVE" ? "Item approved." : "Item rejected.");
        setDraftRemarks((d) => ({ ...d, [cell.id]: "" }));
        onRefresh?.();
      } else {
        toast.error(res?.error || "Action failed");
      }
    } catch (err) {
      toast.error(err?.message || "Action failed");
    } finally {
      setBusyCells((prev) => {
        const next = new Set(prev);
        next.delete(cell.id);
        return next;
      });
    }
  };

  if (rowsByProduct.length === 0) {
    return (
      <div
        style={{
          padding: "32px 24px",
          background: "#f8fafc",
          border: "1px dashed #e2e8f0",
          borderRadius: 10,
          color: "#64748b",
          fontSize: 13,
          textAlign: "center",
        }}
      >
        No contracted items have been routed to the committee yet.
      </div>
    );
  }

  return (
    <div className="arc-matrix">
      <style jsx>{`
        .arc-matrix {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .arc-product-row {
          background: #fff;
          border: 1px solid #e9ecef;
          border-radius: 10px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.03);
        }
        .arc-product-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          gap: 12px;
          cursor: pointer;
          background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
          border-bottom: 1px solid #e9ecef;
        }
        .arc-product-name {
          font-size: 14px;
          font-weight: 700;
          color: #1a2730;
        }
        .arc-product-meta {
          font-size: 11px;
          color: #6c757d;
          font-weight: 500;
        }
        .arc-cell-body {
          display: grid;
          grid-template-columns: 1fr;
        }
        .arc-cell {
          display: grid;
          grid-template-columns: 1.4fr 1fr 1.6fr 0.8fr auto;
          gap: 14px;
          align-items: center;
          padding: 14px 16px;
          border-top: 1px solid #f1f5f9;
        }
        .arc-cell:first-child { border-top: none; }
        .arc-cell .vendor-name {
          font-weight: 600;
          font-size: 13px;
          color: #0f172a;
        }
        .arc-cell .vendor-id {
          font-size: 11px;
          color: #94a3b8;
        }
        .arc-cell .price {
          font-size: 14px;
          font-weight: 700;
          color: #2e5ba8;
        }
        .arc-cell input.remarks {
          width: 100%;
          padding: 7px 10px;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          font-size: 12px;
          font-family: inherit;
        }
        .arc-cell input.remarks:focus {
          outline: none;
          border-color: #2e5ba8;
          box-shadow: 0 0 0 3px rgba(46,91,168,0.12);
        }
        .arc-cell .status-pill {
          display: inline-block;
          padding: 3px 8px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.3px;
          text-transform: uppercase;
        }
        .arc-cell .actions {
          display: flex;
          gap: 6px;
        }
        .arc-cell button {
          padding: 7px 12px;
          border-radius: 6px;
          border: none;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
        }
        .arc-cell button.approve {
          background: #16a34a;
          color: #fff;
        }
        .arc-cell button.approve:disabled {
          background: #bbf7d0;
          cursor: not-allowed;
        }
        .arc-cell button.reject {
          background: #fff;
          color: #dc2626;
          border: 1px solid #fecaca;
        }
        .arc-cell button.reject:hover {
          background: #fee2e2;
        }
        .arc-cell button.reject:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        @media (max-width: 768px) {
          .arc-cell {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {rowsByProduct.map((row) => {
        const open = openProducts.has(row.rfq_product_id);
        const counts = row.cells.reduce(
          (acc, c) => {
            const s = (c.status || "PENDING").toUpperCase();
            if (s === "APPROVED") acc.approved++;
            else if (s === "REJECTED") acc.rejected++;
            else acc.pending++;
            return acc;
          },
          { approved: 0, rejected: 0, pending: 0 }
        );

        return (
          <div key={row.rfq_product_id} className="arc-product-row">
            <div className="arc-product-head" onClick={() => toggleProduct(row.rfq_product_id)}>
              <div>
                <div className="arc-product-name">{row.product_name}</div>
                <div className="arc-product-meta">
                  {row.cells.length} vendor{row.cells.length === 1 ? "" : "s"} ·
                  {" "}{counts.approved} approved · {counts.rejected} rejected · {counts.pending} pending
                </div>
              </div>
              <span style={{ color: "#94a3b8", fontSize: 13 }}>{open ? "▴" : "▾"}</span>
            </div>
            {open && (
              <div className="arc-cell-body">
                {row.cells.map((cell) => {
                  const status = (cell.status || "PENDING").toUpperCase();
                  const pill = STATUS_COLORS[status] || STATUS_COLORS.PENDING;
                  const isPending = status === "PENDING";
                  const busy = busyCells.has(cell.id);
                  return (
                    <div key={cell.id} className="arc-cell">
                      <div>
                        <div className="vendor-name">{cell.vendor_name || `Vendor #${cell.vendor_id}`}</div>
                        <div className="vendor-id">arc_item #{cell.id}</div>
                      </div>
                      <div className="price">₹{Number(cell.unit_price || 0).toFixed(2)}</div>
                      <div>
                        {isPending && !readOnly ? (
                          <input
                            type="text"
                            className="remarks"
                            placeholder="Optional remark (required for reject)"
                            value={draftRemarks[cell.id] || ""}
                            onChange={(e) => setDraftRemarks((d) => ({ ...d, [cell.id]: e.target.value }))}
                          />
                        ) : (
                          <span style={{ color: "#94a3b8", fontSize: 12 }}>—</span>
                        )}
                      </div>
                      <div>
                        <span className="status-pill" style={{ background: pill.bg, color: pill.color }}>
                          {pill.label}
                        </span>
                      </div>
                      <div className="actions">
                        {isPending && !readOnly ? (
                          <>
                            <button
                              type="button"
                              className="approve"
                              disabled={busy}
                              onClick={() => handleCellAction(cell, "APPROVE")}
                            >
                              {busy ? "…" : "Approve"}
                            </button>
                            <button
                              type="button"
                              className="reject"
                              disabled={busy}
                              onClick={() => handleCellAction(cell, "REJECT")}
                            >
                              Reject
                            </button>
                          </>
                        ) : (
                          <span style={{ fontSize: 12, color: "#94a3b8" }}>
                            {readOnly ? "Read only" : "—"}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ProductArcMatrix;
