import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Building2, RotateCcw, Warehouse } from "lucide-react";
import { useModulePermissions } from "@/hooks/useModulePermissions";
import { getMyHospitalityContexts } from "@/services/hospitality";
import {
  getStoredHospitalityContext, setStoredHospitalityContext, subscribeHospitalityContext,
} from "@/utils/hospitalityContext";
import HotelSelect from "@/components/inventory/stock/HotelSelect";
import useInventoryHotels from "@/components/inventory/stock/useInventoryHotels";
import { stockRoutes, toId } from "@/components/inventory/stock/stockUtils";
import { onTabKeyDown, tabIndexFor } from "@/components/inventory/stock/tabKeys";
import ItemsTab from "./ItemsTab";
import CategoryDefaultsTab from "./CategoryDefaultsTab";
import HotelLevelsTab from "./HotelLevelsTab";
import SettingsTab from "./SettingsTab";
import OpeningStockTab from "./OpeningStockTab";
import r from "@/components/inventory/receive/receive.module.scss";
import s from "@/components/inventory/stock/stock.module.scss";

// Inventory setup: items, category defaults, hotel levels, settings and the
// opening-stock import. The tab and hotel live in the URL (?tab=&hotelId=) so
// links such as the stock list's "Import opening stock" land on the right one.
//
// Rights, as the server checks them (setupService):
// - Company-level actions (new item, item details, map a variant, category
//   defaults, company settings: inventory.admin; units and barcodes:
//   inventory.update) act on ONE company: the one in the hospitality context
//   (the X-Hospitality-Company header), else the caller's only company. So the
//   UI asks about rights over that company's hotels only, and names it. With no
//   context and several companies, the page asks which company first.
// - Hotel-level actions (levels: update; hotel settings, opening stock: admin)
//   are checked per hotel. Admin is never read as update.
// - Nothing renders read-only or locked while rights are still loading.
// - A super admin (user_type 8) passes every server check; with no company
//   mappings the page falls back to all the hotels they can read.
//
// Props: initialTab, initialHotelId (from the query).

export const SETUP_TABS = [
  { value: "items", label: "Items", hotel: false },
  { value: "categories", label: "Category defaults", hotel: false },
  { value: "levels", label: "Hotel levels", hotel: true },
  { value: "settings", label: "Settings", hotel: true },
  { value: "opening", label: "Opening stock", hotel: true },
];
const TAB_VALUES = SETUP_TABS.map((t) => t.value);

/** The caller's companies with their hotels (GET /hospitality/my-contexts). */
const useMyCompanies = () => {
  const [state, setState] = useState({ companies: [], loading: true, error: null });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setState((st) => ({ ...st, loading: true, error: null }));
    (async () => {
      try {
        const res = await getMyHospitalityContexts();
        const list = Array.isArray(res?.data?.data) ? res.data.data : Array.isArray(res?.data) ? res.data : [];
        const companies = list
          .map((c) => ({
            id: Number(c?.id),
            name: c?.name || `Company ${c?.id}`,
            hotelIds: (Array.isArray(c?.hotels) ? c.hotels : []).map((h) => Number(h?.id)).filter((id) => id > 0),
          }))
          .filter((c) => c.id > 0);
        if (!cancelled) setState({ companies, loading: false, error: null });
      } catch {
        if (!cancelled) setState({ companies: [], loading: false, error: "Could not load your companies." });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [attempt]);
  return { ...state, retry: () => setAttempt((n) => n + 1) };
};

/** The company id in the stored hospitality context (what the header sends). */
const useContextCompany = () => {
  const [ctx, setCtx] = useState({ loaded: false, companyId: null, companyName: null });
  useEffect(() => {
    const read = (c) => setCtx({ loaded: true, companyId: toId(c?.companyId), companyName: c?.companyName || null });
    read(getStoredHospitalityContext());
    return subscribeHospitalityContext(read);
  }, []);
  return ctx;
};

const CompanyChooser = ({ title, companies, onCancel }) => {
  const [value, setValue] = useState("");
  return (
    <section className={r.card} aria-label="Choose a company">
      <div className={r.cardBody}>
        <div className={r.stateIc} style={{ marginBottom: 10 }}><Building2 size={20} aria-hidden="true" /></div>
        <h2 className={r.cardTitle} style={{ marginBottom: 6 }}>{title}</h2>
        <p className={r.meta} style={{ marginTop: 0 }}>
          Items, category defaults and company settings belong to one company. Choose the one to set up; you can change it later.
        </p>
        <div className={s.fieldRow} style={{ maxWidth: 360 }}>
          <label className={r.label} htmlFor="setup-company">Company</label>
          <select id="setup-company" className={r.select} value={value} onChange={(e) => setValue(e.target.value)}>
            <option value="">Choose a company…</option>
            {companies.map((c) => (
              <option key={c.id} value={String(c.id)}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className={r.flags} style={{ marginTop: 12 }}>
          <button
            type="button"
            className={`${r.btn} ${r.btnPrimary}`}
            disabled={!value}
            onClick={() => {
              const c = companies.find((x) => String(x.id) === value);
              if (c) setStoredHospitalityContext({ companyId: c.id, companyName: c.name, hotelId: null, hotelName: null });
            }}
          >
            Use this company
          </button>
          {onCancel && (
            <button type="button" className={`${r.btn} ${r.btnSecondary}`} onClick={onCancel}>
              Cancel
            </button>
          )}
        </div>
      </div>
    </section>
  );
};

const SetupPage = ({ initialTab = null, initialHotelId = null }) => {
  const router = useRouter();
  const { hotels, loading: hotelsLoading, error: hotelsError, reload: reloadHotels } = useInventoryHotels();
  const my = useMyCompanies();
  const ctx = useContextCompany();
  const [tab, setTab] = useState(() => (TAB_VALUES.includes(initialTab) ? initialTab : "items"));
  const [hotelId, setHotelId] = useState(() => toId(initialHotelId));
  const [choosing, setChoosing] = useState(false);
  const [tabBusy, setTabBusy] = useState(false); // the opening import is posting

  // A company picked (here or in the header switcher) closes the chooser.
  useEffect(() => {
    setChoosing(false);
  }, [ctx.companyId]);

  // ── The company the server will act on ───────────────────────────────────
  const stockIds = useMemo(() => new Set(hotels.map((h) => h.id)), [hotels]);
  // Companies where the caller can read inventory, with those hotels.
  const readable = useMemo(
    () =>
      my.companies
        .map((c) => ({ ...c, stockHotelIds: c.hotelIds.filter((id) => stockIds.has(id)) }))
        .filter((c) => c.stockHotelIds.length > 0),
    [my.companies, stockIds]
  );
  const scopeLoading = hotelsLoading || my.loading || !ctx.loaded;
  // Without the company list the acting company can't be told apart: ask again
  // rather than guess from every hotel's rights.
  const scopeError = !scopeLoading && !!my.error;
  let company = null; // {id, name, stockHotelIds} | {legacy:true}
  let companyProblem = null; // "choose" | "no-access"
  if (!scopeLoading && !scopeError) {
    if (ctx.companyId) {
      company = readable.find((c) => c.id === ctx.companyId) || null;
      if (!company) {
        if (readable.length) companyProblem = "no-access";
        else company = { legacy: true, id: ctx.companyId, name: ctx.companyName, stockHotelIds: hotels.map((h) => h.id) };
      }
    } else if (readable.length === 1) {
      company = readable[0];
    } else if (readable.length > 1) {
      companyProblem = "choose";
    } else {
      // No company mappings cover these hotels (e.g. a super admin): rights over every readable hotel.
      company = { legacy: true, id: null, name: null, stockHotelIds: hotels.map((h) => h.id) };
    }
  }
  const companyHotels = useMemo(
    () => (company ? hotels.filter((h) => company.stockHotelIds.includes(h.id)) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hotels, company?.id, company?.legacy, company?.stockHotelIds?.join(",")]
  );
  const companyHotelIds = useMemo(() => companyHotels.map((h) => h.id), [companyHotels]);

  // The hotel must be one of the company's (else every one listed); otherwise the first.
  const hotelChoices = company && !company.legacy ? companyHotels : hotels;
  useEffect(() => {
    if (scopeLoading) return;
    if (!hotelChoices.length) {
      if (hotelId != null) setHotelId(null);
      return;
    }
    if (hotelId == null || !hotelChoices.some((h) => h.id === hotelId)) setHotelId(hotelChoices[0].id);
  }, [scopeLoading, hotelChoices, hotelId]);

  const hotelIds = useMemo(() => (hotelId ? [hotelId] : []), [hotelId]);
  const companyPerms = useModulePermissions({
    moduleKey: "inventory", hotelIds: companyHotelIds, enabled: companyHotelIds.length > 0,
  });
  const hotelPerms = useModulePermissions({ moduleKey: "inventory", hotelIds, enabled: hotelIds.length > 0 });

  const companyAdmin = companyPerms.hasPermission("admin");
  const companyUpdate = companyPerms.canUpdate;
  const hotelAdmin = hotelPerms.hasPermission("admin");
  const hotelUpdate = hotelPerms.canUpdate;

  const go = (nextTab, nextHotel) => {
    setTab(nextTab);
    setHotelId(nextHotel);
    router.replace(stockRoutes.setup({ tab: nextTab, hotelId: nextHotel || undefined }), undefined, { shallow: true });
  };

  const current = SETUP_TABS.find((t) => t.value === tab) || SETUP_TABS[0];
  const hotel = hotels.find((h) => h.id === hotelId) || null;
  const noHotels = !hotelsLoading && !hotelsError && hotels.length === 0;
  const permsLoading =
    scopeLoading ||
    (companyHotelIds.length > 0 && companyPerms.loading) ||
    (current.hotel && hotelIds.length > 0 && hotelPerms.loading) ||
    (current.hotel && hotelChoices.length > 0 && !hotelId);
  const permsError = companyPerms.error || (current.hotel ? hotelPerms.error : null);
  const showChooser = !scopeLoading && (companyProblem || choosing);

  const skeleton = (
    <div className={r.card}>
      <div className={r.cardBody} aria-busy="true">
        {[0, 1, 2].map((i) => <span key={i} className={r.sk} style={{ width: `${88 - i * 12}%`, marginBottom: 14 }} />)}
      </div>
    </div>
  );

  let panel;
  if (hotelsError) {
    panel = (
      <div className={r.stateCard} role="alert">
        <div className={r.stateIc}><Warehouse size={20} aria-hidden="true" /></div>
        <h2 className={r.stateTitle}>{hotelsError}</h2>
        <div className={r.stateActions}>
          <button type="button" className={`${r.btn} ${r.btnSecondary}`} onClick={reloadHotels}>
            <RotateCcw size={14} aria-hidden="true" /> Try again
          </button>
        </div>
      </div>
    );
  } else if (noHotels) {
    panel = (
      <div className={r.stateCard}>
        <div className={r.stateIc}><Warehouse size={20} aria-hidden="true" /></div>
        <h2 className={r.stateTitle}>You don&apos;t have inventory access at any hotel</h2>
        <p className={r.stateSub}>Ask your admin for inventory rights.</p>
      </div>
    );
  } else if (scopeError) {
    panel = (
      <div className={r.stateCard} role="alert">
        <div className={r.stateIc}><Building2 size={20} aria-hidden="true" /></div>
        <h2 className={r.stateTitle}>{my.error}</h2>
        <div className={r.stateActions}>
          <button type="button" className={`${r.btn} ${r.btnSecondary}`} onClick={my.retry}>
            <RotateCcw size={14} aria-hidden="true" /> Try again
          </button>
        </div>
      </div>
    );
  } else if (showChooser) {
    panel = (
      <CompanyChooser
        title={
          companyProblem === "no-access"
            ? `You don't have inventory access in ${ctx.companyName || "the company you chose"}`
            : choosing
              ? "Change company"
              : "Choose a company to set up"
        }
        companies={readable}
        onCancel={choosing && !companyProblem ? () => setChoosing(false) : null}
      />
    );
  } else if (permsError && !permsLoading) {
    panel = (
      <div className={r.stateCard} role="alert">
        <h2 className={r.stateTitle}>Couldn&apos;t check your inventory rights</h2>
        <div className={r.stateActions}>
          <button
            type="button"
            className={`${r.btn} ${r.btnSecondary}`}
            onClick={() => {
              companyPerms.refetch();
              if (current.hotel) hotelPerms.refetch();
            }}
          >
            <RotateCcw size={14} aria-hidden="true" /> Try again
          </button>
        </div>
      </div>
    );
  } else if (permsLoading) {
    panel = skeleton;
  } else if (tab === "items") {
    panel = <ItemsTab key={company?.id ?? "any"} canAdmin={companyAdmin} canUpdate={companyUpdate} />;
  } else if (tab === "categories") {
    panel = <CategoryDefaultsTab key={company?.id ?? "any"} canAdmin={companyAdmin} />;
  } else if (tab === "levels") {
    panel = <HotelLevelsTab key={hotelId} hotelId={hotelId} canUpdate={hotelUpdate} />;
  } else if (tab === "settings") {
    panel = (
      <SettingsTab
        key={`${company?.id ?? "any"}:${hotelId}`}
        hotelId={hotelId}
        hotelName={hotel?.name}
        companyName={company?.name || null}
        canAdmin={hotelAdmin}
        canAdminCompany={companyAdmin}
      />
    );
  } else {
    panel = (
      <OpeningStockTab
        key={hotelId}
        hotelId={hotelId}
        hotelName={hotel?.name}
        canAdmin={hotelAdmin}
        onBusyChange={setTabBusy}
      />
    );
  }

  const showHotelPicker = current.hotel && hotelChoices.length > 1 && !showChooser && !scopeError;

  return (
    <div className={r.page}>
      <section className={r.pageHeader}>
        <div className={r.pageHeaderInner}>
          <div className={r.headMain}>
            <div className={r.eyebrow}>
              <Link href={stockRoutes.stock({ hotelId: hotelId || undefined })} className={r.btnLink}>Stock</Link>
            </div>
            <h1 className={r.pageTitle}>Inventory setup</h1>
            <div className={r.pageSub}>
              {company?.name && !showChooser ? (
                <span>
                  For <strong>{company.name}</strong>
                  {readable.length > 1 && (
                    <>
                      {" · "}
                      <button type="button" className={`${r.btnLink} ${s.tapLink}`} onClick={() => setChoosing(true)}>
                        Change company
                      </button>
                    </>
                  )}
                </span>
              ) : (
                <span>Items, levels and the rules stock follows</span>
              )}
            </div>
          </div>
          {showHotelPicker && (
            <div className={`${r.headerActions} ${r.headerActionsKeep}`}>
              <HotelSelect
                hotels={hotelChoices}
                value={hotelId ?? ""}
                disabled={tabBusy}
                onChange={(id) => id && !tabBusy && go(tab, id)}
              />
            </div>
          )}
        </div>
      </section>

      <main className={r.pageBody}>
        <div className={r.stack}>
          <div className={s.tabs} role="tablist" aria-label="Setup">
            {SETUP_TABS.map((t) => (
              <button
                key={t.value}
                type="button"
                role="tab"
                id={`setup-tab-${t.value}`}
                aria-selected={tab === t.value}
                aria-controls="setup-panel"
                tabIndex={tabIndexFor(tab === t.value)}
                className={`${s.tab} ${tab === t.value ? s.tabActive : ""}`}
                disabled={tabBusy && tab !== t.value}
                onClick={() => go(t.value, hotelId)}
                onKeyDown={(e) => {
                  if (!tabBusy) onTabKeyDown(e, TAB_VALUES, tab, (v) => go(v, hotelId));
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div role="tabpanel" id="setup-panel" aria-labelledby={`setup-tab-${tab}`}>
            {panel}
          </div>
        </div>
      </main>
    </div>
  );
};

export default SetupPage;
