import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ClipboardCheck, PackageMinus, Trash2, Truck, Warehouse } from "lucide-react";
import {
  ActionBanner,
  DashPanel,
  KpiTile,
  RankList,
  SkeletonKpiGrid,
  SkeletonRankList,
  surfaceStyles,
} from "@/components/dashboard/shared";
import { formatMoney, formatMoneyExact } from "@/components/dashboard/shared/format";
import AccessDeniedPage from "@/components/shared/AccessDeniedPage";
import { getInventoryOverview } from "@/services/inventory";
import { getApiErrorMessage } from "@/utils/apiError";
import styles from "./OverviewPage.module.scss";

// Inventory · Overview. Every figure comes from GET /inventory/overview, which
// scopes stock to the caller's inventory.read hotels and deliveries to their
// grn.read hotels; this page only lays the numbers out.

const ROUTES = {
  stock: "/dashboard/buyer/inventory/stock",
  receive: "/dashboard/buyer/inventory/receive",
  counts: "/dashboard/buyer/inventory/counts",
  reports: "/dashboard/buyer/reports",
};

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

const EmptyPanel = ({ title, text }) => (
  <div className={surfaceStyles.emptyState}>
    <h2>{title}</h2>
    <p>{text}</p>
  </div>
);

const OverviewPage = () => {
  const [hotelId, setHotelId] = useState("");
  const [hotelOptions, setHotelOptions] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [denied, setDenied] = useState(false);
  const seq = useRef(0);

  const load = useCallback(async (selected) => {
    const mine = ++seq.current;
    setLoading(true);
    setError(null);
    try {
      const payload = await getInventoryOverview(selected ? { hotelId: selected } : {});
      if (mine !== seq.current) return;
      setData(payload || null);
      // The unfiltered answer lists every hotel in scope; keep it for the picker.
      if (!selected) {
        const hotels = payload?.hotels || [];
        setHotelOptions(hotels);
        setDenied(hotels.length === 0);
      }
    } catch (err) {
      if (mine !== seq.current) return;
      if (err?.response?.status === 403) {
        setDenied(true);
      } else {
        setError(getApiErrorMessage(err, "We couldn't load the inventory overview."));
      }
    } finally {
      if (mine === seq.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(hotelId);
  }, [hotelId, load]);

  const stockValue = useMemo(
    () => (data?.stockValueByHotel || []).reduce((sum, h) => sum + (Number(h.value) || 0), 0),
    [data]
  );

  if (denied) {
    return (
      <AccessDeniedPage
        title="Access Denied"
        message="You need inventory or goods-receipt access at a hotel to see the inventory overview."
        showBackButton={false}
      />
    );
  }

  const deliveries = data?.deliveries || { dueToday: 0, dueThisWeek: 0, overdue: 0 };
  const notStarted = data?.stockNotStartedHotels || [];
  const hotelCount = (data?.stockValueByHotel || []).length;

  const hotelRows = (data?.stockValueByHotel || []).map((h) => ({
    key: String(h.hotelId),
    name: h.hotelName,
    value: Number(h.value) || 0,
    valueLabel: <span className={styles.mono}>{formatMoneyExact(h.value)}</span>,
  }));
  const deptRows = (data?.outThisMonthByDept || []).map((d, i) => ({
    key: String(d.departmentId ?? `none-${i}`),
    name: d.departmentName || "No department",
    value: Number(d.value) || 0,
    valueLabel: <span className={styles.mono}>{formatMoneyExact(d.value)}</span>,
  }));

  const firstLoad = loading && !data;

  return (
    <div className={styles.page}>
      <section className={surfaceStyles.pageHeader}>
        <div>
          <h1 className={surfaceStyles.pageH1}>Inventory overview</h1>
          <p className={surfaceStyles.pageSub}>
            Stock held, deliveries due and what departments marked out this month. Values are at stock cost.
          </p>
        </div>
        <div className={surfaceStyles.pageHeaderActions}>
          <label className={styles.hotelPicker}>
            Hotel
            <select
              className={styles.hotelSelect}
              value={hotelId}
              onChange={(e) => setHotelId(e.target.value)}
              disabled={hotelOptions.length === 0}
              aria-label="Hotel"
            >
              <option value="">All hotels</option>
              {hotelOptions.map((h) => (
                <option key={h.id} value={String(h.id)}>
                  {h.name}
                </option>
              ))}
            </select>
          </label>
          <Link href={ROUTES.stock} className={styles.linkBtn}>
            Stock
          </Link>
          <Link href={ROUTES.receive} className={styles.linkBtn}>
            Receive
          </Link>
          <Link href={ROUTES.reports} className={styles.linkBtn}>
            Reports
          </Link>
        </div>
      </section>

      {error && (
        <div className={styles.error} role="alert">
          <span>{error}</span>
          <button
            type="button"
            className={`${surfaceStyles.btn} ${surfaceStyles.btnSecondary}`}
            onClick={() => load(hotelId)}
          >
            Try again
          </button>
        </div>
      )}

      {notStarted.length > 0 && (
        <ActionBanner
          tone="info"
          icon={ClipboardCheck}
          title={`Stock not started at ${plural(notStarted.length, "hotel", "hotels")}`}
          sub={`${notStarted.map((h) => h.hotelName).join(", ")}. Approve a full count there to start stock tracking and reorder alerts.`}
          actions={
            <Link href={ROUTES.counts} className={styles.linkBtn}>
              Counts
            </Link>
          }
        />
      )}

      {firstLoad ? (
        <SkeletonKpiGrid count={4} />
      ) : (
        data && (
          <div className={surfaceStyles.kpiGrid} aria-busy={loading}>
            <KpiTile
              label="Stock value"
              value={<span className={styles.mono}>{formatMoney(stockValue)}</span>}
              sub={plural(hotelCount, "hotel", "hotels")}
              icon={Warehouse}
              accent="accent"
            />
            <KpiTile
              label="Low stock"
              value={<span className={styles.mono}>{data.lowStockCount ?? 0}</span>}
              sub="Items at or below reorder level"
              icon={PackageMinus}
              accent={data.lowStockCount > 0 ? "warn" : "success"}
            />
            <KpiTile
              label="Overdue deliveries"
              value={<span className={styles.mono}>{deliveries.overdue}</span>}
              sub={`${deliveries.dueToday} due today · ${deliveries.dueThisWeek} due this week`}
              icon={Truck}
              accent={deliveries.overdue > 0 ? "danger" : "info"}
            />
            <KpiTile
              label="Wastage this month"
              value={<span className={styles.mono}>{formatMoney(data.wastageThisMonth)}</span>}
              sub="Wastage, breakage and expiry"
              icon={Trash2}
              accent="violet"
            />
          </div>
        )
      )}

      <div className={surfaceStyles.dashGrid}>
        <DashPanel title="Stock value by hotel" icon={Warehouse} subtitle="At stock cost">
          {firstLoad ? (
            <SkeletonRankList rows={4} />
          ) : hotelRows.length ? (
            <RankList rows={hotelRows} />
          ) : (
            <EmptyPanel title="No stock yet" text="Stock appears here once goods are received or counted." />
          )}
        </DashPanel>
        <DashPanel title="Marked out this month" icon={PackageMinus} subtitle="By department, net of returns">
          {firstLoad ? (
            <SkeletonRankList rows={4} />
          ) : deptRows.length ? (
            <RankList rows={deptRows} />
          ) : (
            <EmptyPanel title="Nothing marked out" text="No department has drawn stock this month." />
          )}
        </DashPanel>
      </div>
    </div>
  );
};

export default OverviewPage;
