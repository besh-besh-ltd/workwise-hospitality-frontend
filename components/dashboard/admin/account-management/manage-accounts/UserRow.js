import React, { useState } from "react";
import { HiOutlinePencil, HiOutlineKey } from "react-icons/hi";
import { BsBuilding } from "react-icons/bs";
import { formatDisplayDate } from "@/utils/sharedFunctions";
import styles from "./ManageAccounts.module.scss";
import { dedupeHospitalityMappings } from "@/components/dashboard/admin/shared/hospitalityMappings";

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

const UserRow = ({ account, isHospitality, mappings, roleScopes, departments, onEdit, onManageAccess, onResetPassword, isResettingPassword }) => {
  const isActive = account.status === "active";
  const initials = getInitials(account.name);
  const avatarColor = getAvatarColor(account.name);
  const dedupedMappings = dedupeHospitalityMappings(mappings || []);
  // One chip per grant (role + where it applies), not per title: the same role
  // held at two units is two different pieces of access.
  const unitNames = new Map(
    (mappings || []).filter((m) => m.mapping_type === 1 && m.hospitality_hotel_id != null).map((m) => [Number(m.hospitality_hotel_id), m.hotel_name])
  );
  const scopeLabel = (s) => (s.hotel_id ? unitNames.get(Number(s.hotel_id)) || s.hotel_name || "One unit" : "All units");
  const roleChips = [];
  const seenChips = new Set();
  (roleScopes || []).forEach((s) => {
    if (!s.role_title) return;
    const label = `${s.role_title} · ${scopeLabel(s)}`;
    const key = `${s.role_title}|${s.company_id ?? ""}|${s.hotel_id ?? ""}`;
    if (seenChips.has(key)) return;
    seenChips.add(key);
    roleChips.push({ key, label });
  });
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
              {/* Administrators used to be filtered out of this list entirely.
                  Now that they are shown, the most consequential thing about a
                  row — whether this person can administer the company — should
                  be visible without opening it. */}
              {account.is_company_admin && (
                <span className={styles.adminTag} title="Can manage users, units, access and approvals">
                  Administrator
                </span>
              )}
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
            items={roleChips}
            maxVisible={2}
            getLabel={(chip) => chip.label}
            renderBadge={(chip) => (
              <span key={chip.key} className={styles.roleBadge}>{chip.label}</span>
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
          {onResetPassword && (
            <button
              type="button"
              className={styles.accessBtn}
              onClick={() => onResetPassword(account)}
              disabled={isResettingPassword}
              title="Email this person a link to set a new password"
            >
              <HiOutlineKey size={13} />
              {isResettingPassword ? "Sending…" : "Reset password"}
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
