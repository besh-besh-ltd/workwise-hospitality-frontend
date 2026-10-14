// One line's specification, clauses and attachments — read-only for everyone,
// editable for a technical reviewer of the line (capabilities.review.can_edit_lines).
// Every edit goes through the page's `run` (toast + refetch + error handling);
// every control is disabled while any PR call is in flight (`busy`).

import { useRef, useState } from "react";
import * as PrApi from "@/services/pr";
import { handleUploadFile } from "@/services/rfq";
import { ATTACHMENT_KIND_LABEL, fmtDateTime, sameUser } from "./prDetail";

const SPEC_MAX = 1000;
const CLAUSE_MAX = 2000;
const WEIGHT_RE = /^\d{1,3}$/;
const muted = { fontSize: 11.5, color: "var(--fg-3)" };
const errStyle = { color: "var(--danger)", fontSize: 11.5, marginTop: 4 };

const weightageText = (w) => {
  if (w === null || w === undefined || w === "") return null;
  const n = Number(w);
  return Number.isFinite(n) ? `${Number.isInteger(n) ? n : n.toFixed(2)}%` : String(w);
};

function SpecBlock({ prId, line, canEdit, run, busy }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const tooLong = value.length > SPEC_MAX;

  const save = async () => {
    const ok = await run(() => PrApi.updateLineSpec(prId, line.id, value.trim() || null), { success: "Specification updated" });
    if (ok) setEditing(false);
  };

  return (
    <div>
      <div className="section-label" style={{ marginBottom: 6 }}>Specification</div>
      {!editing && (
        <>
          <div style={{ fontSize: 13, color: line.specification ? "var(--fg-2)" : "var(--fg-4)", whiteSpace: "pre-wrap", lineHeight: 1.55 }}>
            {line.specification || "No specification yet."}
          </div>
          {canEdit && (
            <button type="button" className="btn btn-secondary btn-sm" style={{ marginTop: 8 }} disabled={busy}
              onClick={() => { setValue(line.specification || ""); setEditing(true); }}>
              Edit specification
            </button>
          )}
        </>
      )}
      {editing && (
        <div>
          <textarea className="textarea" aria-label={`Specification for item ${line.line_no}`} value={value}
            onChange={(e) => setValue(e.target.value)} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6, gap: 8 }}>
            <span className="fs-11" style={{ color: tooLong ? "var(--danger)" : "var(--fg-4)" }}>{value.length}/{SPEC_MAX}</span>
            <span style={{ display: "flex", gap: 8 }}>
              <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => setEditing(false)}>Discard</button>
              <button type="button" className="btn btn-blue btn-sm" disabled={busy || tooLong} onClick={save}>Save specification</button>
            </span>
          </div>
          <div style={muted}>The requester and approvers see your change in the timeline, with the old text.</div>
        </div>
      )}
    </div>
  );
}

function ClauseBlock({ prId, line, canEdit, run, busy }) {
  const [text, setText] = useState("");
  const [type, setType] = useState("clause");
  const [weight, setWeight] = useState("");
  const [err, setErr] = useState("");
  const clauses = line.clauses || [];

  const add = async () => {
    const clauseText = text.trim();
    if (!clauseText) { setErr("Write the clause"); return; }
    if (clauseText.length > CLAUSE_MAX) { setErr(`A clause can be at most ${CLAUSE_MAX} characters`); return; }
    const w = weight.trim();
    if (w !== "" && (!WEIGHT_RE.test(w) || Number(w) > 100)) { setErr("Weightage is a whole number from 0 to 100"); return; }
    setErr("");
    const ok = await run(
      () => PrApi.addClause(prId, line.id, { clause_text: clauseText, clause_type: type, weightage: w === "" ? null : Number(w) }),
      { success: "Clause added" },
    );
    if (ok) { setText(""); setType("clause"); setWeight(""); }
  };

  return (
    <div>
      <div className="section-label" style={{ marginBottom: 6 }}>Technical clauses</div>
      {clauses.length === 0 && <div style={muted}>No clauses.</div>}
      {clauses.map((c, i) => (
        <div key={c.id} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "6px 0", borderTop: i ? "1px dashed var(--border)" : "none" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, color: "var(--fg)", whiteSpace: "pre-wrap" }}>{c.clause_text}</div>
            <div style={muted}>
              {c.clause_type === "sampling" ? "Sampling" : "Clause"}
              {weightageText(c.weightage) ? ` · weight ${weightageText(c.weightage)}` : ""}
              {c.added_by_name ? ` · added by ${c.added_by_name}` : ""}
            </div>
          </div>
          {canEdit && (
            <button type="button" className="btn btn-ghost btn-sm" aria-label={`Remove clause ${i + 1}`} disabled={busy}
              onClick={() => run(() => PrApi.deleteClause(prId, line.id, c.id), { success: "Clause removed" })}>
              Remove
            </button>
          )}
        </div>
      ))}
      {canEdit && (
        <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "1fr 130px 100px auto", gap: 8, alignItems: "end" }}>
          <div>
            <label className="label" htmlFor={`clause-text-${line.id}`}>Clause text</label>
            <input id={`clause-text-${line.id}`} aria-label="Clause text" className="input" value={text}
              placeholder="e.g. 600 GSM minimum, ISI marked" onChange={(e) => setText(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor={`clause-type-${line.id}`}>Type</label>
            <select id={`clause-type-${line.id}`} aria-label="Clause type" className="select" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="clause">Clause</option>
              <option value="sampling">Sampling</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor={`clause-weight-${line.id}`}>Weight %</label>
            <input id={`clause-weight-${line.id}`} aria-label="Weightage" className="input" inputMode="numeric" value={weight}
              placeholder="0–100" onChange={(e) => setWeight(e.target.value)} />
          </div>
          <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={add}>Add clause</button>
        </div>
      )}
      {err && <div style={errStyle}>{err}</div>}
    </div>
  );
}

/**
 * Attachment list + (when `canEdit`) a kind picker and file input. Used for a
 * line (prLineId = line id) or the PR header (prLineId = null). Remove shows
 * only on files the viewer may remove: their own uploads, or any file when
 * the viewer is the requester (the server's rule).
 */
export function AttachmentBlock({ prId, prLineId, attachments, canEdit, run, busy, meId, raisedBy, title = "Attachments" }) {
  const [kind, setKind] = useState("spec");
  const [uploading, setUploading] = useState(false);
  const [failed, setFailed] = useState(null); // the File that did not attach — kept for "Try again"
  const fileRef = useRef(null);
  const key = prLineId ?? "pr";
  const mayRemove = (a) => canEdit && (sameUser(a.uploaded_by, meId) || sameUser(raisedBy, meId));

  const attach = async (file) => {
    setUploading(true);
    const ok = await run(async () => {
      const up = await handleUploadFile(file);
      const row = up?.data?.[0];
      if (!row?.file_path) throw new Error("The file didn't upload. Try again.");
      return PrApi.addAttachment(prId, { pr_line_id: prLineId, kind, file_url: row.file_path, file_name: row.file_name || file.name });
    }, { success: "File attached" });
    setUploading(false);
    if (ok) {
      setFailed(null);
      if (fileRef.current) fileRef.current.value = "";
    } else {
      setFailed(file);
    }
  };

  const onFile = (e) => {
    const file = e.target.files?.[0];
    if (file) attach(file);
  };

  return (
    <div>
      <div className="section-label" style={{ marginBottom: 6 }}>{title}</div>
      {(attachments || []).length === 0 && <div style={muted}>No files.</div>}
      {(attachments || []).map((a) => (
        <div key={a.id} style={{ display: "flex", gap: 10, alignItems: "center", padding: "4px 0" }}>
          <a className="file-chip-mini" href={a.file_url} target="_blank" rel="noopener noreferrer">{a.file_name}</a>
          <span style={muted}>
            {ATTACHMENT_KIND_LABEL[a.kind] || a.kind}
            {a.uploaded_by_name ? ` · ${a.uploaded_by_name}` : ""}
            {a.created_at ? ` · ${fmtDateTime(a.created_at)}` : ""}
          </span>
          {mayRemove(a) && (
            <button type="button" className="btn btn-ghost btn-sm" aria-label={`Remove ${a.file_name}`} disabled={busy}
              onClick={() => run(() => PrApi.deleteAttachment(prId, a.id), { success: "File removed" })}>
              Remove
            </button>
          )}
        </div>
      ))}
      {canEdit && (
        <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <select aria-label="File type" className="select" style={{ width: 150 }} value={kind} disabled={busy} onChange={(e) => setKind(e.target.value)}>
            {Object.entries(ATTACHMENT_KIND_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <input id={`pr-file-${key}`} ref={fileRef} type="file" aria-label="Attach a file" disabled={busy || uploading} onChange={onFile}
            style={{ fontSize: 12 }} />
          {uploading && <span style={muted}>Uploading…</span>}
          {failed && !uploading && (
            <button type="button" className="btn btn-secondary btn-sm" aria-label={`Try ${failed.name} again`} disabled={busy}
              onClick={() => attach(failed)}>
              Try again
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function PrLineWork({ prId, line, canEdit, run, busy, meId, raisedBy }) {
  return (
    <div data-testid={`line-work-${line.id}`} style={{ display: "grid", gap: 16, padding: "14px 16px", background: "var(--surface-2)" }}>
      {canEdit && (
        <div className="guide" style={{ padding: "8px 12px" }}>
          <div>You review this item. Tighten the specification, add clauses and attach datasheets before you complete your review.</div>
        </div>
      )}
      <SpecBlock prId={prId} line={line} canEdit={canEdit} run={run} busy={busy} />
      {line.suggested_vendor_note && (
        <div>
          <div className="section-label" style={{ marginBottom: 6 }}>Suggested vendor</div>
          <div style={{ fontSize: 13, color: "var(--fg-2)", whiteSpace: "pre-wrap" }}>{line.suggested_vendor_note}</div>
        </div>
      )}
      <ClauseBlock prId={prId} line={line} canEdit={canEdit} run={run} busy={busy} />
      <AttachmentBlock prId={prId} prLineId={line.id} attachments={line.attachments} canEdit={canEdit} run={run} busy={busy}
        meId={meId} raisedBy={raisedBy} />
    </div>
  );
}
