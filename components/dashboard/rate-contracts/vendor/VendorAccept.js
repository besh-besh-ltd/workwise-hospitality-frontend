// Vendor contract acceptance with OTP sign — the contract is hash-pinned on
// successful verify and the parent ARC moves to contract_active when all
// vendors have signed.

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { vendorGetContract, vendorRequestOtp, vendorVerifyOtp, vendorDeclineContract } from "@/services/arc_v2";

export default function VendorAccept({ contractId }) {
  const router = useRouter();
  const [contract, setContract] = useState(null);
  const [lines, setLines] = useState([]);
  const [otpRequested, setOtpRequested] = useState(false);
  const [devCode, setDevCode] = useState(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (!contractId) return;
    (async () => {
      const res = await vendorGetContract(contractId);
      setContract(res?.data?.contract);
      setLines(res?.data?.lines || []);
    })();
  }, [contractId]);

  const requestOtp = async () => {
    setBusy(true); setError(null);
    try {
      const res = await vendorRequestOtp(contractId);
      setOtpRequested(true);
      if (res?.data?.dev_code) setDevCode(res.data.dev_code);
    } catch (e) { setError(e?.response?.data?.message || e?.message); }
    finally { setBusy(false); }
  };
  const verify = async () => {
    setBusy(true); setError(null);
    try {
      await vendorVerifyOtp(contractId, code.trim());
      setSuccess("Contract signed!");
      setTimeout(() => router.push("/dashboard/vendor/rate-contracts/requests?tab=active"), 1500);
    } catch (e) { setError(e?.response?.data?.message || e?.message); }
    finally { setBusy(false); }
  };
  const decline = async () => {
    const reason = prompt("Reason for declining (optional):") || "";
    setBusy(true); setError(null);
    try {
      await vendorDeclineContract(contractId, reason);
      router.push("/dashboard/vendor/rate-contracts/requests");
    } catch (e) { setError(e?.response?.data?.message || e?.message); }
    finally { setBusy(false); }
  };

  if (!contract) return <div style={{ padding: 24 }}>Loading…</div>;

  return (
    <div style={{ padding: 24, maxWidth: 920, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Accept Rate Contract</h1>
      <p style={{ color: "#6b7280", fontSize: 13 }}>{contract.arc_number} · {contract.arc_title}</p>

      <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: 18, marginTop: 14 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600 }}>Contract lines ({lines.length})</h2>
        {lines.map(l => (
          <div key={l.id} style={{ padding: "8px 0", borderTop: "1px solid #f3f4f6", fontSize: 13 }}>
            <div style={{ fontWeight: 600 }}>{l.variant_name || `Variant #${l.product_variant_id}`}</div>
            <div style={{ color: "#6b7280", fontSize: 12 }}>
              Rate ₹{l.unit_rate} · Committed {l.committed_qty} · Payment {l.payment_terms || "—"}
            </div>
          </div>
        ))}
        {contract.awaiting_until && (
          <p style={{ color: "#b45309", fontSize: 12, marginTop: 10 }}>
            Deadline to accept: {new Date(contract.awaiting_until).toLocaleString()}
          </p>
        )}
      </div>

      <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: 18, marginTop: 14 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600 }}>Digital signature (OTP)</h2>
        {!otpRequested && (
          <button disabled={busy} onClick={requestOtp}
                  style={{ background: "#2563eb", color: "white", padding: "9px 16px", border: 0, borderRadius: 7, fontWeight: 600, cursor: "pointer" }}>
            Request OTP
          </button>
        )}
        {otpRequested && (
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input value={code} onChange={e => setCode(e.target.value)} placeholder="6-digit code"
                   style={{ padding: 10, border: "1px solid #d1d5db", borderRadius: 7, fontSize: 16, letterSpacing: "4px", width: 180 }} />
            <button disabled={busy} onClick={verify}
                    style={{ background: "#16a34a", color: "white", padding: "9px 16px", border: 0, borderRadius: 7, fontWeight: 600, cursor: "pointer" }}>
              Verify & Sign
            </button>
          </div>
        )}
        {devCode && (
          <div style={{ marginTop: 10, fontSize: 12, color: "#6b7280" }}>
            <strong>Dev mode</strong> — code is <code style={{ background: "#f3f4f6", padding: "2px 6px", borderRadius: 4 }}>{devCode}</code>
          </div>
        )}
        {success && <div style={{ marginTop: 10, color: "#047857" }}>{success}</div>}
        {error && <div style={{ background: "#fef2f2", color: "#b91c1c", padding: 10, borderRadius: 8, marginTop: 10 }}>{error}</div>}
      </div>

      <div style={{ marginTop: 14 }}>
        <button onClick={decline} style={{ background: "transparent", color: "#b91c1c", border: 0, padding: "6px 0", cursor: "pointer", textDecoration: "underline" }}>
          Decline this contract
        </button>
      </div>
    </div>
  );
}
