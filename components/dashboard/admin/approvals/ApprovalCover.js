"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { BsPersonCheck } from "react-icons/bs";
import {
  getApprovalDelegations,
  createApprovalDelegation,
  revokeApprovalDelegation,
} from "@/services/approval";
import { getCompanyUsersDetailed } from "@/services/Auth";
import Loader from "@/components/shared/Loader";
import InfoTip from "@/components/shared/InfoTip";
import styles from "./Approvals.module.css";

/**
 * Cover — "while I am away, X approves for me".
 *
 * The platform already ships a system role titled "Proxy Approver" with zero
 * holders and no delegation semantics anywhere behind it: a name promising
 * cover the product did not provide. This is the thing itself.
 *
 * What the screen has to make unmistakable is that cover is *forward-only*. It
 * is applied when an approval is created, so arranging it does not move
 * anything already sitting in somebody's queue — that is what reassignment on
 * the In progress view is for. An admin who expects otherwise will arrange
 * cover, watch nothing move, and conclude the feature is broken.
 */

const asLocalInput = (d) => {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const dateLabel = (iso) =>
  new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const ApprovalCover = () => {
  const [rows, setRows] = useState([]);
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const today = useMemo(() => asLocalInput(new Date()), []);
  const [form, setForm] = useState({ delegator: "", delegate: "", from: "", to: "", reason: "" });

  const load = useCallback(async () => {
    try {
      const [cover, staff] = await Promise.all([
        getApprovalDelegations(),
        getCompanyUsersDetailed({ limit: 500 }),
      ]);
      setRows(cover?.data || []);
      setPeople((staff?.data?.users || staff?.data || []).filter((u) => u.status === 1));
      setError(null);
    } catch (err) {
      setError("Could not load approval cover.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    setBusyId("new");
    try {
      await createApprovalDelegation({
        delegator_user_id: Number(form.delegator),
        delegate_user_id: Number(form.delegate),
        // The window is inclusive of the end date as a person reads it, so it
        // is sent as the start of the following day. "Back on the 20th" and
        // "covered until the 19th" have to mean the same thing.
        starts_at: new Date(`${form.from}T00:00:00`).toISOString(),
        ends_at: new Date(`${form.to}T23:59:59`).toISOString(),
        reason: form.reason.trim() || null,
      });
      toast.success("Cover arranged");
      setForm({ delegator: "", delegate: "", from: "", to: "", reason: "" });
      load();
    } catch (err) {
      toast.error(
        err?.message?.response?.data?.message || "Could not arrange cover"
      );
    } finally {
      setBusyId(null);
    }
  };

  const end = async (id) => {
    setBusyId(id);
    try {
      await revokeApprovalDelegation(id);
      toast.success("Cover ended");
      load();
    } catch (err) {
      toast.error("Could not end this cover");
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <Loader />;
  if (error) return <div className={styles.errorBanner}>{error}</div>;

  const complete =
    form.delegator && form.delegate && form.from && form.to && form.delegator !== form.delegate;

  return (
    <div className={styles.cover}>
      <p className={styles.coverHint}>
        Cover applies to approvals raised from now on. It does not move anything
        already waiting — use <strong>In progress</strong> to reassign those.
        <InfoTip
          label="How cover works"
          text="When an approval is created, the system works out who should approve it. If that person has cover arranged for today, the request goes to whoever is covering instead. Approvals that already exist keep the approvers they were created with."
        />
      </p>

      <div className={styles.coverForm}>
        <label className={styles.reassignField}>
          <span>Who is away</span>
          <select
            value={form.delegator}
            onChange={(e) => setForm((f) => ({ ...f, delegator: e.target.value }))}
          >
            <option value="">Choose a person…</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.reassignField}>
          <span>Who covers</span>
          <select
            value={form.delegate}
            onChange={(e) => setForm((f) => ({ ...f, delegate: e.target.value }))}
          >
            <option value="">Choose a person…</option>
            {people
              .filter((p) => String(p.id) !== form.delegator)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
        </label>

        <label className={styles.reassignField}>
          <span>From</span>
          <input
            type="date"
            min={today}
            value={form.from}
            onChange={(e) => setForm((f) => ({ ...f, from: e.target.value }))}
          />
        </label>

        <label className={styles.reassignField}>
          <span>Until (inclusive)</span>
          <input
            type="date"
            min={form.from || today}
            value={form.to}
            onChange={(e) => setForm((f) => ({ ...f, to: e.target.value }))}
          />
        </label>

        <label className={styles.reassignField}>
          <span>Reason (optional)</span>
          <input
            type="text"
            value={form.reason}
            placeholder="e.g. Annual leave"
            onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
          />
        </label>

        <button
          type="button"
          className={styles.coverConfirm}
          disabled={!complete || busyId === "new"}
          onClick={submit}
        >
          {busyId === "new" ? "Arranging…" : "Arrange cover"}
        </button>
      </div>

      {rows.length === 0 && (
        <div className={styles.emptyState}>
          <BsPersonCheck size={26} />
          <h2>Nobody is covering for anybody</h2>
          <p>Arrange cover above when someone will be away.</p>
        </div>
      )}

      <ul className={styles.stuckList}>
        {rows.map((row) => (
          <li key={row.id} className={styles.stuckRow}>
            <div className={styles.coverRow}>
              <div className={styles.stuckWhat}>
                <span className={styles.stuckEntity}>
                  {row.delegate_name} covers {row.delegator_name}
                </span>
                <span className={styles.stuckUnit}>
                  {dateLabel(row.starts_at)} – {dateLabel(row.ends_at)}
                  {row.reason ? ` · ${row.reason}` : ""}
                </span>
              </div>

              {/* Never colour alone. "Scheduled" and "Active now" are different
                  facts and an admin acts on them differently. */}
              <span
                className={`${styles.coverState} ${
                  row.is_active ? styles.coverStateOn : ""
                }`}
              >
                {row.is_active ? "Active now" : "Scheduled"}
              </span>

              <button
                type="button"
                className={styles.reassignBtn}
                disabled={busyId === row.id}
                onClick={() => end(row.id)}
              >
                {busyId === row.id ? "Ending…" : "End early"}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ApprovalCover;
