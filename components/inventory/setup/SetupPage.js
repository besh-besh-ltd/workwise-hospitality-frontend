import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Warehouse } from "lucide-react";
import { useModulePermissions } from "@/hooks/useModulePermissions";
import HotelSelect from "@/components/inventory/stock/HotelSelect";
import useInventoryHotels from "@/components/inventory/stock/useInventoryHotels";
import { stockRoutes, toId } from "@/components/inventory/stock/stockUtils";
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
// Props: initialTab, initialHotelId (from the query).

export const SETUP_TABS = [
  { value: "items", label: "Items", hotel: false },
  { value: "categories", label: "Category defaults", hotel: false },
  { value: "levels", label: "Hotel levels", hotel: true },
  { value: "settings", label: "Settings", hotel: true },
  { value: "opening", label: "Opening stock", hotel: true },
];

const SetupPage = ({ initialTab = null, initialHotelId = null }) => {
  const router = useRouter();
  const { hotels, loading: hotelsLoading, error: hotelsError } = useInventoryHotels();
  const [tab, setTab] = useState(() => (SETUP_TABS.some((t) => t.value === initialTab) ? initialTab : "items"));
  const [hotelId, setHotelId] = useState(() => toId(initialHotelId));

  // The hotel must be one the server listed; otherwise use the first.
  useEffect(() => {
    if (hotelsLoading) return;
    if (!hotels.length) {
      if (hotelId != null) setHotelId(null);
      return;
    }
    if (hotelId == null || !hotels.some((h) => h.id === hotelId)) setHotelId(hotels[0].id);
  }, [hotelsLoading, hotels, hotelId]);

  const allHotelIds = useMemo(() => hotels.map((h) => h.id), [hotels]);
  const hotelIds = useMemo(() => (hotelId ? [hotelId] : []), [hotelId]);
  const company = useModulePermissions({ moduleKey: "inventory", hotelIds: allHotelIds, enabled: allHotelIds.length > 0 });
  const atHotel = useModulePermissions({ moduleKey: "inventory", hotelIds, enabled: hotelIds.length > 0 });

  const companyAdmin = company.hasPermission("admin");
  const companyUpdate = company.canUpdate || companyAdmin;
  const hotelAdmin = atHotel.hasPermission("admin");
  const hotelUpdate = atHotel.canUpdate || hotelAdmin;

  const go = (nextTab, nextHotel) => {
    setTab(nextTab);
    setHotelId(nextHotel);
    router.replace(stockRoutes.setup({ tab: nextTab, hotelId: nextHotel || undefined }), undefined, { shallow: true });
  };

  const current = SETUP_TABS.find((t) => t.value === tab) || SETUP_TABS[0];
  const hotel = hotels.find((h) => h.id === hotelId) || null;
  const noHotels = !hotelsLoading && hotels.length === 0;

  return (
    <div className={r.page}>
      <section className={r.pageHeader}>
        <div className={r.pageHeaderInner}>
          <div className={r.headMain}>
            <div className={r.eyebrow}>
              <Link href={stockRoutes.stock({ hotelId: hotelId || undefined })} className={r.btnLink}>Stock</Link>
            </div>
            <h1 className={r.pageTitle}>Inventory setup</h1>
            <div className={r.pageSub}>Items, levels and the rules stock follows</div>
          </div>
          {current.hotel && hotels.length > 1 && (
            <div className={`${r.headerActions} ${r.headerActionsKeep}`}>
              <HotelSelect hotels={hotels} value={hotelId ?? ""} onChange={(id) => id && go(tab, id)} />
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
                className={`${s.tab} ${tab === t.value ? s.tabActive : ""}`}
                onClick={() => go(t.value, hotelId)}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div role="tabpanel" id="setup-panel" aria-labelledby={`setup-tab-${tab}`}>
            {noHotels ? (
              <div className={r.stateCard}>
                <div className={r.stateIc}><Warehouse size={20} aria-hidden="true" /></div>
                <h2 className={r.stateTitle}>{hotelsError || "You don't have inventory access at any hotel"}</h2>
                <p className={r.stateSub}>Ask your admin for inventory rights.</p>
              </div>
            ) : hotelsLoading ? (
              <div className={r.card}>
                <div className={r.cardBody} aria-busy="true">
                  {[0, 1, 2].map((i) => <span key={i} className={r.sk} style={{ width: `${88 - i * 12}%`, marginBottom: 14 }} />)}
                </div>
              </div>
            ) : tab === "items" ? (
              <ItemsTab canAdmin={companyAdmin} canUpdate={companyUpdate} />
            ) : tab === "categories" ? (
              <CategoryDefaultsTab canAdmin={companyAdmin} />
            ) : tab === "levels" ? (
              <HotelLevelsTab key={hotelId} hotelId={hotelId} canUpdate={hotelUpdate} />
            ) : tab === "settings" ? (
              <SettingsTab hotelId={hotelId} hotelName={hotel?.name} canAdmin={hotelAdmin} canAdminCompany={companyAdmin} />
            ) : (
              <OpeningStockTab hotelId={hotelId} hotelName={hotel?.name} canAdmin={hotelAdmin} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default SetupPage;
