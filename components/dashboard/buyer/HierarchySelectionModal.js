import { formatToINRShort } from "@/utils/sharedFunctions";
import React, { useState, useMemo, useEffect } from "react";
import { Modal, Button, Form, Badge, Card } from "react-bootstrap";

/**
 * HierarchySelectionModal
 *
 * Props:
 * - show: boolean
 * - onHide: fn
 * - hierarchies: array of hierarchies from API. Each item expected shape:
 *    {
 *      hierarchy_type: "po",
 *      hierarchy_id: "1",
 *      approvers: [{ id, name, email, level, bypass_cap, active, ... }, ...],
 *      is_default: true|false,
 *      created_at?: "...",
 *      mapped_project_ids?: [...]
 *    }
 * - currentUserId (optional): number - used only for UX, API guarantees approvers will include the current user
 * - onConfirm: fn(selectedHierarchy) -> called with the selected hierarchy object (or null if none)
 *
 * Usage:
 * <HierarchySelectionModal show={show} onHide={...} hierarchies={list} onConfirm={(h) => { ... }} />
 */
const HierarchySelectionModal = ({
  show,
  onHide,
  hierarchies = [],
  currentUserId = null,
  onConfirm,
}) => {
  const [selectedId, setSelectedId] = useState(
    hierarchies.find((h) => h.is_default)?.hierarchy_id
  );

  useEffect(() => {
    if (hierarchies) {
      setSelectedId(hierarchies.find((h) => h.is_default)?.hierarchy_id);
    }
  }, [hierarchies]);

  // Group hierarchies by type for neat display
  const byType = useMemo(() => {
    const g = {};
    (hierarchies || []).forEach((h) => {
      const t = h.hierarchy_type || "unknown";
      if (!g[t]) g[t] = [];
      g[t].push(h);
    });
    return g;
  }, [hierarchies]);

  const handleConfirm = () => {
    const pick = (hierarchies || []).find(
      (h) => String(h.hierarchy_id) === String(selectedId)
    );
    onConfirm?.(parseInt(pick?.hierarchy_id) ?? null);
    // keep modal control to parent; close here for convenience
    setSelectedId(null);
    onHide?.();
  };

  const clearAndClose = () => {
    setSelectedId(null);
    onHide?.();
  };

  return (
    <Modal
      show={show}
      onHide={clearAndClose}
      centered
      size="lg"
      contentClassName="p-3"
      dialogClassName="custom-modal-width"
    >
      <Modal.Header closeButton>
        <Modal.Title className="fw-semibold fs-4 ms-3">
          Select Approval Hierarchy
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="pt-2 pb-3">
        <p className="text-muted small mb-3">
          Choose an approval hierarchy to apply for this operation. The list
          shows hierarchies you have access to — the approvers list will include
          you.
        </p>

        {hierarchies?.length === 0 ? (
          <div className="text-muted">No hierarchies available.</div>
        ) : (
          Object.keys(byType).map((type) => (
            <div key={type} className="mb-3 d-flex flex-column gap-2">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <div className="fw-bold text-capitalize">
                  {type.toUpperCase().replace("_", " ")} hierarchies
                </div>
                <div className="small text-muted">
                  {byType[type].length} found
                </div>
              </div>

              {byType[type].map((h) => {
                const approvers = h.approvers || [];
                // extract some quick metadata
                const created =
                  approvers?.[0]?.created_at || h.created_at || null;
                const approverCount = approvers.length;
                const highest = approvers
                  .filter((a) => a.level > 0)
                  .sort((a, b) => a.level - b.level)
                  .slice(-1)[0];

                return (
                  <div className="d-flex flex-column gap-2">
                    <Card key={h.hierarchy_id} className="shadow-sm">
                      <Card.Body className="p-3">
                        <div className="d-flex align-items-start gap-3">
                          <div style={{ minWidth: 42 }}>
                            <Form.Check
                              type="radio"
                              id={`hier-${h.hierarchy_id}`}
                              checked={
                                String(selectedId) === String(h.hierarchy_id)
                              }
                              onChange={() => setSelectedId(h.hierarchy_id)}
                              aria-label={`Select hierarchy ${h.hierarchy_id}`}
                            />
                          </div>

                          <div style={{ flex: 1 }}>
                            <div className="d-flex align-items-center gap-2 mb-1">
                              <div className="fw-semibold">
                                Hierarchy #{h.hierarchy_id}
                              </div>

                              {h.is_default ? (
                                <Badge
                                  bg="success"
                                  className="text-uppercase small"
                                >
                                  Default
                                </Badge>
                              ) : (
                                <Badge
                                  bg="secondary"
                                  className="text-uppercase small"
                                >
                                  Standard
                                </Badge>
                              )}

                              <div className="small text-muted ms-2">
                                {approverCount} approver(s)
                              </div>
                            </div>

                            <div className="d-flex align-items-center gap-3 flex-wrap">
                              {/* small approver avatar cluster (initials) */}
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: -10,
                                }}
                              >
                                {approvers.slice(0, 4).map((a, i) => (
                                  <div
                                    key={a.id}
                                    title={`${a.name} • ${a.email}`}
                                    style={{
                                      width: 34,
                                      height: 34,
                                      borderRadius: "50%",
                                      background: "#f1f5f9",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      fontWeight: 700,
                                      fontSize: 12,
                                      border: "2px solid #fff",
                                      boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                                      marginLeft: i === 0 ? 0 : -10,
                                    }}
                                  >
                                    {a.name
                                      .split(" ")
                                      .map((n) => n[0])
                                      .slice(0, 2)
                                      .join("")}
                                  </div>
                                ))}
                                {approvers.length > 4 && (
                                  <div className="small text-muted ms-2">
                                    +{approvers.length - 4}
                                  </div>
                                )}
                              </div>

                              {/* short details */}
                              <div className="small text-muted">
                                {highest ? (
                                  <>
                                    Highest approver:{" "}
                                    <strong className="text-dark">
                                      {highest.name}
                                    </strong>
                                  </>
                                ) : (
                                  "No active approver"
                                )}
                                {created && (
                                  <span className="ms-2">
                                    • Created:{" "}
                                    {new Date(created).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </Card.Body>
                    </Card>
                    {String(selectedId) === String(h.hierarchy_id) && (
                      <Card>
                        <Card.Body
                          style={{ paddingTop: 12 }}
                          className="px-3 d-flex flex-column gap-3"
                        >
                          {approvers.map((u) => (
                            <div>
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  gap: "14px",
                                }}
                              >
                                <div>
                                  <div style={{ fontWeight: 600, fontSize: 14 }}>
                                    {u.name} <span className="small text-muted"> – Level {u.level}</span>
                                  </div>
                                  <div
                                    className="text-muted"
                                    style={{ fontSize: 12 }}
                                  >
                                    {u.email}
                                  </div>
                                </div>
                                <div style={{ textAlign: "right" }}>
                                  <div className="small">
                                    ₹
                                    {u.bypass_cap
                                      ? formatToINRShort(u.bypass_cap)
                                      : "-"}
                                  </div>
                                  <Badge
                                    bg={u.active ? "success" : "secondary"}
                                    className="mt-1"
                                  >
                                    {u.active ? "Active" : "Inactive"}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          ))}
                        </Card.Body>
                      </Card>
                    )}
                  </div>
                );
              })}
            </div>
          ))
        )}
      </Modal.Body>

      <Modal.Footer className="d-flex justify-content-end gap-2">
        <Button
          variant="outline-secondary"
          className="p-2"
          onClick={() => {
            setSelectedId(null);
            onHide?.();
          }}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          className="p-2"
          disabled={!selectedId}
          onClick={handleConfirm}
        >
          Apply Hierarchy
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default HierarchySelectionModal;
