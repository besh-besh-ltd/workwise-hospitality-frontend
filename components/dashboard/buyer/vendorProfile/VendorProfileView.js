// Buyer-facing vendor dossier — a redesign of the legacy bare profile page.
// Renders everything a buyer needs to qualify a vendor mid-award: identity &
// verification, registrations/compliance, financial scale, capability
// (products + categories), reachability (contacts + SPOCs), banking, payment
// terms, supporting media, and prior engagement. Matches the arc_v2 theme.
import React, { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import * as XLSX from "xlsx";
import {
  ArrowLeft, ShieldCheck, BadgeCheck, Crown, MapPin, Calendar, Users,
  Building2, Globe, Phone, Mail, Download, Package, Layers, Landmark,
  FileText, ExternalLink, Check, Briefcase, Wallet,
} from "lucide-react";
import { getVendorDetailsByID, getPastRFQS, getVendorEngagement } from "@/services/rfq";
import { getUserPaymentTerms } from "@/services/Auth";
import { formatDisplayDate } from "@/utils/sharedFunctions";
import MediaRender from "@/components/shared/MediaRender";
import styles from "./VendorProfileView.module.scss";

function initialsOf(name) {
  if (!name) return "?";
  return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]).join("").toUpperCase();
}

export default function VendorProfileView() {
  const router = useRouter();
  const { id, showContact } = router.query;
  const showContactDetails = showContact === "true";

  const [loading, setLoading] = useState(true);
  const [vendor, setVendor] = useState(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [pastRFQs, setPastRFQs] = useState([]);
  const [paymentTerms, setPaymentTerms] = useState([]);
  const [engagement, setEngagement] = useState(null);

  useEffect(() => {
    if (!router.isReady || !id) return;
    let cancelled = false;
    setLoading(true);
    getVendorDetailsByID(id, { showContact: showContactDetails })
      .then((res) => {
        if (cancelled) return;
        setVendor({ ...res.data, subscription: res.subscription });
        setLoggedIn(res.logged_In);
      })
      .catch((err) => { if (!cancelled) console.error("vendor profile fetch failed", err); })
      .finally(() => { if (!cancelled) setLoading(false); });
    getPastRFQS(id).then((res) => { if (!cancelled) setPastRFQs(res?.data || []); }).catch(() => {});
    getVendorEngagement(id).then((res) => { if (!cancelled) setEngagement(res?.data || null); }).catch(() => {});
    getUserPaymentTerms(id, "buyer")
      .then((res) => {
        if (cancelled) return;
        const t = res?.data?.data || res?.data || [];
        setPaymentTerms(Array.isArray(t) ? t.filter((r) => r && (r.value || r.comment)) : []);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [router.isReady, id, showContactDetails]);

  // ── derived ────────────────────────────────────────────────────────────
  const docByType = (type) => (vendor?.compliance_docs || []).find((d) => d.document_type === type);
  const pan = docByType("pan");
  const gst = docByType("gst");
  const msme = docByType("msme");
  const fssai = docByType("fssai");
  const cheque = docByType("cancelled_cheque");
  const bank = vendor?.bank_details || {};

  const name = vendor?.company_name || vendor?.vendor_name || "Vendor";
  const verified = Number(vendor?.status) === 1;
  const premium = !!vendor?.subscription_plan_id;
  const avatar = vendor?.profile_image_url || vendor?.profile_image || null;
  const primaryLoc = Array.isArray(vendor?.location) ? vendor.location[0] : null;
  const locText = primaryLoc
    ? [primaryLoc.city_name, primaryLoc.state_name, primaryLoc.country_name].filter(Boolean).join(", ")
    : null;

  const yearsOperating = vendor?.established_year
    ? Math.max(0, new Date().getFullYear() - Number(vendor.established_year))
    : null;

  const categoryGroups = useMemo(() => {
    const groups = new Map();
    (vendor?.subscribed_categories || []).forEach((sub) => {
      const key = sub.item_type === "subcategory" && sub.parent_title ? sub.parent_title : sub.title;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(sub);
    });
    return Array.from(groups.entries());
  }, [vendor]);

  const mediaGroups = useMemo(() => {
    const order = [
      { type: "certification", label: "Certifications", icon: <BadgeCheck size={13} /> },
      { type: "project_document", label: "Projects completed", icon: <Briefcase size={13} /> },
      { type: "product_image", label: "Product images", icon: <Package size={13} /> },
      { type: "product_video", label: "Product videos", icon: <Package size={13} /> },
    ];
    return order
      .map((g) => ({ ...g, docs: (vendor?.vendor_info || []).filter((d) => d.file_type === g.type) }))
      .filter((g) => g.docs.length > 0);
  }, [vendor]);

  // Registrations buyers vet for risk — compliance completeness (the signature).
  const registrations = [
    { label: "PAN", value: pan?.document_number, docUrl: pan?.document_url },
    { label: "GSTIN", value: vendor?.gstin, docUrl: gst?.document_url },
    { label: "CIN", value: vendor?.cin, docUrl: null },
    { label: "Udyam / MSME", value: msme?.document_number, docUrl: msme?.document_url },
    { label: "FSSAI", value: fssai?.document_number, docUrl: fssai?.document_url },
    { label: "Imp/Exp code", value: vendor?.import_export_code, docUrl: null },
  ];
  const hasBank = !!(bank.account_holder_name || bank.bank_name || bank.ifsc_code || bank.account_number_masked);
  const complianceItems = [...registrations.map((r) => !!r.value), hasBank];
  const compOnFile = complianceItems.filter(Boolean).length;
  const compTotal = complianceItems.length;
  const compPct = compTotal ? Math.round((compOnFile / compTotal) * 100) : 0;

  const trustChips = [
    { label: "GST", ok: !!vendor?.gstin },
    { label: "PAN", ok: !!pan?.document_number },
    { label: "Udyam", ok: !!msme?.document_number },
    { label: "FSSAI", ok: !!fssai?.document_number },
    { label: "Bank a/c", ok: hasBank },
  ];

  const socials = [
    { label: "LinkedIn", url: vendor?.linkedin },
    { label: "Facebook", url: vendor?.facebook },
    { label: "WhatsApp", url: vendor?.whatsapp },
    { label: "Skype", url: vendor?.skype },
  ].filter((s) => s.url);

  const spocs = (vendor?.spoc_details || []).filter((s) => s && (s.name || s.email || s.mobile));

  // The actual files the vendor uploaded — registration certificates + cheque —
  // surfaced as a prominent, downloadable list (not just buried "View" links).
  const DOC_LABELS = {
    pan: "PAN card", gst: "GST certificate", msme: "Udyam / MSME certificate",
    fssai: "FSSAI license", cancelled_cheque: "Cancelled cheque",
  };
  const documentFiles = (vendor?.compliance_docs || [])
    .filter((d) => d.document_url)
    .map((d) => ({ key: d.document_type, label: DOC_LABELS[d.document_type] || d.document_type, number: d.document_number, url: d.document_url }));
  const mediaCount = mediaGroups.reduce((s, g) => s + g.docs.length, 0);

  // Only the company facts that are actually filled — keeps the About card from
  // reading as a wall of em-dashes for sparsely-completed vendors.
  const aboutFacts = [
    { k: "Nature of business", v: vendor?.nature_of_business },
    { k: "Type of business", v: vendor?.type_of_business },
    { k: "Established", v: vendor?.established_year },
    { k: "Employees", v: vendor?.no_of_employess },
    { k: "Annual turnover", v: vendor?.turnover ? `₹${vendor.turnover} Cr` : null },
    { k: "GSTIN", v: vendor?.gstin },
    { k: "CIN", v: vendor?.cin },
    { k: "Website", v: vendor?.website || null, href: vendor?.website ? normalizeUrl(vendor.website) : null },
  ].filter((f) => f.v);

  function goBack() {
    if (typeof window !== "undefined" && window.history.length > 1) router.back();
    else if (typeof window !== "undefined") window.close();
  }

  function downloadDossier() {
    if (!vendor) return;
    const rows = [
      ["Field", "Value"],
      ["Company Name", vendor?.company_name || ""],
      ["Vendor Name", vendor?.vendor_name || ""],
      ["Status", verified ? "Verified" : "Unverified"],
      ["Email", vendor?.email || ""],
      ["Mobile", vendor?.mobile || ""],
      ["Website", vendor?.website || ""],
      ["Location", locText || ""],
      ["Established Year", vendor?.established_year || ""],
      ["Nature of Business", vendor?.nature_of_business || ""],
      ["Type of Business", vendor?.type_of_business || ""],
      ["Annual Turnover (Cr)", vendor?.turnover || ""],
      ["Employees", vendor?.no_of_employess || ""],
      [],
      ["Registrations & Compliance", ""],
      ...registrations.map((r) => [r.label, r.value || ""]),
      ["GST Certificate", gst?.document_url || ""],
      [],
      ["Banking", ""],
      ["Account Holder", bank.account_holder_name || ""],
      ["Bank Name", bank.bank_name || ""],
      ["Account Number (masked)", bank.account_number_masked || ""],
      ["IFSC Code", bank.ifsc_code || ""],
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [{ wch: 30 }, { wch: 60 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Vendor Dossier");
    const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
    XLSX.writeFile(wb, `${base}_dossier.xlsx`);
  }

  // ── render ─────────────────────────────────────────────────────────────
  if (loading) return <VendorProfileSkeleton onBack={goBack} />;
  if (!vendor) {
    return (
      <main className="main-body">
        <button type="button" className={styles.backLink} onClick={goBack}><ArrowLeft size={15} /> Back</button>
        <div className={styles.center}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--fg)", margin: "0 0 6px" }}>Vendor not found</h2>
            <p style={{ fontSize: 13, color: "var(--fg-3)", margin: 0 }}>We couldn&apos;t load this vendor&apos;s profile. The link may be invalid.</p>
          </div>
        </div>
      </main>
    );
  }

  const ringStyle = { background: `conic-gradient(var(--success) ${compPct * 3.6}deg, var(--surface-3) 0deg)` };

  return (
    <main className="main-body">
      <Head>
        <title>{name} — Vendor profile</title>
        <meta name="description" content={vendor?.profile || `Vendor profile for ${name}`} />
      </Head>

      <button type="button" className={styles.backLink} onClick={goBack}><ArrowLeft size={15} /> Back</button>

      {/* ── HERO ── */}
        <div className={styles.hero}>
          <div className={styles.heroTop}>
            <div className={styles.heroAvatar}>
              {avatar ? <img src={avatar} alt={name} /> : initialsOf(name)}
            </div>
            <div className={styles.heroMain}>
              <div className={styles.heroEyebrow}>Vendor profile</div>
              <h1 className={styles.heroName}>
                <span>{name}</span>
                {premium ? (
                  <span className={`${styles.hBadge} ${styles.premium}`}><Crown size={12} /> Premium</span>
                ) : null}
                <span className={`${styles.hBadge} ${verified ? styles.verified : styles.unverified}`}>
                  <ShieldCheck size={12} />{verified ? "Verified" : "Unverified"}
                </span>
              </h1>
              <div className={styles.heroMetaRow}>
                {vendor?.vendor_name && vendor.vendor_name !== name && (
                  <span className={styles.item}><Building2 size={13} />{vendor.vendor_name}</span>
                )}
                {locText && <span className={styles.item}><MapPin size={13} />{locText}</span>}
                {vendor?.established_year && <span className={styles.item}><Calendar size={13} />Est. {vendor.established_year}</span>}
                {vendor?.no_of_employess && <span className={styles.item}><Users size={13} />{vendor.no_of_employess} employees</span>}
                {vendor?.type_of_business && <span className={styles.item}><Briefcase size={13} />{vendor.type_of_business}</span>}
              </div>
              {vendor?.profile && <p className={styles.heroBio}>{vendor.profile}</p>}
            </div>
            <div className={styles.heroActions}>
              <button type="button" className={styles.heroBtn} onClick={downloadDossier}>
                <Download size={14} /> Download dossier
              </button>
              {showContactDetails && vendor?.email && (
                <a className={`${styles.heroBtn} ${styles.primary}`} href={`mailto:${vendor.email}`}>
                  <Mail size={14} /> Contact vendor
                </a>
              )}
            </div>
          </div>

          {/* Trust ribbon — the at-a-glance compliance read */}
          <div className={styles.trustRibbon}>
            <span className={styles.trustLead}>On file</span>
            {trustChips.map((c) => (
              <span key={c.label} className={`${styles.trustChip} ${c.ok ? styles.ok : styles.no}`}>
                {c.ok ? <Check size={12} /> : <span style={{ width: 12, textAlign: "center" }}>–</span>}
                {c.label}
              </span>
            ))}
          </div>
        </div>

        {/* ── ENGAGEMENT SNAPSHOT — your organisation's history with this vendor ── */}
        <div className={styles.stats}>
          <Stat value={engagement ? engagement.rfqs_participated : <span className={styles.mutedVal}>—</span>} label="RFQs participated" />
          <Stat value={engagement ? engagement.pos_released : <span className={styles.mutedVal}>—</span>} label="POs released" />
          <Stat value={engagement ? fmtMoney(engagement.total_value) : <span className={styles.mutedVal}>—</span>} label="Business value" />
          <Stat value={engagement ? engagement.contracts_awarded : <span className={styles.mutedVal}>—</span>} label="Contracts awarded" />
          <Stat value={(vendor?.subscribed_categories || []).length} label="Categories served" />
          <Stat value={yearsOperating != null ? yearsOperating : <span className={styles.mutedVal}>—</span>} label="Years operating" />
        </div>

        {/* ── BODY ── */}
        <div className={styles.grid}>
          {/* MAIN COLUMN */}
          <div className={styles.col}>
            {/* About */}
            <Card icon={<Building2 size={15} />} title="About" sub="Company overview">
              {vendor?.profile && <div className={styles.about}>{vendor.profile}</div>}
              {aboutFacts.length > 0 ? (
                <div className={styles.facts} style={{ marginTop: vendor?.profile ? 16 : 0 }}>
                  {aboutFacts.map((f) => (
                    <Fact key={f.k} k={f.k} v={f.href ? <a href={f.href} target="_blank" rel="noopener noreferrer">{f.v}</a> : f.v} />
                  ))}
                </div>
              ) : (
                !vendor?.profile && <div className={styles.empty}>This vendor hasn&apos;t added company details yet — registrations and contacts are on the right.</div>
              )}
            </Card>

            {/* Categories served */}
            {categoryGroups.length > 0 && (
              <Card icon={<Layers size={15} />} title="Categories served" sub="Subscribed supply categories" count={(vendor?.subscribed_categories || []).length} flush>
                <div className={styles.rows}>
                  {categoryGroups.map(([groupTitle, items]) => (
                    <div className={styles.catGroup} key={groupTitle}>
                      <div className={styles.gt}>{groupTitle}</div>
                      <div className={styles.chips}>
                        {items.map((s, i) => (
                          <span key={s.item_id || i} className={`${styles.chip} ${s.item_type !== "subcategory" ? styles.parent : ""}`}>{s.title}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Documents & files — registration certificates + any media the
                vendor shared, all viewable and downloadable */}
            {(documentFiles.length > 0 || mediaGroups.length > 0) && (
              <Card icon={<FileText size={15} />} iconTone="blue" title="Documents & files" sub="Registration certificates and files shared by the vendor" count={documentFiles.length + mediaCount} flush>
                {documentFiles.length > 0 && (
                  <div className={styles.rows}>
                    {documentFiles.map((d) => (
                      <div className={styles.fileRow} key={d.key}>
                        <div className={styles.fileIc}><FileText size={16} /></div>
                        <div className={styles.fileMeta}>
                          <div className={styles.fileName}>{d.label}</div>
                          {d.number && <div className={styles.fileNum}>{d.number}</div>}
                        </div>
                        <div className={styles.fileActions}>
                          <a className={styles.fileBtn} href={d.url} target="_blank" rel="noopener noreferrer"><ExternalLink size={13} /> View</a>
                          <a className={`${styles.fileBtn} ${styles.primary}`} href={d.url} download><Download size={13} /> Download</a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {mediaGroups.length > 0 && (
                  <div className={styles.rows}>
                    {mediaGroups.map((g) => (
                      <div className={styles.mediaGroup} key={g.type}>
                        <div className={styles.gt}>{g.icon}{g.label} <span style={{ color: "var(--fg-4)", fontWeight: 500 }}>· {g.docs.length}</span></div>
                        <div className={styles.mediaGrid}>
                          {g.docs.map((doc) => (
                            <div className={styles.mediaCard} key={doc.id}>
                              <div className={styles.body}>
                                <MediaRender fileUrl={doc.file_url} fileName={doc.file_name} fileType={doc.file_type} />
                                <div className={styles.cap}>
                                  <span>{doc.created_at ? formatDisplayDate(doc.created_at) : ""}</span>
                                  {doc.is_approved && <span className={styles.okTag}><Check size={11} />Approved</span>}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}

            {/* Payment terms */}
            {paymentTerms.length > 0 && (
              <Card icon={<Wallet size={15} />} title="Payment terms" sub="Terms this vendor typically works on" flush>
                <table className={styles.ptTable}>
                  <thead>
                    <tr><th>% of amount</th><th>Type</th><th>Credit days</th><th>Notes</th></tr>
                  </thead>
                  <tbody>
                    {paymentTerms.map((t, i) => (
                      <tr key={i}>
                        <td><span style={{ fontFamily: "'Geist Mono', monospace", color: "var(--fg)", fontWeight: 600 }}>{t.value || "—"}</span></td>
                        <td style={{ textTransform: "capitalize" }}>{t.type || "—"}</td>
                        <td>{t.type === "credit" ? (t.days || "—") : "—"}</td>
                        <td>{t.comment || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            )}
          </div>

          {/* ASIDE */}
          <div className={styles.aside}>
            {/* Reach the vendor */}
            <Card icon={<Phone size={15} />} iconTone="blue" title="Reach the vendor" flush>
              {showContactDetails ? (
                <div className={styles.rows}>
                  {vendor?.mobile && (
                    <Row icon={<Phone size={15} />} k="Phone" v={<a href={`tel:${vendor.mobile}`}>{vendor.mobile}</a>} />
                  )}
                  {vendor?.email && (
                    <Row icon={<Mail size={15} />} k="Email" v={<a href={`mailto:${vendor.email}`}>{vendor.email}</a>} />
                  )}
                  {vendor?.website && (
                    <Row icon={<Globe size={15} />} k="Website" v={<a href={normalizeUrl(vendor.website)} target="_blank" rel="noopener noreferrer">{vendor.website}</a>} />
                  )}
                  {!vendor?.mobile && !vendor?.email && !vendor?.website && <div className={styles.gatedNote}>No direct contact details on record.</div>}
                </div>
              ) : (
                <div className={styles.gatedNote}>Contact details are available once you engage this vendor through an RFQ or rate contract.</div>
              )}
              {socials.length > 0 && (
                <div className={styles.socials}>
                  {socials.map((s) => (
                    <a key={s.label} className={styles.social} href={normalizeUrl(s.url)} target="_blank" rel="noopener noreferrer" title={s.label} aria-label={s.label}>
                      <Globe size={15} />
                    </a>
                  ))}
                </div>
              )}
            </Card>

            {/* Key contacts (SPOCs) */}
            {spocs.length > 0 && (
              <Card icon={<Users size={15} />} title="Key contacts" count={spocs.length} flush>
                <div className={styles.rows}>
                  {spocs.map((s, i) => (
                    <div className={styles.spoc} key={s.id || s.user_id || i}>
                      <span className={styles.av}>{initialsOf(s.name)}</span>
                      <div style={{ minWidth: 0 }}>
                        <div className={styles.name}>{s.name || "—"}</div>
                        {s.role && <div className={styles.role}>{s.role}</div>}
                      </div>
                      {(s.email || s.mobile) && showContactDetails && (
                        <div className={styles.contact}>
                          {s.mobile && <a href={`tel:${s.mobile}`}>{s.mobile}</a>}
                          {s.email && <a href={`mailto:${s.email}`}>{s.email}</a>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Registrations & compliance — signature panel */}
            <Card icon={<ShieldCheck size={15} />} iconTone="green" title="Verification & compliance">
              <div className={styles.meter}>
                <div className={styles.ring} style={ringStyle}>
                  <div className={styles.inner}><b>{compOnFile}/{compTotal}</b></div>
                </div>
                <div className={styles.meterText}>
                  <div className={styles.mk}>{compPct}% on file</div>
                  <div className={styles.ms}>{verified ? "Verified vendor" : "Verification pending"} · {compOnFile} of {compTotal} key records provided</div>
                </div>
              </div>
              <div className={styles.compList}>
                {registrations.map((r) => (
                  <div className={styles.compRow} key={r.label}>
                    <span className={styles.clbl}>{r.label}</span>
                    <span className={styles.cval}>{r.value || "—"}</span>
                    {r.docUrl ? (
                      <a className={styles.cdoc} href={r.docUrl} target="_blank" rel="noopener noreferrer">View <ExternalLink size={11} /></a>
                    ) : (
                      <span className={`${styles.cstat} ${r.value ? styles.ok : styles.no}`}>
                        {r.value ? <><Check size={12} />On file</> : "—"}
                      </span>
                    )}
                  </div>
                ))}
                <div className={styles.compRow}>
                  <span className={styles.clbl}>Bank a/c</span>
                  <span className={styles.cval}>{bank.account_number_masked || "—"}</span>
                  <span className={`${styles.cstat} ${hasBank ? styles.ok : styles.no}`}>{hasBank ? <><Check size={12} />On file</> : "—"}</span>
                </div>
              </div>
            </Card>

            {/* Banking */}
            {hasBank && (
              <Card icon={<Landmark size={15} />} title="Banking" sub="For PO settlement">
                <div className={styles.bank}>
                  <BankCell k="Account holder" v={bank.account_holder_name} />
                  <BankCell k="Bank" v={bank.bank_name} />
                  <BankCell k="Account no." v={bank.account_number_masked} mono />
                  <BankCell k="IFSC" v={bank.ifsc_code} mono />
                </div>
                {cheque?.document_url && (
                  <a href={cheque.document_url} target="_blank" rel="noopener noreferrer"
                     style={{ marginTop: 12, display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12.5, fontWeight: 600, color: "var(--primary)", textDecoration: "none" }}>
                    <FileText size={14} /> Cancelled cheque <ExternalLink size={12} />
                  </a>
                )}
              </Card>
            )}

            {/* Past engagements */}
            <Card icon={<Briefcase size={15} />} title="Past engagements" sub="RFQs this vendor took part in" count={pastRFQs.length} flush>
              {pastRFQs.length === 0 ? (
                <div className={styles.gatedNote}>No prior engagements with this vendor yet.</div>
              ) : (
                <div className={styles.rows}>
                  {pastRFQs.map((r) => (
                    <div className={styles.engRow} key={r.id}>
                      <span className={styles.en}>{r.rfq_no || `#${r.id}`}</span>
                      <span className={styles.et} title={r.name}>{r.name || "—"}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
    </main>
  );
}

// Content-aware loading skeleton — mirrors the hero + stat strip + two-column
// body so the layout doesn't jump when real data lands.
function VendorProfileSkeleton({ onBack }) {
  const sk = (w, h, r = 7, style = {}) => (
    <span className={styles.skel} style={{ display: "block", width: w, height: h, borderRadius: r, ...style }} />
  );
  const cardSk = (bodyH) => (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        {sk(30, 30, 8)}
        <div style={{ flex: 1, minWidth: 0 }}>
          {sk("38%", 12)}
          <div style={{ marginTop: 6 }}>{sk("58%", 9)}</div>
        </div>
      </div>
      <div className={styles.cardBody}>{sk("100%", bodyH, 10)}</div>
    </div>
  );
  return (
    <main className="main-body">
      <button type="button" className={styles.backLink} onClick={onBack}><ArrowLeft size={15} /> Back</button>
      {sk("100%", 150, 14)}
      <div className={styles.stats}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div className={styles.stat} key={i}>
            {sk(46, 20)}
            <div style={{ marginTop: 8 }}>{sk("72%", 9)}</div>
          </div>
        ))}
      </div>
      <div className={styles.grid}>
        <div className={styles.col}>{cardSk(150)}{cardSk(120)}{cardSk(96)}</div>
        <div className={styles.aside}>{cardSk(110)}{cardSk(170)}{cardSk(110)}</div>
      </div>
    </main>
  );
}

// ── small presentational helpers ──────────────────────────────────────────
function Stat({ value, label }) {
  return (
    <div className={styles.stat}>
      <div className={styles.sVal}>{value}</div>
      <div className={styles.sLabel}>{label}</div>
    </div>
  );
}

function Card({ icon, iconTone, title, sub, count, children, flush }) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <div className={`${styles.ic} ${iconTone ? styles[iconTone] : ""}`}>{icon}</div>
        <div style={{ minWidth: 0 }}>
          <h2>{title}</h2>
          {sub && <div className={styles.sub}>{sub}</div>}
        </div>
        {count != null && <span className={styles.count}>{count}</span>}
      </div>
      {children != null && <div className={flush ? `${styles.cardBody} ${styles.flush}` : styles.cardBody}>{children}</div>}
    </div>
  );
}

function Fact({ k, v }) {
  return (
    <div className={styles.fact}>
      <div className="k" style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--fg-4)", fontWeight: 600 }}>{k}</div>
      <div className={styles.v} style={{ marginTop: 3, fontSize: 13.5, color: v ? "var(--fg)" : "var(--fg-4)", fontWeight: 500 }}>{v || "—"}</div>
    </div>
  );
}

function Row({ icon, k, v }) {
  return (
    <div className={styles.row}>
      <div className={styles.ic}>{icon}</div>
      <div className={styles.meta}>
        <div className={styles.k}>{k}</div>
        <div className={styles.v}>{v}</div>
      </div>
    </div>
  );
}

function BankCell({ k, v, mono }) {
  return (
    <div className={styles.bankCell}>
      <div className="k" style={{ fontSize: 9.5, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--fg-4)", fontWeight: 600 }}>{k}</div>
      <div className={`${styles.v} ${mono ? styles.mono : ""}`} style={{ marginTop: 3, fontSize: 13, color: v ? "var(--fg)" : "var(--fg-4)", fontFamily: mono ? "'Geist Mono', monospace" : undefined }}>{v || "—"}</div>
    </div>
  );
}

function normalizeUrl(url) {
  if (!url) return "#";
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

// Compact ₹ formatter — Cr / L / k, matching the listing pages.
function fmtMoney(n) {
  const v = Number(n);
  if (!v || Number.isNaN(v)) return "₹0";
  if (Math.abs(v) >= 1e7) return "₹" + (v / 1e7).toFixed(2) + " Cr";
  if (Math.abs(v) >= 1e5) return "₹" + (v / 1e5).toFixed(2) + " L";
  if (Math.abs(v) >= 1e3) return "₹" + (v / 1e3).toFixed(1) + "k";
  return "₹" + v.toFixed(0);
}
