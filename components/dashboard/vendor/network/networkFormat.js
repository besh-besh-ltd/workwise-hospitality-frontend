// Labels, tones and formatters shared by the vendor-network pages.
// Values mirror backend/app/constants/vendorNetwork.js exactly.

export const RELATIONSHIP_LABEL = {
  PRINCIPAL: "Principal",
  BRANCH: "Branch",
  DISTRIBUTOR: "Distributor",
  DEALER: "Dealer",
};

// The relationships an admin may give a linked or created entity.
export const LINKABLE_RELATIONSHIPS = ["BRANCH", "DISTRIBUTOR", "DEALER"];

export const ENTITY_STATUS = {
  INVITED: { label: "Invited", tone: "info" },
  ACTIVE: { label: "Active", tone: "success" },
  SUSPENDED: { label: "Suspended", tone: "warn" },
  REMOVED: { label: "Removed", tone: "neutral" },
};

export const MEMBER_STATUS = {
  INVITED: { label: "Invited", tone: "info" },
  ACTIVE: { label: "Active", tone: "success" },
  DISABLED: { label: "Disabled", tone: "neutral" },
};

export const ROLE_LABEL = {
  ORG_ADMIN: "Network admin",
  ENTITY_MEMBER: "Entity member",
};

// Same rule as the backend's POST /entities check.
export const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const fmtDate = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

export const fmtInr = (n) => {
  const v = Number(n);
  if (n == null || isNaN(v)) return "—";
  return `₹${v.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
};

export const StatusPill = ({ map, status }) => {
  const s = map[status] || { label: status || "—", tone: "neutral" };
  return (
    <span className={`status-pill ${s.tone}`}>
      <span className="dot"></span>
      <span>{s.label}</span>
    </span>
  );
};
