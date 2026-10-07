import React, { useState } from "react";
import { toast } from "react-toastify";
import { inviteMember, updateMember } from "@/services/vendorNetwork";
import NetworkModal from "./NetworkModal";
import { networkErrorMessage } from "./networkErrors";
import { EMAIL_RE, RELATIONSHIP_LABEL, ROLE_LABEL } from "./networkFormat";

const ERROR_OVERRIDES = {
  EMAIL_EXISTS: "This email already belongs to a Workwise account that isn't a network login. Use a different email.",
};

const entityLabel = (e) =>
  `${e.name} (${RELATIONSHIP_LABEL[e.relationship] || e.relationship}${e.status === "SUSPENDED" ? ", suspended" : ""})`;

/** Role + (for an entity member) entity selects, shared by invite and edit. */
function RoleEntityFields({ idPrefix, role, entityId, entities, onRole, onEntity, error }) {
  return (
    <>
      <div>
        <label className="label" htmlFor={`${idPrefix}-role`}>Role</label>
        <select id={`${idPrefix}-role`} className="select" value={role} onChange={(e) => onRole(e.target.value)}>
          <option value="ENTITY_MEMBER">{ROLE_LABEL.ENTITY_MEMBER}</option>
          <option value="ORG_ADMIN">{ROLE_LABEL.ORG_ADMIN}</option>
        </select>
        <div className="help-text">
          {role === "ORG_ADMIN"
            ? "Manages the whole network: entities, seats, team, coverage and routing."
            : "Works on the enquiries, quotes and orders of one entity."}
        </div>
      </div>
      {role === "ENTITY_MEMBER" && (
        <div>
          <label className="label" htmlFor={`${idPrefix}-entity`}>Entity</label>
          <select id={`${idPrefix}-entity`} className="select" value={entityId} onChange={(e) => onEntity(e.target.value)}>
            <option value="">Select an entity</option>
            {entities.map((e) => (
              <option key={e.vendor_id} value={e.vendor_id}>{entityLabel(e)}</option>
            ))}
          </select>
          {error && <div className="help-text" style={{ color: "var(--danger)" }}>{error}</div>}
        </div>
      )}
    </>
  );
}

const roleEntityPayload = (role, entityId) =>
  role === "ORG_ADMIN" ? { role } : { role, entity_vendor_id: Number(entityId) };

const modalFooter = ({ onClose, busy, label, busyLabel, onSubmit }) => (
  <>
    <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
    <button type="button" className="btn btn-blue" onClick={onSubmit} disabled={busy}>{busy ? busyLabel : label}</button>
  </>
);

/** Invite a person (spec §5 "People"): they get an email to set a password. */
export function InviteMemberModal({ entities, onClose, onInvited }) {
  const [form, setForm] = useState({ email: "", name: "", role: "ENTITY_MEMBER", entity: "" });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async () => {
    const found = {};
    if (!EMAIL_RE.test(form.email.trim())) found.email = "Enter a valid email address.";
    if (!form.name.trim()) found.name = "Enter the person's name.";
    if (form.role === "ENTITY_MEMBER" && !form.entity) found.entity = "Pick the entity this person works for.";
    setErrors(found);
    if (Object.keys(found).length) return;

    setBusy(true);
    try {
      const res = await inviteMember({
        email: form.email.trim(),
        name: form.name.trim(),
        ...roleEntityPayload(form.role, form.entity),
      });
      toast.success(res?.message || "Invitation sent");
      onInvited?.();
    } catch (err) {
      toast.error(networkErrorMessage(err, "Could not invite this person.", ERROR_OVERRIDES));
      setBusy(false);
    }
  };

  const err = (key) => errors[key] && <div className="help-text" style={{ color: "var(--danger)" }}>{errors[key]}</div>;

  return (
    <NetworkModal
      title="Invite person"
      sub="They get an email with a link to set their password. The link is valid for 72 hours."
      onClose={onClose}
      busy={busy}
      footer={modalFooter({ onClose, busy, label: "Send invitation", busyLabel: "Sending…", onSubmit: submit })}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label className="label" htmlFor="vn-inv-email">Email</label>
          <input id="vn-inv-email" className="input" type="email" maxLength={255} value={form.email} onChange={(e) => set("email", e.target.value)} />
          {err("email")}
        </div>
        <div>
          <label className="label" htmlFor="vn-inv-name">Name</label>
          <input id="vn-inv-name" className="input" maxLength={255} value={form.name} onChange={(e) => set("name", e.target.value)} />
          {err("name")}
        </div>
        <RoleEntityFields
          idPrefix="vn-inv"
          role={form.role}
          entityId={form.entity}
          entities={entities}
          onRole={(v) => set("role", v)}
          onEntity={(v) => set("entity", v)}
          error={errors.entity}
        />
      </div>
    </NetworkModal>
  );
}

/** Change a person's role or entity. */
export function EditMemberModal({ member, entities, onClose, onSaved }) {
  const [role, setRole] = useState(member.role);
  const [entity, setEntity] = useState(member.entity_vendor_id ? String(member.entity_vendor_id) : "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (role === "ENTITY_MEMBER" && !entity) return setError("Pick the entity this person works for.");
    setError("");
    setBusy(true);
    try {
      // An admin covers the whole network, so its entity is cleared explicitly.
      const payload = role === "ORG_ADMIN" ? { role, entity_vendor_id: null } : roleEntityPayload(role, entity);
      const res = await updateMember(member.id, payload);
      toast.success(res?.message || "Person updated");
      onSaved?.();
    } catch (err) {
      toast.error(networkErrorMessage(err, "Could not update this person."));
      setBusy(false);
    }
  };

  return (
    <NetworkModal
      title={`Edit ${member.name || member.email}`}
      sub={member.email}
      onClose={onClose}
      busy={busy}
      footer={modalFooter({ onClose, busy, label: "Save", busyLabel: "Saving…", onSubmit: submit })}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <RoleEntityFields
          idPrefix="vn-edit"
          role={role}
          entityId={entity}
          entities={entities}
          onRole={setRole}
          onEntity={setEntity}
          error={error}
        />
      </div>
    </NetworkModal>
  );
}
