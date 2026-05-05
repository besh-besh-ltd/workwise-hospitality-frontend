import Head from "next/head";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import { AuthGuard } from "@/utils/authGuard";
import { getVendorArcDetail, getVendorArcDocument } from "@/services/arc";
import s from "./arcs.module.scss";

const formatDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const STATUS_PILL = {
  PENDING_COMMITTEE:   { label: "Pending Committee", bg: "#fef3c7", color: "#92400e" },
  PARTIALLY_DECIDED:   { label: "Partially Decided", bg: "#fef3c7", color: "#92400e" },
  DOC_GENERATED:       { label: "Document Ready",    bg: "#dbeafe", color: "#1e40af" },
  ACTIVE:              { label: "Active",            bg: "#dcfce7", color: "#15803d" },
  EXPIRED:             { label: "Expired",           bg: "#f1f5f9", color: "#64748b" },
  VOID:                { label: "Void",              bg: "#fee2e2", color: "#991b1b" },
};

const VendorArcDetailPage = () => {
  const router = useRouter();
  const { arc_id } = router.query;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!router.isReady || !arc_id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await getVendorArcDetail(arc_id);
        if (cancelled) return;
        setData(res?.data?.data || res?.data || null);
      } catch (err) {
        toast.error(err?.message?.response?.data?.message || "Failed to load contract");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router.isReady, arc_id]);

  const approvedItems = useMemo(
    () => (data?.items || []).filter((i) => i.status === "APPROVED"),
    [data]
  );

  const handleDownload = async () => {
    if (!arc_id) return;
    setDownloading(true);
    try {
      const res = await getVendorArcDocument(arc_id);
      const url = res?.data?.data?.document_url || res?.data?.document_url;
      if (!url) {
        toast.warn("Document not yet available for this contract.");
        return;
      }
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      toast.error(err?.message?.response?.data?.message || "Failed to fetch document");
    } finally {
      setDownloading(false);
    }
  };

  const pill = data ? (STATUS_PILL[data.status] || { label: data.status, bg: "#f1f5f9", color: "#475569" }) : null;
  const isDocReady = data && (data.status === "ACTIVE" || data.status === "DOC_GENERATED") && data.document_url;

  return (
    <AuthGuard>
      <Head>
        <title>{data ? `ARC #${data.rfq_no}` : "Rate Contract"} · Vendor</title>
      </Head>
      <main className={s.detailPage}>
        <button type="button" onClick={() => router.push("/dashboard/vendor/arcs")} className={s.detailBack}>
          ← All rate contracts
        </button>

        {loading ? (
          <div className={s.loadingState}>
            <span className="spinner-border" role="status" aria-hidden />
            <p>Loading contract…</p>
          </div>
        ) : !data ? (
          <div className={s.emptyState}>
            <h3>Contract not found</h3>
            <p>The contract may have been voided, or it isn't awarded to your account.</p>
          </div>
        ) : (
          <>
            <section className={s.detailHero}>
              <div className={s.detailHeroTop}>
                <div>
                  <h1 className={s.detailHeadline}>Tender #{data.rfq_no}</h1>
                  {data.rfq_title && <p className={s.detailSubline}>{data.rfq_title}</p>}
                  <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <span className={s.scopePill}>{data.tender_scope === "GROUP" ? "Group ARC" : "Single ARC"}</span>
                    {pill && (
                      <span className={s.statusPill} style={{ background: pill.bg, color: pill.color }}>
                        {pill.label}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={!isDocReady || downloading}
                  className={s.detailDownload}
                  title={isDocReady ? "Open the signed contract" : "Document is not ready for this contract yet."}
                >
                  {downloading ? "Loading…" : isDocReady ? "Download contract" : "Document not ready"}
                </button>
              </div>

              <div className={s.detailMetaGrid}>
                <div className={s.detailMetaItem}>
                  <div className={s.detailMetaLabel}>Period from</div>
                  <div className={s.detailMetaValue}>{formatDate(data.period_from)}</div>
                </div>
                <div className={s.detailMetaItem}>
                  <div className={s.detailMetaLabel}>Period to</div>
                  <div className={s.detailMetaValue}>{formatDate(data.period_to)}</div>
                </div>
                <div className={s.detailMetaItem}>
                  <div className={s.detailMetaLabel}>Hotels covered</div>
                  <div className={s.detailMetaValue}>{(data.hotels || []).length}</div>
                </div>
                <div className={s.detailMetaItem}>
                  <div className={s.detailMetaLabel}>Approved items</div>
                  <div className={s.detailMetaValue}>{approvedItems.length}</div>
                </div>
              </div>
            </section>

            <h3 className={s.detailSectionTitle}>Hotels covered</h3>
            <div className={s.detailHotelList}>
              {(data.hotels || []).length === 0 ? (
                <div className={s.detailHotelRow}>
                  <span style={{ color: "#94a3b8" }}>No hotels listed.</span>
                </div>
              ) : (
                data.hotels.map((h) => (
                  <div key={h.id} className={s.detailHotelRow}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{h.name}</div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>
                        {[h.address, h.city].filter(Boolean).join(" · ") || "—"}
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: "#64748b" }}>
                      {h.company_name || ""}
                    </div>
                  </div>
                ))
              )}
            </div>

            <h3 className={s.detailSectionTitle}>Awarded items</h3>
            <div className={s.detailItemList}>
              <div className={`${s.detailItemRow} ${s.detailItemRowHead}`}>
                <span>Product</span>
                <span>Variant</span>
                <span>Status</span>
                <span style={{ textAlign: "right" }}>Unit Price</span>
              </div>
              {(data.items || []).length === 0 ? (
                <div className={s.detailItemRow}>
                  <span style={{ color: "#94a3b8" }}>No items.</span>
                </div>
              ) : (
                data.items.map((it) => {
                  const itemPill = it.status === "APPROVED"
                    ? { bg: "#dcfce7", color: "#15803d" }
                    : it.status === "REJECTED"
                      ? { bg: "#fee2e2", color: "#991b1b" }
                      : { bg: "#fef3c7", color: "#92400e" };
                  return (
                    <div key={it.id} className={s.detailItemRow}>
                      <span style={{ fontWeight: 500 }}>{it.product_name || `Variant #${it.product_variant_id}`}</span>
                      <span style={{ color: "#64748b" }}>{it.variant || "—"}</span>
                      <span>
                        <span className={s.statusPill} style={{ background: itemPill.bg, color: itemPill.color }}>
                          {it.status}
                        </span>
                      </span>
                      <span style={{ textAlign: "right", fontWeight: 600 }}>
                        ₹{Number(it.unit_price || 0).toFixed(2)}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </main>
    </AuthGuard>
  );
};

export default VendorArcDetailPage;
