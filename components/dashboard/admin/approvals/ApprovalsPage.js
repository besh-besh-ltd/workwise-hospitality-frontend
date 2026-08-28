"use client";
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { BsDiagram3, BsArrowLeft } from "react-icons/bs";
import { HiOutlineLocationMarker } from "react-icons/hi";
import { getHospitalityCompanies } from "@/services/hospitality";
import ApprovalHierarchyRedesigned from "@/components/dashboard/admin/hospitality-manager/approval-hierarchy";
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
 */
const ApprovalsPage = () => {
  const router = useRouter();
  const { companyId, hotelId } = router.query;

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
