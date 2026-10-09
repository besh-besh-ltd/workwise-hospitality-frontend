import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { createEntity, lookupCoverageCities, lookupCoverageStates } from "@/services/vendorNetwork";
import NetworkModal from "./NetworkModal";
import { networkErrorMessage } from "./networkErrors";
import { EMAIL_RE, GSTIN_RE, LINKABLE_RELATIONSHIPS, RELATIONSHIP_LABEL, fmtInr } from "./networkFormat";

const EMPTY = { company_name: "", gstin: "", email: "", state_id: "", city_id: "", address: "", relationship: "BRANCH" };

const ERROR_OVERRIDES = {
  EMAIL_EXISTS: "This email is already used by a Workwise account. Use a different email, or link that account instead.",
};

function validate(form) {
  const errors = {};
  if (!form.company_name.trim()) errors.company_name = "Enter the company name.";
  if (!GSTIN_RE.test(form.gstin.trim())) errors.gstin = "Enter a valid 15-character GSTIN (e.g. 27ABCDE1234F1Z5).";
  if (!EMAIL_RE.test(form.email.trim())) errors.email = "Enter a valid email address.";
  if (!form.state_id) errors.state_id = "Pick a state.";
  return errors;
}

/**
 * "Create branch / distributor" (spec §5): a new vendor login for an entity
 * that has no Workwise account yet. It joins the network at once; its seat is
 * active, or pending payment when a seat fee applies.
 */
export default function CreateEntityModal({ onClose, onCreated }) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    lookupCoverageStates()
      .then((res) => !cancelled && setStates(res?.data || []))
      .catch(() => !cancelled && setStates([]));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!form.state_id) {
      setCities([]);
      return undefined;
    }
    let cancelled = false;
    lookupCoverageCities(Number(form.state_id))
      .then((res) => !cancelled && setCities(res?.data || []))
      .catch(() => !cancelled && setCities([]));
    return () => {
      cancelled = true;
    };
  }, [form.state_id]);

  const set = (key) => (e) => {
    const value = key === "gstin" ? e.target.value.toUpperCase() : e.target.value;
    setForm((f) => ({ ...f, [key]: value, ...(key === "state_id" ? { city_id: "" } : {}) }));
  };

  const submit = async () => {
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length) return;

    setBusy(true);
    try {
      const res = await createEntity({
        company_name: form.company_name.trim(),
        gstin: form.gstin.trim(),
        email: form.email.trim(),
        state_id: Number(form.state_id),
        city_id: form.city_id ? Number(form.city_id) : null,
        address: form.address.trim() || null,
        relationship: form.relationship,
      });
      toast.success(res?.message || "Entity created");
      const seat = res?.data?.seat;
      if (seat?.payable) {
        toast.info(`A seat fee of ${fmtInr(seat.amount)} is due before this entity can operate. Use "Pay for seats".`);
      }
      onCreated?.();
    } catch (err) {
      toast.error(networkErrorMessage(err, "Could not create the entity.", ERROR_OVERRIDES));
      setBusy(false);
    }
  };

  const fieldError = (key) =>
    errors[key] ? (
      <div className="help-text" style={{ color: "var(--danger)" }}>
        {errors[key]}
      </div>
    ) : null;

  return (
    <NetworkModal
      title="Create branch / distributor"
      sub="Creates a new vendor login for this entity and adds it to your network."
      size="lg"
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="btn btn-blue" onClick={submit} disabled={busy}>
            {busy ? "Creating…" : "Create entity"}
          </button>
        </>
      }
    >
      <div className="form-grid">
        <div className="span-2">
          <label className="label" htmlFor="vn-ce-name">Company name</label>
          <input id="vn-ce-name" className="input" maxLength={255} value={form.company_name} onChange={set("company_name")} />
          {fieldError("company_name")}
        </div>
        <div>
          <label className="label" htmlFor="vn-ce-gstin">GSTIN</label>
          <input id="vn-ce-gstin" className="input mono" maxLength={15} value={form.gstin} onChange={set("gstin")} placeholder="27ABCDE1234F1Z5" />
          {fieldError("gstin")}
        </div>
        <div>
          <label className="label" htmlFor="vn-ce-email">Login email</label>
          <input id="vn-ce-email" className="input" type="email" maxLength={255} value={form.email} onChange={set("email")} />
          {fieldError("email")}
        </div>
        <div>
          <label className="label" htmlFor="vn-ce-state">State</label>
          <select id="vn-ce-state" className="select" value={form.state_id} onChange={set("state_id")}>
            <option value="">Select a state</option>
            {states.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          {fieldError("state_id")}
        </div>
        <div>
          <label className="label" htmlFor="vn-ce-city">City (optional)</label>
          <select id="vn-ce-city" className="select" value={form.city_id} onChange={set("city_id")} disabled={!form.state_id}>
            <option value="">{form.state_id ? "Select a city" : "Pick a state first"}</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="span-2">
          <label className="label" htmlFor="vn-ce-address">Address (optional)</label>
          <textarea id="vn-ce-address" className="textarea" value={form.address} onChange={set("address")} />
        </div>
        <div>
          <label className="label" htmlFor="vn-ce-rel">Relationship</label>
          <select id="vn-ce-rel" className="select" value={form.relationship} onChange={set("relationship")}>
            {LINKABLE_RELATIONSHIPS.map((r) => (
              <option key={r} value={r}>{RELATIONSHIP_LABEL[r]}</option>
            ))}
          </select>
        </div>
      </div>
    </NetworkModal>
  );
}
