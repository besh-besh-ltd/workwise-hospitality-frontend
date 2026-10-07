// Vendor network — Coverage (spec §6.1, §9). Admin only.
// Pick a member entity, edit its STATE / CITY / HOTEL include-exclude rules
// (each optionally for one category), save them all at once (PUT replaces the
// set), and see which of the network's hotels the saved rules cover. The
// principal is never offered: it is the fallback, not a routing candidate.

import { useCallback, useEffect, useMemo, useState } from "react";
import Head from "next/head";
import { toast } from "react-toastify";
import { Trash2 } from "lucide-react";
import { getCoverage, getOrg, lookupCoverageStates, putCoverage } from "@/services/vendorNetwork";
import { nestedCategoryData } from "@/services/products";
import NetworkAccessNotice from "@/components/dashboard/vendor/network/NetworkAccessNotice";
import { ConfirmModal } from "@/components/dashboard/vendor/network/NetworkModal";
import CoverageRuleForm from "@/components/dashboard/vendor/network/CoverageRuleForm";
import { isNetworkAdmin, useNetworkProfile } from "@/components/dashboard/vendor/network/networkProfile";
import { networkErrorMessage } from "@/components/dashboard/vendor/network/networkErrors";
import { ENTITY_STATUS, RELATIONSHIP_LABEL } from "@/components/dashboard/vendor/network/networkFormat";
import { MODE_LABEL, SCOPE_LABEL, SPECIFICITY_LABEL } from "@/components/dashboard/vendor/network/routingFormat";

// Mirrors MAX_COVERAGE_RULES in the backend coverage controller.
const MAX_RULES = 500;

const ruleKey = (r) => `${r.scope_type}:${r.scope_id}:${r.category_id ?? 0}`;
const toPayload = (rules) =>
  rules.map((r) => ({ scope_type: r.scope_type, scope_id: r.scope_id, mode: r.mode, category_id: r.category_id ?? null }));
const sameRules = (a, b) => JSON.stringify(toPayload(a)) === JSON.stringify(toPayload(b));

function CoverageView() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [entities, setEntities] = useState([]);
  const [states, setStates] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [switchTo, setSwitchTo] = useState(null);

  const [rulesLoading, setRulesLoading] = useState(false);
  const [rulesError, setRulesError] = useState("");
  const [savedRules, setSavedRules] = useState([]);
  const [rules, setRules] = useState([]);
  const [preview, setPreview] = useState(null);
  const [previewCategory, setPreviewCategory] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoadError("");
    try {
      const res = await getOrg();
      const principalId = res?.data?.org?.principal_vendor_id;
      const members = (res?.data?.entities || []).filter(
        (e) => e.relationship !== "PRINCIPAL" && Number(e.vendor_id) !== Number(principalId)
      );
      setEntities(members);
      setSelectedId((cur) => cur || (members[0] ? String(members[0].vendor_id) : ""));
    } catch (err) {
      setLoadError(networkErrorMessage(err, "Could not load your network."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    lookupCoverageStates()
      .then((res) => setStates(res?.data || []))
      .catch(() => setStates([]));
    nestedCategoryData(0, "", false)
      .then((res) => setCategories(res?.type === "category" ? res?.data || [] : []))
      .catch(() => setCategories([]));
  }, [load]);

  // Rules and preview of the selected entity. The preview always reflects the SAVED rules.
  const loadCoverage = useCallback(async (vendorId, categoryId, { keepRules = false } = {}) => {
    if (!vendorId) return;
    if (!keepRules) setRulesLoading(true);
    setRulesError("");
    try {
      const res = await getCoverage(Number(vendorId), { category_id: categoryId ? Number(categoryId) : undefined });
      if (!keepRules) {
        const loaded = res?.data?.rules || [];
        setSavedRules(loaded);
        setRules(loaded);
      }
      setPreview(res?.data?.preview || null);
    } catch (err) {
      setRulesError(networkErrorMessage(err, "Could not load this entity's coverage."));
    } finally {
      setRulesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedId) loadCoverage(selectedId, "");
    setPreviewCategory("");
  }, [selectedId, loadCoverage]);

  const dirty = useMemo(() => !sameRules(rules, savedRules), [rules, savedRules]);

  const pickEntity = (value) => {
    if (value === selectedId) return;
    if (dirty) setSwitchTo(value);
    else setSelectedId(value);
  };

  const addRule = (rule) => {
    if (rules.some((r) => ruleKey(r) === ruleKey(rule))) {
      return "There is already a rule for this place and category. Change its mode instead.";
    }
    if (rules.length >= MAX_RULES) return `An entity can have at most ${MAX_RULES} rules.`;
    setRules((cur) => [...cur, rule]);
    return null;
  };

  const setMode = (key, mode) => setRules((cur) => cur.map((r) => (ruleKey(r) === key ? { ...r, mode } : r)));
  const removeRule = (key) => setRules((cur) => cur.filter((r) => ruleKey(r) !== key));

  const save = async () => {
    setSaving(true);
    try {
      const res = await putCoverage(Number(selectedId), { rules: toPayload(rules) });
      toast.success(res?.message || "Coverage saved");
      const saved = res?.data?.rules || rules;
      setSavedRules(saved);
      setRules(saved);
      await loadCoverage(selectedId, previewCategory, { keepRules: true });
    } catch (err) {
      toast.error(networkErrorMessage(err, "Could not save the coverage."));
    } finally {
      setSaving(false);
    }
  };

  const changePreviewCategory = (value) => {
    setPreviewCategory(value);
    loadCoverage(selectedId, value, { keepRules: true });
  };

  const selected = entities.find((e) => String(e.vendor_id) === String(selectedId));
  const covered = preview?.covered || [];

  return (
    <main className="main-body">
      <div>
        <h1 className="page-h1">Coverage</h1>
        <p className="page-sub">
          Where each entity can serve. The most specific rule decides for a hotel: a hotel rule beats a city rule, which beats a state rule.
        </p>
      </div>

      {loadError && (
        <div className="section-card">
          <div className="section-body flex items-center justify-between gap-3">
            <span style={{ color: "var(--danger)", fontSize: 13 }}>{loadError}</span>
            <button type="button" className="btn btn-secondary btn-sm" onClick={load}>Retry</button>
          </div>
        </div>
      )}

      {!loadError && !loading && entities.length === 0 && (
        <div className="section-card">
          <div className="empty-state">
            <h2>No member entities yet</h2>
            <p>Link or create a branch, distributor or dealer on the Entities page, then set where it can serve.</p>
          </div>
        </div>
      )}

      {!loadError && entities.length > 0 && (
        <>
          <div className="section-card">
            <div className="section-body">
              <div style={{ maxWidth: 420 }}>
                <label className="label" htmlFor="vn-cov-entity">Entity</label>
                <select id="vn-cov-entity" className="select" value={selectedId} onChange={(e) => pickEntity(e.target.value)}>
                  {entities.map((e) => (
                    <option key={e.vendor_id} value={e.vendor_id}>
                      {e.name} · {RELATIONSHIP_LABEL[e.relationship] || e.relationship}
                      {e.status !== "ACTIVE" ? ` (${ENTITY_STATUS[e.status]?.label || e.status})` : ""}
                    </option>
                  ))}
                </select>
                {selected && selected.status !== "ACTIVE" && (
                  <div className="help-text">This entity is not active, so it gets no work until it is reactivated.</div>
                )}
              </div>
            </div>
          </div>

          {rulesError ? (
            <div className="section-card">
              <div className="section-body flex items-center justify-between gap-3">
                <span style={{ color: "var(--danger)", fontSize: 13 }}>{rulesError}</span>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => loadCoverage(selectedId, "")}>Retry</button>
              </div>
            </div>
          ) : (
            <>
              <div className="section-card">
                <div className="section-head">
                  <div className="h-left">
                    <h2>Rules</h2>
                    {dirty && <span className="pill warn">Unsaved changes</span>}
                  </div>
                  <div className="h-right flex items-center gap-2">
                    <span className="pill outline">{rules.length}</span>
                    <button type="button" className="btn btn-ghost btn-sm" disabled={!dirty || saving} onClick={() => setRules(savedRules)}>
                      Discard changes
                    </button>
                    <button type="button" className="btn btn-blue btn-sm" disabled={!dirty || saving || rulesLoading} onClick={save}>
                      {saving ? "Saving…" : "Save coverage"}
                    </button>
                  </div>
                </div>
                <div className="section-body flush table-scroll">
                  {rulesLoading ? (
                    <div className="section-body" style={{ color: "var(--fg-3)", fontSize: 13 }}>Loading rules…</div>
                  ) : rules.length === 0 ? (
                    <div className="section-body" style={{ color: "var(--fg-3)", fontSize: 13 }}>
                      No rules: this entity covers no hotel and is never suggested for routing.
                    </div>
                  ) : (
                    <table className="table" aria-label="Coverage rules">
                      <thead>
                        <tr>
                          <th>Scope</th>
                          <th>Place</th>
                          <th>Mode</th>
                          <th>Category</th>
                          <th className="right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rules.map((r) => {
                          const key = ruleKey(r);
                          const place = r.scope_name || `#${r.scope_id}`;
                          return (
                            <tr key={key}>
                              <td><span className="pill">{SCOPE_LABEL[r.scope_type] || r.scope_type}</span></td>
                              <td style={{ fontWeight: 600, color: "var(--fg)" }}>{place}</td>
                              <td>
                                <select
                                  className="select"
                                  aria-label={`Mode for ${place}`}
                                  value={r.mode}
                                  onChange={(e) => setMode(key, e.target.value)}
                                  style={{ maxWidth: 140 }}
                                >
                                  <option value="INCLUDE">{MODE_LABEL.INCLUDE}</option>
                                  <option value="EXCLUDE">{MODE_LABEL.EXCLUDE}</option>
                                </select>
                              </td>
                              <td>{r.category_id ? r.category_name || `Category #${r.category_id}` : <span style={{ color: "var(--fg-3)" }}>All categories</span>}</td>
                              <td style={{ textAlign: "right" }}>
                                <button type="button" className="btn btn-ghost btn-icon btn-sm" aria-label={`Remove rule ${place}`} onClick={() => removeRule(key)}>
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
                <div className="section-body" style={{ borderTop: "1px solid var(--border)" }}>
                  <CoverageRuleForm states={states} categories={categories} onAdd={addRule} />
                </div>
              </div>

              <div className="section-card">
                <div className="section-head">
                  <div className="h-left">
                    <h2>Covered hotels</h2>
                    <span className="pill outline">{covered.length}</span>
                  </div>
                  <div className="h-right">
                    <select
                      className="select"
                      aria-label="Preview for category"
                      value={previewCategory}
                      onChange={(e) => changePreviewCategory(e.target.value)}
                      style={{ maxWidth: 240 }}
                    >
                      <option value="">Rules for all categories</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.title}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="section-body" style={{ fontSize: 12.5, color: "var(--fg-3)", paddingBottom: 0 }}>
                  Of the {preview?.hotels_considered ?? 0} hotels your network has been invited to quote for, based on the saved rules.
                  {preview?.truncated ? " Only the first 2,000 hotels are checked." : ""}
                  {dirty ? " Save to update this preview." : ""}
                </div>
                <div className="section-body flush table-scroll">
                  {covered.length === 0 ? (
                    <div className="section-body" style={{ color: "var(--fg-3)", fontSize: 13 }}>No hotel is covered.</div>
                  ) : (
                    <table className="table" aria-label="Covered hotels">
                      <thead>
                        <tr>
                          <th>Hotel</th>
                          <th>City</th>
                          <th>State</th>
                          <th>Matched by</th>
                        </tr>
                      </thead>
                      <tbody>
                        {covered.map((h) => (
                          <tr key={h.id}>
                            <td style={{ fontWeight: 600, color: "var(--fg)" }}>{h.name}</td>
                            <td>{h.city || "—"}</td>
                            <td>{h.state || "—"}</td>
                            <td><span className="pill">{SPECIFICITY_LABEL[h.specificity] || "Rule"}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </>
          )}
        </>
      )}

      {switchTo && (
        <ConfirmModal
          title="Discard unsaved changes?"
          body="The rules you changed for this entity have not been saved."
          confirmLabel="Discard"
          onConfirm={() => {
            setRules(savedRules);
            setSelectedId(switchTo);
            setSwitchTo(null);
          }}
          onCancel={() => setSwitchTo(null)}
        />
      )}
    </main>
  );
}

export default function NetworkCoveragePage() {
  const { profile, pending } = useNetworkProfile();
  return (
    <>
      <Head>
        <title>Workwise | Network coverage</title>
      </Head>
      {!profile || pending ? null : isNetworkAdmin(profile) ? <CoverageView /> : <NetworkAccessNotice profile={profile} />}
    </>
  );
}
