/* ────────────────────────────────────────────────────────────
   Dashboard API fixtures — one per endpoint, shaped exactly like
   the backend contract (backend docs/dashboard_v3/SPEC.md, "API
   contract changes" + "Persona widgets"). Component tests render
   from these, so a card that reads a field the backend no longer
   sends shows up as a failing test, not a blank tile in prod.
   ──────────────────────────────────────────────────────────── */

export const envelope = (data) => ({ status: 1, data });

/* ─── Cross-role ─────────────────────────────────────────── */

export const ACTION_CENTER = {
  pending_approvals: 4,
  pending_approval_instances: 9,
  rfqs_awaiting: 3,
  rfqs_ending_soon: 2,
  pos_awaiting: 5,
  rejected_vendors: 1,
  rejected_in_approval: 2,
};

export const BANNER = {
  mode: "steady",
  counts: {
    pending_approvals: 2,
    closing_soon: 0,
    closed_no_quotes: 0,
    quote_compare_ready: 3,
    po_acceptance_pending: 1,
  },
  soonest_closing: null,
  period: { rfqs_published: 6, savings_pct: 4.2, savings_basis: "awarded", windowed: true },
  weekly: { rfqs_published: 6, savings_pct: 4.2 },
};

export const PROCUREMENT_SNAPSHOT = {
  total_rfqs: 40,
  active_rfqs: 17,
  in_progress_rfqs: 23,
  closed_rfqs: 12,
  active_tenders: 0,
  pos_issued: 512,
  total_spend: 298400000,
  spend_breakup: { base_excl_gst: 252881356, total_gst: 45518644, total_incl_gst: 298400000 },
  avg_turnaround: 10.2,
  turnaround_days: { median: 6.6, p90: 21.4, n: 392 },
};

export const NEGOTIATION_SAVINGS = {
  basis: "awarded",
  total_savings: 12654361,
  market_baseline: 150000000,
  negotiated_total: 137345639,
  negotiation_count: 120,
  savings_pct: 8.4,
  rfq_count: 48,
  all_vendors: {
    total_savings: 18073564,
    market_baseline: 210000000,
    negotiated_total: 191926436,
    negotiation_count: 739,
  },
  awarded: { total_savings: 12654361 },
};

export const COST_INTELLIGENCE = {
  top_products: [
    { product_variant_id: 2247, product_name: "SMART TV 55", order_count: 4, value: 1200000 },
    { product_variant_id: 1037, product_name: "BATH TOWEL", order_count: 9, value: 540000 },
  ],
  selected_product_variant_id: 2247,
  granularity: "day",
  benchmark: {
    product_variant_id: 2247,
    benchmark_price: 22550,
    current_price: 29500,
    vs_benchmark_pct: 30.8,
    last_purchased_at: "2026-09-10T10:00:00Z",
    spec_variation: false,
    basis: "paid_vs_paid",
  },
  price_trend: {
    labels: ["2026-09-01", "2026-09-02", "2026-09-03"],
    avg: [25000, null, 27000],
    max: [29500, null, 29500],
    min: [22550, null, 24500],
  },
  vendor_comparison: [
    { vendor_id: 11, vendor_name: "A", company_name: "Alpha Electronics", avg_price: 24000, quote_count: 3, is_best: true },
    { vendor_id: 12, vendor_name: "B", company_name: "Beta Traders", avg_price: 27500, quote_count: 2, is_best: false },
  ],
};

export const CATEGORY_INSIGHTS = {
  total_spend: 1000000,
  categories: [
    { category_name: "Linen", spend_amount: 600000, rfq_count: 4, po_count: 6, percentage: 60 },
    { category_name: "Electronics", spend_amount: 300000, rfq_count: 2, po_count: 2, percentage: 30 },
    { category_name: "Others", spend_amount: 100000, rfq_count: null, po_count: null, bucket_count: 5, percentage: 10 },
  ],
};

export const ABC_ANALYSIS = {
  metric: "value",
  total_items: 10,
  total_value: 1000000,
  classes: [
    { class: "A", item_count: 2, item_pct: 20, value: 800000, metric_pct: 80 },
    { class: "B", item_count: 3, item_pct: 30, value: 150000, metric_pct: 15 },
    { class: "C", item_count: 5, item_pct: 50, value: 50000, metric_pct: 5 },
  ],
  items: [
    { product_variant_id: 1, rank: 1, name: "SMART TV 55", class: "A", value: 500000 },
    { product_variant_id: 2, rank: 2, name: "BATH TOWEL", class: "A", value: 300000 },
  ],
};

export const WORKFLOW_EFFICIENCY = {
  stages: [
    { stage_name: "rfq_approval", rfq_count: 30, samples: 28, instant_count: 2, median_hours: 5.5, p90_hours: 30, avg_dwell_time_hours: 9 },
    { stage_name: "tech_evaluation", rfq_count: 12, samples: 12, instant_count: 0, median_hours: 72, p90_hours: 200, avg_dwell_time_hours: 90 },
    { stage_name: "po_approval", rfq_count: 20, samples: 18, instant_count: 2, median_hours: 19, p90_hours: 52, avg_dwell_time_hours: 25 },
  ],
};

export const SMART_INSIGHTS = {
  insights: [
    {
      type: "benchmark_alert",
      severity: "high",
      title: "SMART TV 55 above price benchmark",
      description: "Latest purchase is 30.8% above the best price paid.",
      details: [
        { label: "Best paid", value: "₹22,550" },
        { label: "Latest", value: "₹29,500" },
      ],
      action_label: "Find RFQs for this item",
      action: { type: "rfqList", params: { search: "SMART TV 55" } },
    },
    {
      type: "vendor_optimization",
      severity: "low",
      title: "Alpha Electronics offers best pricing",
      description: "Lowest price on 12 competitive quote line(s) this period. Consider consolidating orders.",
      details: [],
      action_label: "View their POs",
      action: { type: "poList", params: { search: "Alpha Electronics" } },
    },
    {
      type: "spend_trend",
      severity: "medium",
      title: "Spend decreased by 12%",
      description: "Committed spend has decreased by 12% compared with the previous period of the same length.",
      details: [],
      action_label: "Open spend reports",
      action: { type: "reports", params: {} },
    },
    {
      type: "price_alert",
      severity: "medium",
      title: "An insight with an unknown destination",
      description: "<b>not html</b>",
      details: [],
      action_label: "Go somewhere",
      action: { type: "doesNotExist", params: {} },
    },
  ],
};

export const PENDING_APPROVALS = [
  { approval_id: 1, item_key: "RFQ:10", entity_type: "RFQ", entity_id: 10, rfq_id: 10, rfq_ref_id: 10, entity_title: "Linen RFQ", entity_rfq_no: 536100, hotel_name: "Goa", waiting_hours: 30, instance_count: 1, total_steps: 1 },
  { approval_id: 2, item_key: "NQ:20", entity_type: "NEGOTIATION_QUOTE", entity_id: 991, rfq_id: 20, rfq_ref_id: 20, entity_title: "TV RFQ", entity_rfq_no: 536200, hotel_name: "Goa", waiting_hours: 5, instance_count: 26, total_steps: 2, current_step: 1 },
  { approval_id: 3, item_key: "PO:77", entity_type: "PO", entity_id: 77, rfq_id: 30, po_id: 77, po_number: "PO-0077", hotel_name: "Pune", waiting_hours: 50, instance_count: 1 },
  { approval_id: 4, item_key: "TECH:40", entity_type: "TECHNICAL", entity_id: 5555, rfq_id: 40, rfq_ref_id: 40, entity_title: "Kitchen RFQ", hotel_name: "Pune", waiting_hours: 2, instance_count: 1 },
];

export const REJECTED_POS = [
  { po_id: 81, po_number: "PO-0081", rfq_id: 9, rfq_no: 536009, rfq_title: "Towels", vendor_company: "Beta Traders", hotel_name: "Goa", po_value: 120000, rejected_at: "2026-09-20T10:00:00Z", rejection_source: "vendor", rejection_reason: "Out of stock" },
  { po_id: 82, po_number: "PO-0082", rfq_id: 9, rfq_no: 536009, rfq_title: "Towels", vendor_company: "Gamma", hotel_name: "Goa", po_value: 90000, rejected_at: "2026-09-21T10:00:00Z", rejection_source: "approval", rejection_reason: "Budget" },
];

export const NO_RESPONSE = {
  active: [
    { id: 51, rfq_no: 536051, title: "Crockery", bid_end_date: "2026-10-02 18:00:00", invited_vendor_count: 4, regret_count: 1, hotel_name: "Goa", is_expired: false },
  ],
  expired: [
    { id: 52, rfq_no: 536052, title: "Cutlery", bid_end_date: "2026-09-20 18:00:00", invited_vendor_count: 3, regret_count: 0, hotel_name: "Pune", is_expired: true },
  ],
};

/* ─── Persona widgets ────────────────────────────────────── */

const approvalItem = (over) => ({
  approval_id: 1,
  item_key: "k1",
  entity_type: "RFQ",
  instance_count: 1,
  rfq_id: 10,
  rfq_no: 536100,
  rfq_title: "Linen RFQ",
  rfq_product_ids: [],
  product_names: [],
  po_id: null,
  po_number: null,
  vendor_names: [],
  value: null,
  submitted_at: "2026-09-20T10:00:00Z",
  waiting_since: "2026-09-25T10:00:00Z",
  age_days: 3,
  submitted_by_name: "Asha",
  hotel_name: "Goa",
  ...over,
});

export const PERSONA = {
  my_drafts: {
    count: 7,
    oldest_created_at: "2026-09-01T10:00:00Z",
    items: [
      { id: 101, rfq_no: 536101, title: "Draft linen", product_count: 3, created_at: "2026-09-20T10:00:00Z" },
      { id: 102, rfq_no: 536102, title: null, product_count: 1, created_at: "2026-09-21T10:00:00Z" },
    ],
  },
  my_active_rfqs: {
    total: 20,
    stages: [
      { stage: "RFQ_APPROVAL", label: "RFQ Approval", count: 2, oldest_age_days: 4 },
      { stage: "COMMERCIAL_EVALUATION", label: "Commercial Evaluation", count: 11, oldest_age_days: 20 },
      { stage: "AWAITING_PO", label: "Awaiting PO", count: 0, oldest_age_days: null },
    ],
  },
  my_no_response_rfqs: {
    count: 3,
    silent_vendor_count: 8,
    items: [{ id: 201, rfq_no: 536201, title: "Crockery", bid_end_date: "2026-10-02 18:00:00", silent_vendor_count: 3, total_vendor_count: 5 }],
  },
  my_rfqs_bid_closed_no_quotes: {
    count: 2,
    items: [{ id: 301, rfq_no: 536301, title: "Cutlery", bid_end_date: "2026-09-20 18:00:00", days_overdue: 8, regret_count: 2 }],
  },
  my_tech_evals_pending: {
    count: 12,
    oldest_waiting_since: "2026-09-01 18:00:00",
    items: [{ id: 401, rfq_id: 40, rfq_product_id: 4001, rfq_no: 536040, rfq_title: "Kitchen RFQ", product_name: "Combi oven", opened_at: "2026-09-02", waiting_since: "2026-09-01 18:00:00" }],
  },
  tech_evals_with_vendor_disagreements: {
    count: 3,
    total_disagreement_clauses: 7,
    items: [{ id: 501, rfq_id: 50, rfq_product_id: 5001, rfq_no: 536050, rfq_title: "Laundry", product_name: "Washer", disagreeing_vendor_count: 2, disagreeing_clause_count: 4 }],
  },
  my_tech_approvals_pending: {
    count: 1,
    oldest_waiting_since: "2026-09-25T10:00:00Z",
    oldest_age_days: 3,
    items: [approvalItem({ entity_type: "TECHNICAL", item_key: "TECH:525", rfq_id: 525, rfq_no: 536525, rfq_title: "HVAC", product_names: ["Chiller"] })],
  },
  my_rfq_approvals_pending: {
    count: 2,
    oldest_waiting_since: "2026-09-25T10:00:00Z",
    oldest_age_days: 3,
    items: [approvalItem({ entity_type: "RFQ", item_key: "RFQ:10", rfq_id: 10 })],
  },
  my_commercial_approvals_pending: {
    count: 3,
    total_value: 120547.88,
    oldest_waiting_since: "2026-09-10T10:00:00Z",
    oldest_age_days: 18,
    items: [approvalItem({ entity_type: "NEGOTIATION_QUOTE", item_key: "NQ:536435", rfq_id: 435, rfq_no: 536435, rfq_title: "Amenities", instance_count: 26, product_names: ["Soap", "Shampoo"], vendor_names: ["Delta"], value: 94379 })],
  },
  my_award_approvals_pending: {
    count: 1,
    total_value: 250000,
    oldest_waiting_since: "2026-09-26T10:00:00Z",
    oldest_age_days: 2,
    items: [approvalItem({ entity_type: "PO", item_key: "PO:77", po_id: 77, po_number: "PO-0077", rfq_id: 30, rfq_no: 536030, vendor_names: ["Alpha"], value: 250000 })],
  },
  my_quote_compares: {
    count: 11,
    items: [{ id: 601, rfq_no: 536601, title: "Minibar", vendor_count: 4, bid_closed_at: "2026-09-25 18:00:00" }],
  },
  my_active_negotiations: {
    count: 2,
    awaiting_approval_count: 1,
    total_silent_vendors: 3,
    items: [
      { id: 701, rfq_id: 70, rfq_no: 536070, rfq_title: "Uniforms", round_number: 2, round_status: "ACTIVE", round_end_date: "2026-10-01 18:00:00", invited_vendor_count: 4, silent_vendor_count: 3 },
      { id: 702, rfq_id: 71, rfq_no: 536071, rfq_title: "Carpets", round_number: 1, round_status: "PENDING_APPROVAL", round_end_date: null, invited_vendor_count: 2, silent_vendor_count: null },
    ],
  },
  savings_pipeline: {
    basis: "awarded",
    total_savings: 450000,
    prior_period_savings: 300000,
    negotiation_count: 9,
    avg_savings_pct: 6.25,
    all_vendors_savings: 700000,
    window: { start_date: "2026-08-29", end_date: "2026-09-28" },
    prior_window: { start_date: "2026-07-30", end_date: "2026-08-28" },
  },
  recent_awards: {
    count: 17,
    total_value: 21900000,
    window: { start_date: "2026-08-29", end_date: "2026-09-28" },
    items: [{ po_id: 88, po_number: "PO-0088", rfq_id: 31, rfq_no: 536031, rfq_title: "Beds", vendor_name: "Sleepwell", value: 1500000, status: "approved", approved_at: "2026-09-27T10:00:00Z", approved_by_me: true }],
  },
  award_value_pipeline: {
    committed_value: 5000000,
    committed_po_count: 12,
    pending_value: 800000,
    pending_po_count: 3,
    stages: [
      { key: "in_approval", label: "In approval", value: 800000, po_count: 3 },
      { key: "approved", label: "Approved", value: 3000000, po_count: 7 },
      { key: "in_fulfilment", label: "In fulfilment", value: 2000000, po_count: 5 },
      { key: "rejected", label: "Rejected", value: 0, po_count: 0 },
    ],
  },
  approval_turnaround: {
    window: { start_date: "2026-04-01", end_date: "2026-09-28" },
    tabs: [
      { key: "tech_eval", label: "Technical evaluation", n: 0, median_hours: null, p90_hours: null, instant_count: 0 },
      { key: "tech_approval", label: "Technical approval", n: 4, median_hours: 30, p90_hours: 96, instant_count: 1 },
      { key: "quote_approval", label: "Quote approval", n: 0, median_hours: null, p90_hours: null, instant_count: 0 },
      { key: "po_approval", label: "PO approval", n: 12, median_hours: 0.5, p90_hours: 19, instant_count: 3 },
      { key: "rfq_approval", label: "RFQ approval", n: 0, median_hours: null, p90_hours: null, instant_count: 0 },
    ],
  },
};

/** Minimal "nothing here" payloads per persona widget (true count 0). */
export const PERSONA_EMPTY = {
  my_drafts: { count: 0, oldest_created_at: null, items: [] },
  my_active_rfqs: { total: 0, stages: [] },
  my_no_response_rfqs: { count: 0, silent_vendor_count: 0, items: [] },
  my_rfqs_bid_closed_no_quotes: { count: 0, items: [] },
  my_tech_evals_pending: { count: 0, oldest_waiting_since: null, items: [] },
  tech_evals_with_vendor_disagreements: { count: 0, total_disagreement_clauses: 0, items: [] },
  my_tech_approvals_pending: { count: 0, oldest_waiting_since: null, oldest_age_days: null, items: [] },
  my_rfq_approvals_pending: { count: 0, oldest_waiting_since: null, oldest_age_days: null, items: [] },
  my_commercial_approvals_pending: { count: 0, total_value: 0, oldest_waiting_since: null, oldest_age_days: null, items: [] },
  my_award_approvals_pending: { count: 0, total_value: 0, oldest_waiting_since: null, oldest_age_days: null, items: [] },
  my_quote_compares: { count: 0, items: [] },
  my_active_negotiations: { count: 0, awaiting_approval_count: 0, total_silent_vendors: 0, items: [] },
  savings_pipeline: { basis: "awarded", total_savings: 0, prior_period_savings: null, negotiation_count: 0, avg_savings_pct: null, all_vendors_savings: 0, window: null, prior_window: null },
  recent_awards: { count: 0, total_value: 0, window: null, items: [] },
  award_value_pipeline: { committed_value: 0, committed_po_count: 0, pending_value: 0, pending_po_count: 0, stages: [] },
  approval_turnaround: { window: null, tabs: [] },
};
