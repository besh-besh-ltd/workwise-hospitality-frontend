// Vendor master — every approved supplier, with the categories they serve,
// the properties they have been invited for, their compliance status and what
// the group has done with them. Rows open the buyer-facing vendor profile.
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, Building2, ShieldCheck, AlertTriangle } from "lucide-react";
import axiosInstance from "@/lib/axios";

const getVendorMaster = () =>
  new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.get("/vendors/master");
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });

const fmtMoney = (n) => {
  const v = Number(n) || 0;
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(2)} Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(2)} L`;
  return v ? `₹${v.toLocaleString("en-IN")}` : "—";
};

export default function VendorMasterPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");

  useEffect(() => {
    getVendorMaster()
      .then((res) => setRows(Array.isArray(res?.data) ? res.data : []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(() => Array.from(new Set(rows.flatMap((r) => r.categories))).sort(), [rows]);
  const shown = rows.filter((r) =>
    (!search || r.name.toLowerCase().includes(search.toLowerCase()) || r.city.toLowerCase().includes(search.toLowerCase())) &&
    (!category || r.categories.includes(category))
  );
  const flagged = rows.filter((r) => r.status === "Flagged").length;
  const engaged = rows.filter((r) => r.rfqs_invited > 0).length;
  const value = rows.reduce((s, r) => s + r.business_value, 0);

  return (
    <main className="main-body">
      <div>
        <h1 className="page-h1">Vendor Management</h1>
        <div className="page-sub">The approved supplier base — categories, properties served, compliance and engagement.</div>
      </div>

      <div className="stat-strip" style={{ marginTop: 14 }}>
        <div className="stat-card"><div className="s-ic indigo"><Building2 /></div><div><div className="s-val">{rows.length}</div><div className="s-label">Approved vendors</div></div></div>
        <div className="stat-card"><div className="s-ic green"><ShieldCheck /></div><div><div className="s-val">{engaged}</div><div className="s-label">Invited to an RFQ this year</div></div></div>
        <div className="stat-card"><div className="s-ic amber"><AlertTriangle /></div><div><div className="s-val">{flagged}</div><div className="s-label">Flagged on compliance</div></div></div>
        <div className="stat-card"><div className="s-ic neutral"><Building2 /></div><div><div className="s-val">{fmtMoney(value)}</div><div className="s-label">Business value (POs raised)</div></div></div>
      </div>

      <div className="section-card" style={{ marginTop: 14 }}>
        <div className="section-head">
          <div className="h-left"><h2>Vendors</h2><span className="h-sub">{shown.length} of {rows.length}</span></div>
          <div className="h-right" style={{ display: "flex", gap: 8 }}>
            <select className="select-mini" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">All categories</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <div className="search-input" style={{ width: 240 }}>
              <Search size={14} strokeWidth={2} />
              <input className="input" placeholder="Search by name or city…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
        </div>
        <div className="section-body flush">
          {loading ? (
            <div style={{ padding: 16 }}><span className="arc-sk" style={{ display: "block", height: 240, borderRadius: 10 }} /></div>
          ) : (
            <div className="table-scroll">
              <table className="table">
                <thead>
                  <tr>
                    <th>Vendor</th><th>Categories</th><th>Properties served</th><th>Status</th>
                    <th className="center">Documents</th><th className="center">RFQs quoted</th><th className="center">On time</th><th>Business value</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((r) => (
                    <tr key={r.id}>
                      <td className="strong">
                        <Link href={`/dashboard/buyer/rfq-management-vendor/vendor-profile?id=${r.id}&showContact=true`} style={{ color: "inherit" }}>{r.name}</Link>
                        <div className="fs-11 text-fg-3">{r.city}{r.state ? `, ${r.state}` : ""} · since {r.since}</div>
                      </td>
                      <td>{r.categories.join(", ")}</td>
                      <td>{r.properties.length ? r.properties.join(", ") : <span className="text-fg-3">Not yet invited</span>}</td>
                      <td>
                        <span className={`status-pill ${r.status === "Flagged" ? "expiring" : "active"}`}><span className="dot" />{r.status}</span>
                      </td>
                      <td className="center"><span className="mono">{r.documents_valid}/{r.documents_total}</span></td>
                      <td className="center"><span className="mono fw-600">{r.rfqs_quoted}</span><span className="text-fg-3"> / {r.rfqs_invited}</span></td>
                      <td className="center mono">{r.on_time_pct != null ? `${r.on_time_pct}%` : "—"}</td>
                      <td className="mono">{fmtMoney(r.business_value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
