import React, { useEffect, useMemo, useState } from "react";
import Modal from "react-modal";
import { toast } from "react-toastify";
import {
  getAllPermissions,
  createCustomRole,
  updateCustomRole,
  getRoles,
  getRolePermissions,
} from "@/services/rbac";
import styles from "./CustomRolePermissionsModal.module.scss";
import {
  getResourceLabel,
  getResourceDescription,
  getActionLabel,
  getActionHelp,
} from "@/components/dashboard/admin/shared/permissionLabels";

const modalStyle = {
  overlay: {
    backgroundColor: "rgba(15, 23, 42, 0.62)",
    backdropFilter: "blur(2px)",
    zIndex: 9999,
  },
  content: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    maxWidth: "1200px",
    width: "95%",
    border: "none",
    background: "#fff",
    overflow: "hidden",
    padding: 0,
    maxHeight: "92vh",
    height: "92vh",
    borderRadius: "16px",
    boxShadow: "0 20px 60px rgba(15, 23, 42, 0.25)",
  },
};

/**
 * `initialAction` lets a caller open straight into the editor instead of the
 * modal's own role list. The Access page already shows the catalogue, so
 * making an admin land on a second list inside the modal — and pick the same
 * role again — would be pure friction.
 */
const CustomRolePermissionsModal = ({ isOpen, onClose, initialAction = null, initialRole = null }) => {
  const [mode, setMode] = useState("list");
  const [roles, setRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [roleName, setRoleName] = useState("");
  const [roleDescription, setRoleDescription] = useState("");
  const [permissions, setPermissions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingRoles, setIsLoadingRoles] = useState(false);
  const [permissionSearch, setPermissionSearch] = useState("");
  const [activeResource, setActiveResource] = useState("ALL");

  const flattenedPermissions = permissions.reduce((acc, group) => {
    return acc.concat(
      group.items.map((item) => ({
        ...item,
        resource: group.resource,
      }))
    );
  }, []);

  const selectedCount = flattenedPermissions.filter((p) => p.enabled).length;
  const totalCount = flattenedPermissions.length;
  const progressPct = totalCount ? Math.round((selectedCount / totalCount) * 100) : 0;

  const resourceOptions = useMemo(
    () => permissions.map((group) => group.resource),
    [permissions]
  );

  const filteredPermissions = useMemo(() => {
    const query = permissionSearch.trim().toLowerCase();

    return permissions
      .filter((group) => activeResource === "ALL" || group.resource === activeResource)
      .map((group) => {
        const filteredItems = group.items.filter((perm) => {
          if (!query) return true;
          return (
            getActionLabel(perm.action).toLowerCase().includes(query) ||
            perm.action.toLowerCase().includes(query) ||
            getResourceLabel(group.resource).toLowerCase().includes(query) ||
            group.resource.toLowerCase().includes(query)
          );
        });

        return { ...group, items: filteredItems };
      })
      .filter((group) => group.items.length > 0);
  }, [permissions, activeResource, permissionSearch]);

  const resetRoleForm = () => {
    setMode("list");
    setSelectedRole(null);
    setRoleName("");
    setRoleDescription("");
    setPermissions([]);
    setPermissionSearch("");
    setActiveResource("ALL");
  };

  const handleClose = () => {
    resetRoleForm();
    onClose?.();
  };

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

  const handleToggleResourcePermissions = (resource, enabled) => {
    setPermissions((prev) =>
      prev.map((group) =>
        group.resource === resource
          ? {
              ...group,
              items: group.items.map((perm) => ({ ...perm, enabled })),
            }
          : group
      )
    );
  };

  const handleToggleAllPermissions = (enabled) => {
    setPermissions((prev) =>
      prev.map((group) => ({
        ...group,
        items: group.items.map((perm) => ({ ...perm, enabled })),
      }))
    );
  };

  const loadUserCreatedRoles = async () => {
    try {
      setIsLoadingRoles(true);
      const response = await getRoles();
      const allRoles = response?.data?.data || response?.data || [];
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
        getRolePermissions(roleId),
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

  const handleCreateNew = () => {
    setMode("create");
    setSelectedRole(null);
    setRoleName("");
    setRoleDescription("");
    setPermissionSearch("");
    setActiveResource("ALL");
    fetchPermissionsForCreate();
  };

  const handleEditRole = async (role) => {
    setMode("edit");
    setSelectedRole(role);
    setRoleName(role.title);
    setRoleDescription(role.description || "");
    setPermissionSearch("");
    setActiveResource("ALL");
    await loadRolePermissions(role.id);
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
        response?.message ||
        (mode === "edit" ? "Role updated successfully" : "Custom role created successfully");

      if (isSuccess) {
        toast.success(successMessage);
        await loadUserCreatedRoles();
        resetRoleForm();
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
    if (!isOpen) return;
    resetRoleForm();
    loadUserCreatedRoles();
    if (initialAction === "create") handleCreateNew();
    else if (initialAction === "edit" && initialRole) handleEditRole(initialRole);
    // initialAction/initialRole are read once per open, deliberately: changing
    // them while the modal is up must not yank the admin out of an edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={handleClose}
      ariaHideApp={false}
      contentLabel="Custom Roles and Permissions"
      className={`${styles.modalRoot} contact-modal contact-modal-new`}
      style={modalStyle}
    >
      <div className={styles.header}>
        <div>
          <h5 className={styles.title}>Custom Roles and Permissions</h5>
          <p className={styles.subtitle}>Enterprise-grade access control for hospitality workflows.</p>
        </div>
        <div className={styles.headerMeta}>
          {mode !== "list" && (
            <>
              <span className={styles.metaPill}>{selectedCount} selected</span>
              <span className={styles.metaPill}>{totalCount} total</span>
            </>
          )}
          <button
            onClick={handleClose}
            className="btn-close"
            aria-label="Close"
            id="close_custom_roles_modal-modal_header-custom_roles_permissions_modal"
          />
        </div>
      </div>

      <div className={styles.body}>
        {mode === "list" ? (
          <>
            <div className={styles.topBand}>
              <div>
                <p className={styles.bandTitle}>Manage custom roles without ambiguity</p>
                <p className={styles.bandSubtext}>Each role defines exactly what users can access and perform.</p>
              </div>
              <button
                type="button"
                className="btn btn-primary p-2"
                onClick={handleCreateNew}
                id="create_new_role-button-custom_roles_permissions_modal"
              >
                Create New Role
              </button>
            </div>

            {isLoadingRoles ? (
              <p className={styles.message}>Loading roles...</p>
            ) : roles.length === 0 ? (
              <div className={styles.emptyState}>
                <p className={styles.emptyTitle}>No custom roles available</p>
                <p className={styles.emptyText}>Create your first role to start assigning permissions.</p>
                <button type="button" className="btn btn-primary" onClick={handleCreateNew}>
                  Create First Role
                </button>
              </div>
            ) : (
              <div className={styles.rolesTableWrap}>
                <table className={`table ${styles.rolesTable}`}>
                  <thead>
                    <tr>
                      <th>Role</th>
                      <th>Description</th>
                      <th className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roles.map((role) => (
                      <tr key={role.id}>
                        <td>
                          <div className={styles.roleTitle}>{role.title}</div>
                          <small className={styles.roleMeta}>Role ID: {role.id}</small>
                        </td>
                        <td>{role.description || "No description provided"}</td>
                        <td className="text-end">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary p-2"
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
          <div className={styles.workspace}>
            <div className={styles.workspaceHead}>
              <div>
                <h6 className={styles.workspaceTitle}>
                  {mode === "edit" ? `Edit Role: ${roleName}` : "Create New Role"}
                </h6>
                <p className={styles.workspaceSubtext}>
                  Define role details and assign permissions with clear resource labels.
                </p>
              </div>
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={resetRoleForm}>
                Back to List
              </button>
            </div>

            <div className={styles.workspaceContent}>
              <div className={styles.leftPanel}>
                <div className={styles.panelSection}>
                  <label className={styles.fieldLabel}>Role Name</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Purchase Reviewer"
                    value={roleName}
                    onChange={(e) => setRoleName(e.target.value)}
                    disabled={mode === "edit"}
                    id="role_name-input-custom_roles_permissions_modal"
                  />
                  {mode === "edit" && <small className={styles.helper}>Role name cannot be changed</small>}
                </div>

                <div className={styles.panelSection}>
                  <label className={styles.fieldLabel}>Description</label>
                  <textarea
                    className="form-control"
                    rows={4}
                    placeholder="Describe responsibilities for this role"
                    value={roleDescription}
                    onChange={(e) => setRoleDescription(e.target.value)}
                    id="role_description-textarea-custom_roles_permissions_modal"
                  />
                </div>

                <div className={styles.guidelineBox}>
                  <p className={styles.guidelineTitle}>Recommended naming</p>
                  <p className={styles.guidelineText}>
                    Use job-oriented names such as RFQ Approver, Tender Reviewer, or Technical Evaluator.
                  </p>
                </div>
              </div>

              <div className={styles.rightPanel}>
                <div className={styles.toolbar}>
                  <div className={styles.toolbarRow}>
                    <div className={styles.selectionSummary}>
                      <span>{selectedCount} selected</span>
                      <span className={styles.separator}>•</span>
                      <span>{progressPct}% coverage</span>
                    </div>
                    <div className={styles.bulkActions}>
                      <button type="button" className="btn btn-sm btn-outline-primary p-2" onClick={() => handleToggleAllPermissions(true)}>
                        Select All
                      </button>
                      <button type="button" className="btn btn-sm btn-outline-secondary p-2" onClick={() => handleToggleAllPermissions(false)}>
                        Clear All
                      </button>
                    </div>
                  </div>

                  <div className={styles.progressTrack}>
                    <div className={styles.progressFill} style={{ width: `${progressPct}%` }} />
                  </div>

                  <div className={styles.toolbarRow}>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Search by resource or permission"
                      value={permissionSearch}
                      onChange={(e) => setPermissionSearch(e.target.value)}
                    />
                    <select
                      className="form-select"
                      value={activeResource}
                      onChange={(e) => setActiveResource(e.target.value)}
                    >
                      <option value="ALL">All Resources</option>
                      {resourceOptions.map((resource) => (
                        <option key={resource} value={resource}>
                          {getResourceLabel(resource)} ({resource})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {isLoading && <p className={styles.message}>Loading permissions...</p>}

                {!isLoading && !permissions.length && (
                  <p className={styles.message}>No permissions available. Please try again later.</p>
                )}

                {!isLoading && permissions.length > 0 && (
                  <div className={styles.permissionsArea}>
                    {!filteredPermissions.length ? (
                      <div className={styles.emptyInline}>No matching permissions found for your filters.</div>
                    ) : (
                      filteredPermissions.map((group) => {
                        const groupSelected = group.items.filter((item) => item.enabled).length;

                        return (
                          <section className={styles.resourceSection} key={group.resource}>
                            <div className={styles.resourceHeader}>
                              <div>
                                <div className={styles.resourceTitleWrap}>
                                  <span className={styles.resourceLabel}>{getResourceLabel(group.resource)}</span>
                                  <span className={styles.resourceCode}>{group.resource}</span>
                                </div>
                                <p className={styles.resourceDescription}>{getResourceDescription(group.resource)}</p>
                                <p className={styles.resourceCount}>{groupSelected} / {group.items.length} selected</p>
                              </div>
                              <div className={styles.groupActions}>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-primary p-2"
                                  onClick={() => handleToggleResourcePermissions(group.resource, true)}
                                >
                                  Select Group
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-secondary p-2"
                                  onClick={() => handleToggleResourcePermissions(group.resource, false)}
                                >
                                  Clear Group
                                </button>
                              </div>
                            </div>

                            <div className={styles.permissionGrid}>
                              {group.items.map((perm) => (
                                <label
                                  key={perm.id}
                                  className={`${styles.permissionCard} ${perm.enabled ? styles.permissionCardActive : ""}`}
                                  htmlFor={`permission_${group.resource}_${perm.id}-checkbox-custom_roles_permissions_modal`}
                                >
                                  <input
                                    id={`permission_${group.resource}_${perm.id}-checkbox-custom_roles_permissions_modal`}
                                    className="form-check-input"
                                    type="checkbox"
                                    checked={perm.enabled}
                                    onChange={() => handleTogglePermission(perm.id)}
                                  />
                                  <div className={styles.permissionText}>
                                    <p className={styles.permissionName}>{getActionLabel(perm.action)}</p>
                                    <p className={styles.permissionHelp}>{getActionHelp(perm.action)}</p>
                                    <small className={styles.permissionKey}>Key: {perm.action}</small>
                                  </div>
                                </label>
                              ))}
                            </div>
                          </section>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className={styles.footer}>
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={resetRoleForm}
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
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                )}
                {mode === "edit" ? "Update Role" : "Save Role"}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default CustomRolePermissionsModal;
