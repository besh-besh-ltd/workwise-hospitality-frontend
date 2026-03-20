import React from "react";
import { HiOutlinePencil } from "react-icons/hi";
import { formatDisplayDate } from "@/utils/sharedFunctions";
import styles from "./ManageAccounts.module.css";

const AVATAR_COLORS = [
  "#2E5BA8", "#3B82F6", "#1D4ED8", "#4F46E5",
  "#0EA5E9", "#64748B", "#D97706", "#DC2626",
];

const getAvatarColor = (name) => {
  if (!name) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const getInitials = (name) => {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return parts[0].slice(0, 2).toUpperCase();
};

const dedupeHospitalityMappings = (list = []) => {
  const seen = new Set();
  return list.filter((item) => {
    const key =
      item.mapping_type === 0
        ? `company-${item.hospitality_company_id}`
        : `hotel-${item.hospitality_company_id}-${item.hospitality_hotel_id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const UserRow = ({ account, isHospitality, mappings, roleScopes, departments, onEdit }) => {
  const isActive = account.status === "active";
  const initials = getInitials(account.name);
  const avatarColor = getAvatarColor(account.name);
  const dedupedMappings = dedupeHospitalityMappings(mappings || []);
  const uniqueRoles = Array.from(new Set((roleScopes || []).map((s) => s.role_title).filter(Boolean)));
  const depts = departments || [];

  return (
    <tr className={!isActive ? styles.rowInactive : undefined}>
      <td>
        <div className={styles.userCell}>
          <div className={styles.userAvatar} style={{ background: avatarColor }}>
            {initials}
          </div>
          <div>
            <div className={styles.userName}>{account.name}</div>
            <div className={styles.userEmail}>{account.email}</div>
          </div>
        </div>
      </td>
      <td>
        <span className={styles.userMobile}>{account.employee_code || "—"}</span>
      </td>
      <td>
        <span className={styles.userMobile}>{account.designation || "—"}</span>
      </td>
      <td>
        <span className={styles.userMobile}>{account.mobile || "—"}</span>
      </td>
      <td>
        <span className={`${styles.statusBadge} ${isActive ? styles.statusActive : styles.statusInactive}`}>
          <span className={`${styles.statusDot} ${isActive ? styles.dotActive : styles.dotInactive}`} />
          {isActive ? "Active" : "Inactive"}
        </span>
      </td>
      {isHospitality && (
        <td>
          {uniqueRoles.length > 0 ? (
            <div className={styles.badgeWrap}>
              {uniqueRoles.map((title) => (
                <span key={title} className={styles.roleBadge}>{title}</span>
              ))}
            </div>
          ) : (
            <span className={styles.noData}>—</span>
          )}
        </td>
      )}
      <td>
        {depts.length > 0 ? (
          <div className={styles.badgeWrap}>
            {depts.map((dept) => (
              <span key={dept.id} className={styles.deptBadge}>{dept.title}</span>
            ))}
          </div>
        ) : (
          <span className={styles.noData}>—</span>
        )}
      </td>
      <td>{account.created_at ? formatDisplayDate(account.created_at) : "—"}</td>
      {isHospitality && (
        <td>
          {dedupedMappings.length > 0 ? (
            <div className={styles.badgeWrap}>
              {dedupedMappings.map((mapping) => (
                <span
                  key={`${mapping.mapping_type}-${mapping.hospitality_hotel_id || "co"}-${mapping.hospitality_company_id}`}
                  className={`${styles.mappingBadge} ${mapping.mapping_type === 0 ? styles.mappingCompany : styles.mappingHotel}`}
                >
                  {mapping.mapping_type === 0
                    ? mapping.company_name || "Company"
                    : mapping.hotel_name || "BU"}
                </span>
              ))}
            </div>
          ) : (
            <span className={styles.noData}>Not mapped</span>
          )}
        </td>
      )}
      <td>
        <button type="button" className={styles.editBtn} onClick={() => onEdit(account)}>
          <HiOutlinePencil size={13} />
          Edit
        </button>
      </td>
    </tr>
  );
};

export default UserRow;
