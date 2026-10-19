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
