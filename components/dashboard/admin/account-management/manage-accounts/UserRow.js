import React, { useState } from "react";
import { HiOutlinePencil } from "react-icons/hi";
import { BsBuilding } from "react-icons/bs";
import { formatDisplayDate } from "@/utils/sharedFunctions";
import styles from "./ManageAccounts.module.scss";

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

const TruncatedBadges = ({ items, renderBadge, maxVisible = 2, getLabel }) => {
  const [expanded, setExpanded] = useState(false);

  if (items.length === 0) return <span className={styles.noData}>—</span>;

  const visible = expanded ? items : items.slice(0, maxVisible);
  const remaining = items.length - maxVisible;

  return (
    <div className={styles.badgeWrap}>
      {visible.map(renderBadge)}
      {!expanded && remaining > 0 && (
        <button
          type="button"
          className={styles.moreBadge}
          onClick={() => setExpanded(true)}
          title={items.slice(maxVisible).map(getLabel).join(", ")}
        >
          +{remaining} more
        </button>
      )}
      {expanded && remaining > 0 && (
        <button
          type="button"
          className={styles.moreBadge}
          onClick={() => setExpanded(false)}
        >
          Show less
        </button>
      )}
    </div>
  );
};

const UserRow = ({ account, isHospitality, mappings, roleScopes, departments, onEdit, onManageAccess }) => {
  const isActive = account.status === "active";
  const initials = getInitials(account.name);
  const avatarColor = getAvatarColor(account.name);
  const dedupedMappings = dedupeHospitalityMappings(mappings || []);
  // Dedup on (title, is_network_scope) so a role granted both BU-scoped
  // and network-wide renders as two chips with distinct colours — admins
  // can tell at a glance which holders have the wider Group-ARC reach.
  const seenRoleKeys = new Set();
  const uniqueRoles = (roleScopes || [])
    .filter((s) => s.role_title)
    .reduce((acc, s) => {
      const isNetwork = s.is_network_scope === 1 || s.is_network_scope === true;
      const key = `${s.role_title}|${isNetwork ? 1 : 0}`;
      if (seenRoleKeys.has(key)) return acc;
      seenRoleKeys.add(key);
      acc.push({ title: s.role_title, isNetwork });
      return acc;
    }, []);
  const depts = departments || [];

  return (
    <tr>
      <td>
        <div className={styles.userCell}>
          <div className={styles.userAvatar} style={{ background: isActive ? avatarColor : "#94a3b8" }}>
            {initials}
          </div>
          <div>
            <div className={styles.userName} style={{ color: !isActive ? "#94a3b8" : undefined  }}>
              {account.name}
              {account.employee_code ? <span className={styles.userEmpCode}> · {account.employee_code}</span> : ""}
              {!isActive && <span className={styles.inactiveTag}>Inactive</span>}
            </div>
            <div className={styles.userEmail}>{account.email}</div>
            {account.mobile && (
              <div className={styles.userMobileInline}>{account.mobile}</div>
            )}
          </div>
        </div>
      </td>
      {isHospitality && (
        <td>
          <TruncatedBadges
            items={uniqueRoles}
            maxVisible={2}
            getLabel={(r) => r.isNetwork ? `${r.title} · Network-Wide` : r.title}
            renderBadge={(r) => (
              <span
                key={`${r.title}|${r.isNetwork ? 1 : 0}`}
                className={r.isNetwork ? styles.roleBadgeNetwork : styles.roleBadge}
                title={r.isNetwork ? "Network-wide grant — applies across all hotels" : undefined}
              >
                {r.title}{r.isNetwork ? " · Network" : ""}
              </span>
            )}
          />
        </td>
      )}
      <td>
        <TruncatedBadges
          items={depts}
          maxVisible={2}
          getLabel={(dept) => dept.title}
          renderBadge={(dept) => (
            <span key={dept.id} className={styles.deptBadge}>{dept.title}</span>
          )}
        />
      </td>
      <td>{account.created_at ? formatDisplayDate(account.created_at) : "—"}</td>
      {isHospitality && (
        <td>
          <TruncatedBadges
            items={dedupedMappings}
            maxVisible={1}
            getLabel={(mapping) =>
              mapping.mapping_type === 0
                ? mapping.company_name || "Company"
                : mapping.hotel_name || "BU"
            }
            renderBadge={(mapping) => (
              <span
                key={`${mapping.mapping_type}-${mapping.hospitality_hotel_id || "co"}-${mapping.hospitality_company_id}`}
                className={`${styles.mappingBadge} ${mapping.mapping_type === 0 ? styles.mappingCompany : styles.mappingHotel}`}
              >
                {mapping.mapping_type === 0
                  ? mapping.company_name || "Company"
                  : mapping.hotel_name || "BU"}
              </span>
            )}
          />
        </td>
      )}
      <td>
        <div className={styles.actionBtnGroup}>
          {isHospitality && onManageAccess && (
            <button type="button" className={styles.accessBtn} onClick={() => onManageAccess(account)}>
              <BsBuilding size={12} />
              Access
            </button>
          )}
          <button type="button" className={styles.editBtn} onClick={() => onEdit(account)}>
            <HiOutlinePencil size={13} />
            Edit
          </button>
        </div>
      </td>
    </tr>
  );
};

export default UserRow;
