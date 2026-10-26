import { HEADER_FIELDS, blankHeader, blankLine, lineFromDraft, qtyText, toQ } from "./receiveUtils";

// The receive form's state built from a ReceiveContext: a resumed server
// draft, or a blank form prefilled from a dispatch note. Pure functions, so
// the page only commits what they return.

/** 'YYYY-MM-DD' stays; an ISO instant becomes its IST calendar day. */
export const dayOf = (v) => {
  if (!v) return "";
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const t = Date.parse(s);
  if (Number.isNaN(t)) return "";
  return new Date(t + 330 * 60000).toISOString().slice(0, 10);
};

/**
 * Fill blank received qtys from a dispatch note and take its paperwork where
 * the receiver has not typed any. Returns {entries, header}.
 */
export const applyDispatch = (dsp, entries, header) => {
  let next = entries;
  for (const dl of dsp.lines || []) {
    const e = next[dl.poLineId];
    if (e && !(toQ(e.received) > 0)) {
      next = { ...next, [dl.poLineId]: { ...e, received: qtyText(dl.qty), scanUnits: 0, scanBase: null } };
    }
  }
  return {
    entries: next,
    header: {
      ...header,
      dispatchId: String(dsp.id),
      vendorChallanNo: header.vendorChallanNo || dsp.challanNo || "",
      vendorChallanDate: header.vendorChallanDate || dayOf(dsp.challanDate) || "",
      ewayBillNo: header.ewayBillNo || dsp.ewayBillNo || "",
      vehicleNo: header.vehicleNo || dsp.vehicleNo || "",
    },
  };
};

/**
 * {entries, header, note} for a loaded context. `draft` is the server draft
 * to resume (or null); `dispatchId` the ?dispatch= to prefill from. A draft
 * wins over the dispatch note, and a note for another hotel fills nothing;
 * either way `note` says so instead of skipping silently.
 */
export const formFromContext = (data, { draft = null, dispatchId = null } = {}) => {
  const deptDefault = data.po?.departmentId ?? null;
  const draftLines = new Map((draft?.lines || []).map((d) => [Number(d.poLineId), d]));
  let entries = {};
  for (const l of data.lines || []) {
    const d = draftLines.get(Number(l.poLineId));
    entries[l.poLineId] = d ? lineFromDraft(d, l, { departmentId: deptDefault }) : blankLine(l, { departmentId: deptDefault });
  }
  let header = blankHeader();
  let note = null;
  const dsp = dispatchId ? (data.dispatches || []).find((x) => String(x.id) === String(dispatchId)) : null;
  const hotelName = data.hotel?.name || "this hotel";

  if (draft) {
    for (const k of HEADER_FIELDS) {
      if (draft[k] == null) continue;
      header[k] = /Date$|^receivedAt$/.test(k) ? dayOf(draft[k]) || header[k] : String(draft[k]);
    }
    header.dispatchId = draft.dispatchId ? String(draft.dispatchId) : "";
    if (dispatchId) {
      note = {
        tone: "note",
        text: `You have a saved draft at ${hotelName}, so ${dsp?.dispatchNumber || "the dispatch note"} wasn't filled in. ` +
          "Pick it under “Against dispatch” to fill the lines that are still blank.",
      };
    }
  } else if (dsp) {
    ({ entries, header } = applyDispatch(dsp, entries, header));
  } else if (dispatchId) {
    note = {
      tone: "warn",
      text: `That dispatch note isn't on its way to ${hotelName}, so nothing was filled in. Check the hotel, or receive without it.`,
    };
  }
  return { entries, header, note };
};
