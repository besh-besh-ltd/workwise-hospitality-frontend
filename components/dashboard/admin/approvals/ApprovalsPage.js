"use client";
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { BsDiagram3, BsArrowLeft } from "react-icons/bs";
import { HiOutlineLocationMarker } from "react-icons/hi";
import { getHospitalityCompanies } from "@/services/hospitality";
import ApprovalHierarchyRedesigned from "@/components/dashboard/admin/hospitality-manager/approval-hierarchy";
import StuckApprovals from "./StuckApprovals";
import ApprovalCover from "./ApprovalCover";
import Loader from "@/components/shared/Loader";
import InfoTip from "@/components/shared/InfoTip";
import styles from "./Approvals.module.css";

/**
 * Approvals — the approval matrix, given its own place in the rail.
 *
 * This screen decides who authorises spend. It used to be reachable only by
 * opening Hospitality Network, picking a company, finding the right business
 * unit card and clicking "Set Hierarchy" — no nav entry, no way to see at a
 * glance which units had been configured at all. A unit whose matrix was
 * never set up looked exactly like one that had been.
 *
 * The configuration UI itself is unchanged: this wraps the existing
 * ApprovalHierarchyRedesigned, which reads `companyId` and `hotelId` from the
 * query string. What is new is the way in — a unit picker that says which
 * units are configured — and the fact that the selection lives in the URL, so
 * Back returns you to the unit you were looking at rather than to a default.
 *
 * Two views, because an admin who says "approvals" means one of two things and
 * only knows which once they are here. Setup is who *should* approve; In
 * progress is what is actually waiting and who on. Separate screens would put
 * the second one behind a nav entry nobody would find, and the two questions
 * lead into each other — a unit that keeps blocking is usually a unit whose
 * matrix is wrong.
 */
const ApprovalsPage = () => {
  const router = useRouter();
  const { companyId, hotelId, view } = router.query;
  const activeView = ["stuck", "cover"].includes(view) ? view : "setup";

  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await getHospitalityCompanies({ include: "hotels" });
        if (cancelled) return;
        setCompanies(response?.data ?? response ?? []);
        setLoadError(null);
      } catch (err) {
        if (!cancelled) setLoadError("Could not load your business units.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedCompany = useMemo(
    () => companies.find((c) => String(c.id) === String(companyId)) || null,
    [companies, companyId]
  );
  const selectedHotel = useMemo(
    () => (selectedCompany?.hotels || []).find((h) => String(h.id) === String(hotelId)) || null,
    [selectedCompany, hotelId]
  );

  const openUnit = useCallback(
    (cid, hid) => {
      router.push(
        { pathname: "/dashboard/admin/approvals", query: { companyId: cid, hotelId: hid } },
        undefined,
        { shallow: true }
      );
    },
    [router]
  );

  const clearSelection = useCallback(() => {
    router.push({ pathname: "/dashboard/admin/approvals" }, undefined, { shallow: true });
  }, [router]);

  // In the URL, like every other selection on these screens, so a link to
  // "what is stuck" can be sent to somebody.
  const showView = useCallback(
    (next) => {
      router.push(
        {
          pathname: "/dashboard/admin/approvals",
          query: next === "setup" ? {} : { view: next },
        },
        undefined,
        { shallow: true }
      );
    },
    [router]
  );

  const viewTabs = (
    <div className={styles.viewTabs} role="tablist" aria-label="Approvals view">
      <button
        type="button"
        role="tab"
        aria-selected={activeView === "setup"}
        className={`${styles.viewTab} ${activeView === "setup" ? styles.viewTabOn : ""}`}
        onClick={() => showView("setup")}
      >
        Setup
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={activeView === "stuck"}
        className={`${styles.viewTab} ${activeView === "stuck" ? styles.viewTabOn : ""}`}
        onClick={() => showView("stuck")}
      >
        In progress
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={activeView === "cover"}
        className={`${styles.viewTab} ${activeView === "cover" ? styles.viewTabOn : ""}`}
        onClick={() => showView("cover")}
      >
        Cover
      </button>
    </div>
  );

  if (activeView !== "setup") {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>Approvals</h1>
            <p className={styles.subtitle}>
              {activeView === "stuck"
                ? "What is waiting, and who on"
                : "Who stands in while someone is away"}
            </p>
          </div>
        </header>
        {viewTabs}
        {activeView === "stuck" ? <StuckApprovals /> : <ApprovalCover />}
      </div>
    );
  }

  // A unit is chosen and it really exists — hand over to the existing editor.
  if (companyId && hotelId) {
    return (
      <div className={styles.page}>
        <div className={styles.contextBar}>
          <button type="button" className={styles.backBtn} onClick={clearSelection}>
            <BsArrowLeft size={14} />
            All business units
          </button>
          <div className={styles.contextCrumb}>
            <span className={styles.contextCompany}>
              {selectedCompany?.name || "Company"}
            </span>
            <span className={styles.contextSep}>/</span>
            <span className={styles.contextUnit}>
              {selectedHotel?.name || `Unit #${hotelId}`}
            </span>
          </div>
        </div>
        <ApprovalHierarchyRedesigned />
      </div>
    );
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <Loader />
      </div>
    );
  }

  const companiesWithUnits = companies.filter((c) => (c.hotels || []).length > 0);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Approvals</h1>
          <p className={styles.subtitle}>
            Who signs off on what, per business unit
            <InfoTip
              label="What an approval workflow controls"
              text="An approval workflow decides which people must authorise an RFQ, a purchase order or a contract before it can proceed — and in what order. A unit with no workflow will not route anything for approval."
            />
          </p>
        </div>
      </header>

      {viewTabs}

      {loadError && <div className={styles.errorBanner}>{loadError}</div>}

      {!loadError && companiesWithUnits.length === 0 && (
        <div className={styles.emptyState}>
          <BsDiagram3 size={28} />
          <h2>No business units yet</h2>
          <p>
            Approval workflows are configured per business unit. Add a unit under
            Organisation first, then come back here to decide who approves what.
          </p>
        </div>
      )}

      {companiesWithUnits.map((company) => (
        <section key={company.id} className={styles.companyBlock}>
          <h2 className={styles.companyName}>{company.name}</h2>
          <div className={styles.unitGrid}>
            {(company.hotels || []).map((hotel) => (
              <button
                key={hotel.id}
                type="button"
                className={styles.unitCard}
                onClick={() => openUnit(company.id, hotel.id)}
              >
                <span className={styles.unitName}>{hotel.name}</span>
                <span className={styles.unitLocation}>
                  <HiOutlineLocationMarker size={13} />
                  {[hotel.city, hotel.state].filter(Boolean).join(", ") || "Location not set"}
                </span>
                <span className={styles.unitAction}>
                  <BsDiagram3 size={13} />
                  Configure approvals
                </span>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
};

export default ApprovalsPage;
