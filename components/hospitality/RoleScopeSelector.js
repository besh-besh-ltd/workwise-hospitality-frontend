import { Fragment, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { HiX, HiPencil } from "react-icons/hi";
import { getDepartments, getRoles, getRolePermissions } from "@/services/rbac";
import { getHospitalityEntities, getUserMappingsById } from "@/services/hospitality";
import { getApprovalProcesses } from "@/services/process";
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
  // "" = not yet chosen, "all" = deliberately every unit, "<id>" = one unit.
  //
  // The unit used to default to "All Business Units", which meant Role and
  // Department were reachable before the admin had thought about scope at all
  // — the out-of-sequence problem in UM-4. Requiring a deliberate choice fixes
  // that without removing the legitimate all-units grant, which is a real and
  // common thing to want.
  const [hotelChoice, setHotelChoice] = useState("");
  // Confirmation after a role is staged, so multi-add has visible feedback.
  const [justAdded, setJustAdded] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState(propSelectedDepartment || null);
  const [processes, setProcesses] = useState([]);
  // Single process per scope row, matching the Business Unit / Department
  // pattern. Multi-process access is achieved by adding multiple rows (same
  // role, same hotel/dept, different process) — mirrors how multi-hotel works.
  const [selectedProcess, setSelectedProcess] = useState(null); // {id, name, process_type} | null
  const [processesLoading, setProcessesLoading] = useState(false);

  // null = create mode; number = index into existingRoles being edited.
  // When set, the bottom form pre-fills with that role's scope and the
  // primary action becomes "Save Changes" instead of "Add Role".
  const [editingIndex, setEditingIndex] = useState(null);
  const [allAccessConfirm, setAllAccessConfirm] = useState({ open: false, scope: null });

  // Expose current form state to parent so it can auto-add on save.
  // Empty process = scope row with process_id = null = "all processes" (the
  // backwards-compat wildcard).
  useEffect(() => {
    if (!pendingScopeRef) return;
    if (selectedRole && selectedCompany) {
      pendingScopeRef.current = {
        role_id: selectedRole.id,
        role_title: selectedRole.title,
        company_id: selectedCompany.id,
        hotel_id: selectedHotel?.id || null,
        department_id: selectedDepartment?.id || null,
        process_id: selectedProcess?.id || null,
        process_name: selectedProcess?.name || null,
        process_type: selectedProcess?.process_type || null,
        permissions
      };
    } else {
      pendingScopeRef.current = null;
    }
  }, [selectedRole, selectedCompany, selectedHotel, selectedDepartment, selectedProcess, permissions, pendingScopeRef]);

  // Load processes for the currently-selected company. Per-company catalog
  // (tbl_approval_processes is scoped per parent company, bridged via
  // tbl_hospitality_companies.buyer_company_id on the backend). Honors
  // user_type=7 (hospitality admin) so a single admin can configure scope
  // across multiple companies.
  useEffect(() => {
    if (!selectedCompany?.id) {
      setProcesses([]);
      setSelectedProcess(null);
      return;
    }
    let cancelled = false;
    setProcessesLoading(true);
    getApprovalProcesses({ company_id: selectedCompany.id })
      .then((res) => {
        if (cancelled) return;
        const list = res?.data?.data || res?.data || [];
        setProcesses(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (!cancelled) setProcesses([]);
      })
      .finally(() => {
        if (!cancelled) setProcessesLoading(false);
      });
    return () => { cancelled = true; };
  }, [selectedCompany?.id]);

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

  /**
   * Clears the form.
   *
   * `keepScope` is what makes assigning several roles bearable. Giving one
   * person four roles at the same unit used to mean re-picking the company and
   * the unit four times — UM-2. After a role is staged, the scope stays and
   * only the role, department and process reset, so the second role is two
   * choices rather than six.
   */
  const resetForm = ({ keepScope = false } = {}) => {
    setSelectedRole(null);
    setSelectedDepartment(null);
    setSelectedProcess(null);
    setPermissions({});
    setError(null);
    if (!keepScope) {
      setSelectedCompany(null);
      setSelectedHotel(null);
      setHotelChoice("");
    }
  };

  const commitScope = (scope) => {
    if (editingIndex !== null && onReplaceRole) {
      onReplaceRole(editingIndex, scope);
      setEditingIndex(null);
      setJustAdded(null);
      resetForm();
    } else {
      onAddRole(scope);
      setJustAdded(scope.role_title || "Role");
      resetForm({ keepScope: true });
    }
  };

  const handleAddRole = () => {
    if (!selectedRole || !selectedCompany) return;

    const newScope = {
      role_id: selectedRole.id,
      role_title: selectedRole.title,
      company_id: selectedCompany.id,
      hotel_id: selectedHotel?.id || null,
      department_id: selectedDepartment?.id || null,
      process_id: selectedProcess?.id || null,
      process_name: selectedProcess?.name || null,
      process_type: selectedProcess?.process_type || null,
      permissions
    };

    // Prevent exact duplicate role scope. Tuple includes process_id so
    // (role, company, hotel, dept, P1) and (role, company, hotel, dept, P2)
    // are independent rows. Admins create multi-process access by adding
    // multiple rows (one per process) — same pattern as multi-hotel today.
    const isDuplicate = (existingRoles || []).some((r, i) => {
      if (editingIndex !== null && i === editingIndex) return false;
      return r.role_id === newScope.role_id &&
        r.company_id === newScope.company_id &&
        (r.hotel_id || null) === newScope.hotel_id &&
        (r.department_id || null) === newScope.department_id &&
        (r.process_id || null) === newScope.process_id;
    });
    if (isDuplicate) {
      setError("This exact role assignment already exists.");
      return;
    }

    // If hotel, department, or process is "All" (null), confirm with user.
    // The process confirm only fires when the company actually has processes
    // configured — picking "all" on an empty catalog is unambiguous.
    const allHotel = !newScope.hotel_id;
    const allDept = !newScope.department_id;
    const allProcess = !newScope.process_id && processes.length > 0;
    if (allHotel || allDept || allProcess) {
      setAllAccessConfirm({ open: true, scope: newScope });
      return;
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
    setSelectedCompany(matchedCompany || null);
    setSelectedHotel(matchedHotel);
    setHotelChoice(role.hotel_id ? String(role.hotel_id) : "all");
    setJustAdded(null);
    setSelectedDepartment(matchedDept);
    // Process pre-fill: single value, matching dept/hotel selection. The
    // process options list reloads asynchronously via the selectedCompany
    // effect; we set the value directly so the saved process shows even
    // before the catalog finishes loading.
    if (role.process_id) {
      setSelectedProcess({
        id: role.process_id,
        name: role.process_name || `Process #${role.process_id}`,
        process_type: role.process_type || null,
      });
    } else {
      setSelectedProcess(null);
    }
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

  /**
   * Whether the form holds a selection the admin has not staged yet.
   *
   * UM-3: people fill this in, miss "Add Role", press Update Account and lose
   * the grant silently. The parent asks this before saving so it can say so.
   */
  const hasUnstagedSelection = () => Boolean(selectedRole && selectedCompany);

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

  // ARC is process-free: a role whose permissions are ALL ARC resources
  // (arc / arc-tech / arc-comm / arc-committee) must never be process-scoped —
  // ARC entities carry process_id = NULL, so a process on the grant would
  // wrongly narrow it. Hide the Process picker and force process_id = NULL.
  const isArcResource = (r) => r === "arc" || (typeof r === "string" && r.startsWith("arc-"));
  const permissionResources = Object.keys(permissions);
  const isArcOnlyRole = hasPermissions && permissionResources.length > 0 && permissionResources.every(isArcResource);

  useEffect(() => {
    if (isArcOnlyRole && selectedProcess) setSelectedProcess(null);
  }, [isArcOnlyRole, selectedProcess]);

  // Group existingRoles into Company → Business Unit → [roles] so the admin
  // can scan their scope hierarchy directly instead of paging through a flat
  // list. Each leaf carries _index so edit/remove still target the correct
  // row in the original existingRoles array.
  const groupedRoles = useMemo(() => {
    const groups = new Map(); // companyId -> { name, hotels: Map<hotelId, [roles]> }
    (existingRoles || []).forEach((role, idx) => {
      const cid = role.company_id ?? '__none__';
      const hid = role.hotel_id ?? '__all__';
      if (!groups.has(cid)) {
        groups.set(cid, { name: getCompanyName(role.company_id), hotels: new Map() });
      }
      const company = groups.get(cid);
      if (!company.hotels.has(hid)) {
        company.hotels.set(hid, {
          name: getHotelName(role.company_id, role.hotel_id),
          roles: [],
        });
      }
      company.hotels.get(hid).roles.push({ ...role, _index: idx });
    });
    // Materialise into arrays for stable rendering order.
    return Array.from(groups.entries()).map(([cid, c]) => ({
      companyId: cid,
      companyName: c.name,
      hotels: Array.from(c.hotels.entries()).map(([hid, h]) => ({
        hotelId: hid,
        hotelName: h.name,
        roles: h.roles,
      })),
    }));
  }, [existingRoles, allCompanies, allDepartments]);

  /**
   * The add/edit form, rendered in one of two places.
   *
   * In add mode it sits below the list, where new work belongs. In edit mode
   * it is rendered inline directly beneath the row being edited (UM-6) —
   * previously editing a role scrolled the admin to a form at the bottom of a
   * long modal, with no visual tie back to the row they had clicked, so it was
   * easy to lose track of which grant was being changed.
   */
  const roleForm = (
    <>
            {/* Add / Edit Role Form. Shared form: in create mode it inserts a
                new role; in edit mode it replaces the role at editingIndex. */}
            <div className={styles.addRoleSection}>
              <div className={styles.addRoleTitle}>
                {isEditing ? "Edit Role" : "Add New Role"}
              </div>
              <div className={styles.addRoleGrid}>
                {/* Order matters here. Company -> Business Unit -> Role +
                    Department, each gated on the one before it (UM-4). It used
                    to run Role -> Company -> Business Unit, with Department
                    reachable as soon as a role was picked, which let an admin
                    choose a department before deciding which unit it belonged
                    to. Scope first, then what the person may do inside it. */}

                {/* Company */}
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
                      setHotelChoice("");
                      setSelectedRole(null);
                      setSelectedDepartment(null);
                      setError(null);
                    }}
                  >
                    <option value="">Select company...</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Business Unit */}
                <div className={styles.addRoleField}>
                  <label className={styles.addRoleFieldLabel}>
                    Business Unit <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <select
                    className={styles.formSelect}
                    disabled={!selectedCompany}
                    value={hotelChoice}
                    onChange={(e) => {
                      const value = e.target.value;
                      setHotelChoice(value);
                      setSelectedHotel(
                        value && value !== "all"
                          ? selectedCompany?.hotels.find((h) => h.id === Number(value)) || null
                          : null
                      );
                      setSelectedDepartment(null);
                      setError(null);
                    }}
                  >
                    <option value="">Select business unit...</option>
                    <option value="all">All Business Units</option>
                    {selectedCompany?.hotels.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Role */}
                <div className={styles.addRoleField}>
                  <label className={styles.addRoleFieldLabel}>
                    Role <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <select
                    className={styles.formSelect}
                    disabled={!selectedCompany || !hotelChoice}
                    value={selectedRole?.id || ""}
                    onChange={(e) => {
                      const role = roles.find((r) => r.id === Number(e.target.value)) || null;
                      setSelectedRole(role);
                      setError(null);
                    }}
                  >
                    <option value="">
                      {!selectedCompany
                        ? "Select a company first..."
                        : !hotelChoice
                        ? "Select a business unit first..."
                        : "Select a role..."}
                    </option>
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Department */}
                <div className={styles.addRoleField}>
                  <label className={styles.addRoleFieldLabel}>
                    Department
                    <span className={styles.addRoleFieldHint}> (optional)</span>
                  </label>
                  <select
                    className={styles.formSelect}
                    disabled={
                      propSelectedDepartment && !isEditMode
                        ? true
                        : !selectedCompany || !hotelChoice
                    }
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

                {/* Process — single select, matching the Business Unit /
                    Department dropdowns above. NULL on emit = "all processes"
                    (mirrors how hotel_id/department_id work). Admins create
                    multi-process access by adding multiple role rows.
                    Hidden entirely for ARC-only roles — ARC is process-free. */}
                {isArcOnlyRole ? (
                  <div className={styles.addRoleField}>
                    <label className={styles.addRoleFieldLabel}>Process</label>
                    <small className={styles.formSmallHint} style={{ color: "#9d174d" }}>
                      ARC roles are process-free — this grant applies to all rate contracts. No process needed.
                    </small>
                  </div>
                ) : (
                <div className={styles.addRoleField}>
                  <label className={styles.addRoleFieldLabel}>
                    Process
                    <span className={styles.addRoleFieldHint}> (optional)</span>
                  </label>
                  <select
                    className={styles.formSelect}
                    disabled={!selectedCompany || !hotelChoice || !selectedRole || processesLoading}
                    value={selectedProcess?.id || ""}
                    onChange={(e) => {
                      const id = Number(e.target.value);
                      const proc = processes.find((p) => p.id === id) || null;
                      setSelectedProcess(proc);
                      if (proc) setError(null);
                    }}
                  >
                    <option value="">
                      {processesLoading ? "Loading processes..." : "All Processes"}
                    </option>
                    {processes.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}{p.process_type ? ` (${p.process_type})` : ""}
                      </option>
                    ))}
                  </select>
                  {selectedCompany && !processesLoading && processes.length === 0 && (
                    <small className={styles.formSmallHint}>
                      No processes configured for this company yet. Role will apply to all processes once they're added.
                    </small>
                  )}
                </div>
                )}
              </div>

              {/* The action sits directly under the fields, before the
                  permissions preview (UM-3). It used to come after the preview,
                  which on a full-height role can be a screen and a half of
                  content — so people filled the form in, never saw the button,
                  pressed Update Account and lost the grant without being told. */}
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
                  disabled={!selectedRole || !selectedCompany}
                  onClick={handleAddRole}
                >
                  {isEditing ? "Save Changes" : "Add Role"}
                </button>
              </div>

              {justAdded && !isEditing && (
                <div className={styles.addRoleStagedNote} role="status">
                  <strong>{justAdded}</strong> added to the list above. The company
                  and business unit are kept — pick another role to add a second.
                </div>
              )}

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

            </div>
    </>
  );

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
                              <Fragment key={`r-${role._index}`}>
                              <div
                                className={`${styles.scopeRoleRow} ${isThisRowEditing ? styles.scopeRoleRowEditing : ""}`}
                              >
                                <div className={styles.scopeRoleMain}>
                                  <span className={styles.scopeRoleTitle}>
                                    {role.role_title || role.title}
                                  </span>
                                  {role.department_id && (
                                    <span className={styles.scopeRoleDeptTag}>
                                      {getDeptName(role.department_id)}
                                    </span>
                                  )}
                                  {role.process_id && (
                                    <span
                                      className={styles.scopeRoleDeptTag}
                                      style={{
                                        background: role.process_type === "TENDER" ? "#fef3c7" : "#dbeafe",
                                        color: role.process_type === "TENDER" ? "#92400e" : "#1e40af",
                                      }}
                                    >
                                      {role.process_name || `Process #${role.process_id}`}
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
                              {isThisRowEditing && (
                                <div className={styles.scopeRoleInlineEdit}>{roleForm}</div>
                              )}
                              </Fragment>
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

          {!isEditing && roleForm}
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
          if (!allAccessConfirm.scope.process_id && processes.length > 0) parts.push('all processes');
          return `This role will have access across ${parts.join(' and ')}. Are you sure?`;
        })()}
        confirmButtonColor="warning"
        confirmButtonText="Yes, grant access"
        cancelButtonText="Cancel"
      />
    </div>
  );
}
