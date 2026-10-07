// Public: a person invited into a vendor network sets their password here.
// The backend emails exactly /vendor/network/accept-invite?token=… — the
// 256-bit token is the credential, so this page needs no session.
//
// The token can set a password for 72 hours, so it must not linger in the URL
// (analytics $current_url / replay, the canonical <link>, browser history). It
// is copied into state on first render and stripped from the address bar
// straight away; the preview and accept calls use only the stored copy.

import React, { useEffect, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";
import { previewMemberInvite, acceptMemberInvite } from "@/services/vendorNetwork";
import { clearUserProfile } from "@/redux/slice";
import { persistor } from "@/redux/store";
import storageInstance from "@/utils/storageInstance";
import { setStoredHospitalityContext } from "@/utils/hospitalityContext";
import posthog from "@/lib/analytics";

const GENERIC_GONE = "This invitation is invalid or has already been used";
const EXPIRED = "This invitation has expired. Ask your network admin to resend it.";

// Same rule as the backend (memberController strongEnough): >= 8 characters,
// at least one letter and one digit.
const passwordProblem = (password, confirm) => {
  if (!password || password.length < 8) return "Password must be at least 8 characters.";
  if (password.length > 128) return "Password must be at most 128 characters.";
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return "Password must contain a letter and a digit.";
  if (password !== confirm) return "Passwords do not match.";
  return null;
};

const serverMessage = (err, fallback) => err?.response?.data?.message || fallback;

const inputStyle = {
  width: "100%",
  padding: "9px 11px",
  border: "1px solid var(--border-input)",
  borderRadius: 8,
  background: "var(--surface)",
  color: "var(--fg)",
  fontSize: 13.5,
  outline: "none",
};
const labelStyle = { display: "block", fontSize: 12.5, fontWeight: 500, color: "var(--fg-2)", marginBottom: 6 };

const Row = ({ k, v }) => (
  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "6px 0", fontSize: 13 }}>
    <span style={{ color: "var(--fg-3)" }}>{k}</span>
    <span style={{ color: "var(--fg)", fontWeight: 500, textAlign: "right", wordBreak: "break-word" }}>{v}</span>
  </div>
);

/**
 * End whatever session this browser holds (e.g. an admin opening the link to
 * test it), so "/?login=true" offers the sign-in form instead of bouncing to
 * that account's dashboard. Same keys as the DashboardShell logout.
 */
const endExistingSession = async (dispatch) => {
  try { posthog.reset(); } catch (_) {}
  dispatch(clearUserProfile());
  ["token", "current-user-type", "current-user-name", "current-user-email", "user-permissions", "guest-session"].forEach(
    (key) => storageInstance.removeStorege(key)
  );
  setStoredHospitalityContext(null);
  try { await persistor.flush(); } catch (_) {}
  window.dispatchEvent(new Event("loginStatusChanged"));
};

const AcceptInvitePage = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  // null until captured from the URL on the first ready render.
  const [token, setToken] = useState(null);

  // 'loading' | 'open' | 'gone'
  const [phase, setPhase] = useState("loading");
  const [invite, setInvite] = useState(null);
  const [goneMessage, setGoneMessage] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Capture the token once, then drop it from the address bar.
  useEffect(() => {
    if (!router.isReady || token !== null) return;
    const raw = router.query?.token;
    setToken(typeof raw === "string" ? raw.trim() : "");
    if (raw !== undefined) router.replace({ pathname: router.pathname }, undefined, { shallow: true });
  }, [router.isReady, router.query, token]);

  useEffect(() => {
    if (token === null) return;
    if (!token) {
      setGoneMessage("This invitation link is incomplete. Open the link from your invitation email again.");
      setPhase("gone");
      return;
    }
    let cancelled = false;
    setPhase("loading");
    previewMemberInvite(token)
      .then((res) => {
        if (cancelled) return;
        const data = res?.data;
        if (!data) {
          setGoneMessage(GENERIC_GONE);
          setPhase("gone");
        } else if (data.expired) {
          setInvite(data);
          setGoneMessage(EXPIRED);
          setPhase("gone");
        } else {
          setInvite(data);
          setPhase("open");
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setGoneMessage(
          err?.response?.status === 410
            ? serverMessage(err, GENERIC_GONE)
            : "We could not load this invitation. Please try again later."
        );
        setPhase("gone");
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    const problem = passwordProblem(password, confirm);
    if (problem) {
      setFormError(problem);
      return;
    }
    setFormError("");
    setSubmitting(true);
    try {
      const res = await acceptMemberInvite({ token, password });
      await endExistingSession(dispatch);
      toast.success(res?.message || "Your account is ready. Sign in with your email and new password.");
      router.replace("/?login=true");
    } catch (err) {
      if (err?.response?.status === 410) {
        setGoneMessage(serverMessage(err, GENERIC_GONE));
        setPhase("gone");
      } else {
        setFormError(serverMessage(err, "Could not activate your account. Please try again."));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Workwise | Accept invitation</title>
      </Head>
      <div style={{ display: "flex", justifyContent: "center", padding: "56px 16px 72px", background: "var(--bg)" }}>
        <div className="section-card" style={{ width: "100%", maxWidth: 440 }}>
          <div className="section-head">
            <div>
              <h2>Join your vendor network</h2>
              <div className="h-sub">Set a password to activate your Workwise account.</div>
            </div>
          </div>
          <div className="section-body">
            {phase === "loading" && (
              <div style={{ color: "var(--fg-3)", fontSize: 13 }}>Checking your invitation…</div>
            )}

            {phase === "gone" && (
              <div>
                <div
                  style={{
                    background: "var(--warn-soft)",
                    color: "var(--warn)",
                    border: "1px solid rgba(180,83,9,0.28)",
                    borderRadius: 8,
                    padding: "10px 12px",
                    fontSize: 13,
                  }}
                >
                  {goneMessage}
                </div>
                {invite?.org_name && (
                  <div style={{ marginTop: 12, fontSize: 12.5, color: "var(--fg-3)" }}>
                    Network: <span style={{ color: "var(--fg-2)" }}>{invite.org_name}</span>
                  </div>
                )}
              </div>
            )}

            {phase === "open" && invite && (
              <form onSubmit={handleSubmit} noValidate>
                <div style={{ borderBottom: "1px solid var(--border)", paddingBottom: 10, marginBottom: 16 }}>
                  <Row k="Network" v={invite.org_name} />
                  {invite.entity_name && <Row k="Entity" v={invite.entity_name} />}
                  <Row k="Sign-in email" v={invite.email} />
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label htmlFor="vn-invite-password" style={labelStyle}>New password</label>
                  <input
                    id="vn-invite-password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={inputStyle}
                  />
                  <div style={{ fontSize: 11.5, color: "var(--fg-3)", marginTop: 5 }}>
                    At least 8 characters, with a letter and a digit.
                  </div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label htmlFor="vn-invite-confirm" style={labelStyle}>Confirm password</label>
                  <input
                    id="vn-invite-confirm"
                    type="password"
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    style={inputStyle}
                  />
                </div>

                {formError && (
                  <div role="alert" style={{ color: "var(--danger)", fontSize: 12.5, marginBottom: 12 }}>
                    {formError}
                  </div>
                )}

                <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
                  {submitting ? "Activating…" : "Activate account"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default AcceptInvitePage;
