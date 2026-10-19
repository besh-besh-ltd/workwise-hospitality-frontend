// Pure helpers over the `GET /approval/policy-coverage` payload:
//   { hotel_id, process_free: string[], by_process: { [processId]: string[] } }
// A null coverage means "unknown" (loading or the call failed). Callers must
// treat unknown as "show today's behaviour", never as "nothing works".

const has = (list, type) => Array.isArray(list) && list.includes(type);

/** Unwrap the axios response into the coverage object, or null if malformed. */
export const coverageFromResponse = (response) => {
  const data = response?.data?.data ?? response?.data;
  if (!data || typeof data !== "object" || !data.by_process) return null;
  return data;
};

/** An RFQ-type process is usable when an active RFQ policy targets it, or a process-free RFQ policy exists. */
export const isRfqProcessUsable = (processId, coverage) => {
  if (!coverage) return true;
  return has(coverage.by_process?.[String(processId)], "RFQ") || has(coverage.process_free, "RFQ");
};

/**
 * Narrow the RFQ-type processes to the ones that work at the chosen unit.
 * `processes` are {value,label,process_type}. ARC/TENDER-type processes never
 * belong in the RFQ create form.
 */
export const usableRfqProcesses = (processes, coverage) =>
  (processes || [])
    .filter((p) => !p.process_type || String(p.process_type).toUpperCase() === "RFQ")
    .filter((p) => isRfqProcessUsable(p.value, coverage));

/** Tender is offered unless coverage is known and has no TENDER policy anywhere. */
export const isTenderAvailable = (coverage) => {
  if (!coverage) return true;
  if (has(coverage.process_free, "TENDER")) return true;
  return Object.values(coverage.by_process || {}).some((types) => has(types, "TENDER"));
};

const intersect = (a, b) => a.filter((x) => b.includes(x));

/**
 * Coverage for a multi-unit RFQ: an entity type works only if it works at
 * EVERY unit. Per unit, a process's effective types are by_process[id] plus
 * that unit's process_free types. Returns null (unknown) for no/invalid input.
 */
export const mergeCoverages = (list) => {
  if (!Array.isArray(list) || list.length === 0 || list.some((c) => !c)) return null;
  if (list.length === 1) return list[0];
  const ids = [...new Set(list.flatMap((c) => Object.keys(c.by_process || {})))];
  const effective = (c, id) => [...new Set([...(c.by_process?.[id] || []), ...(c.process_free || [])])];
  return {
    hotel_id: null,
    process_free: list.map((c) => c.process_free || []).reduce(intersect),
    by_process: Object.fromEntries(ids.map((id) => [id, list.map((c) => effective(c, id)).reduce(intersect)])),
  };
};

/**
 * What the Process field should be, given the RFQ-type processes the user may
 * pick from. Unknown coverage always means the required select (today's
 * behaviour) so the user can never be left unable to choose.
 */
export const processFieldState = (rfqProcesses, coverage) => {
  if (!coverage) return "select";
  if (!rfqProcesses || rfqProcesses.length === 0) return "select";
  const usable = usableRfqProcesses(rfqProcesses, coverage);
  if (usable.length === 0) return "none";
  return usable.length === 1 ? "readonly" : "select";
};

/**
 * The process_id the form should hold. Only acts when coverage is known:
 * auto-select the lone usable process, clear an id that is no longer usable,
 * otherwise keep what is there.
 */
export const nextProcessId = (currentProcessId, usableProcesses, coverage) => {
  if (!coverage) return currentProcessId ?? null;
  if (usableProcesses.length === 1) return usableProcesses[0].value;
  if (currentProcessId && !usableProcesses.some((p) => p.value === currentProcessId)) return null;
  return currentProcessId ?? null;
};
