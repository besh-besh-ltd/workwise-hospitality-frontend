import { useEffect, useState } from "react";
import { getDepartments, getRoles, getRolePermissions } from "@/services/rbac";
import { getHospitalityEntities } from "@/services/hospitality";

/**
 * RoleScopeSelector (Bootstrap-friendly)
 * -----------------------------------
 * Designed to be used INSIDE a Bootstrap modal body
 * Uses only React + Bootstrap classes
 *
 * Props:
 * - onAddRole(scopeObject)
 *
 * scopeObject shape:
 * {
 *   role_id,
 *   role_title,
 *   company_id,
 *   hotel_id,
 *   permissions: {
 *     tender: ['read','create'],
 *     negotiation: ['read','write']
 *   }
 * }
 */

export default function RoleScopeSelector({ onAddRole, existingRoles, selectedDepartment: propSelectedDepartment, isEditMode = true, onRemoveRole, userDepartments = [] }) {
  const [roles, setRoles] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [allDepartments, setAllDepartments] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /* ---------------- State ---------------- */

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
        const departmentsData =
          departmentsRes?.data?.data || departmentsRes?.data || [];
        const entities = entitiesRes?.data?.data || entitiesRes?.data || [];

        setRoles(rolesData);
        setAllDepartments(departmentsData);
        // Initially set departments - will be filtered by second useEffect if needed
        setDepartments(departmentsData);
        setCompanies(
          entities.map((c) => ({
            id: c.company_id,
            name: c.company_name,
            hotels: (c.hotels || []).map((h) => ({
              id: h.hotel_id,
              name: h.hotel_name
            }))
          }))
        );
      } catch {
        setError("Failed to load role & hospitality data.");
      } finally {
        setLoading(false);
      }
    };

    loadMasters();
  }, []);

  // Filter departments based on userDepartments in edit mode
  useEffect(() => {
    if (allDepartments.length === 0) return;
    
    // In edit mode, only show user's departments if userDepartments is provided and not empty
    if (isEditMode) {
      // If userDepartments is undefined, show all departments (data still loading)
      if (userDepartments === undefined) {
        setDepartments(allDepartments);
        return;
      }
      
      // If userDepartments is provided
      if (Array.isArray(userDepartments)) {
        if (userDepartments.length > 0) {
          // Extract department IDs from userDepartments (handle both object and id formats)
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
            // If userDepartments is empty array, show no departments
            setDepartments([]);
          }
        } else {
          // If userDepartments is empty array, show no departments
          setDepartments([]);
        }
      } else {
        // If userDepartments is not an array, show all departments
        setDepartments(allDepartments);
      }
    } else {
      // Not in edit mode, show all departments
      setDepartments(allDepartments);
    }
  }, [isEditMode, userDepartments, allDepartments]);

  useEffect(() => {
    if (propSelectedDepartment && !isEditMode) {
      // If propSelectedDepartment is an object with id/value, use it directly
      // Otherwise, find it in departments list
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

  const togglePermission = (resource, action) => {
    setPermissions(prev => {
      const current = prev[resource] || [];
      return {
        ...prev,
        [resource]: current.includes(action)
          ? current.filter(a => a !== action)
          : [...current, action]
      };
    });
  };

  const handleAddRole = () => {
    if (!selectedRole || !selectedCompany) return;

    onAddRole({
      role_id: selectedRole.id,
      role_title: selectedRole.title,
      company_id: selectedCompany.id,
      hotel_id: selectedHotel?.id || null,
      department_id: selectedDepartment?.id || null,
      permissions
    });

    // Reset after add
    setSelectedRole(null);
    setSelectedCompany(null);
    setSelectedHotel(null);
    setPermissions({});
  };

  /* ---------------- UI ---------------- */

  return (
    <div className="w-100 border rounded-3 bg-light p-3" style={{ width: "100%" }}>

      {/* Header */}
      <div className="mb-3">
        <h5 className="fw-semibold mb-0">Roles</h5>
        <small className="text-muted">Choose as many as you want</small>
      </div>

      {loading && (
        <p className="text-muted mb-2">Loading role & scope data…</p>
      )}
      {error && !loading && (
        <p className="text-danger mb-2">{error}</p>
      )}

      {existingRoles && Array.isArray(existingRoles) && existingRoles.length > 0 && (
        <div className="d-flex flex-wrap gap-2 mb-2">
          {existingRoles.map((role, index) => (
            <div
              key={index}
              className="alert alert-success text-sm px-2.5 py-2 mb-0 d-flex align-items-center gap-2"
            >
              <span>{role.role_title || role.title}</span>
              {isEditMode && onRemoveRole && (
                <button
                  type="button"
                  className="btn-close btn-close-sm"
                  onClick={() => onRemoveRole(index)}
                  aria-label="Remove role"
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Role & Scope selectors */}
      <div className="row g-3 mb-3">
        <div className="col-md-4">
          <label className="form-label">Select Role</label>
          <select
            className="form-select"
            value={selectedRole?.id || ""}
            onChange={e =>
              setSelectedRole(
                roles.find(r => r.id === Number(e.target.value)) || null
              )
            }
          >
            <option value="">Select a role</option>
            {roles.map(role => (
              <option key={role.id} value={role.id}>
                {role.title}
              </option>
            ))}
          </select>
        </div>

        <div className="col-md-4">
          <label className="form-label">Select Company *</label>
          <select
            className="form-select"
            value={selectedCompany?.id || ""}
            onChange={e => {
              const company = companies.find(
                c => c.id === Number(e.target.value)
              );
              setSelectedCompany(company || null);
              setSelectedHotel(null);
            }}
          >
            <option value="">Select company</option>
            {companies.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="col-md-4">
          <label className="form-label">Select Hotel (optional)</label>
          <select
            className="form-select"
            disabled={!selectedCompany}
            value={selectedHotel?.id || ""}
            onChange={e => {
                setSelectedHotel(
                    selectedCompany?.hotels.find(
                    h => h.id === Number(e.target.value)
                    ) || null
                );
                setSelectedDepartment(null);
            }}
          >
            <option value="">All Hotels</option>
            {selectedCompany?.hotels.map(h => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-md-4">
          <label className="form-label">Select Department {propSelectedDepartment && !isEditMode ? "(Auto-selected)" : "(optional)"}</label>
          <select
            className="form-select"
            disabled={propSelectedDepartment && !isEditMode ? true : false}
            value={selectedDepartment?.id || selectedDepartment?.value || ""}
            onChange={e =>
              setSelectedDepartment(
                departments.find(
                  d => d.id === Number(e.target.value)
                ) || null
              )
            }
          >
            <option value="">All Departments</option>
            {departments.map(h => (
              <option key={h.id} value={h.id}>
                {h.title}
              </option>
            ))}
          </select>
          {propSelectedDepartment && !isEditMode && (
            <small className="text-muted">Department is set from account creation and cannot be changed here</small>
          )}
        </div>
      </div>

      {/* Permissions */}
      {selectedRole && (
        <div className="mb-3">
          <label className="form-label fw-semibold">Permissions</label>

          {Object.entries(permissions).map(([resource, actions]) => (
            <div key={resource} className="mb-2">
              <div className="fw-medium text-capitalize mb-1">
                {resource}
              </div>
              <div className="d-flex flex-wrap gap-3">
                {["read", "create", "update", "delete", "approve"].map(action => (
                  <div className="form-check" key={action}>
                    <input
                      readOnly
                      className="form-check-input"
                      type="checkbox"
                      checked={actions.includes(action)}
                    />
                    <label className="form-check-label text-capitalize">
                      {action}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="d-flex justify-content-end">
        <button
          className="btn btn-primary p-2"
          disabled={!selectedRole || !selectedCompany}
          onClick={handleAddRole}
        >
          Add Role Scope
        </button>
      </div>

    </div>
  );
}