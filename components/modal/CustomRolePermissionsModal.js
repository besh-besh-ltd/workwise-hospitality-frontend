import React, { useEffect, useState } from "react";
import Modal from "react-modal";
import { toast } from "react-toastify";
import { getAllPermissions, createCustomRole, updateCustomRole, getRoles, getRolePermissions } from "@/services/rbac";

const CustomRolePermissionsModal = ({ isOpen, onClose }) => {
  const [mode, setMode] = useState("list"); // "list" or "create" or "edit"
  const [roles, setRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [roleName, setRoleName] = useState("");
  const [roleDescription, setRoleDescription] = useState("");
  const [permissions, setPermissions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingRoles, setIsLoadingRoles] = useState(false);

  const flattenedPermissions = permissions.reduce((acc, group) => {
    return acc.concat(
      group.items.map((item) => ({
        ...item,
        resource: group.resource,
      }))
    );
  }, []);

  const handleTogglePermission = (id) => {
    setPermissions((prev) =>
      prev.map((group) => ({
        ...group,
        items: group.items.map((perm) =>
          perm.id === id ? { ...perm, enabled: !perm.enabled } : perm
        ),
      }))
    );
  };

  const handleClose = () => {
    setMode("list");
    setSelectedRole(null);
    setRoleName("");
    setRoleDescription("");
    setPermissions([]);
    onClose?.();
  };

  const loadUserCreatedRoles = async () => {
    try {
      setIsLoadingRoles(true);
      const response = await getRoles();
      const allRoles = response?.data?.data || response?.data || [];
      // Filter roles where created_by is not null (user-created roles)
      const userRoles = allRoles.filter((role) => role.created_by !== null);
      setRoles(userRoles);
    } catch (error) {
      console.error("Error loading roles:", error);
      toast.error("Failed to load custom roles");
    } finally {
      setIsLoadingRoles(false);
    }
  };

  const loadRolePermissions = async (roleId) => {
    try {
      setIsLoading(true);
      const [permissionsRes, rolePermissionsRes] = await Promise.all([
        getAllPermissions(),
        getRolePermissions(roleId)
      ]);

      const grouped = permissionsRes?.data || {};
      const rolePermissions = rolePermissionsRes?.data || {};

      const mappedPermissions = Object.keys(grouped).map((resourceKey) => ({
        resource: resourceKey,
        items: (grouped[resourceKey] || []).map((item) => ({
          id: item.id,
          action: item.action,
          enabled: (rolePermissions[resourceKey] || []).includes(item.action),
        })),
      }));

      setPermissions(mappedPermissions);
    } catch (error) {
      const apiError = error?.response;
      const message =
        apiError?.data?.message ||
        apiError?.data?.errors ||
        "Failed to load permissions";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNew = () => {
    setMode("create");
    setSelectedRole(null);
    setRoleName("");
    setRoleDescription("");
    fetchPermissionsForCreate();
  };

  const handleEditRole = async (role) => {
    setMode("edit");
    setSelectedRole(role);
    setRoleName(role.title);
    setRoleDescription(role.description || "");
    await loadRolePermissions(role.id);
  };

  const fetchPermissionsForCreate = async () => {
    try {
      setIsLoading(true);
      const response = await getAllPermissions();
      const grouped = response?.data || {};

      const mappedPermissions = Object.keys(grouped).map((resourceKey) => ({
        resource: resourceKey,
        items: (grouped[resourceKey] || []).map((item) => ({
          id: item.id,
          action: item.action,
          enabled: false,
        })),
      }));

      setPermissions(mappedPermissions);
    } catch (error) {
      const apiError = error?.response;
      const message =
        apiError?.data?.message ||
        apiError?.data?.errors ||
        "Failed to load permissions";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    const trimmedName = roleName.trim();
    const trimmedDescription = roleDescription.trim();

    if (!trimmedName) {
      toast.error("Please enter a role name");
      return;
    }

    if (!trimmedDescription) {
      toast.error("Please enter a role description");
      return;
    }

    const selectedPermissionIds = flattenedPermissions
      .filter((p) => p.enabled)
      .map((p) => p.id);

    if (!selectedPermissionIds.length) {
      toast.error("Please select at least one permission");
      return;
    }

    try {
      setIsSaving(true);
      const payload = {
        title: trimmedName,
        description: trimmedDescription,
        permission_ids: selectedPermissionIds,
      };

      let response;
      if (mode === "edit" && selectedRole) {
        response = await updateCustomRole(selectedRole.id, payload);
      } else {
        response = await createCustomRole(payload);
      }

      const isSuccess = response?.status;
      const successMessage =
        response?.message || (mode === "edit" ? "Role updated successfully" : "Custom role created successfully");

      if (isSuccess) {
        toast.success(successMessage);
        await loadUserCreatedRoles();
        setMode("list");
        setSelectedRole(null);
        setRoleName("");
        setRoleDescription("");
        setPermissions([]);
      } else {
        toast.error(response?.message || "Failed to save role");
      }
    } catch (error) {
      const apiError = error?.message?.response;
      const message =
        apiError?.data?.message ||
        apiError?.errors ||
        (mode === "edit" ? "Failed to update custom role" : "Failed to create custom role");
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setMode("list");
      setSelectedRole(null);
      setRoleName("");
      setRoleDescription("");
      setPermissions([]);
      loadUserCreatedRoles();
    }
  }, [isOpen]);

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={handleClose}
      ariaHideApp={false}
      contentLabel="Custom Roles and Permissions"
      className="contact-modal contact-modal-new"
      style={{
        overlay: {
          backgroundColor: "rgba(0, 0, 0, 0.75)",
          zIndex: 9999,
        },
        content: {
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          maxWidth: "960px",
          width: "95%",
          border: "none",
          background: "transparent",
          overflow: "visible",
          padding: "24px",
          maxHeight: "90vh",
          height: "auto",
        },
      }}
    >
      <div className="modal-header border-0 pb-3 d-flex justify-content-between align-items-center">
        <h5 className="modal-title mb-0">Custom Roles &amp; Permissions</h5>
        <button
          onClick={handleClose}
          className="btn-close"
          aria-label="Close"
          id="close_custom_roles_modal-modal_header-custom_roles_permissions_modal"
          style={{ marginLeft: "auto", flexShrink: 0 }}
        />
      </div>

      <div className="modal-body">
        <div className="card shadow-sm border-0">
          <div className="card-body d-flex flex-column" style={{ maxHeight: "70vh" }}>
            {mode === "list" ? (
              <>
                <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
                  <p className="text-muted mb-0 flex-grow-1">
                    Manage your custom roles. Only roles you created can be edited.
                  </p>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleCreateNew}
                    id="create_new_role-button-custom_roles_permissions_modal"
                    style={{ flexShrink: 0 }}
                  >
                    Create New Role
                  </button>
                </div>

                {isLoadingRoles ? (
                  <p className="text-muted mb-0">Loading roles...</p>
                ) : roles.length === 0 ? (
                  <div className="text-center py-5">
                    <p className="text-muted mb-3">No custom roles created yet.</p>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleCreateNew}
                    >
                      Create Your First Role
                    </button>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-striped">
                      <thead>
                        <tr>
                          <th>Role Name</th>
                          <th>Description</th>
                          <th className="text-end">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {roles.map((role) => (
                          <tr key={role.id}>
                            <td>
                              <strong>{role.title}</strong>
                            </td>
                            <td>{role.description || "—"}</td>
                            <td className="text-end">
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => handleEditRole(role)}
                                id={`edit_role_${role.id}-button-custom_roles_permissions_modal`}
                              >
                                Edit Permissions
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <h6 className="mb-0">
                    {mode === "edit" ? "Edit Role Permissions" : "Create New Role"}
                  </h6>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => {
                      setMode("list");
                      setSelectedRole(null);
                      setRoleName("");
                      setRoleDescription("");
                      setPermissions([]);
                    }}
                  >
                    Back to List
                  </button>
                </div>

                <p className="text-muted mb-4">
                  {mode === "edit"
                    ? "Update the permissions for this custom role."
                    : "Define a custom role for your company users. This will create a backend role with the selected permissions."}
                </p>

                <div className="row flex-grow-1">
                  <div className="col-md-4 border-end mb-3 mb-md-0">
                    <div className="mb-3">
                      <label className="form-label fw-semibold">Role Name</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Purchase Reviewer"
                        value={roleName}
                        onChange={(e) => setRoleName(e.target.value)}
                        disabled={mode === "edit"}
                        id="role_name-input-custom_roles_permissions_modal"
                      />
                      {mode === "edit" && (
                        <small className="text-muted">Role name cannot be changed</small>
                      )}
                    </div>

                    <div className="mb-3">
                      <label className="form-label fw-semibold">Description</label>
                      <textarea
                        className="form-control"
                        rows={3}
                        placeholder="Short summary of what this role can do"
                        value={roleDescription}
                        onChange={(e) => setRoleDescription(e.target.value)}
                        id="role_description-textarea-custom_roles_permissions_modal"
                      />
                    </div>

                    <div className="small text-muted">
                      Use a clear name and description that match how this role will
                      be used in your workflows (for example, "RFQ Approver" or
                      "Tender Viewer").
                    </div>
                  </div>

                  <div className="col-md-8">
                    <div className="mb-2 d-flex justify-content-between align-items-center">
                      <label className="form-label fw-semibold mb-0">
                        Permissions for this role
                      </label>
                      {!isLoading && permissions.length > 0 && (
                        <span className="badge bg-light text-dark">
                          {flattenedPermissions.filter((p) => p.enabled).length}{" "}
                          selected
                        </span>
                      )}
                    </div>

                    {isLoading && (
                      <p className="text-muted mb-0">Loading permissions...</p>
                    )}
                    {!isLoading && !permissions.length && (
                      <p className="text-muted mb-0">
                        No permissions available. Please try again later.
                      </p>
                    )}
                    {!isLoading && permissions.length > 0 && (
                      <div
                        className="border rounded p-3 bg-light"
                        style={{ maxHeight: "360px", overflowY: "auto" }}
                      >
                        {permissions.map((group) => (
                          <div key={group.resource} className="mb-3">
                            <div className="d-flex align-items-center mb-2">
                              <span className="badge bg-secondary text-uppercase me-2">
                                {group.resource}
                              </span>
                            </div>
                            <div className="row">
                              {group.items.map((perm) => (
                                <div className="col-md-6 mb-2" key={perm.id}>
                                  <div className="form-check">
                                    <input
                                      className="form-check-input"
                                      type="checkbox"
                                      id={`permission_${group.resource}_${perm.id}-checkbox-custom_roles_permissions_modal`}
                                      checked={perm.enabled}
                                      onChange={() => handleTogglePermission(perm.id)}
                                    />
                                    <label
                                      className="form-check-label text-capitalize"
                                      htmlFor={`permission_${group.resource}_${perm.id}-checkbox-custom_roles_permissions_modal`}
                                    >
                                      {perm.action}
                                    </label>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="d-flex justify-content-end gap-2 pt-3 mt-3 border-top">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => {
                      setMode("list");
                      setSelectedRole(null);
                      setRoleName("");
                      setRoleDescription("");
                      setPermissions([]);
                    }}
                    id="cancel_custom_roles_modal-modal_footer-custom_roles_permissions_modal"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleSave}
                    disabled={isSaving}
                    id="save_custom_roles_modal-modal_footer-custom_roles_permissions_modal"
                  >
                    {isSaving && (
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        role="status"
                        aria-hidden="true"
                      ></span>
                    )}
                    {mode === "edit" ? "Update Role" : "Save Role"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default CustomRolePermissionsModal;
