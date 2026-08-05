import { useMemo } from "react";
import Link from "next/link";
import { useSelector } from "react-redux";

/**
 * ProcessScopeErrorBanner
 *
 * Surfaces backend errors raised by the process-scope alignment work:
 *   - NO_APPROVAL_POLICY_FOR_PROCESS — backend's NoApprovalPolicyError (400)
 *   - PROCESS_NOT_IN_USER_SCOPE     — backend's AuthorizationError (403)
 *   - PROCESS_REQUIRED              — user submitted without a process while
 *                                     processes exist for the scope
 *
 * Pass `error` as the axios error object OR the parsed `{ code, message, data }`
 * shape. The component is null-safe: render unconditionally and it returns
 * null when there's nothing to show.
 *
 * Usage:
 *   const [scopeError, setScopeError] = useState(null);
 *   try { await submit(); } catch (err) { setScopeError(err); }
 *   <ProcessScopeErrorBanner error={scopeError} onDismiss={() => setScopeError(null)} />
 */
export default function ProcessScopeErrorBanner({ error, onDismiss = null }) {
  const userProfile = useSelector((state) => state.userProfile);

  const parsed = useMemo(() => {
    if (!error) return null;
    // Accept either the typed shape directly or an axios error.
    const payload = error?.response?.data || error?.data || error;
    const code = payload?.code;
    if (!code) return null;
    return {
      code,
      message: payload?.message || "",
      data: payload?.data || {},
    };
  }, [error]);

  if (!parsed) return null;

  const isAdmin = Number(userProfile?.user_type) === 7;

  const KNOWN = {
    NO_APPROVAL_POLICY_FOR_PROCESS: {
      tone: "red",
      title: "Approval policy missing",
      body:
        parsed.message ||
        "No approval policy is configured for this process in your hotel and department. Contact your administrator to add one before submitting.",
      adminLink: isAdmin
        ? "/dashboard/admin/hospitality-manager/approval-hierarchy"
        : null,
      adminLinkLabel: "Open Approval Hierarchy",
    },
    PROCESS_NOT_IN_USER_SCOPE: {
      tone: "orange",
      title: "Access changed",
      body:
        parsed.message ||
        "Your access may have changed. Refresh the page, or contact your administrator if this looks wrong.",
      adminLink: null,
      adminLinkLabel: null,
    },
    PROCESS_REQUIRED: {
      tone: "red",
      title: "Process is required",
      body:
        parsed.message ||
        "Pick a process for this entity before submitting.",
      adminLink: null,
      adminLinkLabel: null,
    },
  };

  const cfg = KNOWN[parsed.code];
  if (!cfg) return null;

  const palette =
    cfg.tone === "orange"
      ? { bg: "#fff7ed", border: "#fdba74", text: "#9a3412", accent: "#c2410c" }
      : { bg: "#fef2f2", border: "#fca5a5", text: "#991b1b", accent: "#b91c1c" };

  return (
    <div
      role="alert"
      style={{
        background: palette.bg,
        border: `1px solid ${palette.border}`,
        borderLeft: `4px solid ${palette.accent}`,
        color: palette.text,
        padding: "12px 14px",
        borderRadius: 6,
        margin: "12px 0",
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        fontSize: 13,
        lineHeight: 1.45,
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>{cfg.title}</div>
        <div>{cfg.body}</div>
        {cfg.adminLink && (
          <div style={{ marginTop: 8 }}>
            <Link
              href={cfg.adminLink}
              style={{
                color: palette.accent,
                fontWeight: 600,
                textDecoration: "underline",
              }}
            >
              {cfg.adminLinkLabel} →
            </Link>
          </div>
        )}
        {parsed.data && Object.keys(parsed.data).length > 0 && (
          <details style={{ marginTop: 8, fontSize: 12, opacity: 0.85 }}>
            <summary style={{ cursor: "pointer" }}>Details</summary>
            <pre style={{ marginTop: 4, fontSize: 11, whiteSpace: "pre-wrap" }}>
              {Object.entries(parsed.data)
                .map(([k, v]) => `${k}: ${v ?? "—"}`)
                .join("\n")}
            </pre>
          </details>
        )}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          style={{
            background: "transparent",
            border: "none",
            color: palette.accent,
            cursor: "pointer",
            fontSize: 18,
            lineHeight: 1,
            padding: 0,
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}
