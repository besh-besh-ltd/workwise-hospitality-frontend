// "Who must act now" — the band that sits above the comparison grid on the
// buyer's Negotiation & Award tab.
//
// Upper management and moderators read this page to answer one question that
// the grid itself never answers: whose desk is this sitting on right now. The
// page already had two half-answers — a per-product tag that says "Awaiting
// approval from 3 persons" (a count, not names) and a roster strip further up
// that shows three names and a "+4". Neither of those names everybody, and the
// "+4" is exactly what the reader is trying to see. So this band names EVERY
// current action taker, in full, with no preview and no overflow, and when the
// viewer is one of them it says so in words before it says so in colour.
//
// Three rules this file is deliberate about:
//
//   • It renders NOTHING rather than something approximate. `stage_actors` is
//     null before the bid deadline (server-side redaction) and null when the
//     stage has no live actor. Both are real states, and an empty shell that
//     says "current action taker: —" would be a claim the payload does not
//     support. There is no fallback derivation from any other field.
//
//   • "Is it me" is decided on identity, never on a display name. The payload's
//     `is_me` is authoritative when present; without it we compare `user_id`
//     against the signed-in user from redux (`userProfile`, the same source
//     rfq-management-details and the PO pages read), falling back to the
//     redux-persist blob. Two people called "Asha Menon" is not a hypothetical
//     on this tenant, and a name match would tell one of them to act on
//     something that is not theirs.
//
//   • The urgent state is carried by TEXT first. The heading literally reads
//     "You are to take action" and the viewer's own chip is tagged "You"; the
//     amber tint is the second, redundant signal, not the only one. And it is
//     not announced as an alert — this band is on screen from first paint, and
//     a live region would hijack a screen reader on every page view.
import { useContext, useEffect, useState } from "react";
import { ReactReduxContext } from "react-redux";
import { ArrowRight, UserCheck, Users } from "lucide-react";

import styles from "./QuoteComparison.module.scss";

/* ── who is signed in ──────────────────────────────────────────────────── */

const normalizeId = (id) => (id == null || id === "" ? null : String(id));

const idFromProfile = (profile) => normalizeId(profile?.id ?? profile?.user_id ?? null);

const idFromStore = (store) => {
  try {
    return idFromProfile(store?.getState?.()?.userProfile);
  } catch {
    return null;
  }
};

// redux-persist writes each whitelisted slice as its own JSON string inside the
// "persist:root" blob (see redux/store.js — `whitelist: ["userProfile"]`), so
// the value has to be parsed twice. Only ever a fallback: the store is the live
// copy, this is what is left when there is no Provider above us.
const idFromPersistedBlob = () => {
  if (typeof window === "undefined") return null;
  try {
    const root = window.localStorage.getItem("persist:root");
    if (!root) return null;
    const slice = JSON.parse(root)?.userProfile;
    return idFromProfile(typeof slice === "string" ? JSON.parse(slice) : slice);
  } catch {
    return null;
  }
};

const readCurrentUserId = (store) => idFromStore(store) ?? idFromPersistedBlob();

// Reads the signed-in user WITHOUT requiring a <Provider> overhead this
// component cannot guarantee: QuoteComparison is mounted three different ways
// (its own page, a dynamic import inside the RFQ lifecycle page, and directly
// in tests), and `useSelector` throws outright when the context is missing.
// Here a missing store simply means "we do not know who you are", which is a
// state this band already has to survive — `is_me` from the server is the
// primary signal and this is only its fallback.
export function useCurrentUserId() {
  const ctx = useContext(ReactReduxContext);
  const store = ctx?.store || null;
  const [id, setId] = useState(() => readCurrentUserId(store));

  useEffect(() => {
    if (!store) return undefined;
    const sync = () =>
      setId((prev) => {
        const next = readCurrentUserId(store);
        return prev === next ? prev : next;
      });
    // The profile is dispatched by the layout on mount, which can land after
    // this component's first render — so re-read once on subscribe as well.
    sync();
    return store.subscribe(sync);
  }, [store]);

  return id;
}

/* ── reading the payload ───────────────────────────────────────────────── */

// `is_me` wins wherever the server sent it — it is computed against the
// authenticated session and knows about delegation and role expansion that the
// client cannot see. Only when the field is genuinely absent do we fall back to
// identity comparison, and there is no third fallback: a name is never enough.
export const actorIsMe = (actor, meId) => {
  if (typeof actor?.is_me === "boolean") return actor.is_me;
  if (meId == null) return false;
  const uid = normalizeId(actor?.user_id);
  return uid != null && uid === meId;
};

const initialsOf = (name) =>
  String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("") || "?";

const text = (v) => {
  const s = typeof v === "string" ? v.trim() : "";
  return s || null;
};

// ANY and ALL mean genuinely different things to the person reading this — one
// says "you alone can unblock it", the other says "your approval is one of
// several still owed". An absent rule says nothing rather than guessing, and a
// roster of one has no distinction to draw: both rules reduce to "this person
// has to act", which the list above already says.
const ruleSentence = (decisionRule, count) => {
  if (count <= 1) return null;
  const rule = String(decisionRule || "").toUpperCase();
  if (rule === "ANY") return "Any one of them can act — the first decision moves it forward.";
  if (rule === "ALL") return "All of them must act before it moves forward.";
  return null;
};

const joinDot = (...parts) => parts.filter(Boolean).join(" · ");

/* ── the band ──────────────────────────────────────────────────────────── */

function ActorChip({ actor, mine }) {
  const name = text(actor?.name) || "Unnamed user";
  const role = text(actor?.role);
  return (
    <li className={`${styles.saPerson} ${mine ? styles.saPersonMine : ""}`}>
      {/* Decorative only. The full name is always present as text beside it, so
          nothing here is the sole carrier of an identity. */}
      <span className={`${styles.saAvatar} ${styles.mono}`} aria-hidden="true">
        {initialsOf(name)}
      </span>
      <span className={styles.saPersonMeta}>
        <span className={styles.saName}>{name}</span>
        {role ? <span className={styles.saRole}>{role}</span> : null}
      </span>
      {mine ? <span className={styles.saYou}>You</span> : null}
    </li>
  );
}

export default function StageActorBanner({ stageActors, idPrefix = "qc-stage-actors" }) {
  const meId = useCurrentUserId();

  const actors = Array.isArray(stageActors?.actors) ? stageActors.actors.filter(Boolean) : [];
  // Absent block, or a block with nobody in it: both are "there is no live
  // actor", and neither earns a box on the page.
  if (!stageActors || actors.length === 0) return null;

  const resolved = actors.map((a) => ({ actor: a, mine: actorIsMe(a, meId) }));
  const mine = resolved.some((r) => r.mine);

  const stageLabel = text(stageActors.stage_label);
  const roleLabel = text(stageActors.role_label);
  const rule = ruleSentence(stageActors.decision_rule, actors.length);

  const heading = mine
    ? "You are to take action"
    : actors.length === 1
      ? "Current action taker"
      : `Current action takers · ${actors.length}`;
  // Under ANY the reader still needs to know they are not alone on it, and
  // under ALL they need to know how many others are still owed. Both come out
  // of the same sentence.
  const others = resolved.length - 1;
  const lede = mine
    ? others > 0
      ? `This is waiting on you and ${others} other${others === 1 ? "" : "s"}.`
      : "This is waiting on you alone."
    : null;

  const next = stageActors.next || null;
  const nextActors = Array.isArray(next?.actors) ? next.actors.filter(Boolean) : [];
  const nextNames = nextActors.map((a) => text(a?.name) || "Unnamed user");

  const titleId = `${idPrefix}-title`;

  return (
    <section
      className={`${styles.saBand} ${mine ? styles.saBandMine : ""}`}
      aria-labelledby={titleId}
    >
      <span className={styles.saIc} aria-hidden="true">
        {mine ? <UserCheck size={14} /> : <Users size={14} />}
      </span>
      <div className={styles.saMain}>
        {/* Heading, stage and the sentence that places the roster sit on ONE
            line. They are three parts of a single statement — who must act,
            where in the RFQ, and under what rule — and the thing the reader
            actually opened this page for is the grid underneath, so they are
            not worth three stacked rows. They wrap onto their own rows only
            when the column is genuinely too narrow to hold them.

            Role first, then the personal statement, then the rule: the role is
            what places the names, and a sentence reads badly with a label
            bolted onto its tail. */}
        <div className={styles.saHead}>
          <h2 id={titleId} className={styles.saTitle}>
            {heading}
          </h2>
          {stageLabel ? <span className={styles.saStage}>{stageLabel}</span> : null}
          {(roleLabel || lede || rule) && (
            <p className={styles.saMeta}>{joinDot(roleLabel, lede, rule)}</p>
          )}
        </div>
        {/* Every one of them, always. No preview, no "+N": the truncation is the
            thing this band was asked to remove. */}
        <ul className={styles.saPeople}>
          {resolved.map((r, i) => (
            <ActorChip
              key={`${r.actor?.user_id ?? "x"}-${i}`}
              actor={r.actor}
              mine={r.mine}
            />
          ))}
        </ul>
        {nextActors.length > 0 && (
          <p className={styles.saNext}>
            <ArrowRight size={12} strokeWidth={2.4} aria-hidden="true" />
            <span>
              Next: <strong>{text(next.stage_label) || "the following stage"}</strong>
              {text(next.role_label) ? ` · ${text(next.role_label)}` : ""} — {nextNames.join(", ")}
            </span>
          </p>
        )}
      </div>
    </section>
  );
}
