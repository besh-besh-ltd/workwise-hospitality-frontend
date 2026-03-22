import { useEffect, useState } from "react";
import { HiX } from "react-icons/hi";
import { getDepartments, getRoles, getRolePermissions } from "@/services/rbac";
import { getHospitalityEntities, getUserMappings } from "@/services/hospitality";
import styles from "@/components/dashboard/admin/account-management/manage-accounts/ManageAccounts.module.scss";

export default function RoleScopeSelector({ onAddRole, existingRoles, selectedDepartment: propSelectedDepartment, isEditMode = true, onRemoveRole, userDepartments = [], userId = null, externalMappings = null }) {
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
    const loadUserMappings = async () => {
      try {
        const response = await getUserMappings(userId);
        const mappings = response?.data?.data || response?.data || [];
        setUserMappings(mappings);
      } catch (error) {
        console.error("Error loading user mappings:", error);
        setUserMappings([]);
      } finally {
        setUserMappingsLoaded(true);
      }
    };

    loadUserMappings();
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

  useEffect(() => {
    if (allDepartments.length === 0) return;

    if (isEditMode) {
      if (userDepartments === undefined) {
        setDepartments(allDepartments);
        return;
      }

      if (Array.isArray(userDepartments)) {
        if (userDepartments.length > 0) {
          const userDeptIds = userDepartments.map(d => {
            if (typeof d === 'number') return Number(d);
            if (typeof d === 'object' && d !== null) {
              const id = d.id || d.value || d.department_id;
              return id ? Number(id) : null;
            }
            return null;
          }).filter(id => id !== null && id !== undefined);

          if (userDeptIds.length > 0) {
            const filteredDepts = allDepartments.filter(d => {
              const deptId = Number(d.id || d.value);
              return userDeptIds.includes(deptId);
            });
            setDepartments(filteredDepts);
          } else {
            setDepartments([]);
          }
        } else {
          setDepartments([]);
        }
      } else {
        setDepartments(allDepartments);
      }
    } else {
      // Not in edit mode — filter by userDepartments if provided
      if (Array.isArray(userDepartments) && userDepartments.length > 0) {
        const userDeptIds = userDepartments.map(d => {
          if (typeof d === 'number') return Number(d);
          if (typeof d === 'object' && d !== null) {
            const id = d.id || d.value || d.department_id;
            return id ? Number(id) : null;
          }
          return null;
        }).filter(id => id !== null && id !== undefined);

        if (userDeptIds.length > 0) {
          setDepartments(allDepartments.filter(d => userDeptIds.includes(Number(d.id || d.value))));
        } else {
          setDepartments(allDepartments);
        }
      } else {
        setDepartments(allDepartments);
      }
    }
  }, [isEditMode, userDepartments, allDepartments]);

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

  const handleAddRole = () => {
    if (!selectedRole || !selectedCompany) return;

    // Prevent exact duplicate role scope
    const isDuplicate = (existingRoles || []).some(
      (r) =>
        r.role_id === selectedRole.id &&
        r.company_id === selectedCompany.id &&
        (r.hotel_id || null) === (selectedHotel?.id || null) &&
        (r.department_id || null) === (selectedDepartment?.id || null)
    );
    if (isDuplicate) {
      setError("This exact role assignment already exists.");
      return;
    }

    onAddRole({
      role_id: selectedRole.id,
      role_title: selectedRole.title,
      company_id: selectedCompany.id,
      hotel_id: selectedHotel?.id || null,
      department_id: selectedDepartment?.id || null,
      permissions
    });

    setSelectedRole(null);
    setSelectedCompany(null);
    setSelectedHotel(null);
    setSelectedDepartment(null);
    setPermissions({});
    setError(null);
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
          {/* Assigned Roles */}
          <div className={styles.assignedRolesSection}>
            <div className={styles.assignedRolesTitle}>
              Assigned Roles {existingRoles?.length > 0 && `(${existingRoles.length})`}
            </div>

            {existingRoles && existingRoles.length > 0 ? (
              <div className={styles.assignedRolesList}>
                {existingRoles.map((role, index) => {
                  const perms = role.permissions || {};
                  const permEntries = Object.entries(perms).filter(
                    ([, actions]) => Array.isArray(actions) && actions.length > 0
                  );

                  // Build a compact permission summary string
                  const permSummary = permEntries.map(([resource, actions]) => ({
                    resource,
                    actions: actions.join(", "),
                  }));

                  return (
                    <div key={index} className={styles.roleRow}>
                      <div className={styles.roleRowMain}>
                        <div className={styles.roleRowTopLine}>
                          <span className={styles.roleRowTitle}>
                            {role.role_title || role.title}
                          </span>
                          <span className={styles.roleRowScopePath}>
                            <span className={styles.roleRowScopeValue}>{getCompanyName(role.company_id)}</span>
                            <span className={styles.roleRowScopeSep}> → </span>
                            <span className={styles.roleRowScopeValue}>{getHotelName(role.company_id, role.hotel_id)}</span>
                            <span className={styles.roleRowScopeSep}> → </span>
                            <span className={styles.roleRowScopeValue}>{getDeptName(role.department_id)}</span>
                          </span>
                        </div>
                        <div className={styles.roleRowPermLine}>
                          {permSummary.length > 0 ? (
                            permSummary.map((p, i) => (
                              <span key={p.resource}>
                                {i > 0 && <span className={styles.roleRowPermDot}>·</span>}
                                <span className={styles.roleRowPermHighlight}>{p.resource}</span>
                                {": "}
                                {p.actions}
                              </span>
                            ))
                          ) : (
                            <span>Default role permissions</span>
                          )}
                        </div>
                      </div>
                      {onRemoveRole && (
                        <button
                          type="button"
                          className={styles.roleRowRemove}
                          onClick={() => onRemoveRole(index)}
                          title="Remove role"
                        >
                          <HiX size={13} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className={styles.assignedRolesEmpty}>
                No workflow roles assigned yet. Add a role below.
              </div>
            )}
          </div>

          {/* Add Role Form */}
          <div className={styles.addRoleSection}>
            <div className={styles.addRoleTitle}>Add New Role</div>
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

              {/* Business Unit */}
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

              {/* Department */}
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
              <button
                type="button"
                className={styles.primaryBtn}
                disabled={!selectedRole || !selectedCompany}
                onClick={handleAddRole}
              >
                Add Role
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
