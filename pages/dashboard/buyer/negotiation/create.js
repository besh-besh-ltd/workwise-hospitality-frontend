// Placeholder for standalone "Create Negotiation" — the feature lands later.
// Negotiations are currently started from an RFQ's Negotiation & Award stage
// (or Quote Comparison); this page just explains that and points the user there.
import Head from "next/head";
import Link from "next/link";
import { Handshake } from "lucide-react";

const btnStyle = {
  display: "inline-flex", alignItems: "center", padding: "8px 14px",
  borderRadius: 8, border: "1px solid", fontSize: 13, fontWeight: 500,
  textDecoration: "none", cursor: "pointer",
};

export default function CreateNegotiation() {
  return (
    <>
      <Head><title>Workwise | Create Negotiation</title></Head>
      <div style={{ display: "grid", placeItems: "center", minHeight: "60vh", padding: 24 }}>
        <div style={{ maxWidth: 470, textAlign: "center", background: "#fff", border: "1px solid #ebebe6", borderRadius: 16, padding: "40px 32px", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: "#eff6ff", color: "#2563eb", display: "grid", placeItems: "center", margin: "0 auto 18px" }}>
            <Handshake size={26} strokeWidth={2} />
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "#18181b", margin: "0 0 8px", letterSpacing: "-0.02em" }}>Create Negotiation</h1>
          <p style={{ fontSize: 13.5, color: "#71717a", lineHeight: 1.6, margin: "0 0 22px" }}>
            Standalone negotiation creation is coming soon. For now, start a negotiation from an RFQ&apos;s{" "}
            <strong style={{ color: "#3f3f46" }}>Negotiation &amp; Award</strong> stage or the Quote Comparison page.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/dashboard/buyer/negotiation" style={{ ...btnStyle, background: "#1f2937", color: "#fff", borderColor: "#1f2937" }}>
              View all negotiations
            </Link>
            <Link href="/dashboard/buyer/rfq-management" style={{ ...btnStyle, background: "#fff", color: "#18181b", borderColor: "#d6d6cf" }}>
              Go to RFQs
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
