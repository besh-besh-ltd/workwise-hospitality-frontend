import React, { useState } from "react";
import { toast } from "react-toastify";
import { UserPlus } from "lucide-react";
import { handleAddSiteRep } from "@/services/po";
import { revokeSiteRep } from "@/services/inventory";
import { getApiErrorMessage } from "@/utils/apiError";
import ConfirmationModal from "@/components/modal/ConfirmationModal";
import po from "../PurchaseOrders.module.scss";
import { fmtDateOnly, fmtDateTime } from "../shared";
import s from "./deliveries.module.scss";

/*
  Site representatives: hotel staff outside the system who receive this PO
  through an emailed link (spec §6.9). The links come with the Deliveries
  payload (`siteReps`, no token); `live` is the predicate token auth uses.

  Who may add or revoke is the server's: `can.manageSiteRep`, at the hotels
  in `can.siteRepHotelIds` (grn.create there). Only those hotels are offered,
  and only links at those hotels can be revoked. A multi-hotel PO needs the
  hotel the person receives at; issuing a link at a hotel replaces that
  hotel's previous link.

  Props:
    poId, hotels [{id, name}]   the PO's hotels
    siteReps                    the payload's siteReps
    canManage                   can.manageSiteRep
    hotelIds                    can.siteRepHotelIds
    canAdd                      false once nothing is left to receive
    onChanged()                 reload the tab after an add or a revoke
*/

const EMPTY = { name: "", email: "", phone: "", hotelId: "" };
const PAST_SHOWN = 5;

export default function SiteRepPanel({ poId, hotels = [], siteReps = [], canManage = false, hotelIds = [], canAdd = true, onChanged }) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState(null);
  const [revoking, setRevoking] = useState(null);

  const multiHotel = hotels.length > 1;
  const choices = hotels.filter((h) => hotelIds.includes(h.id));
  const hotelName = (id) => hotels.find((h) => h.id === Number(id))?.name || null;
  const mayRevoke = (r) => canManage && (r.hotelId == null ? hotelIds.length > 0 : hotelIds.includes(r.hotelId));

  const live = siteReps.filter((r) => r.live);
  const past = siteReps.filter((r) => !r.live).slice(0, PAST_SHOWN);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const filled = form.name.trim() && form.email.trim() && form.phone.trim();
  const canSend = !!filled && (!multiHotel || !!form.hotelId) && !busy;
  const replaces = multiHotel && form.hotelId ? live.find((r) => r.hotelId === Number(form.hotelId)) : null;

  const openForm = () => {
    // One hotel to choose from: choose it.
    setForm({ ...EMPTY, hotelId: multiHotel && choices.length === 1 ? String(choices[0].id) : "" });
    setFormError(null);
    setAdding(true);
  };

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
      onChanged?.();
    } catch (err) {
      setFormError(getApiErrorMessage(err, "Couldn't add the site representative."));
    } finally {
      setBusy(false);
    }
  };

  const revoke = async () => {
    const rep = revoking;
    try {
      await revokeSiteRep(poId, rep.tokenId);
      toast.success(`${rep.name}'s link no longer works.`);
      onChanged?.();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Couldn't revoke the link."));
    } finally {
      setRevoking(null);
    }
  };

  const where = (r) => (r.hotelId != null ? r.hotelName || hotelName(r.hotelId) || `Hotel #${r.hotelId}` : null);

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
          <button type="button" className={`${po.btn} ${po.btnSecondary} ${po.btnSm} ${s.act}`} onClick={openForm}>
            Add site rep
          </button>
        )}
      </div>

      {live.length === 0 ? (
        <div className={s.sectionPad}>
          <div className={s.muted}>
            Nobody outside the system can receive this PO. Add someone at the hotel and they get a receiving link by email.
          </div>
        </div>
      ) : (
        <div className={s.list}>
          {live.map((r) => (
            <div key={r.tokenId} className={s.listRow}>
              <div className={s.lMain}>
                <div className={s.lTitle}>{r.name}</div>
                <div className={s.lSub}>{[r.email, r.phone].filter(Boolean).join(" · ")}</div>
                <div className={s.lSub}>
                  {where(r) ? `${where(r)} · ` : ""}Link expires {fmtDateOnly(r.expiresAt)}
                </div>
                <div className={s.lSub}>{r.lastUsedAt ? `Last used ${fmtDateTime(r.lastUsedAt)}` : "Not used yet"}</div>
              </div>
              {mayRevoke(r) && (
                <div className={s.lRight}>
                  <button
                    type="button"
                    className={`${s.linkBtn} ${s.act}`}
                    aria-label={`Revoke ${r.name}'s link`}
                    onClick={() => setRevoking(r)}
                  >
                    Revoke
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {past.length > 0 && (
        <div className={s.list} aria-label="Links that no longer work">
          {past.map((r) => (
            <div key={r.tokenId} className={`${s.listRow} ${s.pastRow}`}>
              <div className={s.lMain}>
                <div className={s.lTitle}>{r.name}</div>
                <div className={s.lSub}>
                  {[where(r), r.revoked ? "Revoked" : "No longer works"].filter(Boolean).join(" · ")}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {adding && (
        <form className={s.repForm} onSubmit={submit} noValidate>
          {multiHotel && (
            <label>
              Hotel
              <select className={s.textInput} value={form.hotelId} onChange={set("hotelId")}>
                <option value="">Choose the hotel they receive at…</option>
                {choices.map((h) => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </select>
            </label>
          )}
          <label>
            Name
            <input type="text" className={s.textInput} value={form.name} onChange={set("name")} maxLength={99} autoComplete="off" />
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
              className={`${po.btn} ${po.btnGhost} ${po.btnSm} ${s.act}`}
              onClick={() => {
                setAdding(false);
                setForm(EMPTY);
                setFormError(null);
              }}
              disabled={busy}
            >
              Cancel
            </button>
            <button type="submit" className={`${po.btn} ${po.btnPrimary} ${po.btnSm} ${s.act}`} disabled={!canSend}>
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
