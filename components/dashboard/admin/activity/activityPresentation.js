/**
 * How the trail is presented.
 *
 * The feed's whole job is to be read quickly and believed. Two rules follow
 * from that and are enforced here rather than left to each component.
 *
 * Severity and actor kind are never carried by colour alone — every one pairs
 * a colour with a word, per the accessibility target in PRODUCT.md. A feed of
 * coloured dots is unreadable to a large minority of people and unprintable
 * for everybody.
 *
 * Actors are distinguished rather than flattened. A vendor is a counterparty,
 * not staff; the scheduler is not a person; and the site representative who
 * signs for goods is a real human without an account. Rendering all four as
 * "User" is the fastest way to make an audit trail untrustworthy.
 */

export const SEVERITY_META = {
  critical: {
    label: "Critical",
    hint: "Money, access, or something that cannot be undone",
  },
  notable: { label: "Notable", hint: "Moves work forward a stage" },
  routine: { label: "Routine", hint: "Everyday edits and status changes" },
};

export const ACTOR_META = {
  USER: { label: "Staff", hint: "Someone in your company" },
  VENDOR: { label: "Vendor", hint: "A supplier acting on your RFQs and orders" },
  GUEST_TOKEN: {
    label: "Site rep",
    hint: "A person acting from a one-time link — typically signing for goods received — who has no account",
  },
  SYSTEM: {
    label: "System",
    hint: "The platform itself: scheduled publishing, expiries, reminders",
  },
  PUBLIC: { label: "Visitor", hint: "Someone not signed in" },
  UNKNOWN: {
    label: "Not recorded",
    hint: "This is older history, reconstructed from records that did not name who acted",
  },
};

export const severityMeta = (value) => SEVERITY_META[value] || SEVERITY_META.routine;
export const actorMeta = (value) => ACTOR_META[value] || ACTOR_META.UNKNOWN;

/**
 * Day headings a person would say out loud. An exact date on everything makes
 * a feed feel like a database export; "Today" and "Yesterday" carry most of
 * the weight in the range anybody actually scans.
 */
export const dayLabel = (iso) => {
  const date = new Date(iso);
  const startOf = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const today = startOf(new Date());
  const diffDays = Math.round((today - startOf(date)) / 86400000);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    ...(date.getFullYear() === new Date().getFullYear() ? {} : { year: "numeric" }),
  });
};

export const timeLabel = (iso) =>
  new Date(iso).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

export const groupByDay = (rows = []) => {
  const groups = [];
  let current = null;
  for (const row of rows) {
    const label = dayLabel(row.occurred_at);
    if (!current || current.label !== label) {
      current = { label, rows: [] };
      groups.push(current);
    }
    current.rows.push(row);
  }
  return groups;
};

/**
 * Which fields of a row change are worth showing.
 *
 * A raw before/after of a wide table is a wall of unchanged columns. Only the
 * ones that actually moved tell the reader anything, and the bookkeeping
 * columns moved on every single edit without meaning a thing.
 */
const NOISE_FIELDS = new Set([
  "updated_at",
  "updated_by",
  "timestamp",
  "modified_at",
  "publish_attempts",
]);

export const diffFields = (change) => {
  const before = change?.old_data || {};
  const after = change?.new_data || {};
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort();

  return keys
    .filter((key) => !NOISE_FIELDS.has(key))
    .map((key) => ({ field: key, from: before[key], to: after[key] }))
    .filter(({ from, to }) => JSON.stringify(from ?? null) !== JSON.stringify(to ?? null));
};

export const formatValue = (value) => {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};
