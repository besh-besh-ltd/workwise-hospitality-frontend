import React, { useEffect, useRef, useState } from "react";
import { Plus, Search } from "lucide-react";
import { lookupCoverageCities, lookupCoverageHotels } from "@/services/vendorNetwork";
import { MODE_LABEL, SCOPE_LABEL, SCOPE_TYPES } from "./routingFormat";

const EMPTY = { scope_type: "STATE", state_id: "", city_id: "", hotel_id: "", mode: "INCLUDE", category_id: "" };

/**
 * "Add a rule" row of the coverage editor. Places come only from the coverage
 * lookups: India states, the cities of one state, and the hotels of the
 * network's own hotel set (the server refuses any other hotel id).
 *
 * onAdd(rule) receives { scope_type, scope_id, scope_name, mode, category_id,
 * category_name } and returns an error string to show, or null when added.
 */
export default function CoverageRuleForm({ states, categories, onAdd }) {
  const [form, setForm] = useState(EMPTY);
  const [cities, setCities] = useState([]);
  const [hotelQuery, setHotelQuery] = useState("");
  const [hotels, setHotels] = useState([]);
  const [hotelsLoading, setHotelsLoading] = useState(false);
  const [error, setError] = useState("");

  const needsState = form.scope_type === "STATE" || form.scope_type === "CITY";

  useEffect(() => {
    if (form.scope_type !== "CITY" || !form.state_id) {
      setCities([]);
      return undefined;
    }
    // A newer state (or scope) cancels this request's result: no out-of-order city lists.
    let cancelled = false;
    setCities([]);
    lookupCoverageCities(Number(form.state_id))
      .then((res) => !cancelled && setCities(res?.data || []))
      .catch(() => !cancelled && setCities([]));
    return () => {
      cancelled = true;
    };
  }, [form.scope_type, form.state_id]);

  // Only the latest search may fill the list: an older, slower response is dropped.
  const hotelSearchSeq = useRef(0);
  const searchHotels = async (q) => {
    const mine = ++hotelSearchSeq.current;
    setHotelsLoading(true);
    let found = [];
    try {
      const res = await lookupCoverageHotels(q.trim());
      found = res?.data || [];
    } catch {
      found = [];
    }
    if (mine !== hotelSearchSeq.current) return;
    setHotels(found);
    setForm((f) => ({ ...f, hotel_id: "" }));
    setHotelsLoading(false);
  };

  useEffect(() => {
    if (form.scope_type === "HOTEL") searchHotels("");
    // Only on switching to HOTEL; later searches are explicit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.scope_type]);

  const set = (key) => (e) => {
    const value = e.target.value;
    setError("");
    setForm((f) => {
      const next = { ...f, [key]: value };
      if (key === "scope_type") Object.assign(next, { state_id: "", city_id: "", hotel_id: "" });
      if (key === "state_id") next.city_id = "";
      return next;
    });
  };

  const add = () => {
    let scopeId = null;
    let scopeName = "";
    if (form.scope_type === "STATE") {
      const s = states.find((x) => String(x.id) === String(form.state_id));
      if (!s) return setError("Pick a state.");
      scopeId = s.id;
      scopeName = s.name;
    } else if (form.scope_type === "CITY") {
      const c = cities.find((x) => String(x.id) === String(form.city_id));
      if (!c) return setError("Pick a state, then a city.");
      scopeId = c.id;
      scopeName = c.name;
    } else {
      const h = hotels.find((x) => String(x.id) === String(form.hotel_id));
      if (!h) return setError("Search for a hotel and pick one.");
      scopeId = h.id;
      scopeName = h.name;
    }
    const category = categories.find((x) => String(x.id) === String(form.category_id)) || null;
    const refusal = onAdd({
      scope_type: form.scope_type,
      scope_id: Number(scopeId),
      scope_name: scopeName,
      mode: form.mode,
      category_id: category ? Number(category.id) : null,
      category_name: category ? category.title : null,
    });
    if (refusal) return setError(refusal);
    setForm((f) => ({ ...f, city_id: "", hotel_id: "" }));
    return undefined;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div className="form-grid">
        <div>
          <label className="label" htmlFor="vn-cov-scope">Scope</label>
          <select id="vn-cov-scope" className="select" value={form.scope_type} onChange={set("scope_type")}>
            {SCOPE_TYPES.map((t) => (
              <option key={t} value={t}>{SCOPE_LABEL[t]}</option>
            ))}
          </select>
        </div>

        {needsState && (
          <div>
            <label className="label" htmlFor="vn-cov-state">State</label>
            <select id="vn-cov-state" className="select" value={form.state_id} onChange={set("state_id")}>
              <option value="">Select a state</option>
              {states.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        )}

        {form.scope_type === "CITY" && (
          <div>
            <label className="label" htmlFor="vn-cov-city">City</label>
            <select id="vn-cov-city" className="select" value={form.city_id} onChange={set("city_id")} disabled={!form.state_id}>
              <option value="">{form.state_id ? "Select a city" : "Pick a state first"}</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}

        {form.scope_type === "HOTEL" && (
          <>
            <div>
              <label className="label" htmlFor="vn-cov-hotel-q">Find hotel</label>
              <div className="flex items-center gap-2">
                <input
                  id="vn-cov-hotel-q"
                  className="input"
                  value={hotelQuery}
                  maxLength={100}
                  placeholder="Hotel name"
                  onChange={(e) => setHotelQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      searchHotels(hotelQuery);
                    }
                  }}
                />
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => searchHotels(hotelQuery)} disabled={hotelsLoading}>
                  <Search size={14} /> Search
                </button>
              </div>
            </div>
            <div>
              <label className="label" htmlFor="vn-cov-hotel">Hotel</label>
              <select id="vn-cov-hotel" className="select" value={form.hotel_id} onChange={set("hotel_id")}>
                <option value="">{hotelsLoading ? "Searching…" : hotels.length ? "Select a hotel" : "No hotels found"}</option>
                {hotels.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                    {h.city ? ` · ${h.city}` : ""}
                  </option>
                ))}
              </select>
              <div className="help-text">Hotels your network has been invited to quote for (first 50 matches).</div>
            </div>
          </>
        )}

        <div>
          <label className="label" htmlFor="vn-cov-mode">Mode</label>
          <select id="vn-cov-mode" className="select" value={form.mode} onChange={set("mode")}>
            <option value="INCLUDE">{MODE_LABEL.INCLUDE}</option>
            <option value="EXCLUDE">{MODE_LABEL.EXCLUDE}</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="vn-cov-category">Category</label>
          <select id="vn-cov-category" className="select" value={form.category_id} onChange={set("category_id")}>
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
          <div className="help-text">
            Category-specific rules are used for rate-contract (ARC) hotel suggestions. RFQ suggestions use rules without a category.
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button type="button" className="btn btn-outline-blue btn-sm" onClick={add}>
          <Plus size={14} /> Add rule
        </button>
        {error && <span style={{ color: "var(--danger)", fontSize: 12.5 }}>{error}</span>}
      </div>
    </div>
  );
}
