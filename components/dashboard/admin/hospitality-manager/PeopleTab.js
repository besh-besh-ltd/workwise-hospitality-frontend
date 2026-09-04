import React from "react";
import { BsPeople } from "react-icons/bs";
import EmptyState from "./EmptyState";
import styles from "./HospitalityManager.module.css";

/**
 * HN-3 — which departments this person operates in.
 *
 * Ashlesha's report was that verifying somebody's department meant opening
 * every mapped user in turn. This is that trip, saved.
 *
 * Read from their role scopes in this company rather than from the user's own
 * department row. Both exist and they disagree — 251 of 258 mapped users in
 * production have a department row and 227 have a scoped one — but the scoped
 * department is what routes approvals, and it is what opening the user
 * actually shows, which is the trip being saved.
 *
 * Three states, not two. "All departments" is a real grant (a role scope with
 * no department restriction), and flattening it into an empty cell would read
 * as "none" — the opposite of what it means.
 */
const DepartmentCell = ({ user }) => {
  const departments = Array.isArray(user.departments) ? user.departments : [];

  if (!user.has_roles_here) {
    return (
      <span className={styles.deptNone} title="This person is mapped to the company but holds no role here, so they cannot act in any department">
        No roles here
      </span>
    );
  }
  if (user.all_departments) {
    return <span className={styles.deptAll}>All departments</span>;
  }
  if (departments.length === 0) {
    return <span className={styles.deptNone}>Not set</span>;
  }
  return (
    <span className={styles.deptList}>
      {departments.map((d) => (
        <span key={d} className={styles.deptChip}>
          {d}
        </span>
      ))}
    </span>
  );
};

const PeopleTab = ({ users, filter, onFilterChange, onRemoveUser, isLoading }) => {
  if (isLoading) {
    return (
      <div className={styles.loadingWrap}>
        <div className={styles.spinner} />
      </div>
    );
  }

  const emptyMessages = {
    all: {
      title: "No people added yet",
      description: "Map users to give them access to this hospitality company and its business units.",
    },
    company: {
      title: "No company-level users found",
      description: "Try changing the filter or map users at the company level.",
    },
    hotel: {
      title: "No business unit-level users found",
      description: "Try changing the filter or map users at the business unit level.",
    },
  };

  return (
    <>
      <div className={styles.tabContentHeader}>
        <h3 className={styles.tabContentTitle}>People</h3>
        <div className={styles.filterBar}>
          <select
            className={styles.filterSelect}
            value={filter}
            onChange={(e) => onFilterChange(e.target.value)}
          >
            <option value="all">All Mappings</option>
            <option value="company">Company Level</option>
            <option value="hotel">Business Unit Level</option>
          </select>
        </div>
      </div>

      {users.length === 0 ? (
        <EmptyState
          icon={<BsPeople size={36} />}
          title={emptyMessages[filter]?.title}
          description={emptyMessages[filter]?.description}
        />
      ) : (
        <div className={styles.tableCard}>
          <table className={styles.peopleTable}>
            <thead>
              <tr>
                <th>User</th>
                <th>Mapping Level</th>
                <th>Departments</th>
                <th>Auto Map Projects</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={`${user.user_id}-${user.mapping_type}-${user.hospitality_hotel_id || "company"}`}>
                  <td>
                    <div className={styles.userRow}>
                      <div className={styles.userAvatar}>
                        {(user.name || "U")[0].toUpperCase()}
                      </div>
                      <div>
                        <div className={styles.userName}>{user.name}</div>
                        <div className={styles.userEmail}>{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    {user.mapping_type === 0 ? (
                      <span className={`${styles.mappingBadge} ${styles.mappingCompany}`}>
                        Company Level
                      </span>
                    ) : (
                      <div>
                        <span className={`${styles.mappingBadge} ${styles.mappingHotel}`}>
                          Business Unit
                        </span>
                        {user.hotel_name && (
                          <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>
                            {user.hotel_name}
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                  <td>
                    <DepartmentCell user={user} />
                  </td>
                  <td>
                    <span
                      className={`${styles.autoMapBadge} ${
                        user.auto_map_projects ? styles.autoMapYes : styles.autoMapNo
                      }`}
                    >
                      {user.auto_map_projects ? "Yes" : "No"}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className={styles.outlineDangerBtn}
                      onClick={() => onRemoveUser(user)}
                      style={{ padding: "6px 14px", fontSize: "12px" }}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
};

export default PeopleTab;
