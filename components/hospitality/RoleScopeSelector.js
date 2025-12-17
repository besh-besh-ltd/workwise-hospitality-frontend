import { useEffect, useState } from "react";
import { Badge } from "react-bootstrap";

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

export default function RoleScopeSelector({ onAddRole, existingRoles }) {
  /* ---------------- Dummy API Data ---------------- */

  const [roles, setRoles] = useState([
    { id: 1, title: "CEO" },
    { id: 2, title: "Technical Approver" },
    { id: 3, title: "Negotiator P1" }
  ]);
  const [companies, setCompanies] = useState([
    {
      id: 10,
      name: "ABC Hospitality",
      hotels: [
        { id: 101, name: "Hotel Taj Central" },
        { id: 102, name: "Hotel Taj Airport" }
      ]
    }
  ]);

  const rolePermissionsMap = {
    1: {
      tender: ["read", "create", "update", "delete"],
      negotiation: ["read", "write", "update", "delete"]
    },
    2: {
      tender: ["read", "approve"],
      negotiation: ["read"]
    },
    3: {
      negotiation: ["read", "write", "update", "delete"]
    }
  };

  /* ---------------- State ---------------- */

  const [selectedRole, setSelectedRole] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [permissions, setPermissions] = useState({});

  /* ---------------- Effects ---------------- */

  useEffect(() => {
    if (selectedRole) {
      setPermissions(rolePermissionsMap[selectedRole.id] || {});
    } else {
      setPermissions({});
    }
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
    <div className="container-sm p-0" style={{maxWidth: "500px"}}>

      {/* Header */}
      <div className="mb-3">
        <h5 className="fw-semibold mb-0">Roles</h5>
        <small className="text-muted">Choose as many as you want</small>
      </div>

      {existingRoles && Array.isArray(existingRoles) && existingRoles.length > 0 && (
        <div className="d-flex gap-2">
            {existingRoles.map(role => (
                <div className="alert alert-success text-sm px-2.5 py-2">{role.title}</div>
            ))}
        </div>
      )}

      {/* Selected Role */}
      <div className="mb-3">
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

      {/* Scope */}
      <div className="row mb-3">
        <div className="col-md-6">
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

        <div className="col-md-6">
          <label className="form-label">Select Hotel (optional)</label>
          <select
            className="form-select"
            disabled={!selectedCompany}
            value={selectedHotel?.id || ""}
            onChange={e =>
              setSelectedHotel(
                selectedCompany?.hotels.find(
                  h => h.id === Number(e.target.value)
                ) || null
              )
            }
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