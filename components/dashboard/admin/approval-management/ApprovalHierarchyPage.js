import { getCompanyUsers } from "@/services/Auth";
import {
  createHierarchy,
  getHierarchy,
  updateHierarchy,
} from "@/services/general";
import { ALLOWED_PO_USERS } from "@/utils/constants";
import { addCommasToNumber, formatToINRShort } from "@/utils/sharedFunctions";
import React, { useState, useEffect } from "react";
import {
  Card,
  Button,
  Form,
  Row,
  Col,
  Modal,
  Tabs,
  Tab,
  Dropdown,
  Badge,
  Container,
} from "react-bootstrap";
import { BsArrowRight } from "react-icons/bs";
import { TbHierarchy } from "react-icons/tb";
import { toast } from "react-toastify";

const ApprovalHierarchyPage = () => {
  const [tab, setTab] = useState("display");
  const [users, setUsers] = useState([]);

  const [hierarchy, setHierarchy] = useState([]);
  const [removableApprovers, setRemovableApprovers] = useState([]);
  const [isEdit, setIsEdit] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    userId: "",
    bypass_cap: "",
    active: true,
    level: "",
  });
  const [editModal, setEditModal] = useState({ show: false, user: null });
  const [finalApproverModal, setFinalApproverModal] = useState(false);
  const [editData, setEditData] = useState({ bypass_cap: "", active: true });
  const [finalApproverData, setFinalApproverData] = useState({ user: null, active: true });

  const fetchCompanyUsers = async () => {
    try {
      const res = await getCompanyUsers();
      setUsers(res.data);
    } catch (error) {
      console.error(error);
      toast.error(
        error.message ?? "Something went wrong while fetching company users!"
      );
    }
  };

  const fetchHierarchy = async () => {
    try {
      const res = await getHierarchy("po");
      if (res.data && res.data.length > 0) {
        setHierarchy(res.data?.[0].approvers ?? []);
        setIsEdit(true);
      }
    } catch (error) {
      console.error(error);
      toast.error(
        error.message ?? "Something went wrong while fetching company users!"
      );
    }
  };

  const handleAddUser = () => {
    const data = { ...formData }
    if(!data.userId || (!data.active == undefined) || !data.level) return;

    if(!data.bypass_cap) data.bypass_cap = 0;

    let updatableHierarchy = [...hierarchy];

    if (updatableHierarchy.find((h) => h.id === parseInt(data.userId))) {
      updatableHierarchy = updatableHierarchy.filter(
        (h) => h.id != parseInt(data.userId)
      );
    }

    const user = users.find((u) => u.id === parseInt(data.userId));
    if (
      !user ||
      updatableHierarchy.find((h) => h.level === parseInt(data.level))
    ) {
      updatableHierarchy = updatableHierarchy.filter(
        (h) => h.level != parseInt(data.level)
      );
    }
    setHierarchy([
      ...updatableHierarchy,
      {
        ...user,
        bypass_cap: parseInt(data.bypass_cap),
        active: data.active,
        level: parseInt(data.level),
      },
    ]);
    setFormData({ userId: "", bypass_cap: "", active: true, level: "" });
  };

  const handleSaveChanges = async () => {
    try {
      setSaving(true);
      const payload = hierarchy.map((user) => ({
        user_id: user.id,
        approval_level: user.level,
        bypass_cap: user.bypass_cap,
        is_active: user.active,
      }));

      await (isEdit
        ? updateHierarchy("po", payload, removableApprovers)
        : createHierarchy("po", payload));

      toast.success(
        `Hierarchy has been ${isEdit ? "Edited" : "Created"} successfully`
      );
    } catch (error) {
      console.error(error);
      toast.error(
        error.message ?? "Something went wrong while fetching saving hierarchy!"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (user) => {
    setEditModal({ show: true, user });
    setEditData({ bypass_cap: user.bypass_cap, active: user.active });
  };

  const saveEdit = () => {
    setHierarchy(
      hierarchy.map((u) =>
        u.id === editModal.user.id
          ? { ...u, bypass_cap: editData.bypass_cap, active: editData.active }
          : u
      )
    );
    setEditModal({ show: false, user: null });
  };

  const handleFinalApprover = (user) => {
    setFinalApproverModal(true);
    setFinalApproverData({ user, active: user?.active ?? true });
  };

  const saveFinalApprover = () => {
    const data = { ...finalApproverData }
    if(!data.user || (!data.active == undefined)) return;

    if(!data.bypass_cap) data.bypass_cap = 0;

    let updatableHierarchy = [...hierarchy];

    if(updatableHierarchy.find(u => u.id == data.user)) {
      toast.error("Selected user is already included in the hierarchy, please select another user!")
      setFinalApproverModal(false);
      return;
    }

    if (updatableHierarchy.find((h) => h.level === -1)) {
      updatableHierarchy = updatableHierarchy.filter(
        (h) => h.level != -1
      );
    }

    const user = users.find((u) => u.id === parseInt(data.user));
    setHierarchy([
      ...updatableHierarchy,
      {
        ...user,
        bypass_cap: parseInt(data.bypass_cap),
        active: data.active,
        level: -1,
      },
    ]);
    setFinalApproverData({ user: null, active: true });
    setFinalApproverModal(false);
  };

  const deleteUser = () => {
    setHierarchy(hierarchy.filter((u) => u.id !== editModal.user.id));
    setRemovableApprovers((prev) =>
      !prev.includes(editModal.user.id) ? [...prev, editModal.user.id] : prev
    );
    setEditModal({ show: false, user: null });
  };

  const shiftUser = (id, direction) => {
    const idx = hierarchy.findIndex((u) => u.id === id);
    if (direction === "left" && ((hierarchy[idx].level - 1) <= 0 || !hierarchy.some(h => h.level == (hierarchy[idx].level - 1)))) return;

    const newLevel = hierarchy[idx].level + (direction === "left" ? -1 : 1);
    const existHierarcyWithLevel = hierarchy.find((u) => u.level === newLevel);
    if (existHierarcyWithLevel) {
      existHierarcyWithLevel.level = hierarchy[idx].level;
    }
    const updated = [...hierarchy];
    updated[idx].level = newLevel;
    setHierarchy(updated);
  };

  const isHighestApprover = (user, hierarchy) => {
    const activeUsers = hierarchy.filter(h => h.level > 0 && h.active)
    if(activeUsers.length <= 0) return false;
    return activeUsers[activeUsers.length - 1].id == user.id;
  }

  const getFinalApproverLayout = (hierarchy) => {
    const finalApprover = hierarchy.find(h => h.level == -1);
    return (
      <Card
        style={{ height: 240, minWidth: "320px", position: "relative" }}
        className="shadow-sm"
      >
        <Card.Body>
          <h6 className="mb-1">{finalApprover?.name || "NO FINAL APPROVER SELECTED"}</h6>
          <p className="mb-2 small text-muted">{finalApprover?.email || "-"}</p>
          <p className="mb-1">
            <strong>Level:</strong> Final Approver
          </p>
          <p className="mb-0">
            <strong>Status: </strong>
            {finalApprover ? (
              <Badge bg={finalApprover?.active ? 'success' : 'secondary'}>{finalApprover?.active ? 'Active' : 'Inactive'}</Badge>
            ) : (
              <Badge bg="warning">Not Selected</Badge>
            )}
          </p>
          <button onClick={() => handleFinalApprover(finalApprover)} className="btn btn-light p-2 mt-5">Edit</button>
        </Card.Body>
      </Card>
    );
  }

  useEffect(() => {
    fetchCompanyUsers();
    fetchHierarchy();
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
                <button
                  className={`tab ${tab === "display" ? "active" : ""}`}
                  onClick={() => setTab("display")}
                  id="display_hierarchy_tab-hierarchy_tabs-approval_hierarchy_page"
                >
                  Display Hierarchy
                </button>
                <button
                  className={`tab ${tab === "create" ? "active" : ""}`}
                  onClick={() => setTab("create")}
                  id="create_hierarchy_tab-hierarchy_tabs-approval_hierarchy_page"
                >
                  Create Hierarchy
                </button>
              </div>

              {tab === "display" && (
                <div className="mx-4 mb-4">
                  <h4 className="mb-3 fw-medium">Purchase Order Hierarchy</h4>
                  {hierarchy && Array.isArray(hierarchy) && hierarchy.length > 0 ? (
                    <div className="d-flex gap-3">
                      {getFinalApproverLayout(hierarchy)}

                      <div class="vr mx-2"></div>

                      <div className="d-flex flex-wrap gap-3">
                        {hierarchy
                        .filter(h => h.level > 0)
                        .sort((a, b) => a.level - b.level)
                        .map((user, index, self) => (
                          <>
                            <Card
                              key={user.id}
                              style={{ width: "320px", position: "relative" }}
                              className="shadow-sm"
                            >
                              <Card.Body>
                                <h6 className="mb-1">{user.name}</h6>
                                <p className="mb-2 small text-muted">
                                  {user.email}
                                </p>
                                <p className="mb-1">
                                  <strong>Level:</strong> {user.level}
                                  {isHighestApprover(user, hierarchy) && (
                                    <small className="fw-medium">
                                      {" "}
                                      (Highest Approver)
                                    </small>
                                  )}
                                </p>
                                <p className="mb-1">
                                  <strong>Approval Amount:</strong> ₹
                                  {user.bypass_cap
                                    ? formatToINRShort(user.bypass_cap)
                                    : "-"}
                                </p>
                                <p className="mb-0">
                                  <strong>Status: </strong>
                                  <Badge
                                    bg={user.active ? "success" : "secondary"}
                                  >
                                    {user.active ? "Active" : "Inactive"}
                                  </Badge>
                                </p>
                                <Dropdown className="mt-3">
                                  <Dropdown.Toggle variant="light" size="sm">
                                    Options
                                  </Dropdown.Toggle>
                                  <Dropdown.Menu>
                                    <Dropdown.Item
                                      onClick={() => shiftUser(user.id, "left")}
                                      id={`shift_left_${user.id}-user_actions-approval_hierarchy_page`}
                                    >
                                      Shift Left
                                    </Dropdown.Item>
                                    <Dropdown.Item
                                      onClick={() =>
                                        shiftUser(user.id, "right")
                                      }
                                      id={`shift_right_${user.id}-user_actions-approval_hierarchy_page`}
                                    >
                                      Shift Right
                                    </Dropdown.Item>
                                    <Dropdown.Item
                                      onClick={() => handleEdit(user)}
                                      id={`edit_user_${user.id}-user_actions-approval_hierarchy_page`}
                                    >
                                      Edit
                                    </Dropdown.Item>
                                  </Dropdown.Menu>
                                </Dropdown>
                              </Card.Body>
                            </Card>
                            {index < self.length - 1 && (
                              <div className="d-flex flex-column justify-content-center">
                                <BsArrowRight
                                  className={`${
                                    self[index + 1].active
                                      ? "text-success"
                                      : "text-danger"
                                  }`}
                                  size={35}
                                />
                                {!self[index + 1].active && (
                                  <p className="fw-semibold mb-0 text-danger">
                                    SKIP
                                  </p>
                                )}
                              </div>
                            )}
                          </>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div
                      className="d-flex flex-column"
                      style={{ maxWidth: 400 }}
                    >
                      <div
                        className="mb-3 text-primary"
                        style={{ fontSize: 56 }}
                      >
                        <TbHierarchy />
                      </div>
                      <h4 className="mb-2 fw-semibold">
                        No PO Hierarchy Found
                      </h4>
                      <p className="mb-4 text-muted">
                        Create a hierarchy to start organizing your POs.
                      </p>
                      <Button
                        variant="primary"
                        className="p-2"
                        onClick={() => setTab("create")}
                        id="create_hierarchy-empty_state-approval_hierarchy_page"
                      >
                        Create Hierarchy
                      </Button>
                    </div>
                  )}
                  {hierarchy && Array.isArray(hierarchy) && hierarchy.length > 0 && (
                    <Button
                      disabled={saving}
                      onClick={handleSaveChanges}
                      variant="primary"
                      className="mt-4 p-2"
                      id="save_changes-display_hierarchy-approval_hierarchy_page"
                    >
                      {saving ? "Saving..." : "Save Changes"}
                    </Button>
                  )}
                </div>
              )}
              {tab === "create" && (
                <Row className="mx-3 mb-4">
                  <Col md={5}>
                    <Form.Group className="mb-3">
                      <Form.Label>Select User</Form.Label>
                      <Form.Select
                        value={formData.userId}
                        onChange={(e) =>
                          setFormData({ ...formData, userId: e.target.value })
                        }
                      >
                        <option value="">Select</option>
                        {users.filter(u => ALLOWED_PO_USERS.includes(u.role) ).map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label>Bypass Cap (₹)</Form.Label>
                      <Form.Control
                        type="number"
                        min={0}
                        value={formData.bypass_cap}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            bypass_cap: e.target.value,
                          })
                        }
                      />
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label>Level</Form.Label>
                      <Form.Control
                        type="number"
                        min={1}
                        max={99}
                        value={formData.level}
                        onChange={(e) => {
                          if((parseInt(e.target.value) > 0 && parseInt(e.target.value) < 100) || e.target.value == "")
                           setFormData({ ...formData, level: e.target.value })
                        }
                        }
                      />
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label>Status</Form.Label>
                      <Form.Select
                        value={formData.active}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            active: e.target.value === "true",
                          })
                        }
                      >
                        <option value="true">Active</option>
                        <option value="false">Inactive</option>
                      </Form.Select>
                    </Form.Group>
                    <Button
                      disabled={
                        (!formData.active == undefined) || !formData.level || !formData.userId
                      }
                      onClick={handleAddUser}
                      className="mt-1 p-2"
                      id="add_user-create_hierarchy-approval_hierarchy_page"
                    >
                      Add User
                    </Button>
                    <p className="mt-2">
                      <strong>NOTE: </strong>If a user already exist with given
                      level, they will be replaced by the new entry, effectively
                      removing them from the hierarchy completely!
                    </p>
                  </Col>

                  <Col md={7}>
                    <h6 className="mb-2.5">Preview:</h6>
                    {hierarchy
                      ?.sort((a, b) => a.level - b.level)
                      .map((user) => (
                        <Card key={user.id} className={`mb-2`}>
                          <Card.Body>
                            <div className="d-flex justify-content-between">
                              <div>
                                <strong>{user.name} {isHighestApprover(user, hierarchy) ? <small className="text-muted fw-medium">(Highest Approver)</small>: ""}</strong>
                                <br />
                                <small>{user.email}</small>
                                <br />
                                <small>
                                  Level: {user.level} | ₹
                                  {addCommasToNumber(user.bypass_cap)} |{" "}
                                  <Badge
                                    bg={user.active ? "success" : "secondary"}
                                  >
                                    {user.active ? "Active" : "Inactive"}
                                  </Badge>
                                </small>
                              </div>
                              <button
                                className="btn btn-primary p-2"
                                onClick={() => {
                                  setFormData({
                                    userId: user.id,
                                    bypass_cap: user.bypass_cap,
                                    level: user.level,
                                    active: user.active,
                                  });
                                }}
                                id={`edit_user_preview_${user.id}-preview_actions-approval_hierarchy_page`}
                              >
                                Edit
                              </button>
                            </div>
                          </Card.Body>
                        </Card>
                      ))}

                      <hr/>

                      <Card className={`mb-2`}>
                          <Card.Body>
                            <div className="d-flex justify-content-between">
                              <div>
                                <strong>Kushal Shah</strong> <small className="text-muted fw-medium">(Final Approver)</small>
                                <br />
                                <small>kushal@letsworkwise.com</small>
                                <br />
                                <small>
                                  <Badge
                                    bg={"success"}
                                  >
                                    {"Active"}
                                  </Badge>
                                </small>
                              </div>
                              <button
                                className="btn btn-primary p-2"
                              >
                                Edit
                              </button>
                            </div>
                          </Card.Body>
                        </Card>
                    <Button
                      disabled={saving}
                      variant="success"
                      className="mt-1 p-2"
                      onClick={async () => {
                        await handleSaveChanges();
                      }}
                      id={isEdit ? "update_hierarchy-create_hierarchy-approval_hierarchy_page" : "create_hierarchy-create_hierarchy-approval_hierarchy_page"}
                    >
                      {saving ? "Saving..." : isEdit ? "Update Hierarchy" : "Create Hierarchy"}
                    </Button>
                  </Col>
                </Row>
              )}
            </div>
          </div>
        </div>
        <Modal
          centered
          show={editModal.show}
          onHide={() => setEditModal({ show: false, user: null })}
        >
          <Modal.Header closeButton>
            <Modal.Title className="m-3 mb-0 mt-2">Edit User</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Bypass Cap (₹)</Form.Label>
              <Form.Control
                type="number"
                min={0}
                value={editData.bypass_cap}
                onChange={(e) =>
                  setEditData({
                    ...editData,
                    bypass_cap: parseInt(e.target.value),
                  })
                }
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Status</Form.Label>
              <Form.Select
                value={editData.active}
                onChange={(e) =>
                  setEditData({
                    ...editData,
                    active: e.target.value === "true",
                  })
                }
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </Form.Select>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button className="p-2" variant="danger" onClick={deleteUser} id="delete_user-edit_modal-approval_hierarchy_page">
              Delete
            </Button>
            <Button className="p-2" variant="primary" onClick={saveEdit} id="save_user_edit-edit_modal-approval_hierarchy_page">
              Save
            </Button>
          </Modal.Footer>
        </Modal>

        <Modal
          centered
          show={finalApproverModal}
          onHide={() => setFinalApproverModal(false)}
        >
          <Modal.Header closeButton>
            <Modal.Title className="m-3 mb-0 mt-2">Update Final Approver</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Select User</Form.Label>
              <Form.Select
                value={finalApproverData.user}
                onChange={(e) =>
                  setFinalApproverData({ ...finalApproverData, user: e.target.value })
                }
              >
                <option value="">Select</option>
                {users.filter(u => ALLOWED_PO_USERS.includes(u.role) ).map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Status</Form.Label>
              <Form.Select
                value={finalApproverData.active}
                onChange={(e) =>
                  setEditData({
                    ...finalApproverData,
                    active: e.target.value === "true",
                  })
                }
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </Form.Select>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button className="p-2" variant="primary" onClick={saveFinalApprover}>
              Save
            </Button>
          </Modal.Footer>
        </Modal>
      </section>
    </>
  );
};

export default ApprovalHierarchyPage;
