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

/** "Page x of y" with Previous / Next; nothing when everything fits on one page. */
export const Pager = ({ page, pageSize, total, onPage, disabled, label }) => {
  const pages = Math.max(1, Math.ceil(Number(total || 0) / Number(pageSize || 1)));
  if (pages <= 1) return null;
  return (
    <nav
      aria-label={label}
      className="flex items-center justify-between gap-3"
      style={{ padding: "10px 16px", borderTop: "1px solid var(--border)", fontSize: 12.5, color: "var(--fg-3)" }}
    >
      <span>
        Page {page} of {pages} · {total} total
      </span>
      <span className="flex items-center gap-2">
        <button type="button" className="btn btn-secondary btn-sm" disabled={disabled || page <= 1} onClick={() => onPage(page - 1)}>
          Previous
        </button>
        <button type="button" className="btn btn-secondary btn-sm" disabled={disabled || page >= pages} onClick={() => onPage(page + 1)}>
          Next
        </button>
      </span>
    </nav>
  );
};
