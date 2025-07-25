import { getCompanyUsers } from "@/services/Auth";
import {
  createHierarchy,
  getHierarchy,
  updateHierarchy,
} from "@/services/general";
import { formatToINRShort } from "@/utils/sharedFunctions";
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
} from "react-bootstrap";
import { BsArrowRight } from "react-icons/bs";
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
  const [editData, setEditData] = useState({ bypass_cap: "", active: true });

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
        setHierarchy(res.data[0].approvers);
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
    let updatableHierarchy = [...hierarchy];

    if (updatableHierarchy.find((h) => h.id === parseInt(formData.userId))) {
      updatableHierarchy = updatableHierarchy.filter(
        (h) => h.id != parseInt(formData.userId)
      );
    }

    const user = users.find((u) => u.id === parseInt(formData.userId));
    if (
      !user ||
      updatableHierarchy.find((h) => h.level === parseInt(formData.level))
    ) {
      updatableHierarchy = updatableHierarchy.filter(
        (h) => h.level != parseInt(formData.level)
      );
    }
    setHierarchy([
      ...updatableHierarchy,
      {
        ...user,
        bypass_cap: parseInt(formData.bypass_cap),
        active: formData.active,
        level: parseInt(formData.level),
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

  const deleteUser = () => {
    setHierarchy(hierarchy.filter((u) => u.id !== editModal.user.id));
    setRemovableApprovers((prev) =>
      !prev.includes(editModal.user.id) ? [...prev, editModal.user.id] : prev
    );
    setEditModal({ show: false, user: null });
  };

  const shiftUser = (id, direction) => {
    const idx = hierarchy.findIndex((u) => u.id === id);
    if (direction === "left" && hierarchy[idx].level - 1 < 0) return;

    const newLevel = hierarchy[idx].level + (direction === "left" ? -1 : 1);
    const existHierarcyWithLevel = hierarchy.find((u) => u.level === newLevel);
    if (existHierarcyWithLevel) {
      existHierarcyWithLevel.level = hierarchy[idx].level;
    }
    const updated = [...hierarchy];
    updated[idx].level = newLevel;
    setHierarchy(updated);
  };

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
                >
                  Display Hierarchy
                </button>
                <button
                  className={`tab ${tab === "create" ? "active" : ""}`}
                  onClick={() => setTab("create")}
                >
                  Create Hierarchy
                </button>
              </div>

              {tab === "display" && (
                <div className="mx-4 mb-4">
                  <h4 className="mb-3 fw-medium">Purchase Order Hierarchy</h4>
                  <div className="d-flex flex-wrap gap-3">
                    {hierarchy
                      .sort((a, b) => b.level - a.level)
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
                              <p className="mb-0">
                                <strong>Level:</strong> {user.level}
                              </p>
                              <p className="mb-1">
                                <strong>Bypass:</strong> ₹
                                {user.bypass_cap
                                  ? formatToINRShort(user.bypass_cap)
                                  : "-"}
                                <small className="fw-medium"> {index == self.length - 1 ? ' (Highest Approver)' : ''}</small>
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
                                  >
                                    Shift Left
                                  </Dropdown.Item>
                                  <Dropdown.Item
                                    onClick={() => shiftUser(user.id, "right")}
                                  >
                                    Shift Right
                                  </Dropdown.Item>
                                  <Dropdown.Item
                                    onClick={() => handleEdit(user)}
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
                  <Button
                    disabled={saving}
                    onClick={handleSaveChanges}
                    variant="primary"
                    className="mt-4 p-2"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
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
                        {users.map((u) => (
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
                        value={formData.level}
                        onChange={(e) =>
                          setFormData({ ...formData, level: e.target.value })
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
                    <Button onClick={handleAddUser} className="mt-1 p-2">
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
                      .sort((a, b) => b.level - a.level)
                      .map((user) => (
                        <Card key={user.id} className="mb-2">
                          <Card.Body>
                            <div className="d-flex justify-content-between">
                              <div>
                                <strong>{user.name}</strong>
                                <br />
                                <small>{user.email}</small>
                                <br />
                                <small>
                                  Level: {user.level} | ₹
                                  {user.bypass_cap.toLocaleString()} |{" "}
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
                              >
                                Edit
                              </button>
                            </div>
                          </Card.Body>
                        </Card>
                      ))}
                    <Button
                      variant="success"
                      className="mt-1 p-2"
                      onClick={() => setTab("display")}
                    >
                      Create Hierarchy
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
            <Button className="p-2" variant="danger" onClick={deleteUser}>
              Delete
            </Button>
            <Button className="p-2" variant="primary" onClick={saveEdit}>
              Save
            </Button>
          </Modal.Footer>
        </Modal>
      </section>
    </>
  );
};

export default ApprovalHierarchyPage;
