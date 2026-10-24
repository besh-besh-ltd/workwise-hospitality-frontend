import React, { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { UserPlus } from "lucide-react";
import { getPoDetails, handleAddSiteRep } from "@/services/po";
import { revokeSiteRep } from "@/services/inventory";
import { getApiErrorMessage } from "@/utils/apiError";
import ConfirmationModal from "@/components/modal/ConfirmationModal";
import po from "../PurchaseOrders.module.scss";
import { fmtDateOnly, fmtDateTime } from "../shared";
import s from "./deliveries.module.scss";

/*
  Site representatives: hotel staff outside the system who receive this PO
  through an emailed link (spec §6.9). The live links come from GET /po/:po_id
  (`site_reps`, the predicate token auth uses). A multi-hotel PO needs the
  hotel the person receives at: the server refuses without it, and issuing a
  link at a hotel replaces that hotel's previous link.

  Adding and revoking are gated on `canManage`; the server's gate is
  grn.create at the link's hotel, which is the Deliveries `can.receive` flag.

  Props: poId, hotels [{id, name}], canManage, canAdd (false once the PO is
  fully received or closed: the server refuses a new link then).
*/

const EMPTY = { name: "", email: "", phone: "", hotelId: "" };

export default function SiteRepPanel({ poId, hotels = [], canManage = false, canAdd = true }) {
  const [reps, setReps] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState(null);
  const [revoking, setRevoking] = useState(null);

  const multiHotel = hotels.length > 1;
  const hotelName = (id) => hotels.find((h) => h.id === Number(id))?.name || null;

  const load = useCallback(async () => {
    try {
      const data = await getPoDetails(poId);
      setReps(Array.isArray(data?.site_reps) ? data.site_reps : []);
      setLoadError(null);
    } catch (err) {
      setLoadError(getApiErrorMessage(err, "Couldn't load site representatives."));
    }
  }, [poId]);

  useEffect(() => {
    if (poId) load();
  }, [poId, load]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const filled = form.name.trim() && form.email.trim() && form.phone.trim();
  const canSend = !!filled && (!multiHotel || !!form.hotelId) && !busy;
  const replaces = (reps || []).find((r) => multiHotel && form.hotelId && Number(r.hotel_id) === Number(form.hotelId));

  const submit = async (e) => {
    e.preventDefault();
    if (!canSend) return;
    setBusy(true);
    setFormError(null);
    const payload = { po_id: poId };
    if (multiHotel) payload.hotel_id = Number(form.hotelId);
    payload.name = form.name.trim();
    payload.email = form.email.trim();
    payload.phone = form.phone.trim();
    try {
      const res = await handleAddSiteRep(payload);
      if (res?.data?.email_sent === false) toast.warn(res?.message || "Site representative added, but the email could not be sent.");
      else toast.success(res?.message || "Site representative added.");
      setAdding(false);
      setForm(EMPTY);
      load();
    } catch (err) {
      setFormError(getApiErrorMessage(err, "Couldn't add the site representative."));
    } finally {
      setBusy(false);
    }
  };

  const revoke = async () => {
    const rep = revoking;
    try {
      await revokeSiteRep(poId, rep.id);
      toast.success(`${rep.name}'s link no longer works.`);
      load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Couldn't revoke the link."));
    } finally {
      setRevoking(null);
    }
  };

  return (
    <section className={po.sectionCard} aria-labelledby="po-site-reps-heading">
      <div className={po.sectionHead}>
        <div className={po.hLeft}>
          <div className={po.ic}>
            <UserPlus size={13} />
          </div>
          <h2 id="po-site-reps-heading">Site representatives</h2>
        </div>
        {canManage && canAdd && !adding && (
          <button type="button" className={`${po.btn} ${po.btnSecondary} ${po.btnSm}`} onClick={() => setAdding(true)}>
            Add site rep
          </button>
        )}
      </div>

      {loadError ? (
        <div className={s.sectionPad}>
          <div className={s.errorText}>{loadError}</div>
        </div>
      ) : reps === null ? (
        <div className={s.sectionPad}>
          <div className={s.muted}>Loading…</div>
        </div>
      ) : reps.length === 0 ? (
        <div className={s.sectionPad}>
          <div className={s.muted}>
            Nobody outside the system can receive this PO. Add someone at the hotel and they get a receiving link by email.
          </div>
        </div>
      ) : (
        <div className={s.list}>
          {reps.map((r) => {
            const where = r.hotel_id != null ? hotelName(r.hotel_id) || `Hotel #${r.hotel_id}` : null;
            return (
              <div key={r.id} className={s.listRow}>
                <div className={s.lMain}>
                  <div className={s.lTitle}>{r.name}</div>
                  <div className={s.lSub}>
                    {[r.email, r.phone].filter(Boolean).join(" · ")}
                  </div>
                  <div className={s.lSub}>
                    {where ? `${where} · ` : ""}Link expires {fmtDateOnly(r.expires_at)}
                  </div>
                  <div className={s.lSub}>
                    {r.last_used_at ? `Last used ${fmtDateTime(r.last_used_at)}` : "Not used yet"}
                  </div>
                </div>
                {canManage && (
                  <div className={s.lRight}>
                    <button
                      type="button"
                      className={s.linkBtn}
                      aria-label={`Revoke ${r.name}'s link`}
                      onClick={() => setRevoking(r)}
                    >
                      Revoke
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {adding && (
        <form className={s.repForm} onSubmit={submit} noValidate>
          {multiHotel && (
            <label>
              Hotel
              <select className={s.textInput} value={form.hotelId} onChange={set("hotelId")}>
                <option value="">Choose the hotel they receive at…</option>
                {hotels.map((h) => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </select>
            </label>
          )}
          <label>
            Name
            <input type="text" className={s.textInput} value={form.name} onChange={set("name")} maxLength={200} autoComplete="off" />
          </label>
          <label>
            Email
            <input type="email" className={s.textInput} value={form.email} onChange={set("email")} maxLength={300} autoComplete="off" />
          </label>
          <label>
            Phone
            <input type="tel" className={s.textInput} value={form.phone} onChange={set("phone")} maxLength={15} autoComplete="off" />
          </label>
          {replaces && (
            <div className={s.muted}>
              {replaces.name}&apos;s link at {hotelName(form.hotelId)} stops working when this one is sent.
            </div>
          )}
          {formError && (
            <div className={s.errorText} role="alert">
              {formError}
            </div>
          )}
          <div className={s.repActions}>
            <button
              type="button"
              className={`${po.btn} ${po.btnGhost} ${po.btnSm}`}
              onClick={() => {
                setAdding(false);
                setForm(EMPTY);
                setFormError(null);
              }}
              disabled={busy}
            >
              Cancel
            </button>
            <button type="submit" className={`${po.btn} ${po.btnPrimary} ${po.btnSm}`} disabled={!canSend}>
              {busy ? "Sending…" : "Send link"}
            </button>
          </div>
        </form>
      )}

      <ConfirmationModal
        isOpen={!!revoking}
        onClose={() => setRevoking(null)}
        onConfirm={revoke}
        title="Revoke receiving link"
        description={
          revoking
            ? `${revoking.name}'s link stops working now. They can't record receipts for this PO unless you add them again.`
            : ""
        }
        confirmButtonColor="danger"
        confirmButtonText="Revoke link"
        cancelButtonText="Cancel"
      />
    </section>
  );
}
