import React, { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Loader2, RefreshCw, Save } from "lucide-react";
import { getCompanySettings, getHotelSettings, saveCompanySettings, saveHotelSettings } from "@/services/inventory";
import { fmtInstant } from "@/components/inventory/receive/receiveUtils";
import { errorInfo } from "@/components/inventory/stock/stockUtils";
import r from "@/components/inventory/receive/receive.module.scss";
import s from "@/components/inventory/stock/stock.module.scss";

// Company-wide inventory settings and the selected hotel's own settings.
// Saves send only the fields that changed (both PUTs are partial).
//
// Props: { hotelId, hotelName, canAdmin (inventory.admin at the hotel),
//          canAdminCompany (inventory.admin in the company; defaults to canAdmin) }

const COMPANY_TOGGLES = [
  {
    key: "allowNegativeStock",
    title: "Allow negative stock",
    help: "Let mark out and adjustments take an item below zero. Off keeps stock honest: the post is refused with what is on hand.",
  },
  {
    key: "includeGstInCost",
    title: "Include GST in stock cost",
    help: "Value receipts with GST. Hotels can override this below.",
  },
  {
    key: "countFreeze",
    title: "Freeze stock during counts",
    help: "While a count is open at a hotel, mark out, returns and adjustments wait until it is submitted.",
  },
];
const DOC_CODE = /^[A-Za-z0-9_-]{1,20}$/;

const companyForm = (c) => ({
  overReceiptTolerancePct: c?.overReceiptTolerancePct != null ? String(c.overReceiptTolerancePct) : "0",
  adjustmentAutoApproveLimit: c?.adjustmentAutoApproveLimit != null ? String(c.adjustmentAutoApproveLimit) : "0",
  allowNegativeStock: !!c?.allowNegativeStock,
  includeGstInCost: !!c?.includeGstInCost,
  countFreeze: !!c?.countFreeze,
});
const hotelForm = (h) => ({
  docCode: h?.docCode || "",
  includeGstInCost: h?.includeGstInCost == null ? "" : h.includeGstInCost ? "yes" : "no",
});

const Toggle = ({ id, title, help, checked, disabled, onChange }) => (
  <div className={s.toggleRow}>
    <div className={s.toggleText}>
      <label className={s.toggleTitle} htmlFor={id}>{title}</label>
      {help && <div className={s.toggleHelp}>{help}</div>}
    </div>
    <input id={id} type="checkbox" role="switch" className={s.switch} checked={checked} disabled={disabled} onChange={onChange} />
  </div>
);

const SettingsTab = ({ hotelId, hotelName, canAdmin, canAdminCompany = canAdmin }) => {
  const [company, setCompany] = useState(null);
  const [cForm, setCForm] = useState(companyForm(null));
  const [cErrors, setCErrors] = useState({});
  const [cError, setCError] = useState(null);
  const [cSaving, setCSaving] = useState(false);
  const [cLoadError, setCLoadError] = useState(null);

  const [hotel, setHotel] = useState(null);
  const [hForm, setHForm] = useState(hotelForm(null));
  const [hErrors, setHErrors] = useState({});
  const [hError, setHError] = useState(null);
  const [hSaving, setHSaving] = useState(false);
  const [hLoadError, setHLoadError] = useState(null);

  const loadCompany = useCallback(async () => {
    setCLoadError(null);
    try {
      const res = await getCompanySettings();
      setCompany(res);
      setCForm(companyForm(res));
    } catch (err) {
      setCLoadError(errorInfo(err, "Could not load the company settings.").message);
    }
  }, []);

  const loadHotel = useCallback(async () => {
    if (!hotelId) return;
    setHLoadError(null);
    setHotel(null);
    try {
      const res = await getHotelSettings(hotelId);
      setHotel(res);
      setHForm(hotelForm(res));
      setHErrors({});
      setHError(null);
    } catch (err) {
      setHLoadError(errorInfo(err, "Could not load this hotel's settings.").message);
    }
  }, [hotelId]);

  useEffect(() => {
    loadCompany();
  }, [loadCompany]);
  useEffect(() => {
    loadHotel();
  }, [loadHotel]);

  // ── Company ────────────────────────────────────────────────────────────────
  const companyChanges = () => {
    const out = {};
    const errs = {};
    const base = companyForm(company);
    for (const t of COMPANY_TOGGLES) if (cForm[t.key] !== base[t.key]) out[t.key] = cForm[t.key];
    if (cForm.overReceiptTolerancePct !== base.overReceiptTolerancePct) {
      const n = Number(cForm.overReceiptTolerancePct);
      if (cForm.overReceiptTolerancePct.trim() === "" || !Number.isFinite(n) || n < 0 || n > 100) {
        errs.overReceiptTolerancePct = "Enter a percentage from 0 to 100";
      } else out.overReceiptTolerancePct = n;
    }
    if (cForm.adjustmentAutoApproveLimit !== base.adjustmentAutoApproveLimit) {
      const n = Number(cForm.adjustmentAutoApproveLimit);
      if (cForm.adjustmentAutoApproveLimit.trim() === "" || !Number.isFinite(n) || n < 0) {
        errs.adjustmentAutoApproveLimit = "Enter zero or more";
      } else out.adjustmentAutoApproveLimit = n;
    }
    return { out, errs };
  };
  const cDirty = company && Object.keys(companyChanges().out).length + Object.keys(companyChanges().errs).length > 0;

  const saveCompany = async (e) => {
    e.preventDefault();
    if (cSaving) return;
    const { out, errs } = companyChanges();
    setCErrors(errs);
    setCError(null);
    if (Object.keys(errs).length || !Object.keys(out).length) return;
    setCSaving(true);
    try {
      const res = await saveCompanySettings(out);
      const next = res && typeof res === "object" ? { ...company, ...res } : { ...company, ...out };
      setCompany(next);
      setCForm(companyForm(next));
      toast.success("Company settings saved");
    } catch (err) {
      const info = errorInfo(err, "Could not save the company settings.");
      const field = info.details?.field;
      if (info.code === "VALIDATION" && field && field in cForm) setCErrors({ [field]: info.message });
      else setCError(info.message);
    } finally {
      setCSaving(false);
    }
  };

  // ── Hotel ──────────────────────────────────────────────────────────────────
  const hotelChanges = () => {
    const out = {};
    const errs = {};
    const base = hotelForm(hotel);
    const code = hForm.docCode.trim();
    if (code !== base.docCode) {
      if (code && !DOC_CODE.test(code)) errs.docCode = "Use up to 20 letters, numbers, - or _";
      else out.docCode = code || null;
    }
    if (hForm.includeGstInCost !== base.includeGstInCost) {
      out.includeGstInCost = hForm.includeGstInCost === "" ? null : hForm.includeGstInCost === "yes";
    }
    return { out, errs };
  };
  const hDirty = hotel && Object.keys(hotelChanges().out).length + Object.keys(hotelChanges().errs).length > 0;

  const saveHotel = async (e) => {
    e.preventDefault();
    if (hSaving) return;
    const { out, errs } = hotelChanges();
    setHErrors(errs);
    setHError(null);
    if (Object.keys(errs).length || !Object.keys(out).length) return;
    setHSaving(true);
    try {
      const res = await saveHotelSettings(hotelId, out);
      const next = res && typeof res === "object" ? res : { ...hotel, ...out };
      setHotel(next);
      setHForm(hotelForm(next));
      toast.success(`Settings saved for ${hotelName || "this hotel"}`);
    } catch (err) {
      const info = errorInfo(err, "Could not save this hotel's settings.");
      const field = info.details?.field;
      if (field && field in hForm) setHErrors({ [field]: info.message });
      else setHError(info.message);
    } finally {
      setHSaving(false);
    }
  };

  const readOnly = !canAdmin;
  const companyReadOnly = !canAdminCompany;
  const companyGst = company ? (company.includeGstInCost ? "include GST" : "exclude GST") : "";

  return (
    <div className={r.stack}>
      {readOnly && companyReadOnly && (
        <p className={r.meta} style={{ margin: 0 }}>Only an inventory admin can change these settings.</p>
      )}

      <section className={r.card}>
        <div className={r.cardHead}>
          <h2 className={r.cardTitle}>Company settings</h2>
        </div>
        {cLoadError ? (
          <div className={r.emptyState} role="alert">
            <div className={r.emptyTitle}>{cLoadError}</div>
            <button type="button" className={`${r.btn} ${r.btnSecondary}`} style={{ marginTop: 12 }} onClick={loadCompany}>
              <RefreshCw size={14} aria-hidden="true" /> Try again
            </button>
          </div>
        ) : !company ? (
          <div className={r.cardBody} aria-busy="true">
            {[0, 1, 2].map((i) => <span key={i} className={r.sk} style={{ width: `${85 - i * 12}%`, marginBottom: 14 }} />)}
          </div>
        ) : (
          <form className={r.cardBody} aria-label="Company settings" onSubmit={saveCompany} noValidate>
            {COMPANY_TOGGLES.map((t) => (
              <Toggle
                key={t.key}
                id={`cs-${t.key}`}
                title={t.title}
                help={t.help}
                checked={cForm[t.key]}
                disabled={companyReadOnly || cSaving}
                onChange={(e) => setCForm((f) => ({ ...f, [t.key]: e.target.checked }))}
              />
            ))}
            <div className={r.formGrid} style={{ marginTop: 14 }}>
              <div className={s.fieldRow}>
                <label className={r.label} htmlFor="cs-tol">Over-receipt tolerance (%)</label>
                <input
                  id="cs-tol"
                  className={`${r.input} ${cErrors.overReceiptTolerancePct ? r.inputInvalid : ""}`}
                  inputMode="decimal"
                  value={cForm.overReceiptTolerancePct}
                  disabled={companyReadOnly || cSaving}
                  aria-invalid={cErrors.overReceiptTolerancePct ? "true" : undefined}
                  onChange={(e) => setCForm((f) => ({ ...f, overReceiptTolerancePct: e.target.value }))}
                />
                <div className={r.fieldHint}>How much over the PO qty a receipt may take. Items can set their own.</div>
                {cErrors.overReceiptTolerancePct && <div className={s.fieldError}>{cErrors.overReceiptTolerancePct}</div>}
              </div>
              <div className={s.fieldRow}>
                <label className={r.label} htmlFor="cs-limit">Adjustment auto-approve limit (₹)</label>
                <input
                  id="cs-limit"
                  className={`${r.input} ${cErrors.adjustmentAutoApproveLimit ? r.inputInvalid : ""}`}
                  inputMode="decimal"
                  value={cForm.adjustmentAutoApproveLimit}
                  disabled={companyReadOnly || cSaving}
                  aria-invalid={cErrors.adjustmentAutoApproveLimit ? "true" : undefined}
                  onChange={(e) => setCForm((f) => ({ ...f, adjustmentAutoApproveLimit: e.target.value }))}
                />
                <div className={r.fieldHint}>Adjustments worth up to this post at once. 0 sends every adjustment for approval.</div>
                {cErrors.adjustmentAutoApproveLimit && <div className={s.fieldError}>{cErrors.adjustmentAutoApproveLimit}</div>}
              </div>
            </div>
            {cError && <div className={r.formError} role="alert">{cError}</div>}
            {!companyReadOnly && (
              <div style={{ marginTop: 14 }}>
                <button type="submit" className={`${r.btn} ${r.btnPrimary}`} disabled={cSaving || !cDirty}>
                  {cSaving ? <Loader2 size={14} className={r.spin} aria-hidden="true" /> : <Save size={14} aria-hidden="true" />}
                  Save company settings
                </button>
              </div>
            )}
          </form>
        )}
      </section>

      {hotelId && (
        <section className={r.card}>
          <div className={r.cardHead}>
            <h2 className={r.cardTitle}>Settings at {hotelName || "this hotel"}</h2>
          </div>
          {hLoadError ? (
            <div className={r.emptyState} role="alert">
              <div className={r.emptyTitle}>{hLoadError}</div>
              <button type="button" className={`${r.btn} ${r.btnSecondary}`} style={{ marginTop: 12 }} onClick={loadHotel}>
                <RefreshCw size={14} aria-hidden="true" /> Try again
              </button>
            </div>
          ) : !hotel ? (
            <div className={r.cardBody} aria-busy="true">
              {[0, 1].map((i) => <span key={i} className={r.sk} style={{ width: `${80 - i * 15}%`, marginBottom: 14 }} />)}
            </div>
          ) : (
            <form className={r.cardBody} aria-label="Hotel settings" onSubmit={saveHotel} noValidate>
              <p className={r.meta} style={{ marginTop: 0 }}>
                {hotel.stockStartedAt ? `Stock started ${fmtInstant(hotel.stockStartedAt)}` : "Stock not started yet: run an opening count or import opening stock."}
              </p>
              <div className={r.formGrid}>
                <div className={s.fieldRow}>
                  <label className={r.label} htmlFor="hs-code">Document code</label>
                  <input
                    id="hs-code"
                    className={`${r.input} ${hErrors.docCode ? r.inputInvalid : ""}`}
                    value={hForm.docCode}
                    maxLength={20}
                    placeholder={hotel.effectiveDocCode || String(hotelId)}
                    disabled={readOnly || hSaving}
                    aria-invalid={hErrors.docCode ? "true" : undefined}
                    onChange={(e) => setHForm((f) => ({ ...f, docCode: e.target.value }))}
                  />
                  <div className={r.fieldHint}>
                    Used in document numbers, e.g. GRN/{hForm.docCode.trim() || hotel.effectiveDocCode || hotelId}/2026-27/00012. Blank uses the hotel id.
                  </div>
                  {hErrors.docCode && <div className={s.fieldError}>{hErrors.docCode}</div>}
                </div>
                <div className={s.fieldRow}>
                  <label className={r.label} htmlFor="hs-gst">GST in stock cost</label>
                  <select
                    id="hs-gst"
                    className={r.select}
                    value={hForm.includeGstInCost}
                    disabled={readOnly || hSaving}
                    onChange={(e) => setHForm((f) => ({ ...f, includeGstInCost: e.target.value }))}
                  >
                    <option value="">Same as company{companyGst ? ` (${companyGst})` : ""}</option>
                    <option value="yes">Include GST</option>
                    <option value="no">Exclude GST</option>
                  </select>
                  {hErrors.includeGstInCost && <div className={s.fieldError}>{hErrors.includeGstInCost}</div>}
                </div>
              </div>
              {hError && <div className={r.formError} role="alert">{hError}</div>}
              {!readOnly && (
                <div style={{ marginTop: 14 }}>
                  <button type="submit" className={`${r.btn} ${r.btnPrimary}`} disabled={hSaving || !hDirty}>
                    {hSaving ? <Loader2 size={14} className={r.spin} aria-hidden="true" /> : <Save size={14} aria-hidden="true" />}
                    Save hotel settings
                  </button>
                </div>
              )}
            </form>
          )}
        </section>
      )}
    </div>
  );
};

export default SettingsTab;
