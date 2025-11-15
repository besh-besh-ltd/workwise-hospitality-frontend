import React, { useEffect, useState } from "react";
import {
  Card,
  Button,
  Form,
  Row,
  Col,
  Modal,
  Badge,
  Accordion,
} from "react-bootstrap";
import { BsArrowRight } from "react-icons/bs";
import { TbHierarchy } from "react-icons/tb";
import { toast } from "react-toastify";

import { getCompanyUsers } from "@/services/Auth";
import {
  createHierarchy,
  getHierarchy,
  updateHierarchy,
  // expected service to save mappings - adapt if your backend uses a different name
  updateHierarchyProjectMapping,
} from "@/services/general";

import { ALLOWED_PO_USERS } from "@/utils/constants";
import { addCommasToNumber, formatToINRShort } from "@/utils/sharedFunctions";
import { getProjectList } from "@/services/project";

const ApprovalHierarchyMultiPage = () => {
  // Tab control
  const [tab, setTab] = useState("display");

  // Users available to pick from
  const [users, setUsers] = useState([]);

  // All hierarchies returned from API
  const [allHierarchies, setAllHierarchies] = useState([]);

  // grouped by type
  const [grouped, setGrouped] = useState({});

  // selected shown hierarchy per type (hierarchy_id)
  const [selectedHierarchyByType, setSelectedHierarchyByType] = useState({});

  // local editing/previewing state when creating/updating a hierarchy
  const [previewApprovers, setPreviewApprovers] = useState([]);
  const [removableApprovers, setRemovableApprovers] = useState([]);

  // create/edit form
  const [formData, setFormData] = useState({
    module: "po",
    userId: "",
    bypass_cap: "",
    active: true,
    level: "",
    hierarchyId: "",
  });

  const [isEditMode, setIsEditMode] = useState(false);
  const [saving, setSaving] = useState(false);

  // edit modal (per user in preview)
  const [editModal, setEditModal] = useState({ show: false, user: null });
  const [editData, setEditData] = useState({ bypass_cap: "", active: true });

  // projects & mapping
  const [projects, setProjects] = useState([]);
  const [mappingModal, setMappingModal] = useState({ show: false, hierarchy: null, selected: [] });
  const [mappingSaving, setMappingSaving] = useState(false);

  // fetch company users
  const fetchCompanyUsers = async () => {
    try {
      const res = await getCompanyUsers();
      setUsers(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error(err.message ?? "Failed to fetch company users");
    }
  };

  // fetch projects
  const fetchProjects = async () => {
    try {
      const res = await getProjectList();
      if (res?.data) setProjects(res.data || []);
    } catch (err) {
      console.error(err);
      // fallback: if API not available, you can still map using a manual list
      toast.warning("Failed to fetch projects (check getProjectList service). Project-mapping will be disabled.");
      setProjects([]);
    }
  };

  // fetch all hierarchies
  const fetchAllHierarchies = async () => {
    try {
      const res = await getHierarchy();
      if (res?.data) {
        setAllHierarchies(res.data);
        const groupedObj = (res.data || []).reduce((acc, h) => {
          const type = h.hierarchy_type || "unknown";
          if (!acc[type]) acc[type] = [];
          acc[type].push(h);
          return acc;
        }, {});
        setGrouped(groupedObj);

        const defaults = {};
        Object.keys(groupedObj).forEach((type) => {
          defaults[type] = groupedObj[type][0]?.hierarchy_id || "";
        });
        setSelectedHierarchyByType(defaults);

        if (groupedObj.po && groupedObj.po[0]) {
          setPreviewApprovers(groupedObj.po[0].approvers || []);
          setFormData((f) => ({ ...f, module: "po", hierarchyId: groupedObj.po[0].hierarchy_id }));
          setIsEditMode(true);
        } else {
          setPreviewApprovers([]);
          setIsEditMode(false);
        }
      } else {
        setAllHierarchies([]);
        setGrouped({});
        setPreviewApprovers([]);
      }
    } catch (err) {
      console.error(err);
      toast.error(err.message ?? "Failed to fetch hierarchies");
    }
  };

  // select hierarchy for preview
  const selectHierarchy = (type, hierarchyId) => {
    const list = grouped[type] || [];
    const picked = list.find((h) => String(h.hierarchy_id) === String(hierarchyId));
    if (picked) {
      setPreviewApprovers(picked.approvers || []);
      setFormData((f) => ({ ...f, module: type, hierarchyId: picked.hierarchy_id }));
      setIsEditMode(true);
      setSelectedHierarchyByType((s) => ({ ...s, [type]: picked.hierarchy_id }));
    }
  };

  // go to create tab and load a hierarchy for editing
  const editHierarchy = (type, hierarchyId) => {
    const list = grouped[type] || [];
    const picked = list.find((h) => String(h.hierarchy_id) === String(hierarchyId));
    if (picked) {
      setPreviewApprovers(picked.approvers || []);
      setFormData((f) => ({ ...f, module: type, hierarchyId: picked.hierarchy_id }));
      setIsEditMode(true);
      setTab("create");
      setSelectedHierarchyByType((s) => ({ ...s, [type]: picked.hierarchy_id }));
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
      toast.info(`Editing hierarchy #${picked.hierarchy_id}`);
    } else {
      toast.error("Selected hierarchy not found");
    }
  };

  // mapping modal open
  const openMappingModal = (hierarchy) => {
    // hierarchy may contain mapping metadata like mapped_project_ids or project_mappings
    const existing = hierarchy.mapped_project_ids || [];
    const ids = Array.isArray(existing) ? existing.map((p) => parseInt(p.project_id)) : [];
    setMappingModal({ show: true, hierarchy, selected: ids });
  };

  const toggleProjectSelection = (projectId) => {
    setMappingModal((m) => {
      const exists = m.selected.includes(projectId);
      return { ...m, selected: exists ? m.selected.filter((p) => p !== projectId) : [...m.selected, projectId] };
    });
  };

  const saveMapping = async () => {
    if (!mappingModal.hierarchy) return;
    setMappingSaving(true);
    try {
      // call service - adapt if your API expects different args
      await updateHierarchyProjectMapping(mappingModal.hierarchy.hierarchy_id, mappingModal.hierarchy.hierarchy_type || formData.module, mappingModal.selected);
      toast.success("Mapping saved successfully");
      // refresh hierarchies so UI shows updated mapping
      await fetchAllHierarchies();
      setMappingModal({ show: false, hierarchy: null, selected: [] });
    } catch (err) {
      console.error(err);
      toast.error(err.message ?? "Failed to save mapping");
    } finally {
      setMappingSaving(false);
    }
  };

  // add user to current preview (create/edit)
  const handleAddUser = () => {
    const data = { ...formData };
    if (!data.userId || data.level === "" || data.level === null) {
      toast.error("Select user and level");
      return;
    }
    const bypassCap = data.bypass_cap ? parseInt(data.bypass_cap) : 0;

    let updatable = [...previewApprovers];

    updatable = updatable.filter((h) => h.id !== parseInt(data.userId));
    updatable = updatable.filter((h) => h.level !== parseInt(data.level));

    const user = users.find((u) => u.id === parseInt(data.userId));
    if (!user) {
      toast.error("Selected user not found");
      return;
    }

    updatable.push({
      ...user,
      bypass_cap: bypassCap,
      active: data.active,
      level: parseInt(data.level),
    });

    setPreviewApprovers(updatable);
    setFormData({ ...formData, userId: "", bypass_cap: "", level: "" });
  };

  // remove user from preview
  const removeUserFromPreview = (userId) => {
    setPreviewApprovers((prev) => prev.filter((p) => p.id !== userId));
    setRemovableApprovers((prev) => (!prev.includes(userId) ? [...prev, userId] : prev));
  };

  // shift user left/right in level
  const shiftUser = (id, direction) => {
    const idx = previewApprovers.findIndex((u) => u.id === id);
    if (idx === -1) return;
    const current = previewApprovers[idx];
    const newLevel = current.level + (direction === "left" ? -1 : 1);
    if (newLevel <= 0) return;
    const exist = previewApprovers.find((u) => u.level === newLevel);
    let updated = previewApprovers.map((u) => ({ ...u }));
    if (exist) updated = updated.map(u => u.id === exist.id ? ({...u, level: current.level}): u);
    updated[idx].level = newLevel;
    setPreviewApprovers(updated);
  };

  // save (create or update) current preview as hierarchy
  const handleSaveChanges = async () => {
    try {
      setSaving(true);
      const payload = previewApprovers.map((user) => ({
        user_id: user.id,
        approval_level: user.level,
        bypass_cap: user.bypass_cap ?? 0,
        is_active: !!user.active,
      }));

      if (isEditMode && formData.hierarchyId) {
        await updateHierarchy(formData.module, payload, removableApprovers, formData.hierarchyId);
        toast.success("Hierarchy updated successfully");
      } else {
        await createHierarchy(formData.module, payload);
        toast.success("Hierarchy created successfully");
      }

      await fetchAllHierarchies();
      setRemovableApprovers([]);
      setIsEditMode(false);
      setFormData((f) => ({ ...f, userId: "", bypass_cap: "", level: "", hierarchyId: "" }));
      setPreviewApprovers([]);
    } catch (err) {
      console.error(err);
      toast.error(err.message ?? "Failed to save hierarchy");
    } finally {
      setSaving(false);
    }
  };

  // editing single user's bypass/status
  const handleEdit = (user) => {
    setEditModal({ show: true, user });
    setEditData({ bypass_cap: user.bypass_cap, active: user.active });
  };
  const saveEdit = () => {
    setPreviewApprovers((prev) =>
      prev.map((u) => (u.id === editModal.user.id ? { ...u, bypass_cap: editData.bypass_cap, active: editData.active } : u))
    );
    setEditModal({ show: false, user: null });
  };

  const isHighestApprover = (user, list) => {
    const activeUsers = (list || []).filter((h) => h.level > 0 && h.active).sort((a, b) => a.level - b.level);
    if (activeUsers.length <= 0) return false;
    return activeUsers[activeUsers.length - 1].id === user.id;
  };

  useEffect(() => {
    fetchCompanyUsers();
    fetchAllHierarchies();
    fetchProjects();
  }, []);

  return (
    <>
      <section className="buyer-common-header sc-pt-80">
        <div className="container-fluid">
          <h1 className="heading">Manage Hierarchies</h1>
        </div>
      </section>

      <section className="buyer-rfq-sec-1 buyer-rfq-sec-tab">
        <div className="container-fluid">
          <div className="row">
            <div className="col-md-12">
              <div className="tabs-container">
                <button className={`tab ${tab === "display" ? "active" : ""}`} onClick={() => setTab("display")}>
                  Hierarchies
                </button>
                <button className={`tab ${tab === "create" ? "active" : ""}`} onClick={() => {
                  setTab("create");
                  setPreviewApprovers([]);
                  setIsEditMode(false);
                  setFormData((f) => ({ ...f, userId: "", bypass_cap: "", level: "", hierarchyId: "" }));
                }}>
                  Create Hierarchy
                </button>
              </div>

              {tab === "display" && (
                <div className="mx-4 mb-4">
                  <h4 className="mb-3 fw-medium">Existing Hierarchies</h4>

                  {Object.keys(grouped).length === 0 && (
                    <div className="d-flex flex-column" style={{ maxWidth: 400 }}>
                      <div className="mb-3 text-primary" style={{ fontSize: 56 }}>
                        <TbHierarchy />
                      </div>
                      <h4 className="mb-2 fw-semibold">No Hierarchies Found</h4>
                      <p className="mb-4 text-muted">Create a hierarchy to start organizing approvals.</p>
                      <Button variant="primary" onClick={() => setTab("create")}>Create Hierarchy</Button>
                    </div>
                  )}

                  {Object.keys(grouped).map((type) => (
                    <div key={type} className="mb-4">
                      <h5 className="mb-2 text-capitalize fw-medium mb-2">{type} hierarchies</h5>
                      <Accordion defaultActiveKey="0" alwaysOpen>
                        {grouped[type].map((h, idx) => (
                          <Accordion.Item eventKey={`${type}-${idx}`} key={h.hierarchy_id}>
                            <Accordion.Header>
                              <div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div>
                                  <strong>Hierarchy #{h.hierarchy_id}</strong>
                                  <div className="small text-muted">{h.approvers?.length ?? 0} approver(s) • Created: {h.approvers?.[0]?.created_at ? new Date(h.approvers[0].created_at).toLocaleString() : "-"}</div>
                                </div>

                                <div className="d-flex gap-2 me-4">
                                  <Button size="sm" variant="outline-secondary" className="p-2" onClick={(e) => { e.stopPropagation(); editHierarchy(type, h.hierarchy_id); }}>Edit</Button>

                                  <Button size="sm" variant="outline-secondary" className="p-2" onClick={(e) => { e.stopPropagation(); openMappingModal(h); }}>
                                    Map Projects
                                  </Button>
                                </div>
                              </div>
                            </Accordion.Header>

                            <Accordion.Body>
                              <div className="d-flex flex-wrap gap-3">
                                {(h.approvers || [])
                                  .filter((a) => a.level > 0)
                                  .sort((a, b) => a.level - b.level)
                                  .map((user, i, self) => (
                                    <React.Fragment key={user.id + "-" + user.level}>
                                      <Card style={{ width: "320px", position: "relative" }} className="shadow-sm">
                                        <Card.Body>
                                          <h6 className="mb-1">{user.name}</h6>
                                          <p className="mb-2 small text-muted">{user.email}</p>
                                          <p className="mb-1"><strong>Level:</strong> {user.level}{isHighestApprover(user, h.approvers) && <small className="fw-medium"> (Highest Approver)</small>}</p>
                                          <p className="mb-1"><strong>Approval Amount:</strong> ₹{user.bypass_cap ? formatToINRShort(user.bypass_cap) : "-"}</p>
                                          <p className="mb-0"><strong>Status: </strong><Badge bg={user.active ? "success" : "secondary"}>{user.active ? "Active" : "Inactive"}</Badge></p>
                                        </Card.Body>
                                      </Card>

                                      {i < self.length - 1 && (
                                        <div className="d-flex flex-column justify-content-center">
                                          <BsArrowRight className={`${self[i + 1].active ? "text-success" : "text-danger"}`} size={35} />
                                          {!self[i + 1].active && <p className="fw-semibold mb-0 text-danger">SKIP</p>}
                                        </div>
                                      )}
                                    </React.Fragment>
                                  ))}

                                {/* show mapped projects (if any) */}
                                <div style={{ minWidth: 320 }}>
                                  <Card className="shadow-sm">
                                    <Card.Body>
                                      <h6 className="mb-1">Mapped Projects</h6>
                                      <div className="small text-muted mb-2">
                                        {h.mapped_project_ids && h.mapped_project_ids.length > 0
                                          ? `${h.mapped_project_ids.length} project(s) mapped`
                                          : (h.project_mappings && h.project_mappings.length > 0
                                            ? `${h.project_mappings.length} project(s) mapped`
                                            : "No projects mapped")}
                                      </div>

                                      {(h.mapped_project_ids || []).slice(0, 3).map((pid, i) => {
                                        const id = pid.project_id;
                                        const p = projects.find((pp) => String(pp.id) === String(id));
                                        return <div key={i} className="small">• {p ? p.name : `Project #${id}`}</div>;
                                      })}

                                      <div className="mt-2">
                                        <Button size="sm" variant="outline-secondary" className="p-2 mt-2" onClick={() => openMappingModal(h)}>Edit Mapping</Button>
                                      </div>
                                    </Card.Body>
                                  </Card>
                                </div>

                              </div>
                            </Accordion.Body>
                          </Accordion.Item>
                        ))}
                      </Accordion>
                    </div>
                  ))}
                </div>
              )}

              {tab === "create" && (
                <Row className="mx-3 mb-4">
                  <Col md={5}>
                    <Form.Group className="mb-3">
                      <Form.Label>Module / Type</Form.Label>
                      <Form.Select value={formData.module} onChange={(e) => setFormData({ ...formData, module: e.target.value })}>
                        <option value="po">Purchase Order (po)</option>
                      </Form.Select>
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>Select User</Form.Label>
                      <Form.Select value={formData.userId} onChange={(e) => setFormData({ ...formData, userId: e.target.value })}>
                        <option value="">Select</option>
                        {users.filter((u) => ALLOWED_PO_USERS.includes(u.role)).map((u) => (
                          <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                      </Form.Select>
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>Bypass Cap (₹)</Form.Label>
                      <Form.Control type="number" min={0} value={formData.bypass_cap} onChange={(e) => setFormData({ ...formData, bypass_cap: e.target.value })} />
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>Level</Form.Label>
                      <Form.Control type="number" min={1} max={99} value={formData.level} onChange={(e) => {
                        const v = e.target.value;
                        if ((v === "") || (parseInt(v) > 0 && parseInt(v) < 100)) {
                          setFormData({ ...formData, level: v });
                        }
                      }} />
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>Status</Form.Label>
                      <Form.Select value={String(formData.active)} onChange={(e) => setFormData({ ...formData, active: e.target.value === "true" })}>
                        <option value="true">Active</option>
                        <option value="false">Inactive</option>
                      </Form.Select>
                    </Form.Group>

                    <div className="d-flex gap-2">
                      <Button disabled={!formData.userId || !formData.level} onClick={handleAddUser} className="mt-1 p-2">Add User</Button>

                      <Button variant="secondary" onClick={() => {
                        if (isEditMode && formData.hierarchyId) {
                          toast.info("Currently editing existing hierarchy—make changes and Save.");
                        } else {
                          setPreviewApprovers([]);
                          setFormData({ ...formData, userId: "", bypass_cap: "", level: "", hierarchyId: "" });
                          setIsEditMode(false);
                        }
                      }} className="mt-1 p-2">Reset</Button>
                    </div>

                    <p className="mt-2"><strong>NOTE:</strong> If a user already exists with given level, they will be replaced by the new entry.</p>
                  </Col>

                  <Col md={7}>
                    <h6 className="mb-2.5">Preview:</h6>

                    {previewApprovers?.length === 0 && (
                      <Card className="mb-2">
                        <Card.Body>
                          <div>
                            <strong>No approvers added yet</strong>
                            <div className="small text-muted">Add approvers using the form on the left.</div>
                          </div>
                        </Card.Body>
                      </Card>
                    )}

                    {previewApprovers.slice().sort((a, b) => a.level - b.level).map((user) => (
                      <Card key={user.id + "-" + user.level} className="mb-2">
                        <Card.Body>
                          <div className="d-flex justify-content-between">
                            <div>
                              <strong>{user.name} {isHighestApprover(user, previewApprovers) ? <small className="text-muted fw-medium">(Highest Approver)</small> : null}</strong>
                              <br />
                              <small>{user.email}</small>
                              <br />
                              <small>Level: {user.level} | ₹{addCommasToNumber(user.bypass_cap)} | <Badge bg={user.active ? "success" : "secondary"}>{user.active ? "Active" : "Inactive"}</Badge></small>
                            </div>

                            <div className="d-flex flex-column gap-2">
                              <div className="d-flex gap-1">
                                <button className="btn btn-light p-2" onClick={() => shiftUser(user.id, "left")}>Shift Up</button>
                                <button className="btn btn-light p-2" onClick={() => shiftUser(user.id, "right")}>Shift Down</button>
                              </div>
                              <div className="d-flex gap-1">
                                <button className="btn btn-primary p-2" onClick={() => { setFormData({ ...formData, userId: user.id, bypass_cap: user.bypass_cap, level: user.level, active: user.active, }); }}>Edit</button>
                                <button className="btn btn-danger p-2" onClick={() => removeUserFromPreview(user.id)}>Remove</button>
                              </div>
                            </div>
                          </div>
                        </Card.Body>
                      </Card>
                    ))}

                    <hr />

                    <Button disabled={saving || previewApprovers.length === 0} variant="success" className="mt-1 p-2" onClick={handleSaveChanges}>{saving ? "Saving..." : isEditMode ? "Update Hierarchy" : "Create Hierarchy"}</Button>
                  </Col>
                </Row>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* mapping modal */}
      <Modal centered show={mappingModal.show} onHide={() => setMappingModal({ show: false, hierarchy: null, selected: [] })} size="lg">
        <Modal.Header closeButton className="mx-4 my-3 mb-1">
          <Modal.Title>Map Projects to Hierarchy {mappingModal.hierarchy?.hierarchy_id ?? ""}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {projects.length === 0 && <p className="text-muted">No projects available to map.</p>}

          {projects.length > 0 && (
            <div style={{ maxHeight: 420, overflowY: "auto" }}>
              {projects.map((p) => (
                <Form.Check
                  key={p.id}
                  id={`proj-${p.id}`}
                  className="mb-2"
                  type="checkbox"
                  label={`${p.name} (#${p.id})`}
                  checked={mappingModal.selected.includes(p.id)}
                  onChange={() => toggleProjectSelection(p.id)}
                />
              ))}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setMappingModal({ show: false, hierarchy: null, selected: [] })}>Cancel</Button>
          <Button variant="primary" disabled={mappingSaving} onClick={saveMapping}>{mappingSaving ? "Saving..." : "Save Mapping"}</Button>
        </Modal.Footer>
      </Modal>

      {/* edit user modal */}
      <Modal centered show={editModal.show} onHide={() => setEditModal({ show: false, user: null })}>
        <Modal.Header closeButton>
          <Modal.Title className="m-3 mb-0 mt-2">Edit User</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Bypass Cap (₹)</Form.Label>
            <Form.Control type="number" min={0} value={editData.bypass_cap} onChange={(e) => setEditData({ ...editData, bypass_cap: parseInt(e.target.value) })} />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Status</Form.Label>
            <Form.Select value={editData.active} onChange={(e) => setEditData({ ...editData, active: e.target.value === "true" })}>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </Form.Select>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="danger" onClick={() => { if (!editModal.user) return; removeUserFromPreview(editModal.user.id); setEditModal({ show: false, user: null }); }}>Delete</Button>
          <Button variant="primary" onClick={saveEdit}>Save</Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default ApprovalHierarchyMultiPage;
