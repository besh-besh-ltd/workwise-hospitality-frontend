import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { HiX, HiPencil } from "react-icons/hi";
import { getDepartments, getRoles, getRolePermissions } from "@/services/rbac";
import { getHospitalityEntities, getUserMappingsById } from "@/services/hospitality";
import ConfirmationModal from "@/components/modal/ConfirmationModal";
import styles from "@/components/dashboard/admin/account-management/manage-accounts/ManageAccounts.module.scss";

export default function RoleScopeSelector({ onAddRole, existingRoles, selectedDepartment: propSelectedDepartment, isEditMode = true, onRemoveRole, onReplaceRole = null, userDepartments = [], userId = null, externalMappings = null, pendingScopeRef = null }) {
  const userProfile = useSelector((state) => state.userProfile);
  const [roles, setRoles] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [allCompanies, setAllCompanies] = useState([]);
  const [allDepartments, setAllDepartments] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userMappings, setUserMappings] = useState([]);
  const [userMappingsLoaded, setUserMappingsLoaded] = useState(false);

  const [selectedRole, setSelectedRole] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState(propSelectedDepartment || null);
  // Network-scope toggle for Group ARC. When checked the row is granted
  // with all-NULL BU columns and is_network_scope=1, making the user
  // visible to Group ARC permission/approval resolution. The two scopes
  // do NOT overlap — see migration 004. UI hides the BU pickers when
  // checked since they're not part of a network-scope grant.
  const [isNetworkScope, setIsNetworkScope] = useState(false);

  // null = create mode; number = index into existingRoles being edited.
  // When set, the bottom form pre-fills with that role's scope and the
  // primary action becomes "Save Changes" instead of "Add Role".
  const [editingIndex, setEditingIndex] = useState(null);
  const [allAccessConfirm, setAllAccessConfirm] = useState({ open: false, scope: null });

  // Expose current form state to parent so it can auto-add on save
  useEffect(() => {
    if (!pendingScopeRef) return;
    if (selectedRole && (isNetworkScope || selectedCompany)) {
      pendingScopeRef.current = isNetworkScope
        ? {
            role_id: selectedRole.id,
            role_title: selectedRole.title,
            is_network_scope: 1,
            permissions,
          }
        : {
            role_id: selectedRole.id,
            role_title: selectedRole.title,
            company_id: selectedCompany.id,
            hotel_id: selectedHotel?.id || null,
            department_id: selectedDepartment?.id || null,
            permissions,
          };
    } else {
      pendingScopeRef.current = null;
    }
  }, [selectedRole, selectedCompany, selectedHotel, selectedDepartment, permissions, pendingScopeRef, isNetworkScope]);

  /* ---------------- Effects ---------------- */

  useEffect(() => {
    const loadMasters = async () => {
      try {
        setLoading(true);
        setError(null);
        const [rolesRes, departmentsRes, entitiesRes] = await Promise.all([
          getRoles(),
          getDepartments(),
          getHospitalityEntities()
        ]);

        const rolesData = rolesRes?.data?.data || rolesRes?.data || [];
        const departmentsData = departmentsRes?.data?.data || departmentsRes?.data || [];
        const entities = entitiesRes?.data?.data || entitiesRes?.data || [];

        setRoles(rolesData);
        setAllDepartments(departmentsData);
        setDepartments(departmentsData);

        const allCompaniesData = entities.map((c) => ({
          id: c.company_id,
          name: c.company_name,
          hotels: (c.hotels || []).map((h) => ({
            id: h.hotel_id,
            name: h.hotel_name
          }))
        }));

        setAllCompanies(allCompaniesData);
        setCompanies(allCompaniesData);
      } catch {
        setError("Failed to load role & hospitality data.");
      } finally {
        setLoading(false);
      }
    };

    loadMasters();
  }, []);

  useEffect(() => {
    if (!userId || !isEditMode) {
      setUserMappings([]);
      setUserMappingsLoaded(true);
      return;
    }

    setUserMappingsLoaded(false);
    getUserMappingsById(userId)
      .then((res) => {
        setUserMappings(res?.data || []);
        setUserMappingsLoaded(true);
      })
      .catch(() => {
        setUserMappings([]);
        setUserMappingsLoaded(true);
      });
  }, [userId, isEditMode]);

  useEffect(() => {
    // When externalMappings are provided (create page), use them to filter
    if (!isEditMode && externalMappings && externalMappings.length > 0) {
      const mappedCompanyIds = new Set();
      const mappedHotelIds = new Set();
      const companyLevelMappings = new Set();

      externalMappings.forEach((mapping) => {
        const companyId = mapping.companyId || mapping.hospitality_company_id;
        if (companyId) mappedCompanyIds.add(String(companyId));

        const level = mapping.mappingLevel || (mapping.mapping_type === 0 ? "company" : "hotel");
        if (level === "company") {
          companyLevelMappings.add(String(companyId));
        }

        const hotelId = mapping.hotelId || mapping.hospitality_hotel_id;
        if (level !== "company" && hotelId) {
          mappedHotelIds.add(String(hotelId));
        }
      });

      const filteredCompanies = allCompanies
        .filter((company) => mappedCompanyIds.has(String(company.id)))
        .map((company) => ({
          ...company,
          hotels: companyLevelMappings.has(String(company.id))
            ? company.hotels
            : company.hotels.filter((hotel) => mappedHotelIds.has(String(hotel.id)))
        }));

      setCompanies(filteredCompanies);
      return;
    }

    if (!isEditMode) {
      // No external mappings and not edit mode — show nothing (user must map first)
      if (externalMappings !== null) {
        setCompanies([]);
      } else {
        setCompanies(allCompanies);
      }
      return;
    }

    if (!userMappingsLoaded) {
      setCompanies([]);
      return;
    }

    if (userMappings.length === 0) {
      setCompanies([]);
      return;
    }

    const mappedCompanyIds = new Set();
    const mappedHotelIds = new Set();

    userMappings.forEach((mapping) => {
      mappedCompanyIds.add(mapping.hospitality_company_id);
      if (mapping.mapping_type === 1 && mapping.hospitality_hotel_id) {
        mappedHotelIds.add(mapping.hospitality_hotel_id);
      }
    });

    const filteredCompanies = allCompanies
      .filter((company) => mappedCompanyIds.has(company.id))
      .map((company) => {
        const hasCompanyMapping = userMappings.some(
          (m) => m.hospitality_company_id === company.id && m.mapping_type === 0
        );

        return {
          ...company,
          hotels: hasCompanyMapping
            ? company.hotels
            : company.hotels.filter((hotel) => mappedHotelIds.has(hotel.id))
        };
      });

    setCompanies(filteredCompanies);
  }, [userMappings, allCompanies, isEditMode, userMappingsLoaded, externalMappings]);

  // Role scope department dropdown always shows all departments.
  // department_id = NULL in role scope means literal all-department access,
  // so the dropdown is not restricted by the user's own departments.
  useEffect(() => {
    if (allDepartments.length === 0) return;
    setDepartments(allDepartments);
  }, [allDepartments]);

  useEffect(() => {
    if (propSelectedDepartment && !isEditMode) {
      if (propSelectedDepartment.id || propSelectedDepartment.value) {
        const deptId = propSelectedDepartment.id || propSelectedDepartment.value;
        const foundDept = departments.find(d => d.id === deptId || d.value === deptId);
        if (foundDept) {
          setSelectedDepartment(foundDept);
        } else {
          setSelectedDepartment(propSelectedDepartment);
        }
      } else {
        setSelectedDepartment(propSelectedDepartment);
      }
    }
  }, [propSelectedDepartment, isEditMode, departments]);

  useEffect(() => {
    if (!selectedRole) {
      setPermissions({});
      return;
    }

    let cancelled = false;

    const loadPermissions = async () => {
      try {
        const res = await getRolePermissions(selectedRole.id);
        if (cancelled) return;
        const data = res?.data?.data || res?.data || {};
        setPermissions(data || {});
      } catch {
        if (!cancelled) {
          setPermissions({});
        }
      }
    };

    loadPermissions();

    return () => {
      cancelled = true;
    };
  }, [selectedRole]);

  /* ---------------- Handlers ---------------- */

  const resetForm = () => {
    setSelectedRole(null);
    setSelectedCompany(null);
    setSelectedHotel(null);
    setSelectedDepartment(null);
    setPermissions({});
    setIsNetworkScope(false);
    setError(null);
  };

  const commitScope = (scope) => {
    if (editingIndex !== null && onReplaceRole) {
      onReplaceRole(editingIndex, scope);
      setEditingIndex(null);
    } else {
      onAddRole(scope);
    }
    resetForm();
  };

  const handleAddRole = () => {
    if (!selectedRole) return;
    // Network-scope grants don't need a company; BU grants still do.
    if (!isNetworkScope && !selectedCompany) return;

    const newScope = isNetworkScope
      ? {
          role_id: selectedRole.id,
          role_title: selectedRole.title,
          is_network_scope: 1,
          permissions,
        }
      : {
          role_id: selectedRole.id,
          role_title: selectedRole.title,
          company_id: selectedCompany.id,
          hotel_id: selectedHotel?.id || null,
          department_id: selectedDepartment?.id || null,
          permissions,
        };

    // Prevent exact duplicate role scope. Network-scope rows are deduped
    // on (role_id, is_network_scope=1); BU-scoped rows on the legacy
    // (role_id, company_id, hotel_id, department_id) tuple.
    const isDuplicate = (existingRoles || []).some((r, i) => {
      if (editingIndex !== null && i === editingIndex) return false;
      const rNetwork = r.is_network_scope === 1 || r.is_network_scope === true;
      if (newScope.is_network_scope === 1) {
        return r.role_id === newScope.role_id && rNetwork;
      }
      return r.role_id === newScope.role_id &&
        !rNetwork &&
        r.company_id === newScope.company_id &&
        (r.hotel_id || null) === newScope.hotel_id &&
        (r.department_id || null) === newScope.department_id;
    });
    if (isDuplicate) {
      setError("This exact role assignment already exists.");
      return;
    }

    // BU grants warn on "All Hotels" / "All Departments"; network grants
    // are inherently network-wide so the warning doesn't apply.
    if (!isNetworkScope) {
      const allHotel = !newScope.hotel_id;
      const allDept = !newScope.department_id;
      if (allHotel || allDept) {
        setAllAccessConfirm({ open: true, scope: newScope });
        return;
      }
    }

    commitScope(newScope);
  };

  const handleEditRole = (index) => {
    const role = (existingRoles || [])[index];
    if (!role) return;

    // Pre-fill the form with this role's scope. The role/company/hotel/dept
    // dropdowns each look up the matching item from their loaded master lists,
    // so the existing value renders as the selected option.
    const matchedRole = roles.find((r) => r.id === role.role_id) || { id: role.role_id, title: role.role_title };
    const matchedCompany = allCompanies.find((c) => c.id === role.company_id);
    const matchedHotel = role.hotel_id
      ? matchedCompany?.hotels?.find((h) => h.id === role.hotel_id) || null
      : null;
    const matchedDept = role.department_id
      ? allDepartments.find((d) => d.id === role.department_id) || null
      : null;

    setSelectedRole(matchedRole);
    // Seed network-scope state from the existing row so the toggle
    // reflects reality on edit. When set, the BU pickers stay null
    // (the form hides them anyway).
    const wasNetworkScope = role.is_network_scope === 1 || role.is_network_scope === true;
    setIsNetworkScope(wasNetworkScope);
    setSelectedCompany(wasNetworkScope ? null : (matchedCompany || null));
    setSelectedHotel(wasNetworkScope ? null : matchedHotel);
    setSelectedDepartment(wasNetworkScope ? null : matchedDept);
    // Permissions will auto-load via the selectedRole effect, but seed with
    // the saved permissions immediately so there's no flash of empty state.
    setPermissions(role.permissions || {});
    setEditingIndex(index);
    setError(null);
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    resetForm();
  };

  /* ---------------- Helpers ---------------- */

  const getCompanyName = (companyId) => {
    const c = allCompanies.find((co) => co.id === companyId);
    return c?.name || "N/A";
  };

  const getHotelName = (companyId, hotelId) => {
    if (!hotelId) return "All Business Units";
    const c = allCompanies.find((co) => co.id === companyId);
    const h = c?.hotels?.find((ho) => ho.id === hotelId);
    return h?.name || "All Business Units";
  };

  const getDeptName = (deptId) => {
    if (!deptId) return "All Departments";
    const d = allDepartments.find((dep) => dep.id === deptId);
    return d?.title || "All Departments";
  };

  const hasPermissions = Object.keys(permissions).length > 0;
  const isEditing = editingIndex !== null;

  // Group existingRoles into Company → Business Unit → [roles] so the admin
  // can scan their scope hierarchy directly instead of paging through a flat
  // list. Each leaf carries _index so edit/remove still target the correct
  // row in the original existingRoles array.
  //
  // Network-scope rows go into a synthetic "__network__" group with a
  // friendlier label, since they don't carry a company/BU.
  const groupedRoles = useMemo(() => {
    const groups = new Map(); // companyId -> { name, hotels: Map<hotelId, [roles]> }
    (existingRoles || []).forEach((role, idx) => {
      const isNetwork = role.is_network_scope === 1 || role.is_network_scope === true;
      const cid = isNetwork ? '__network__' : (role.company_id ?? '__none__');
      const hid = isNetwork ? '__network__' : (role.hotel_id ?? '__all__');
      if (!groups.has(cid)) {
        groups.set(cid, {
          name: isNetwork
            ? 'Group ARC'
            : getCompanyName(role.company_id),
          isNetwork,
          hotels: new Map(),
        });
      }
      const company = groups.get(cid);
      if (!company.hotels.has(hid)) {
        company.hotels.set(hid, {
          name: isNetwork
            ? 'Applies to every Group ARC tender across all hotels'
            : getHotelName(role.company_id, role.hotel_id),
          roles: [],
        });
      }
      company.hotels.get(hid).roles.push({ ...role, _index: idx });
    });
    // Materialise into arrays for stable rendering order. Network group
    // sorted to the top so admins see network grants first when present.
    return Array.from(groups.entries())
      .map(([cid, c]) => ({
        companyId: cid,
        companyName: c.name,
        isNetwork: c.isNetwork,
        hotels: Array.from(c.hotels.entries()).map(([hid, h]) => ({
          hotelId: hid,
          hotelName: h.name,
          roles: h.roles,
        })),
      }))
      .sort((a, b) => (a.isNetwork === b.isNetwork ? 0 : a.isNetwork ? -1 : 1));
  }, [existingRoles, allCompanies, allDepartments]);

  return (
    <div className={styles.roleSelectorWrap}>
      {loading && (
        <div className={styles.roleSelectorLoading}>
          <div className={styles.miniSpinner} style={{ margin: "0 auto 10px" }} />
          Loading roles & scope data...
        </div>
      )}

      {error && !loading && (
        <div className={styles.roleSelectorError}>{error}</div>
      )}

      {!loading && (
        <>
          {/* Assigned Roles — grouped by Company → Business Unit so the admin
              can see roles within a scope at a glance. Department info stays
              as a subtle inline tag on each role rather than its own grouping
              level (per UX feedback). */}
          <div className={styles.assignedRolesSection}>
            <div className={styles.assignedRolesTitle}>
              Assigned Roles {existingRoles?.length > 0 && `(${existingRoles.length})`}
            </div>

            {groupedRoles.length > 0 ? (
              <div className={styles.scopeGroupList}>
                {groupedRoles.map((company) => (
                  <div className={styles.scopeGroupCard} key={`co-${company.companyId}`}>
                    <div className={styles.scopeCompanyHeading}>{company.companyName}</div>
                    {company.hotels.map((hotel) => (
                      <div className={styles.scopeBuBlock} key={`bu-${company.companyId}-${hotel.hotelId}`}>
                        <div className={styles.scopeBuHeading}>{hotel.hotelName}</div>
                        <div className={styles.scopeRoleList}>
                          {hotel.roles.map((role) => {
                            const isThisRowEditing = editingIndex === role._index;
                            return (
                              <div
                                key={`r-${role._index}`}
                                className={`${styles.scopeRoleRow} ${isThisRowEditing ? styles.scopeRoleRowEditing : ""}`}
                              >
                                <div className={styles.scopeRoleMain}>
                                  <span className={styles.scopeRoleTitle}>
                                    {role.role_title || role.title}
                                  </span>
                                  {(role.is_network_scope === 1 || role.is_network_scope === true) && (
                                    <span
                                      style={{
                                        fontSize: 10,
                                        fontWeight: 700,
                                        textTransform: "uppercase",
                                        letterSpacing: 0.4,
                                        color: "#A86A00",
                                        background: "#FFF3DD",
                                        border: "1px solid #FFA500",
                                        borderRadius: 4,
                                        padding: "2px 6px",
                                      }}
                                      title="Group ARC grant — applies to Group ARC tenders across all hotels"
                                    >
                                      Group ARC
                                    </span>
                                  )}
                                  {role.department_id && (
                                    <span className={styles.scopeRoleDeptTag}>
                                      {getDeptName(role.department_id)}
                                    </span>
                                  )}
                                  {isThisRowEditing && (
                                    <span className={styles.scopeRoleEditingBadge}>Editing</span>
                                  )}
                                </div>
                                <div className={styles.scopeRoleActions}>
                                  {onReplaceRole && (
                                    <button
                                      type="button"
                                      className={styles.scopeRoleEdit}
                                      onClick={() => handleEditRole(role._index)}
                                      title="Edit role"
                                      disabled={isEditing && !isThisRowEditing}
                                    >
                                      <HiPencil size={13} />
                                    </button>
                                  )}
                                  {onRemoveRole && (
                                    <button
                                      type="button"
                                      className={styles.scopeRoleRemove}
                                      onClick={() => onRemoveRole(role._index)}
                                      title="Remove role"
                                      disabled={isEditing && !isThisRowEditing}
                                    >
                                      <HiX size={13} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.assignedRolesEmpty}>
                No workflow roles assigned yet. Add a role below.
              </div>
            )}
          </div>

          {/* Add / Edit Role Form. Shared form: in create mode it inserts a
              new role; in edit mode it replaces the role at editingIndex. */}
          <div className={styles.addRoleSection}>
            <div className={styles.addRoleTitle}>
              {isEditing ? "Edit Role" : "Add New Role"}
            </div>
            <div className={styles.addRoleGrid}>
              {/* Role */}
              <div className={styles.addRoleField}>
                <label className={styles.addRoleFieldLabel}>
                  Role <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <select
                  className={styles.formSelect}
                  value={selectedRole?.id || ""}
                  onChange={(e) => {
                    const role = roles.find((r) => r.id === Number(e.target.value)) || null;
                    setSelectedRole(role);
                    if (!role) {
                      setError(null);
                      setSelectedCompany(null);
                      setSelectedHotel(null);
                      setSelectedDepartment(null);
                    }
                  }}
                >
                  <option value="">Select a role...</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Network-scope toggle (Group ARC). When checked, the
                  grant applies network-wide (no BU scoping) and the
                  user becomes eligible to act on Group ARC entities.
                  Mutually exclusive with the BU pickers below — those
                  hide when the toggle is on. */}
              <div className={styles.addRoleField} style={{ gridColumn: "1 / -1" }}>
                <label
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    padding: "10px 12px",
                    border: `1px solid ${isNetworkScope ? "#FFA500" : "#e5e7eb"}`,
                    background: isNetworkScope ? "#FFF8EE" : "#fafafa",
                    borderRadius: 8,
                    cursor: selectedRole ? "pointer" : "not-allowed",
                    opacity: selectedRole ? 1 : 0.6,
                    transition: "background 120ms, border-color 120ms",
                  }}
                  title={!selectedRole ? "Select a role first" : ""}
                >
                  <input
                    type="checkbox"
                    checked={isNetworkScope}
                    disabled={!selectedRole}
                    onChange={(e) => {
                      const next = e.target.checked;
                      setIsNetworkScope(next);
                      if (next) {
                        // Network-scope grants are tenant-wide, no BU
                        // scoping. Drop any half-filled BU selections so
                        // the duplicate check + payload stay clean.
                        setSelectedCompany(null);
                        setSelectedHotel(null);
                        setSelectedDepartment(null);
                      }
                    }}
                    style={{ marginTop: 3, accentColor: "#FFA500" }}
                  />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#1A2730" }}>
                      Group ARC grant
                    </div>
                    <div style={{ fontSize: 11, color: "#6c757d", marginTop: 2, lineHeight: 1.4 }}>
                      Required for users acting on Group ARC tenders (multi-BU
                      contracts approved by the Group ARC hierarchy). This
                      grant does NOT cover RFQs or Single ARC tenders — those
                      need separate per-BU grants.
                    </div>
                  </div>
                </label>
              </div>

              {/* Company / BU / Department: shown only when this is a
                  BU-scoped grant. Network-scope rows must have all three
                  null per the CHECK constraint, so the pickers hide. */}
              {!isNetworkScope && (
              <div className={styles.addRoleField}>
                <label className={styles.addRoleFieldLabel}>
                  Company <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <select
                  className={styles.formSelect}
                  value={selectedCompany?.id || ""}
                  onChange={(e) => {
                    const company = companies.find((c) => c.id === Number(e.target.value));
                    setSelectedCompany(company || null);
                    setSelectedHotel(null);
                  }}
                  disabled={!selectedRole}
                >
                  <option value="">Select company...</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              )}

              {!isNetworkScope && (
              <div className={styles.addRoleField}>
                <label className={styles.addRoleFieldLabel}>
                  Business Unit
                  <span className={styles.addRoleFieldHint}> (optional)</span>
                </label>
                <select
                  className={styles.formSelect}
                  disabled={!selectedCompany || !selectedRole}
                  value={selectedHotel?.id || ""}
                  onChange={(e) => {
                    setSelectedHotel(
                      selectedCompany?.hotels.find((h) => h.id === Number(e.target.value)) || null
                    );
                    setSelectedDepartment(null);
                  }}
                >
                  <option value="">All Business Units</option>
                  {selectedCompany?.hotels.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </select>
              </div>
              )}

              {!isNetworkScope && (
              <div className={styles.addRoleField}>
                <label className={styles.addRoleFieldLabel}>
                  Department
                  <span className={styles.addRoleFieldHint}> (optional)</span>
                </label>
                <select
                  className={styles.formSelect}
                  disabled={propSelectedDepartment && !isEditMode ? true : !selectedRole}
                  value={selectedDepartment?.id || selectedDepartment?.value || ""}
                  onChange={(e) => {
                    const dept = departments.find((d) => d.id === Number(e.target.value)) || null;
                    setSelectedDepartment(dept);
                    if (dept) setError(null);
                  }}
                >
                  <option value="">All Departments</option>
                  {departments.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.title}
                    </option>
                  ))}
                </select>
              </div>
              )}
            </div>

            {/* Permissions Preview */}
            {selectedRole && (
              <div className={styles.permissionsPreview}>
                <div className={styles.permissionsPreviewTitle}>
                  Permissions for "{selectedRole.title}"
                </div>
                {hasPermissions ? (
                  Object.entries(permissions).map(([resource, actions]) => (
                    <div key={resource} className={styles.permissionsResourceRow}>
                      <div className={styles.permissionsResourceName}>{resource}</div>
                      <div className={styles.permissionsActionList}>
                        {(Array.isArray(actions) ? actions : []).map((action) => (
                          <span key={action} className={styles.permissionActionTag}>
                            {action}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className={styles.permissionsEmpty}>
                    Loading permissions...
                  </div>
                )}
              </div>
            )}

            <div className={styles.addRoleFooter}>
              {isEditing && (
                <button
                  type="button"
                  className={styles.outlineBtn}
                  onClick={handleCancelEdit}
                >
                  Cancel
                </button>
              )}
              <button
                type="button"
                className={styles.primaryBtn}
                disabled={!selectedRole || (!isNetworkScope && !selectedCompany)}
                onClick={handleAddRole}
              >
                {isEditing ? "Save Changes" : "Add Role"}
              </button>
            </div>
          </div>
        </>
      )}
      {/* All-access confirmation modal */}
      <ConfirmationModal
        isOpen={allAccessConfirm.open}
        onClose={() => setAllAccessConfirm({ open: false, scope: null })}
        onConfirm={() => {
          const scope = allAccessConfirm.scope;
          setAllAccessConfirm({ open: false, scope: null });
          if (scope) commitScope(scope);
        }}
        title="Grant broad access?"
        description={(() => {
          if (!allAccessConfirm.scope) return '';
          const parts = [];
          if (!allAccessConfirm.scope.hotel_id) parts.push('all business units');
          if (!allAccessConfirm.scope.department_id) parts.push('all departments');
          return `This role will have access across ${parts.join(' and ')}. Are you sure?`;
        })()}
        confirmButtonColor="warning"
        confirmButtonText="Yes, grant access"
        cancelButtonText="Cancel"
      />
    </div>
  );
}
