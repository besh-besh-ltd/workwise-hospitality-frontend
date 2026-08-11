import { useRouter } from "next/router";
import React, { useEffect, useInsertionEffect, useRef, useState } from "react";
import Item from "./Item";
import Select from 'react-select';
import { createRfq, saveDraft, updateRfq, getRFQById, getTerms, vendorApproveList, getDraftData, getDraftById, getDraftRfqSheets, getDraftRfqSheetWise, processMagicSearchDraft, getVendorsForRFQProduct, vendorTypes, getVendorsForProduct, getTechEvalUsers, refreshVendors, getClausesByRfqProductId } from "@/services/rfq";
import { Form, Formik, Field } from "formik";
import { CreateRFQSchema } from "@/utils/schema";
import FormikField from "@/components/shared/FormikField";
import CreateRFQSkeleton from "./CreateRFQSkeleton";
import { useDispatch, useSelector } from "react-redux";
import {
  intializeRfq,
  clearRfqState,
  setOtherFormFields,
  setTermsData,
  setTermFiles,
  setAllTerms,
  setStoreLoading,
  removeRfqProduct,
} from "@/redux/slice";
import Link from "next/link";
import { toast } from "react-toastify";
import { getProjectTableDataById, getProjectsByHospitalityContext, getProjectHospitalityContext, getRfqFilters } from "@/services/project";
import { getMyHospitalityContexts } from "@/services/hospitality";
import { getDepartments } from "@/services/rbac";
import { getApprovalProcesses } from "@/services/process";
import { getUnits } from "@/services/units";
import HotelFilter from "@/components/shared/HotelFilter";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClose, faEye, faTrash, faXmark } from "@fortawesome/free-solid-svg-icons";
import { extractfileName, handleFileUpload, formatISOToDateTimeLocal, getDataWithLoading, getEntityLabel } from "@/utils/sharedFunctions";
import { Accordion } from "react-bootstrap";
import { getCountryCodes } from "@/services/cms";
import axiosInstance from "@/lib/axios";
import ViewVendorModal from "../editRFQ/ViewVendorModal";
import { subscriptionTypes, vendorConditions } from "../../vendor/searchConfig";
import { getProductMakeList } from "@/services/products";
import CommonFormInput from "@/components/shared/CommonFormInput";
import AddVendorModal from "../editRFQ/AddVendorModal";

import { BusinessTypes } from "@/utils/constants";

import CreateRFQModal from "./CreateRFQModal";
import AddProductsModal from "./AddProductsModal";
import ValidationErrorsDisplay from "./ValidationErrorsDisplay";
import ConfirmationModal from "@/components/modal/ConfirmationModal";
import { IoIosCloseCircleOutline } from "react-icons/io";
import { BsArrowRepeat } from "react-icons/bs";
import { faTimesCircle } from "@fortawesome/free-regular-svg-icons";
import useModulePermissions from "@/hooks/useModulePermissions";
import ProcessScopeErrorBanner from "@/components/shared/ProcessScopeErrorBanner";
import AccessDeniedPage from "@/components/shared/AccessDeniedPage";
import ReadOnlyBanner from "@/components/shared/ReadOnlyBanner";
import { isQuantityValid, isUnitValid } from "@/utils/productCompleteness";
import { specDeltaKey } from "@/utils/rfqSpecDelta";


const myVendorOptions = [
  { label: "All Vendors", value: null },
  {
    label: "Private Vendors",
    value: "is_private",
  },
  {
    label: "Public Vendors",
    value: "is_public",
  },
  {
    label: "Both Vendors",
    value: "both",
  },
];

export function cleanUpdatableData(updatableData) {
    const deletableIds = updatableData.products.deletable.map(String); // convert to strings for matching

    const cleanedUpdatable = {};
    let cleanVendors = {};

    // Iterate over each section inside updatable (e.g., specs, comment, files, etc.)
    for (const sectionKey in updatableData.products.updatable) {
      const section = updatableData.products.updatable[sectionKey];

      // Filter out entries whose keys are in the deletable list
      const filteredSection = Object.fromEntries(
        Object.entries(section).filter(([id]) => !deletableIds.includes(id))
      );

      cleanedUpdatable[sectionKey] = filteredSection;
    }

    const filteredVendors = Object.fromEntries(
      Object.entries(updatableData.vendors).filter(
        ([id]) => !deletableIds.includes(id)
      )
    );

    cleanVendors = filteredVendors;

    // Return a new object with cleaned updatable section
    return {
      ...updatableData,
      products: {
        ...updatableData.products,
        updatable: cleanedUpdatable,
      },
      vendors: cleanVendors,
    };
  }

const STEPS = [
  { id: 1, label: 'Products' },
  { id: 2, label: 'Details' },
  { id: 3, label: 'Timeline' },
  { id: 4, label: 'Terms' },
  { id: 5, label: 'Review' },
];

// Builds the `{ rfq_id, snapshot }` payload that /rfq/update expects when
// editing an existing RFQ. The snapshot is a full picture of the RFQ — not
// a delta — so this walks the live Redux products + form data and reshapes
// each product into { id, product_variant_id, variant, product_name,
// comment, specs (object), files (object), vendors (id[]) }.
const buildEditSnapshotPayload = ({
  editRfqId,
  formDataCopy,
  fullMobile,
  rfqProductsFromStore,
  selectedTerms,
  selectedHotelIds,
  liveUpdatableData,
}) => {
  const products = (rfqProductsFromStore || []).map((p) => {
    // Spec rows: array of {title, value} → flat object keyed by title
    const specs = {};
    const specRows = Array.isArray(p.spec) ? p.spec : (p.product_specs || []);
    for (const row of specRows) {
      if (row && row.title != null) specs[row.title] = row.value;
    }
    const vendorList = Array.isArray(p.vendors)
      ? p.vendors
      : Array.isArray(p.vendor_details) ? p.vendor_details : [];
    const vendors = vendorList
      .map((v) => Number(v.user_id ?? v.id))
      .filter((id) => !Number.isNaN(id));
    // Prefer the synchronous delta from updatableDataRef when present —
    // a same-tick saveDraft() after an upload sees fresh URLs there before
    // useSelector has a chance to re-render. "rm" is the sentinel that
    // handleFilesChange writes when an array goes empty.
    const fileOverride = liveUpdatableData?.products?.updatable?.files?.[p.id];
    const pickFiles = (key, fallback) => {
      const delta = fileOverride?.[key];
      if (delta === undefined) return (fallback || []).filter(Boolean);
      if (delta === "rm") return [];
      return Array.isArray(delta) ? delta.filter(Boolean) : (fallback || []).filter(Boolean);
    };
    const files = {
      qap_file: pickFiles("qap_file", p.qap_file),
      spec_file: pickFiles("spec_file", p.spec_file),
      datasheet_file: pickFiles("datasheet_file", p.datasheet_file),
    };
    return {
      id: p.id ?? null,
      clientId: p.clientId,
      product_variant_id: Number(p.product_variant_id ?? p.product_id),
      variant: Number(p.variant) || 0,
      product_name: p.product_details?.[0]?.name || p.name || `Product ${p.id || ''}`,
      comment: p.comment || '',
      specs,
      files,
      vendors,
      tech_eval_clauses: p.tech_eval_clauses || [],
    };
  });

  const snapshot = {
    title: formDataCopy.title ?? '',
    comment: formDataCopy.comment ?? '',
    contact_name: formDataCopy.contact_name ?? '',
    contact_number: fullMobile,
    response_email: formDataCopy.response_email ?? '',
    location: formDataCopy.location ?? '',
    bid_end_date: formDataCopy.bid_end_date ?? '',
    tender_publish_date: formDataCopy.tender_publish_date ?? null,
    tender_fees: formDataCopy.tender_fees ?? null,
    vendor_clarification_date: formDataCopy.vendor_clarification_date ?? null,
    rfq_type: formDataCopy.rfq_type ?? null,
    reverse_auction: Number(formDataCopy.reverse_auction || 0),
    ra_start_date: formDataCopy.ra_start_date ?? null,
    ra_end_date: formDataCopy.ra_end_date ?? null,
    project_id: formDataCopy.project_id != null && formDataCopy.project_id !== ''
      ? Number(formDataCopy.project_id)
      : null,
    is_tender: Number(formDataCopy.is_tender || 0),
    hotel_ids: Array.isArray(selectedHotelIds) && selectedHotelIds.length > 0
      ? selectedHotelIds
      : (Array.isArray(formDataCopy.hotel_ids) ? formDataCopy.hotel_ids : []),
    terms: (selectedTerms || []).map((t) => Number(t.id || t.term_id)).filter(Boolean),
    // T&C attachments — diffed on the backend (applyTermFileChanges).
    // Empty array clears all files; omitting the key would mean "no change".
    term_and_condition_files: Array.isArray(formDataCopy.term_and_condition_files)
      ? formDataCopy.term_and_condition_files.filter(Boolean)
      : [],
    products,
  };

  return { rfq_id: editRfqId, snapshot };
};

// Stable empty-array reference shared across renders. useSelector falls
// back to this when the underlying field is null/undefined; without a stable
// reference, `|| []` creates a fresh array each call, which makes useSelector
// think the selected value changed every render and triggers an infinite
// re-render loop downstream (the [termFiles] effect at the term-files
// section is the canonical victim).
const EMPTY_ARRAY = Object.freeze([]);

// Adapts the /rfq/getRfqById response into the shape `intializeRfq` (and
// downstream Item.js / form fields) expects. Differences vs the draft API:
//   • products live under `products` and use `product_specs` for spec rows
//   • vendors come back as `vendor_details` with nested user_details
// We rename to `rfq_products` / `spec` / `vendors` so the rest of the
// CreateRFQ pipeline doesn't need to know it was an edit-mode load.
const reshapeRfqForStore = (rfq, rfqId) => {
  const products = (rfq?.products || []).map((p) => ({
    ...p,
    spec: Array.isArray(p.product_specs) ? p.product_specs : (p.spec || []),
    vendors: Array.isArray(p.vendor_details)
      ? p.vendor_details.map((v) => ({
          user_id: v.user_id,
          variant: v.variant,
          ...(v.user_details || {}),
        }))
      : (p.vendors || []),
    qap_file: Array.isArray(p.qap_file) ? p.qap_file : [],
    spec_file: Array.isArray(p.spec_file) ? p.spec_file : [],
    datasheet_file: Array.isArray(p.datasheet_file) ? p.datasheet_file : [],
  }));
  // /rfq/getRfqById returns the RFQ's T&C URLs under the alias `TERM_files`
  // (see rfqModel.js getRfqById). The rest of the component — selectors,
  // upload reducer, snapshot builder — reads `term_and_condition_files`.
  // Normalise here so an existing draft's T&C chips actually render and the
  // setTermFiles reducer can spread the array on the next upload.
  const termAndConditionFiles =
    Array.isArray(rfq?.term_and_condition_files) ? rfq.term_and_condition_files
    : Array.isArray(rfq?.TERM_files) ? rfq.TERM_files
    : [];
  return {
    rfq_id: rfqId,
    rfq_form_data: { ...rfq, term_and_condition_files: termAndConditionFiles },
    rfq_products: products,
  };
};

// Inline read-more for long text values inside the product detail modal.
// Anything past `limit` chars collapses; clicking the toggle expands inline.
const ExpandableText = ({ text, limit = 300 }) => {
  const [expanded, setExpanded] = useState(false);
  const value = (text ?? "").toString();
  if (!value) return <span className="rfq-product-detail__empty">—</span>;
  if (value.length <= limit) {
    return <span className="rfq-product-detail__text">{value}</span>;
  }
  return (
    <span className="rfq-product-detail__text">
      {expanded ? value : `${value.slice(0, limit)}…`}
      {" "}
      <button
        type="button"
        className="rfq-product-detail__toggle"
        onClick={() => setExpanded((v) => !v)}
      >
        {expanded ? "View less" : "View more"}
      </button>
    </span>
  );
};

// Product detail modal — opened from the Review section's product cards.
// Two-column horizontal grid so labels sit beside compact values; long-text
// fields (size / spec / comments) span both columns.
const ProductDetailModal = ({ product: p, getSpecFieldValue, updatableData, onClose }) => {
  const qty = getSpecFieldValue(p, "quantity");
  const unit = getSpecFieldValue(p, "unit");
  const size = getSpecFieldValue(p, "size");
  const spec = getSpecFieldValue(p, "spec");
  const editedComment = updatableData?.products?.updatable?.comment?.[p.id];
  const commentVal = (editedComment !== undefined ? editedComment : p.comment) || "";
  const tdsFiles = p.datasheet_file || p.TDS_flies || [];
  const qapFiles = p.qap_file || p.QAP_files || [];
  const specFiles = p.spec_file || p.SPEC_files || [];

  const [clauses, setClauses] = useState(null); // null = loading, [] = none
  const [minScore, setMinScore] = useState(null);
  useEffect(() => {
    let cancelled = false;
    if (!p?.id) { setClauses([]); return; }
    (async () => {
      try {
        const res = await getClausesByRfqProductId({ rfq_product_id: p.id, vendor_id: null });
        if (cancelled) return;
        if (res?.success) {
          setClauses(Array.isArray(res.data) ? res.data : []);
          const ms = res.minimum_passing_score;
          setMinScore(ms != null && !isNaN(Number(ms)) ? Number(ms) : null);
        } else {
          setClauses([]);
        }
      } catch {
        if (!cancelled) setClauses([]);
      }
    })();
    return () => { cancelled = true; };
  }, [p?.id]);

  const renderFileGrid = (files) => (
    files.length === 0
      ? <span className="rfq-product-detail__empty">—</span>
      : (
        <ul className="rfq-product-detail__files rfq-product-detail__files--grid">
          {files.map((url, i) => (
            <li key={url}>
              <a href={url} target="_blank" rel="noopener noreferrer">Document {i + 1}</a>
            </li>
          ))}
        </ul>
      )
  );

  return (
    <div
      className="rfq-doc-modal__overlay"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="rfq-doc-modal rfq-doc-modal--wide"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="rfq-doc-modal__header">
          <h3 className="rfq-doc-modal__title">{p.name || `Product #${p.product_id}`}</h3>
          <button
            type="button"
            className="rfq-doc-modal__close"
            aria-label="Close"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <div className="rfq-doc-modal__body">
          <div className="rfq-product-detail">
            <div className="rfq-product-detail__row rfq-product-detail__row--inline">
              <div className="rfq-product-detail__field rfq-product-detail__field--inline">
                <span className="rfq-product-detail__label">Quantity</span>
                <span className="rfq-product-detail__value">{qty || "—"}</span>
              </div>
              <div className="rfq-product-detail__field rfq-product-detail__field--inline">
                <span className="rfq-product-detail__label">Unit</span>
                <span className="rfq-product-detail__value">{unit || "—"}</span>
              </div>
              {p.variant ? (
                <div className="rfq-product-detail__field rfq-product-detail__field--inline">
                  <span className="rfq-product-detail__label">Variant</span>
                  <span className="rfq-product-detail__value">{p.variant}</span>
                </div>
              ) : null}
            </div>

            <div className="rfq-product-detail__field rfq-product-detail__field--full">
              <span className="rfq-product-detail__label">Product Size</span>
              <span className="rfq-product-detail__value">
                <ExpandableText text={size} />
              </span>
            </div>
            <div className="rfq-product-detail__field rfq-product-detail__field--full">
              <span className="rfq-product-detail__label">Product Specification</span>
              <span className="rfq-product-detail__value">
                <ExpandableText text={spec} />
              </span>
            </div>
            <div className="rfq-product-detail__field rfq-product-detail__field--full">
              <span className="rfq-product-detail__label">Comments</span>
              <span className="rfq-product-detail__value">
                <ExpandableText text={commentVal} />
              </span>
            </div>

            <div className="rfq-product-detail__files-row">
              <div className="rfq-product-detail__field">
                <span className="rfq-product-detail__label">TDS</span>
                <span className="rfq-product-detail__value">{renderFileGrid(tdsFiles)}</span>
              </div>
              <div className="rfq-product-detail__field">
                <span className="rfq-product-detail__label">QAP</span>
                <span className="rfq-product-detail__value">{renderFileGrid(qapFiles)}</span>
              </div>
              <div className="rfq-product-detail__field">
                <span className="rfq-product-detail__label">Spec files</span>
                <span className="rfq-product-detail__value">{renderFileGrid(specFiles)}</span>
              </div>
            </div>

            <div className="rfq-product-detail__field rfq-product-detail__field--full">
              <span className="rfq-product-detail__label">
                Marks &amp; Clauses
                {minScore != null && (
                  <span className="rfq-product-detail__label-meta"> · Min passing: {minScore}%</span>
                )}
              </span>
              {clauses === null ? (
                <span className="rfq-product-detail__empty">Loading…</span>
              ) : clauses.length === 0 ? (
                <span className="rfq-product-detail__empty">—</span>
              ) : (
                <ul className="rfq-product-detail__clauses">
                  {clauses.map((c, idx) => (
                    <li key={c.clause_id || idx} className="rfq-product-detail__clause">
                      <div className="rfq-product-detail__clause-head">
                        <span className={`rfq-tag rfq-tag--${c.clause_type === 'sampling' ? 'violet' : 'primary'}`}>
                          {c.clause_type === 'sampling' ? 'Sampling' : 'Technical'}
                        </span>
                        <span className="rfq-product-detail__clause-marks">Marks: {c.weightage || 0}</span>
                      </div>
                      <div className="rfq-product-detail__clause-text">
                        <ExpandableText text={c.clause_text || ''} />
                      </div>
                      {Array.isArray(c.files) && c.files.length > 0 && (
                        <ul className="rfq-product-detail__files rfq-product-detail__files--grid">
                          {c.files.map((url, i) => (
                            <li key={url}>
                              <a href={url} target="_blank" rel="noopener noreferrer">Document {i + 1}</a>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
        <div className="rfq-doc-modal__footer">
          <button
            type="button"
            className="rfq-doc-modal__btn"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const CreateRFQ = () => {
  const router = useRouter();
  const { draft_id, view_only } = router.query;
  // The edit-RFQ route (`/dashboard/buyer/rfq-management-edit?id=<rfqId>`)
  // mounts this same component. When `id` is present we treat the run as
  // editing an existing RFQ — loading via getRFQById and saving via
  // updateRfq instead of the draft endpoints.
  const editRfqId = router.query.id ? parseInt(router.query.id) : null;
  const isEditMode = !!editRfqId;
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [mainLoading, setMainLoading] = useState(false);

  const userProfile = useSelector((state) => state.userProfile);
  const [vendorApprovedList, setVendorApprovedList] = useState([]);
  const [rfqProducts, setRfqProducts] = useState([]);
  const [draftRfqId, setDraftRfqId] = useState(draft_id ? parseInt(draft_id) : -1);

  // Changes by Agnij 2025-08-05 [Added sheet filter state for RFQs created from magic search]
  const [isMagicRfq, setIsMagicRfq] = useState(false);
  const [sheetNameList, setSheetNameList] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState(null);
  const [selectedSheetsForRFQ, setSelectedSheetsForRFQ] = useState([]);
  
  // Hospitality context states
  const [hospitalityContexts, setHospitalityContexts] = useState([]);
  const [userHotelMappings, setUserHotelMappings] = useState([]);
  const [selectedHotelIds, setSelectedHotelIds] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [processes, setProcesses] = useState([]);
  // Captured submit error for structured-code surfacing (process scope /
  // missing approval policy). Renders via ProcessScopeErrorBanner above the
  // submit footer; cleared on next successful action.
  const [scopeError, setScopeError] = useState(null);
  // Unit dropdown source — global defaults + this user's own custom units.
  // Each row: { id, name, is_default }. Re-fetched after add / delete.
  const [units, setUnits] = useState([]);

  const storeLoading = useSelector((data) => data.storeLoading);
  const rfqDetails = useSelector((data) => data.rfq_id);
  const rfqProductsFromStore = useSelector((data) => data.rfqProducts);
  const rfqFormDataFromStore = useSelector((data) => data.rfqFormData);
  const allTerms = useSelector((data) => data.allTerms);
  const selectedTerms = useSelector((data) => data.rfqFormData.terms);
  const termFiles = useSelector((state) => state.rfqFormData.term_and_condition_files || EMPTY_ARRAY);
  // View-only mode: when viewing someone else's draft (linked via view_only=true)
  // Also verified against created_by once draft loads
  const isViewOnlyDraft = view_only === 'true' && draft_id && userProfile &&
    rfqFormDataFromStore?.created_by && String(rfqFormDataFromStore.created_by) !== String(userProfile.id);

  // ── Edit-mode lockdown flags ─────────────────────────────────────────────
  // Mirrors the gates the backend's PUT /rfq/update enforces. Source of truth:
  //   • allowlist: app/controllers/rfq/rfqEditableFields.js (RFQ_EDITABLE_FIELDS)
  //   • runtime gates: rfqController.updateRFQ + rfqUpdateHelpers.assertEditAllowed
  // Anything we let the user edit but the server rejects manifests as a
  // confusing "saved" UX with no real change, so we mirror the rules here.
  //
  //   isReadOnly       — entire form locked (assertEditAllowed would fail)
  //   isRestrictedEdit — only bid_end_date editable + vendor refresh allowed
  //                      (vendors-or-tech-stuck-or-dead-end products)
  //   isPostPublish    — additionally locks tender_publish_date + tender_fees
  const _editMeta = isEditMode ? (rfqFormDataFromStore || {}) : {};
  const _bidEndPassed = !!_editMeta.bid_end_date && new Date(_editMeta.bid_end_date) <= new Date();
  const isReadOnly =
    isEditMode && (
      _editMeta.status === 2 ||
      (_bidEndPassed && _editMeta.is_quotes_present && !_editMeta.has_dead_end_product && !_editMeta.has_tech_stuck_product)
    );
  const isRestrictedEdit =
    isEditMode && !isReadOnly && (
      !!_editMeta.has_received_quotes ||
      !!_editMeta.has_dead_end_product ||
      !!_editMeta.has_tech_stuck_product
    );
  const isPostPublish = isEditMode && _editMeta.is_published === 1;

  // Per-field lock helper. Mirrors the backend's union of rule layers, so
  // any input wired through this is automatically consistent with what
  // the /update endpoint would actually accept.
  const isFieldLocked = (field) => {
    if (isViewOnlyDraft || isReadOnly) return true;
    if (isRestrictedEdit && field !== 'bid_end_date') return true;
    if (isPostPublish && (field === 'tender_publish_date' || field === 'tender_fees')) return true;
    if (isEditMode && field === 'tender_publish_date') return true;
    return false;
  };
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  // Highest step the user has ever reached this session. Stepper pills with
  // id <= maxStepReached stay marked "done" and clickable, so jumping back
  // to step 1 doesn't re-lock the steps the user already completed.
  // In edit-RFQ mode the RFQ is already published, so unlock every step on
  // entry — the user can hop between sections freely.
  const [maxStepReached, setMaxStepReached] = useState(editRfqId ? STEPS.length : 1);
  // When the user clicks Next on an invalid step we tag the step number here
  // so each required-but-empty field can render a red border + "Required"
  // hint. The hint clears as soon as the field gets a value (the empty check
  // itself drives visibility) or when the user navigates to a different step
  // (effect below). Null = no error state.
  const [triedNextOnStep, setTriedNextOnStep] = useState(null);
  // When Submit's business-rule validation fails on a field that DOES have a
  // value (e.g. a publish date that's set but less than 5 minutes from now),
  // isFieldMissing won't flag it. Track the offender by name so the field
  // gets the same red-border treatment until the user edits it or moves
  // steps. Cleared in the step-change effect below and inside
  // handleFormFieldChange when the user edits the flagged field.
  const [submitInvalidField, setSubmitInvalidField] = useState(null);
  const [countryCode , setCountryCode] = useState ([]);
  const [ onecountrycode ,setonecountrycode] = useState("");
  const [showCreateConfirmModal, setShowCreateConfirmModal] = useState(false);
  const [pendingFormValues, setPendingFormValues] = useState(null);
  const [refreshingVendors, setRefreshingVendors] = useState(false);
  const [showRemoveProductConfirmModal, setShowRemoveProductConfirmModal] = useState(false);
  const [pendingProductToRemove, setPendingProductToRemove] = useState(null);
  // In-page modal for adding products to draft OR existing RFQ. Replaces the
  // legacy redirect to /dashboard/buyer/start-rfq?rfq_id=… which broke for
  // published RFQs (it tried to load them via /rfq/get-draft-by-id and 403d).
  // The modal stages products into Redux; the existing snapshot save in
  // PUT /rfq/update persists them as diff.products.added.
  const [showAddProductsModal, setShowAddProductsModal] = useState(false);
  const [queryMeta, setQueryMeta] = useState({
    draft_id: null,
    sheet_id: null,
  })
  // Product clicked from the Review section's product grid; when set, the
  // details modal is open. Cleared when the user closes the modal.
  const [viewProduct, setViewProduct] = useState(null);
  const [updatableData, setUpdatableData] = useState({
    products: {
      addable: [],
      deletable: [],
      updatable: {},
    },
    vendors: {},
  })
  // Mirror of updatableData that's updated synchronously by handleFilesChange
  // (and similar mutators) so an immediate saveDraft() call from a child sees
  // the latest payload — useState updates are async and a same-tick saveDraft
  // would otherwise send stale data and lose the just-uploaded file.
  const updatableDataRef = useRef(null);

  const [vendors, setVendors] = useState({});
  const [viewProductFilter, setViewProductFilter] = useState({});
  const [addableVendors, setAddableVendors] = useState([]);
  const [termsChanged, setTermsChanged] = useState(false);
  const [termFilesChanged, setTermFilesChanged] = useState(false);
  const [termsFileModalOpen, setTermsFileModalOpen] = useState(false);
  const [activeKey, setActiveKey] = useState(null);
  const [showModal, setShowModal] = useState({
    vendorModal: false,
    addVendorModal: false
  })
  const [selectedProduct] = useState({});
  const [vendorFilters, setVendorFilters] = useState({
    global: {},
    local: {},
  })
  const [initialFilterOptions, setInitialFilterOptions] = useState({
    countries: [],
    states: [],
    cities: [],
    vendorTypes: BusinessTypes,
    approvedBy: [],
    productMakes: {},
  })
  const [finalRFQValues, setFinalRFQValues] = useState(null);
  const [showRFQModal, setShowRFQModal] = useState(false);

  const rfqProductsRef = useRef({});
  const rfqFormDataRef = useRef({});
  // Tracks the in-flight saveDraft request so a new save can abort the
  // previous one. Holds an AbortController while a request is pending,
  // null once it settles (or has been superseded).
  const saveDraftAbortRef = useRef(null);
  // True once we've read currentStep / maxStepReached from the URL on
  // first mount. Prevents the URL→state hydration from running again
  // when our own state→URL sync replaces the query.
  const stepHydratedFromUrlRef = useRef(false);
  // The hydration effect and the URL-sync effect both fire in the same
  // render once router.isReady flips. Hydration's setCurrentStep is
  // queued, so the sync effect would still observe stale state (=1) and
  // overwrite the URL — clobbering the values we're trying to restore.
  // This one-shot flag tells the sync effect to skip exactly once after
  // hydration; the next render (with state in sync) handles the rest.
  const skipFirstUrlSyncRef = useRef(false);

  const [validationErrors, setValidationErrors] = useState({});
  const [errorProducts, setErrorProducts] = useState(new Set());
  const [rfqFilters, setRfqFilters] = useState([]);
  const [techEvalUsers, setTechEvalUsers] = useState([]);

  // Permission management - fetch permissions based on selected hotels
  // Dynamic module key based on is_tender field (1 = tender, 0 = rfq)
  const moduleKey = rfqFormDataFromStore?.is_tender === 1 ? "boq" : "rfq";
  const {
    canRead,
    canUpdate,
    canCreate,
    allowedProcessIds,
    loading: permissionsLoading,
  } = useModulePermissions({
    moduleKey: moduleKey,
    hotelIds: selectedHotelIds,
    departmentId: rfqFormDataFromStore?.department_id || null,
    enabled: selectedHotelIds.length > 0,
  });

  const fetchVendorsForProduct = async (rfqProductId, refetch = false) => {
    try {
      // Bail early for staged-but-unsaved products. Their accordion key is
      // the stringified `undefined` from `${product.id}`, which slips past a
      // plain `!rfqProductId` check; cast and number-check to reject both
      // missing values and string keys like "undefined" / "null" / "NaN".
      const numericId = Number(rfqProductId);
      if (
        rfqProductId == null ||
        rfqProductId === "" ||
        rfqProductId === "undefined" ||
        rfqProductId === "null" ||
        Number.isNaN(numericId)
      ) {
        return;
      }

      const key = `${rfqProductId}`;
      if(!refetch && vendors?.[key] && vendors[key].length > 0) return;

      const filters = vendorFilters.local?.[rfqProductId] ?? vendorFilters.global;

      let updatedFilters = {};

      if (filters) {
        Object.keys(filters).forEach((filterKey) => {
          const filter = filters[filterKey];

          if (Array.isArray(filter)) {
            updatedFilters[filterKey] = filter
              .map((singleFilter) => singleFilter?.value ?? null)
              .filter(Boolean);
            return;
          }
          updatedFilters[filterKey] = filter?.value ?? null;
        });
      }

      const vendorRes = await getVendorsForRFQProduct(draftRfqId, rfqProductId, updatedFilters);
      const vendorsData = vendorRes.data;

      setVendors(prev => ({
        ...prev,
        [key]: vendorsData
      }))

      return vendorsData
    } catch (error) {
      console.error("ERROR IN `fetchVendorsForProduct` => ", error);
      toast.error(error.message);
    }
  }
  const fetchRfqFilters = async () =>{
   getRfqFilters(draft_id)
   .then((res=>{setRfqFilters(res.data.data || [])}))
   .catch((error)=>{
    toast.error(error.message);
   })
  }


  useEffect(() => {
    if(draft_id){
      fetchRfqFilters();
    }
  }, [draft_id]);

  const fetchCountryCodes = () => {
      getCountryCodes()
        .then((response) => {
          if (response?.data) {
            setCountryCode(response.data);
          } else {
            setCountryCode([]);
          }
        })
        .catch((error) => {
          toast.error(error.message);
          setCountryCode([]);
        });
    };

  const fetchHospitalityContexts = async () => {
    try {
      // Read user hotel mappings from profile
      const mappings = (userProfile?.hospitality_mappings || []).filter(m => m.hospitality_hotel_id != null);
      setUserHotelMappings(mappings);

      // Also fetch contexts for the company/hotel hierarchy dropdown
      const res = await getMyHospitalityContexts();
      const companiesData = res?.data || [];
      if (companiesData.length > 0) {
        const contexts = [];
        companiesData.forEach((company) => {
          contexts.push({ 
            label: company.name, 
            value: `company_${company.id}`, 
            type: 'company', 
            id: company.id 
          });
          if (company.hotels && company.hotels.length > 0) {
            company.hotels.forEach((hotel) => {
              contexts.push({ 
                label: `  └ ${hotel.name}`, 
                value: `hotel_${hotel.id}`, 
                type: 'hotel', 
                id: hotel.id,
                company_id: company.id 
              });
            });
          }
        });
        setHospitalityContexts(contexts);
      }
    } catch (error) {
      console.error("Error fetching hospitality contexts:", error);
    }
  }

  const fetchDepartments = async (hotelId = null) => {
    try {
      const resource = rfqFormDataFromStore?.is_tender === 1 ? 'boq' : 'rfq';
      const params = hotelId ? { hotel_id: hotelId, resource } : {};
      const response = await getDepartments(params);
      const depts = (response?.data?.data || response?.data || []).map((d) => ({
        value: d.id,
        label: d.title || d.name
      }));
      setDepartments(depts);
    } catch (error) {
      console.error("Error fetching departments:", error);
    }
  };

  const fetchProcesses = async () => {
    try {
      const response = await getApprovalProcesses();
      const procs = (response?.data?.data || response?.data || []).map((p) => ({
        value: p.id,
        label: p.name,
      }));
      // Scope filter: when the user's role grants a specific subset of
      // processes (allowedProcessIds is an array, not null), narrow the list
      // to those they're authorized for. null = wildcard (legacy / all-access).
      const filtered = (Array.isArray(allowedProcessIds))
        ? procs.filter((p) => allowedProcessIds.includes(Number(p.value)))
        : procs;
      setProcesses(filtered);
    } catch (error) {
      console.error("Error fetching processes:", error);
    }
  };

  // Pulled in its own callback so child components can ask the page to
  // refresh after adding / deleting a custom unit.
  const refreshUnits = async () => {
    try {
      const response = await getUnits();
      const rows = response?.data?.data || response?.data || [];
      setUnits(Array.isArray(rows) ? rows : []);
    } catch (error) {
      console.error("Error fetching units:", error);
      toast.error("Couldn't load units. Try refreshing.");
    }
  };

  const handleHotelSelectionChange = (hotelIds) => {
    setSelectedHotelIds(hotelIds);

    if (!hotelIds || hotelIds.length === 0) {
      dispatch(setOtherFormFields({ field_name: "hotel_id", value: null }));
      dispatch(setOtherFormFields({ field_name: "hospitality_company_id", value: null }));
    } else {
      // If single hotel selected, set the hotel_id and company_id
      if (hotelIds.length === 1) {
        const selectedHotel = userHotelMappings.find(h => h.hospitality_hotel_id === hotelIds[0]);
        if (selectedHotel) {
          dispatch(setOtherFormFields({ field_name: "hotel_id", value: selectedHotel.hospitality_hotel_id }));
          dispatch(setOtherFormFields({ field_name: "hospitality_company_id", value: selectedHotel.hospitality_company_id }));
        }
      }
    }

    // Clear department selection when hotel changes since available departments may differ
    // (departments are re-fetched by the selectedHotelIds useEffect)
    dispatch(setOtherFormFields({ field_name: "department_id", value: null }));
    dispatch(setOtherFormFields({ field_name: "project_id", value: -1 }));
    setHasUnsavedChanges(true);
  }

  const handleHospitalityContextChange = (selectedOption) => {
    if (!selectedOption) {
      dispatch(setOtherFormFields({ field_name: "hospitality_company_id", value: null }));
      dispatch(setOtherFormFields({ field_name: "hotel_id", value: null }));
      return;
    }
    if (selectedOption.type === 'company') {
      dispatch(setOtherFormFields({ field_name: "hospitality_company_id", value: selectedOption.id }));
      dispatch(setOtherFormFields({ field_name: "hotel_id", value: null }));
    } else if (selectedOption.type === 'hotel') {
      dispatch(setOtherFormFields({ field_name: "hospitality_company_id", value: selectedOption.company_id }));
      dispatch(setOtherFormFields({ field_name: "hotel_id", value: selectedOption.id }));
    }
    dispatch(setOtherFormFields({ field_name: "project_id", value: -1 }));
    setHasUnsavedChanges(true);
  }

  const getVendorApproveList = async () => {
    try {
      const approvedBy = await getDataWithLoading(vendorApproveList, setLoading);
      setInitialFilterOptions(prev => ({
        ...prev,
        approvedBy: approvedBy.data,
      }))
    } catch (error) {
      throw error;
    }
  };

 

  const getMakesProductWise = async (rfqProductId, product_id) => {
    try {
      if(initialFilterOptions.productMakes?.[rfqProductId]) return;

      const productMakes = await getProductMakeList(product_id);
      setInitialFilterOptions(prev => ({
        ...prev,
        productMakes: { ...prev.productMakes, [rfqProductId]: productMakes ?? [] }
      }))
    } catch (error) {
      throw error;
    }
  };


  // Profile details now come from Redux selector (userProfile)

  const getTermsData = () => {
    getTerms()
      .then((res) => {
        // Normalize terms to ensure consistent structure before adding to Redux
        if (res.data && Array.isArray(res.data)) {
          const normalizedTerms = res.data.map(term => {
            // Extract term ID with fallback
            const termId = String(term.id || term.term_id);
            
            // Extract term content with fallbacks
            const termContent = term.term_content || term.name || term.term_text || 
                             (term.content && term.content[0] ? term.content[0].title : null) ||
                             `Term ${termId}`;
            
            // Return normalized term with consistent properties
            return {
              ...term, // Keep all original properties
              id: termId, // Always have id as string
              term_id: termId, // Add term_id for compatibility
              term_content: termContent, // Ensure term_content exists
              name: termContent // Ensure name exists
            };
          });
          
          dispatch(setAllTerms(normalizedTerms));
        } else {
          toast.error("Something went wrong fetching terms, please refresh the page.");
          dispatch(setAllTerms([]));
        }
      })
      .catch((err) => {
        toast.error(err.message);
      });
  };

  const handleTermChange = (e, item) => {
    try {
      setTermsChanged(true);
      const isChecked = e.target.checked;
      // Always convert ID to string for consistent comparison
      const termId = String(item.id || item.term_id);
      
      // Extract term content with fallbacks
      const termName = item.term_content || item.name || item.term_text || 
                     (item.content && item.content[0] ? item.content[0].title : null) ||
                     `Term ${termId}`;
      
      // Clone the current terms array to avoid direct state mutation
      let updatedTerms = [...(selectedTerms || [])];
      
      if (isChecked) {
        // Make sure term isn't already selected (checking both id and term_id)
        const existingTerm = updatedTerms.find(term => 
          String(term.id) === termId || String(term.term_id) === termId
        );
        
        if (!existingTerm) {
          // IMPORTANT: Only store id and name as required by backend
          updatedTerms.push({
            id: Number(termId), // Convert to number as required by backend
            name: termName
          });
        }
      } else {
        updatedTerms = updatedTerms.filter(term => {
          const cond = term.id != termId
          return cond
        })
      }
      
      // Update Redux with the new terms array
      dispatch(setTermsData(updatedTerms));
      setHasUnsavedChanges(true);
      setTermsChanged(true);
    } catch (error) {
      console.error("Error handling term change:", error);
      toast.error("An error occurred while updating terms. Please try again.");
    }
  };

  const getProjectData = async (projectId) => {
    try {
      const res = await getProjectTableDataById(projectId);
      const projectData = res.data[0];
      return projectData;
    } catch (error) {
      console.error("Error fetching project data:", error.message);
      throw error;
    }
  };

  const validateDates = (name, value, currentFormData) => {
    let error = '';
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time for date-only comparisons if needed

    const bidEndDate = currentFormData.bid_end_date ? new Date(currentFormData.bid_end_date) : null;
    const raStartDate = currentFormData.ra_start_date ? new Date(currentFormData.ra_start_date) : null;
    const raEndDate = currentFormData.ra_end_date ? new Date(currentFormData.ra_end_date) : null;

    if (name === 'ra_start_date' && value && currentFormData.reverse_auction) {
        const selectedStartDate = new Date(value);
        // Changes by Agnij 2025-05-03 [Removed RA must be after bid end constraint]
        // Removed constraint that RA start must be after bid end date

        // mukul 04/may/2025: Ensure RA start date is strictly one day after bid end date
        if (selectedStartDate && bidEndDate) {
          const bidEndDateOnly = new Date(bidEndDate);
          bidEndDateOnly.setHours(0, 0, 0, 0);
        
          const raStartDateOnly = new Date(selectedStartDate);
          raStartDateOnly.setHours(0, 0, 0, 0);
        
          const diffInDays = (raStartDateOnly - bidEndDateOnly) / (1000 * 60 * 60 * 24);
        
          if (diffInDays < 1) {
            error = 'Auction Start Date must be at least one day after the Quote Submission End Date.';
          } else if (selectedStartDate < today) {
            error = 'Auction Start Date/Time cannot be in the past.';
        }}
    } else if (name === 'ra_end_date' && value && currentFormData.reverse_auction) {
        const selectedEndDate = new Date(value);
        // Changes by Agnij 2025-05-03 [Removed RA end must be after bid end constraint]
        // Removed constraint that RA end must be after bid end date

        // mukul - 04/may/2025: Ensure RA end date is on or after RA start date and have 60min gap
        if (raStartDate) {
          const timeDifference = selectedEndDate - raStartDate; // in ms
          if (timeDifference < 60 * 60 * 1000) {
            error = 'Reverse Auction End Time must be at least 60 minutes after the Start Time.';
        }}
    } else if (name === 'vendor_clarification_date' && value) {
        // Vendor Clarification Date Validation. In edit mode the cross-field
        // gap rules are relaxed in favor of the "≥ 60 min from now" floor; in
        // create mode the original chronology rules apply. Once ≥1 vendor has
        // responded the field is locked and validation is skipped entirely —
        // the stored date is typically already in the past at that point.
        if (isEditMode && _editMeta.has_received_quotes) {
          return '';
        }
        const clarificationDate = new Date(value);
        if (isEditMode) {
          if ((clarificationDate - new Date()) < 60 * 60 * 1000) {
            error = 'Vendor Clarification End Date must be at least 60 minutes from now.';
          }
        } else {
          const publishDate = currentFormData.tender_publish_date
            ? new Date(currentFormData.tender_publish_date) : null;

          // Rule 1: Must be at least 5 minutes after tender publish date
          if (publishDate && (clarificationDate - publishDate) < 5 * 60 * 1000) {
            error = 'Vendor Clarification End Date must be at least 5 minutes after the Publish Date & Time.';
          }

          // Rule 2: Quote Submission End Date must be at least 24 hours after Clarification
          if (!error && bidEndDate) {
            const diffInHours = (bidEndDate - clarificationDate) / (1000 * 60 * 60);
            if (diffInHours < 24) {
              error = 'Quote Submission End Date must be at least 24 hours after the Vendor Clarification End Date.';
            }
          }
        }
    } else if (name === 'reverse_auction' && !value) {
      // If disabling RA, clear potential errors for RA dates
      setValidationErrors(prev => ({ ...prev, ra_start_date: '', ra_end_date: '' }));
    } else if (name === 'reverse_auction' && value) {
       // If enabling RA, re-validate existing dates
       const startError = validateDates('ra_start_date', raStartDate, currentFormData);
       const endError = validateDates('ra_end_date', raEndDate, currentFormData);
       const bidEndError = validateDates('bid_end_date', bidEndDate, currentFormData);
       setValidationErrors(prev => ({ ...prev, ra_start_date: startError, ra_end_date: endError, bid_end_date: bidEndError }));
    }

    return error;
  };

  const handleFormFieldChange = async (e, selectedOption, actionMeta) => {
    let name = e?.target?.name || actionMeta?.name;
    let value = e?.target?.value || selectedOption?.value || "";

    // Editing the field that submit-time validation just rejected clears
    // its red highlight — same UX as the existing isFieldMissing path.
    if (name && submitInvalidField === name) {
      setSubmitInvalidField(null);
    }

    // Tender Publish Date validation
    if (name === "tender_publish_date" && value) {
      const publishDate = new Date(value);
      if ((publishDate - new Date()) < 5 * 60 * 1000) {
        toast.error("Publish Date & Time must be at least 5 minutes from now.");
        return;
      }
    }

    // Quote Submission End Date validation — must be at least 24h after the
    // Vendor Clarification End Date (create flow). In edit mode this gap rule
    // is replaced by a "≥ 120 min from now" floor so buyers can compress the
    // timeline when fixing dates on a saved RFQ.
    if (name === "bid_end_date" && value) {
      const bidEndDate = new Date(value);
      if (isEditMode) {
        if ((bidEndDate - new Date()) < 120 * 60 * 1000) {
          toast.error("Quote Submission End Date must be at least 120 minutes from now.");
          return;
        }
      } else if (rfqFormDataFromStore.vendor_clarification_date) {
        const clarificationDate = new Date(rfqFormDataFromStore.vendor_clarification_date);
        const diffInHours = (bidEndDate - clarificationDate) / (1000 * 60 * 60);
        if (diffInHours < 24) {
          toast.error("Quote Submission End Date must be at least 24 hours after the Vendor Clarification End Date.");
          return;
        }
      }
    }

    // Vendor Clarification Date validation — "≥ publish + 5 min" in create
    // flow; "≥ 60 min from now" in edit mode. Skipped entirely once a vendor
    // has responded (field is locked at that point).
    if (name === "vendor_clarification_date" && value && !(isEditMode && _editMeta.has_received_quotes)) {
      const clarificationDate = new Date(value);
      if (isEditMode) {
        if ((clarificationDate - new Date()) < 60 * 60 * 1000) {
          toast.error("Vendor Clarification End Date must be at least 60 minutes from now.");
          return;
        }
      } else if (rfqFormDataFromStore.tender_publish_date) {
        const publishDate = new Date(rfqFormDataFromStore.tender_publish_date);
        if ((clarificationDate - publishDate) < 5 * 60 * 1000) {
          toast.error("Vendor Clarification End Date must be at least 5 minutes after the Publish Date & Time.");
          return;
        }
      }
    }

    // Cascade-clear dependent dates so the chain
    //   Publish → Vendor Clarification End → Quote Submission End
    // never holds a stale value that's now out of order. Editing the publish
    // date clears the next two; editing clarification clears the bid end.
    if (name === "tender_publish_date") {
      if (rfqFormDataFromStore.vendor_clarification_date) {
        dispatch(setOtherFormFields({ field_name: "vendor_clarification_date", value: "" }));
      }
      if (rfqFormDataFromStore.bid_end_date) {
        dispatch(setOtherFormFields({ field_name: "bid_end_date", value: "" }));
      }
    }
    if (name === "vendor_clarification_date") {
      if (rfqFormDataFromStore.bid_end_date) {
        dispatch(setOtherFormFields({ field_name: "bid_end_date", value: "" }));
      }
    }

    if (name === "reverse_auction") {
      value = parseInt(value);

      if (value === 0) {
        // Clear reverse auction dates when disabled
        dispatch(setOtherFormFields({ field_name: "ra_start_date", value: null }));
        dispatch(setOtherFormFields({ field_name: "ra_end_date", value: null }));
      } else if (value === 1) {
        // Changes by Agnij 2025-05-03 [Removed default date setting for reverse auction]
        // Display a toast message to inform the user to set auction dates
        toast.info("Please set the Auction Start Date & Time and End Date & Time for reverse auction");
      }
    }

    if (name === "is_tender") {
      value = parseInt(value);
    if (value === 0) {
      dispatch(setOtherFormFields({ field_name: "tender_fees", value: 0 }));
    }
    }

  if (name === "tender_fees") {
    const numericValue = parseFloat(value || 0);
    const paise = isNaN(numericValue) ? 0 : Math.max(0, Math.round(numericValue * 100));
    dispatch(setOtherFormFields({ field_name: "tender_fees", value: paise }));
    setHasUnsavedChanges(true);
    return;
  }

    // Handle datetime-local inputs for auction and tender dates
    if ((name === 'bid_end_date' || name === 'ra_start_date' || name === 'ra_end_date' || name === 'tender_publish_date' || name === 'vendor_clarification_date') && value) {
      // Changes by Agnij 2025-05-03 [Fixed timestamp format issue]
      // Convert from datetime-local format to server expected format
      // This preserves the exact time without timezone adjustments
      const [datePart, timePart] = value.split('T');
      value = `${datePart} ${timePart}`; // Don't add the extra :00 as it's causing database errors
    }

    if (name === "project_id" && value !== -1) {
      try {
        const projectData = await getProjectData(value);

        if (projectData) {
          dispatch(setOtherFormFields({ field_name: "rfq_type", value: projectData.rfq_type || "" }));
          dispatch(
            setOtherFormFields({
              field_name: "reverse_auction",
              value: projectData.reverse_auction !== undefined ? projectData.reverse_auction : 0,
            })
          );
          dispatch(
            setOtherFormFields({
              field_name: "bid_end_date",
              value: projectData.ended_at ? new Date(projectData.ended_at).toISOString().split("T")[0] : "",
            })
          );
          dispatch(setOtherFormFields({ field_name: "location", value: projectData.location || "" }));
          dispatch(
            setOtherFormFields({
              field_name: "term_and_condition_files",
              value: projectData.files
                ? projectData.files
                    .filter((file) => file.file_type === "tc")
                    .map((file) => (file.file_url))
                : [],
            })
          );

        } else {
          console.error("Project data is empty or undefined.");
        }
      } catch (error) {
        console.error("Failed to handle project_id change:", error.message);
      }

      // Fetch tech eval users for the selected project
      try {
        const res = await getTechEvalUsers(value);
        setTechEvalUsers(res || []);
      } catch (err) {
        toast.error("Failed to fetch technical evaluation users");
        setTechEvalUsers([]);
      }
    }

    if (name === "project_id" && (value === -1 || value === "" || value === null)) {
      setTechEvalUsers([]);
    }

    dispatch(setOtherFormFields({ field_name: name, value }));
    setHasUnsavedChanges(true);
  };

  const handleTechEvalUserChange = (e) => {
    const value = e.target.value;
    const parsedValue = value ? Number(value) : null;
    setHasUnsavedChanges(true);
  };


//If the length of Term Files is greater than 0, set termFilesChanged to true or else false  
useEffect(() => {
  
  setTermFilesChanged(termFiles.length > 0);
}, [termFiles]);


  const handleTermFiles = async (type, dynamicParam) => {
    if (type === "add") {
      try {
        const filePath = await handleFileUpload(dynamicParam);
        dispatch(setTermFiles({ type, value: filePath }))

      } catch (error) {
        let message = error.message;
        toast.error(message);
      }
    } else {
      dispatch(setTermFiles({ type, value: dynamicParam }))
      toast.success("File removed");
    }
    setHasUnsavedChanges(true);
    setTermFilesChanged(true);
  };

  const validateRFQFields = (values) => {
    // Deep clone the form data to avoid direct mutation
    const formDataCopy = JSON.parse(JSON.stringify(rfqFormDataRef.current));

    // Ensure company_name is included from either form values, Redux store, or user profile
    formDataCopy.company_name = values.company_name || formDataCopy.company_name || userProfile?.company_name || "";

    // Each early-return now also reports the step the failed field lives on
    // so the submit handler can park the user there. Step map:
    //  1 → Products  ·  2 → Details  ·  3 → Timeline  ·  4 → Terms
    // The optional `field` is the form-field name to highlight even when it
    // has a value (so business-rule failures like "must be 5 min from now"
    // get the same red border as missing-field failures).
    const fail = (step, message, field = null) => {
      toast.error(message);
      setMainLoading(false);
      return { ok: false, step, field };
    };

    // Changes by Agnij 2025-05-03 [Validate reverse auction dates without default values]
    if (formDataCopy.reverse_auction === 1) {
      if (!formDataCopy.ra_start_date || formDataCopy.ra_start_date === '') {
        return fail(3, "Please set the Auction Start Date & Time for reverse auction", "ra_start_date");
      }
      if (!formDataCopy.ra_end_date || formDataCopy.ra_end_date === '') {
        return fail(3, "Please set the Auction End Date & Time for reverse auction", "ra_end_date");
      }
    }

    // Details step required fields — title + contact trio. Without these
    // the Save Changes path would POST to /rfq/update and only surface the
    // failure as a backend-driven toast, leaving the empty field un-highlighted.
    if (!formDataCopy.title || String(formDataCopy.title).trim() === '') {
      return fail(2, "Please enter the RFQ Title", "title");
    }

    // Department is required when departments are available
    if (departments.length > 0 && !formDataCopy.department_id) {
      return fail(2, "Please select a department", "department_id");
    }

    // Process is required for RFQ creation
    if (!formDataCopy.process_id) {
      return fail(2, "Please select a process", "process_id");
    }

    if (!formDataCopy.contact_name || String(formDataCopy.contact_name).trim() === '') {
      return fail(2, "Please enter the Contact person name", "contact_name");
    }
    if (!formDataCopy.response_email || String(formDataCopy.response_email).trim() === '') {
      return fail(2, "Please enter the Email", "response_email");
    }
    if (!formDataCopy.contact_number || String(formDataCopy.contact_number).trim() === '') {
      return fail(2, "Please enter the Contact Number", "contact_number");
    }

    // Publish Date & Time is required and must be at least 5 minutes from now
    if (!formDataCopy.tender_publish_date) {
      return fail(3, "Please select Publish Date & Time", "tender_publish_date");
    }
    const publishDate = new Date(formDataCopy.tender_publish_date);
    if (!isFieldLocked('tender_publish_date')) {
      if ((publishDate - new Date()) < 5 * 60 * 1000) {
        return fail(3, "Publish Date & Time must be at least 5 minutes from now.", "tender_publish_date");
      }
    }

    // Vendor Clarification End Date — required. "≥ publish + 5 min" in create
    // flow; "≥ 60 min from now" in edit mode (the cross-field gap is relaxed
    // so saved-RFQ timelines can be compressed). Once ≥1 vendor has responded
    // the field is locked and the stored date is usually already in the past,
    // so we skip these checks entirely to avoid blocking bid_end_date updates.
    const skipClarificationValidation = isEditMode && _editMeta.has_received_quotes;
    let clarificationDate = null;
    if (!skipClarificationValidation) {
      if (!formDataCopy.vendor_clarification_date) {
        return fail(3, "Please select Vendor Clarification End Date", "vendor_clarification_date");
      }
      clarificationDate = new Date(formDataCopy.vendor_clarification_date);
      if (isEditMode) {
        if ((clarificationDate - new Date()) < 60 * 60 * 1000) {
          return fail(3, "Vendor Clarification End Date must be at least 60 minutes from now.", "vendor_clarification_date");
        }
      } else if ((clarificationDate - publishDate) < 5 * 60 * 1000) {
        return fail(3, "Vendor Clarification End Date must be at least 5 minutes after the Publish Date & Time.", "vendor_clarification_date");
      }
    }

    // Quote Submission End Date — required. "≥ clarification + 24 h" in create
    // flow; "≥ 120 min from now" in edit mode.
    if (!formDataCopy.bid_end_date) {
      return fail(3, "Please select Quote Submission End Date", "bid_end_date");
    }
    const bidEndDate = new Date(formDataCopy.bid_end_date);
    if (isEditMode) {
      if ((bidEndDate - new Date()) < 120 * 60 * 1000) {
        return fail(3, "Quote Submission End Date must be at least 120 minutes from now.", "bid_end_date");
      }
    } else if ((bidEndDate - clarificationDate) < 24 * 60 * 60 * 1000) {
      return fail(3, "Quote Submission End Date must be at least 24 hours after the Vendor Clarification End Date.", "bid_end_date");
    }

    // Per-product character limits — Size 200, Spec 2000, Comment 1000.
    // Walks the live product list (rfqProductsFromStore) plus any in-flight
    // edits in updatableData.products.updatable.specs / .comment so that
    // both fresh entries and unsaved edits in the edit-RFQ flow are caught.
    const PRODUCT_LIMITS = { Size: 200, Spec: 2000, comment: 1000 };
    const products = Array.isArray(rfqProductsFromStore) ? rfqProductsFromStore : [];
    for (const product of products) {
      if (!product) continue;
      const productLabel = product.name || `product #${product.product_id}`;
      // Spec values: prefer live edits in updatableData, fall back to stored spec[]
      const editedSpecs = updatableData?.products?.updatable?.specs?.[specDeltaKey(product)] || {};
      const storedSpecs = Array.isArray(product.spec) ? product.spec : [];
      const readSpec = (title) => {
        if (Object.prototype.hasOwnProperty.call(editedSpecs, title)) return editedSpecs[title];
        const found = storedSpecs.find(s => (s.title || "").toLowerCase() === title.toLowerCase());
        return found ? (found.value ?? "") : "";
      };
      for (const title of ["Size", "Spec"]) {
        const val = readSpec(title);
        const limit = PRODUCT_LIMITS[title];
        if (typeof val === "string" && val.length > limit) {
          return fail(1, `${title === "Size" ? "Product Size" : "Product Specification"} for "${productLabel}" exceeds ${limit} characters (currently ${val.length}).`);
        }
      }
      // Per-product comment: prefer live edit, fall back to stored value
      const editedComment = updatableData?.products?.updatable?.comment?.[product.id];
      const commentVal = (editedComment !== undefined ? editedComment : product.comment) || "";
      if (typeof commentVal === "string" && commentVal.length > PRODUCT_LIMITS.comment) {
        return fail(1, `Comment for "${productLabel}" exceeds ${PRODUCT_LIMITS.comment} characters (currently ${commentVal.length}).`);
      }
    }

    return { ok: true };
  }

  const handleCreateRFQ = (values) => {
    setErrorProducts(new Set());
    setMainLoading(true);
    setHasUnsavedChanges(false);

    // Use values from the form submission
    const mobileNumber = values.contact_number.trim().replace(/^0+/, "");
    const fullMobile = `${onecountrycode}-${mobileNumber}`;
    
    // Deep clone the form data to avoid direct mutation
    const formDataCopy = JSON.parse(JSON.stringify(rfqFormDataRef.current));

    // Remove spurious keys that are not expected by the backend
    delete formDataCopy.value;
    delete formDataCopy.created_by;

    // Ensure company_name is included from either form values, Redux store, or user profile
    formDataCopy.company_name = values.company_name || formDataCopy.company_name || userProfile?.company_name || "";

    // Ensure bid_end_date is in server expected format (YYYY-MM-DD HH:MM:SS)
    if (formDataCopy.bid_end_date && !formDataCopy.bid_end_date.includes(' ')) {
      if (formDataCopy.bid_end_date.includes('T')) {
        const [date, time] = formDataCopy.bid_end_date.split('T');
        formDataCopy.bid_end_date = `${date} ${time}`;
      }
    }

    // Changes by Agnij 2025-05-03 [Validate reverse auction dates without default values]
    if (formDataCopy.reverse_auction === 1) {
      // Ensure dates are in server expected format (YYYY-MM-DD HH:MM:SS)
      if (formDataCopy.ra_start_date && !formDataCopy.ra_start_date.includes(' ')) {
        if (formDataCopy.ra_start_date.includes('T')) {
          const [date, time] = formDataCopy.ra_start_date.split('T');
          formDataCopy.ra_start_date = `${date} ${time}`; // Changes by Agnij 2025-05-03 [Fixed timestamp format]
        }
      }
      
      if (formDataCopy.ra_end_date && !formDataCopy.ra_end_date.includes(' ')) {
        if (formDataCopy.ra_end_date.includes('T')) {
          const [date, time] = formDataCopy.ra_end_date.split('T');
          formDataCopy.ra_end_date = `${date} ${time}`; // Changes by Agnij 2025-05-03 [Fixed timestamp format]
        }
      }
    } else if (formDataCopy.reverse_auction === 0) {
      // If reverse auction is disabled, explicitly set dates to null
      formDataCopy.ra_start_date = null;
      formDataCopy.ra_end_date = null;
    }
    
    // Handle tender-specific fields
    if (formDataCopy.is_tender === 0 || !formDataCopy.is_tender) {
      formDataCopy.tender_fees = 0;
      // tender_publish_date and vendor_clarification_date are now supported for both RFQs and tenders
    } else if (formDataCopy.is_tender === 1) {
      // Ensure entered tender_fees from store is used; use 0 when cleared (null)
      formDataCopy.tender_fees = rfqFormDataFromStore.tender_fees != null ? rfqFormDataFromStore.tender_fees : (formDataCopy.tender_fees ?? 0);
      // rfq_type (Firm/Budgetary) is not applicable for tenders
      delete formDataCopy.rfq_type;
    }
    
    // IMPORTANT: Normalize terms to ensure proper format for backend
    if (formDataCopy.terms && Array.isArray(formDataCopy.terms)) {
      formDataCopy.terms = formDataCopy.terms.map(term => ({
        id: Number(term.id), // Convert to number for backend
        name: term.name // Only include id and name
      }));
    }

    const filters = getRefinedFilters();
    const cleanedUpdatableData = cleanUpdatableData(updatableData);
    
    let payload = {
      rfq_id: rfqDetails,
      ...formDataCopy,
      project_id: formDataCopy.project_id || -1,
      contact_number: fullMobile,
      updatableData: cleanedUpdatableData,
      filters,
      termsChanged,
      termFilesChanged,
      hotel_ids: selectedHotelIds,
    };

    console.log("PAYLOAD:", payload);

    // Remove country_code if it exists
    if (payload.hasOwnProperty("country_code")) {
      delete payload.country_code;
    }

    if(selectedSheet && selectedSheet.value) {
      payload.sheet_id = selectedSheet.value;
    }

    setShowRFQModal(false);

    // Edit-RFQ flow: route Submit through /rfq/update with the full snapshot
    // payload instead of /rfq/create. Same shape used by handleSaveDraft.
    if (isEditMode) {
      const liveUpdatableData = updatableDataRef.current ?? updatableData;
      const editPayload = buildEditSnapshotPayload({
        editRfqId,
        formDataCopy,
        fullMobile,
        rfqProductsFromStore,
        selectedTerms,
        selectedHotelIds,
        liveUpdatableData,
      });
      updateRfq(editPayload)
        .then((res) => {
          setMainLoading(false);
          toast.success(
            <h6>
              <b>{getEntityLabel(rfqFormDataFromStore?.is_tender)} #{res?.message?.rfq?.rfq_no || editRfqId}:</b> Successfully updated!
            </h6>,
            { position: "top-right" }
          );
          setUpdatableData({
            products: { addable: [], deletable: [], updatable: {} },
            vendors: {},
          });
          setErrorProducts(new Set());
          setHasUnsavedChanges(false);
          rfqProductsRef.current = [];
          rfqFormDataRef.current = {};
          router.push("/dashboard/buyer/rfq-management");
          dispatch(clearRfqState());
        })
        .catch((err) => {
          setMainLoading(false);
          setHasUnsavedChanges(true);
          // updateRfq rejects with { message: <string>, error: <axiosError> }
          const errorData = err?.error?.response?.data;
          const errorMessage =
            err?.message ||
            errorData?.message ||
            errorData?.errors?.message ||
            `Failed to update ${getEntityLabel(rfqFormDataFromStore?.is_tender)}. Please try again.`;
          if (errorData?.errors?.details && Array.isArray(errorData.errors.details)) {
            const missingVendorIds = errorData.errors.details.map(d => d.rfqProductId);
            setErrorProducts(new Set(missingVendorIds));
          }
          // Jump to the step that owns the failing field so the user can
          // see what to fix without hunting for it.
          const failingField = errorData?.field;
          const targetStep = failingField ? submitFieldStep(failingField) : null;
          if (targetStep) {
            setCurrentStep(targetStep);
            setMaxStepReached((m) => Math.max(m, targetStep));
            setSubmitInvalidField(failingField);
            setTriedNextOnStep(targetStep);
          }
          toast.error(errorMessage);
        });
      return;
    }

    createRfq(payload)
      .then((res) => {
        setMainLoading(false);
        toast.success(
          <h6>
            <b>{getEntityLabel(rfqFormDataFromStore?.is_tender)} #{res.data.rfq_no}:</b> Successfully created!
          </h6>,
          { position: "top-right" }
        );
        setUpdatableData({
          products: {
            addable: [],
            deletable: [],
            updatable: {},
          },
          vendors: {},
        })
        setErrorProducts(new Set()); // Ensure cleared after create
        setHasUnsavedChanges(false);
        rfqProductsRef.current = [];
        rfqFormDataRef.current = {};

        router.push("/dashboard/buyer/rfq-management");
        dispatch(clearRfqState());
      })
      .catch((err) => {
        setMainLoading(false);
        setHasUnsavedChanges(true);

        const errorData = err?.message?.response?.data;
        const errorMessage = errorData?.message || `Failed to create ${getEntityLabel(rfqFormDataFromStore?.is_tender)}. Please check your form and try again.`;

        // Typed-code errors (NO_APPROVAL_POLICY_FOR_PROCESS / PROCESS_NOT_IN_USER_SCOPE
        // / PROCESS_REQUIRED) — surface the banner above the submit footer with
        // an admin-aware deep link rather than a transient toast.
        if (errorData?.code) {
          setScopeError(errorData);
          toast.error(errorMessage);
          return;
        }

        if (errorData?.status === 2 && Array.isArray(errorData.details)) {
          const missingVendorIds = errorData.details.map(d => d.rfqProductId);
          setErrorProducts(new Set(missingVendorIds));
          setCurrentStep(1);
          setMaxStepReached((m) => Math.max(m, 1));
          setTimeout(() => {
            const firstError = document.querySelector(".rfq-tag--red");
            if (firstError) {
              firstError.scrollIntoView({ behavior: "smooth", block: "center" });
            }
          }, 0);
          toast.error(errorMessage);
        } else {
          toast.error(errorMessage);
        }
      });
  };

  const handleCreateConfirm = () => {
    if (pendingFormValues) {
      handleCreateRFQ(pendingFormValues);
      setShowCreateConfirmModal(false);
      setPendingFormValues(null);
    }
  };

  const handleCreateCancel = () => {
    setShowCreateConfirmModal(false);
    setPendingFormValues(null);
  };

  const getRefinedFilters = () => {
    const filters = vendorFilters;

    let updatedFilters = {
      global: {},
      local: {},
    };

    if (filters) {
      Object.entries(filters.global).forEach(([filterKey, filter]) => {
        updatedFilters.global[filterKey] = Array.isArray(filter) ? filter.map(value => value.value) : filter;
      });

      Object.keys(filters.local).forEach((id) => {
        const productFilters = filters.local[id];

        if(productFilters)
          Object.keys(productFilters).forEach(filterKey => {
            if(!updatedFilters.local?.[id]) {
              updatedFilters.local[id] = {};
            }
            const filter = productFilters[filterKey];

            if (Array.isArray(filter)) {
              updatedFilters.local[id][filterKey] = filter
                .map((singleFilter) => singleFilter?.value ?? null)
                .filter(Boolean);
              return;
            }
            updatedFilters.local[id][filterKey] = filter?.value ?? null;
          })
      });
    }

    return updatedFilters;
  }

  const refreshVendorCounts = async (productIds = []) => {
    if (!productIds || productIds.length === 0) return;
    try {
      await Promise.all(
        productIds.map((productId) => fetchVendorsForProduct(productId, true))
      );
    } catch (error) {
      console.error("Failed to refresh vendor counts:", error);
    }
  };

  // Generic helpers: get a spec field value (checks updatableData first, then product.spec(s), then direct prop)
  const getSpecFieldValue = (product, fieldName) => {
    // Coerce shapes that aren't strings/numbers — e.g. an array of
    // { title, value } pairs that slipped through — into a readable string.
    // Without this, React renders them as "[object Object],[object Object]".
    const coerce = (v) => {
      if (v === undefined || v === null) return v;
      if (Array.isArray(v)) {
        return v
          .map((item) => {
            if (item && typeof item === "object") {
              return item.value ?? item.val ?? "";
            }
            return item ?? "";
          })
          .filter((s) => s !== "" && s !== null && s !== undefined)
          .join(", ");
      }
      if (typeof v === "object") return v.value ?? v.val ?? "";
      return v;
    };

    // 1) updatableData (Item writes here)
    // Same key handleSpecChange writes under — an unsaved product has no
    // product.id, and reading by it here would make the Review step forget
    // the quantity the buyer just typed.
    const specsUp = updatableData?.products?.updatable?.specs?.[specDeltaKey(product)];
    if (specsUp) {
      // try several key variants
      const candidates = [fieldName, fieldName.toLowerCase(), fieldName.charAt(0).toUpperCase() + fieldName.slice(1)];
      for (const k of candidates) {
        if (Object.prototype.hasOwnProperty.call(specsUp, k)) return coerce(specsUp[k]);
      }
      // also try any key that case-insensitively matches
      for (const k of Object.keys(specsUp)) {
        if (k.toLowerCase() === fieldName.toLowerCase()) return coerce(specsUp[k]);
      }
    }

    // 2) product.spec or product.specs array of { title|label, value }
    const pSpecs = product?.spec || product?.specs;
    if (Array.isArray(pSpecs)) {
      const found = pSpecs.find((s) => ((s.title || s.label || "").toLowerCase() === fieldName.toLowerCase()));
      if (found) return found.value ?? found.val ?? "";
    }

    // 3) direct property on product (e.g., product.quantity or product.unit).
    // Skip when the property is an array/object — that's the spec *container*
    // (e.g. product.spec is the [{title,value}] list), not the value the
    // caller asked for. Returning the container would smush every spec item
    // into the field (e.g. "tonne, 50" under "Product Specification").
    const directKey = fieldName.toLowerCase();
    if (Object.prototype.hasOwnProperty.call(product, directKey)) {
      const direct = product[directKey];
      if (direct === null || direct === undefined) return direct;
      if (typeof direct !== "object") return direct;
    }

    return undefined;
  };

  // "Empty" for quantity and unit means what the SERVER means, not merely
  // "the box has characters in it". The old rule here passed anything
  // non-blank, so '0', '-5' and 'abc' looked filled in on the Review step and
  // were then rejected on submit — the client ticket. Quantity and unit go
  // through the shared predicate that mirrors rfqModel.checkRFQCompletion;
  // any other spec field keeps the plain emptiness check.
  const isSpecFieldEmpty = (product, fieldName) => {
    const v = getSpecFieldValue(product, fieldName);
    const field = String(fieldName).toLowerCase();
    if (field === "quantity") return !isQuantityValid(v);
    if (field === "unit") return !isUnitValid(v);
    return v === undefined || v === null || v === "" || v === "NAN" || v === "NA" || v === "N/A";
  };

  // list any spec keys you want validated on Save Changes
  const specFieldsToValidate = ["quantity", "unit"]; 
  // highlight when Save Changes clicked and any *active* product has any specified empty field
  // skip products that are marked deletable (removed from RFQ)
  const hasEmptySpecFields = rfqProducts.some(
    (p) =>
      !updatableData.products.deletable.includes(p.id) &&
      specFieldsToValidate.some((f) => isSpecFieldEmpty(p, f))
  );

  const handleSaveDraft = async () => {
    // Supersede any prior in-flight save — the latest payload wins. The
    // previous request's catch will see an ERR_CANCELED and bail without
    // toasting / triggering side effects.
    if (saveDraftAbortRef.current) {
      saveDraftAbortRef.current.abort();
    }
    const controller = new AbortController();
    saveDraftAbortRef.current = controller;

    const contactNumber = rfqFormDataRef?.current?.contact_number?.trim();
    const parts = contactNumber?.includes('-') ? contactNumber?.split('-') : [contactNumber];
    const cleanedNumber = parts[parts.length - 1];    
    const fullMobile = `${onecountrycode}-${cleanedNumber}`;

    // Deep clone the form data to avoid direct mutation
    const formDataCopy = JSON.parse(JSON.stringify(rfqFormDataRef.current));

    // Remove spurious 'value' key that is not expected by the backend
    delete formDataCopy.value;

    // IMPORTANT: Filter terms to only include id and name to prevent validation errors
    if (formDataCopy.terms && Array.isArray(formDataCopy.terms)) {
      formDataCopy.terms = formDataCopy.terms.map(term => ({
        id: Number(term.id || term.term_id), // Convert to number for backend
        name: term.name || term.term_content || `Term ${term.id}`
      }));

    }
    // Make sure we maintain the rfq_added_from flag if this is a magic search RFQ
    if (isMagicRfq && !formDataCopy.rfq_added_from) {
      formDataCopy.rfq_added_from = 'magic';
    }
    // Ensure entered tender_fees from store is used when saving draft; use 0 when cleared (null)
    if (formDataCopy.is_tender === 1) {
      formDataCopy.tender_fees = rfqFormDataFromStore.tender_fees != null ? rfqFormDataFromStore.tender_fees : (formDataCopy.tender_fees ?? 0);
    }

    const filters = getRefinedFilters();
    // Prefer the synchronously-updated ref so an upload that happens just
    // before saveDraft() is captured. Falls back to state when the ref hasn't
    // been seeded yet.
    const liveUpdatableData = updatableDataRef.current ?? updatableData;
    const cleanedUpdatableData = cleanUpdatableData(liveUpdatableData);

    // Edit mode posts to /rfq/update which requires a complete RFQ — gate on
    // the same required-field check the Formik submit path uses, since the
    // Save Changes button is type="button" and bypasses Yup. Drafts (non-edit)
    // skip this so partial saves remain legal.
    if (isEditMode) {
      const result = validateRFQFields({
        company_name: rfqFormDataRef.current?.company_name || ''
      });
      if (!result?.ok) {
        if (result?.step) {
          setCurrentStep(result.step);
          setTriedNextOnStep(result.step);
          setSubmitInvalidField(result.field || null);
          setMaxStepReached((m) => Math.max(m, result.step));
        }
        saveDraftAbortRef.current = null;
        return;
      }
    }

    // In edit mode the backend expects a full snapshot ({ rfq_id, snapshot }),
    // not the saveDraft delta — so divert to a different payload shape.
    const payload = isEditMode
      ? buildEditSnapshotPayload({
          editRfqId,
          formDataCopy,
          fullMobile,
          rfqProductsFromStore,
          selectedTerms,
          selectedHotelIds,
          liveUpdatableData,
        })
      : {
          ...formDataCopy, // Use the filtered copy
          rfq_id: rfqDetails,
          contact_number: fullMobile,
          sheet_id: selectedSheet?.value,
          updatableData: cleanedUpdatableData,
          filters,
          termsChanged,
          termFilesChanged,
          selectedSheets: selectedSheetsForRFQ,
          hotel_ids: selectedHotelIds || [],
        };
    const affectedVendorProductIds = Object.keys(
      liveUpdatableData?.vendors || {}
    );

    try {
      // Edit-RFQ flow targets a published RFQ — updateRfq replaces the
      // saveDraft delta call. The signal arg isn't supported on updateRfq,
      // so cancellation falls back to plain "first one in wins" semantics.
      const res = isEditMode
        ? await updateRfq(payload)
        : await saveDraft(payload, controller.signal);
      // Only the latest save owns the success side-effects — if the user
      // kicked off another save while this one was resolving, let that one
      // drive the refetches / toast / URL sync.
      if (saveDraftAbortRef.current !== controller) return;
      saveDraftAbortRef.current = null;
      await getDraftInitialData({ silent: isEditMode });
      await refreshVendorCounts(affectedVendorProductIds);
      if(activeKey) {
        for(const key of activeKey) {
          const rfqProductId = key;
          await fetchVendorsForProduct(rfqProductId, true);
        }
      }
      setUpdatableData({
        products: {
          addable: [],
          deletable: [],
          updatable: {},
        },
        vendors: {},
      })
      // Step-aware toast — names the section the user just saved (Products,
      // Basics, Contact, Timeline, Reverse Auction, Delivery, Terms, Review).
      // Falls back to "Changes" if currentStep is somehow out of range.
      const stepLabel = STEPS[currentStep - 1]?.label || 'Changes';
      toast.success(
        <h6>
          <b>{getEntityLabel(rfqFormDataFromStore?.is_tender)} Draft #{res.message?.rfq?.rfq_no}:</b> {stepLabel} saved successfully!
        </h6>,
        { position: "top-right" }
      );
      setErrorProducts(new Set());
      setHasUnsavedChanges(false);

      // First-save URL sync. When the response brings back a freshly-minted
      // rfq_id and we didn't have one before, push it into Redux AND into the
      // URL so a refresh / share / back-button still loads the draft. The
      // `shallow: true` flag prevents Next from re-running its data-fetching
      // hooks, which keeps the wizard's local state (current step, expanded
      // accordions, scroll position) intact — this is what replaces the
      // hard `window.location.reload()` we used to fire here.
      const newRfqId = res.message?.rfq_id;
      if (newRfqId && (!rfqDetails || rfqDetails === -1)) {
        dispatch(setOtherFormFields({ rfq_id: newRfqId }));
        router.replace(
          { pathname: router.pathname, query: { ...router.query, draft_id: newRfqId } },
          undefined,
          { shallow: true }
        );
      }

    } catch (error) {
      // updateRfq rejects with { message: <string>, error: <axiosError> };
      // saveDraft rejects with { message: <axiosError> }. Normalise both shapes.
      const isUpdateRfqShape = typeof error?.message === 'string';
      const axiosErr = isUpdateRfqShape ? error?.error : error?.message;

      // Aborted because a newer save took over — silent no-op. The newer
      // request will own the user-visible result.
      if (axiosErr?.code === "ERR_CANCELED" || axiosErr?.name === "CanceledError") {
        return;
      }
      if (saveDraftAbortRef.current === controller) {
        saveDraftAbortRef.current = null;
      }

      const errorData = axiosErr?.response?.data;
      const errorMessage =
        (isUpdateRfqShape ? error.message : null) ||
        errorData?.message ||
        errorData?.errors?.message ||
        (isEditMode
          ? `Failed to update ${getEntityLabel(rfqFormDataFromStore?.is_tender)}. Please try again.`
          : "Failed to save draft. Please try again.");

      if (errorData?.errors?.details && Array.isArray(errorData.errors.details)) {
        const missingVendorIds = errorData.errors.details.map(d => d.rfqProductId);
        setErrorProducts(new Set(missingVendorIds));
      }
      // Jump to the step that owns the failing field so the user can see
      // what to fix without hunting for it. Only the /rfq/update path
      // tags errors with `field` today — saveDraft errors lack the tag,
      // so non-edit drafts simply show the toast in place.
      const failingField = errorData?.field;
      const targetStep = failingField ? submitFieldStep(failingField) : null;
      if (targetStep) {
        setCurrentStep(targetStep);
        setMaxStepReached((m) => Math.max(m, targetStep));
        setSubmitInvalidField(failingField);
        setTriedNextOnStep(targetStep);
      }
      toast.error(errorMessage);
    }



  };

  const loadDraft = async (id, sheet_id = queryMeta.sheet_id) => {
    dispatch(setStoreLoading(true));
    try {
      const draftRes = await getDraftById(id, sheet_id);
      const rfqFormData = draftRes?.data?.rfq_form_data || {};
      const isMagicRfqFromFlag = rfqFormData?.rfq_added_from === 'magic';
      const hasMagicSheets = draftRes?.data?.sheets && Array.isArray(draftRes.data.sheets) && draftRes.data.sheets.length > 0;
                  
      if (isMagicRfqFromFlag || hasMagicSheets) {
        setIsMagicRfq(true);
        
        let sheetData = [];
        
        if (hasMagicSheets) {
          sheetData = draftRes.data.sheets;
        } else {
          try {
            const sheetsResponse = await getDraftRfqSheets(id);
            if (sheetsResponse?.data?.sheets && Array.isArray(sheetsResponse.data.sheets)) {
              sheetData = sheetsResponse.data.sheets;                      
            } else {
              console.warn('No sheets found in API response:', sheetsResponse?.data);
            }
          } catch (error) {
            console.error("Error fetching magic search sheets:", error);
            toast.error(`Failed to load sheet data for this ${getEntityLabel(rfqFormDataFromStore?.is_tender)}`);
          }
        }
        
        if (sheetData && sheetData.length > 0) {
          const sheetOptions = sheetData.map(sheet => ({
            label: sheet.sheet_name,
            value: sheet.id,
            is_processed: sheet.is_processed,
            validation_errors: sheet.validation_errors,
          }));
          setSheetNameList(sheetOptions);
          
          // Set default selected sheet
          if (sheetData.length > 0) {
            const defaultSheet = sheetOptions[0];
            if(queryMeta.sheet_id) {
              const sheet = sheetOptions.find(sheet => sheet.value == queryMeta.sheet_id)
              setSelectedSheet(sheet);
            } else if (!selectedSheet)
              setSelectedSheet(defaultSheet);
          }
        } else {
          console.warn("No sheets found for Magic RFQ ID:", id);
        }
      }
      
      if (draftRes?.data) {
        if (draftRes.data.rfq_form_data?.contact_number) {
          let fullContactNumber = draftRes.data.rfq_form_data.contact_number.trim();
          let extractedCountryCode = "";
          let extractedContactNumber = fullContactNumber;
    
          if (fullContactNumber?.includes('-')) {
            const parts = fullContactNumber.split('-');  
            extractedCountryCode = parts[0].replace("-", "").trim();
            extractedContactNumber = parts.slice(1).join("").trim();
          }
    
          draftRes.data.rfq_form_data.contact_number = extractedContactNumber;
          draftRes.data.rfq_form_data.country_code = extractedCountryCode;

          //  set selected hotel ids
          const getSelectedHotelIds = draftRes?.data?.mappedHotels.map((item)=> item.hotel_id);
          setSelectedHotelIds(getSelectedHotelIds);

          setonecountrycode(extractedCountryCode);
        }
        if (draftRes?.data?.rfq_form_data) {
          draftRes.data.rfq_form_data.reverse_auction = 0;
          draftRes.data.rfq_form_data.ra_start_date = null;
          draftRes.data.rfq_form_data.ra_end_date = null;
        }
        dispatch(intializeRfq(draftRes.data));
        draftRes.data.rfq_products
          .map((product) => product.id)
          .forEach((productId) => {
            setViewProductFilter((prev) => ({
              ...prev,
              [productId]: false,
            }));
          });

        // Update document title
        document.title = `Edit Draft ${getEntityLabel(rfqFormDataFromStore?.is_tender)} #${id}`;
        
        // Set up other form-related data
        getTermsData();
      } else {
        console.error("No data found in draft response");
        toast.error(`Failed to load draft ${getEntityLabel(rfqFormDataFromStore?.is_tender)} data`);
      }
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error("Error loading draft by ID:", error);
      // Changes by Agnij 2025-06-17 [Improved error message with specific details]
      toast.error(error.message || `Error loading draft ${getEntityLabel(rfqFormDataFromStore?.is_tender)}`);
    } finally {
      dispatch(setStoreLoading(false));
    }
  };

  const getDraftInitialData = async ({ silent = false } = {}) => {
    dispatch(clearRfqState());
    if (!silent) dispatch(setStoreLoading(true));
    try {
      // If a draft_id is provided in the URL, load that specific draft
      let draftRes;

      if (isEditMode) {
        // Edit-RFQ flow: load the published RFQ via getRFQById and reshape
        // its response to match the draft response so the rest of this
        // function (form hydration, sheets, vendors) keeps working.
        const editRes = await getRFQById(editRfqId, null, true);
        const rfq = editRes?.data || editRes || {};
        const reshaped = reshapeRfqForStore(rfq, editRfqId);
        draftRes = { data: { rfq_id: reshaped.rfq_id, rfq_form_data: reshaped.rfq_form_data, rfq_products: reshaped.rfq_products } };
        document.title = `Edit ${getEntityLabel(rfq?.is_tender)} #${editRfqId}`;
      } else if (draftRfqId && draftRfqId !== -1) {
        draftRes = await getDraftById(draftRfqId, selectedSheet?.value);
        console.log("DRAFT PRODUCTS: ", draftRes.data.products)
        document.title = `Edit Draft ${getEntityLabel(rfqFormDataFromStore?.is_tender)} #${draftRfqId}`;

        const isMagicRfqFromFlag = draftRes?.data?.rfq_form_data?.rfq_added_from === 'magic';
        const hasMagicSheets = draftRes?.data?.sheets && Array.isArray(draftRes.data.sheets) && draftRes.data.sheets.length > 0;
        if (isMagicRfqFromFlag || hasMagicSheets) {
          setIsMagicRfq(true);
          
          let sheetData = [];
          
          if (hasMagicSheets) {
            sheetData = draftRes.data.sheets;
          } else {
            try {
              const sheetsResponse = await getDraftRfqSheets(draftRfqId);              
              if (sheetsResponse?.data?.sheets && Array.isArray(sheetsResponse.data.sheets)) {
                sheetData = sheetsResponse.data.sheets;
              } else {
              }
            } catch (error) {
              toast.error(`Failed to load sheet data for this ${getEntityLabel(rfqFormDataFromStore?.is_tender)}`);
            }
          }
          
          if (sheetData && sheetData.length > 0) {
            const sheetOptions = sheetData.map(sheet => ({
              label: sheet.sheet_name,
              value: sheet.id,
              validation_errors: sheet.validation_errors,
            }));
            setSheetNameList(sheetOptions);
            
            // Set default selected sheet
            if (sheetData.length > 0) {
              const defaultSheet = sheetOptions[0];
              if(queryMeta.sheet_id) {
                const sheet = sheetOptions.find(sheet => sheet.value == queryMeta.sheet_id)
                setSelectedSheet(sheet);
              } else if(!selectedSheet)
                setSelectedSheet(defaultSheet);
            }
          } else {
            console.warn("No sheets found for Magic RFQ ID:", draftRfqId);
          }
        }
      } else {
        // Changes by Agnij 2025-06-17 [Using fresh=true to always create a new RFQ when opening the Create RFQ page]
        draftRes = await getDraftData(true);
        document.title = `Create New ${getEntityLabel(rfqFormDataFromStore?.is_tender)}`;
      }

      if (draftRes?.data?.rfq_form_data?.contact_number) {
        let fullContactNumber = draftRes?.data?.rfq_form_data?.contact_number?.trim();
        let extractedCountryCode = "";
        let extractedContactNumber = fullContactNumber;
  
        if (fullContactNumber?.includes('-')) {
          const parts = fullContactNumber?.split('-');  
          extractedCountryCode = parts[0]?.replace("-", "")?.trim(); // Remove "+" and trim spaces
          extractedContactNumber = parts?.slice(1)?.join("")?.trim(); // Remove "-" and trim spaces
        }
  
        // **Modify `draftRes` before passing it to another function**
        draftRes.data.rfq_form_data.contact_number = extractedContactNumber;
        draftRes.data.rfq_form_data.country_code = extractedCountryCode; // Add extracted country code

        if (!isEditMode) {
          draftRes.data.rfq_form_data.reverse_auction = 0;
          draftRes.data.rfq_form_data.ra_start_date = null;
          draftRes.data.rfq_form_data.ra_end_date = null;
        }

        // **Pass modified draftRes to the function that sets RFQ data**
        dispatch(intializeRfq(draftRes.data));
        setonecountrycode(extractedCountryCode);
      }
      else{
        if (!isEditMode && draftRes?.data?.rfq_form_data) {
          draftRes.data.rfq_form_data.reverse_auction = 0;
          draftRes.data.rfq_form_data.ra_start_date = null;
          draftRes.data.rfq_form_data.ra_end_date = null;
        }
        dispatch(intializeRfq(draftRes.data));
      }
      getTermsData();

      // Fetch tech eval users if project is already selected
      const projectId = draftRes?.data?.rfq_form_data?.project_id;
      if (projectId && projectId !== -1 && projectId !== "") {
        try {
          const teRes = await getTechEvalUsers(projectId);
          setTechEvalUsers(teRes?.data || []);
        } catch (err) {
          toast.error("Failed to fetch technical evaluation users");
        }
      }

    } catch (error) {
      toast.error(error.message || `Error loading draft ${getEntityLabel(rfqFormDataFromStore?.is_tender)}`);
    } finally {
      if (!silent) dispatch(setStoreLoading(false));
    }
  }

  const resetUpdatableData = () => {
    setUpdatableData({
      products: {
        addable: [],
        deletable: [],
        updatable: {},
      },
      vendors: {},
    })
  }

  // Changes by Agnij 2025-08-05 [Added handler for sheet selection]
  const handleSheetChange = async (selectedOption) => {
    if (!selectedOption || !draftRfqId) return;
    
    dispatch(clearRfqState());

    setSelectedSheet(selectedOption);
    setMainLoading(true);
    dispatch(setStoreLoading(true));

    if(hasUnsavedChanges) {
      await handleSaveDraft();
      resetUpdatableData();
    }

    await loadDraft(draftRfqId, selectedOption.value)

    setMainLoading(false);
    dispatch(setStoreLoading(false));
  };

  const handleSpecChange = (product, change) => {
    // Keyed via specDeltaKey, not product.id directly: a product added in this
    // session has no server row yet, so product.id is undefined and EVERY such
    // product filed under the key "undefined". Two new products shared one
    // bucket and the first one's quantity never reached the request — the
    // buyer then saw it on Review (still in Redux) and was told on submit that
    // it was missing. The server resolves each entry by the product_id +
    // variant carried inside the value, so a per-product key is all it needs.
    const key = specDeltaKey(product);
    setUpdatableData((prev) => ({
      ...prev,
      products: {
        ...prev.products,
        updatable: {
          ...prev.products.updatable,
          specs: {
            ...(prev.products.updatable?.specs ?? {}),
            [key]: {
              ...(prev.products.updatable?.specs?.[key] ?? {
                product_id: product.product_id,
                variant: product.variant,
              }),
              [change.title]: change.value,
            },
          },
        },
      },
    }));
    setHasUnsavedChanges(true);
  };

  const handleFilesChange = (product, change) => {
    const reducer = (prev) => ({
      ...prev,
      products: {
        ...prev.products,
        updatable: {
          ...prev.products.updatable,
          files: {
            ...(prev.products.updatable?.files ?? {}),
            [product.id]: {
              ...(prev.products.updatable?.files?.[product.id] ?? {
                product_id: product.product_id,
                variant: product.variant,
              }),
              [change.type]: change?.value.length > 0 ? change.value : "rm",
            },
          },
        },
      },
    });
    // Update the ref synchronously so a same-tick saveDraft() call sees the
    // new files. The state update is queued for the next render.
    updatableDataRef.current = reducer(updatableDataRef.current ?? updatableData);
    setUpdatableData(reducer);
    setHasUnsavedChanges(true)
  };

  const handleCommentChange = (product, change) => {
    setUpdatableData((prev) => ({
      ...prev,
      products: {
        ...prev.products,
        updatable: {
          ...prev.products.updatable,
          comment: {
            ...(prev.products.updatable?.comment ?? {}),
            [product.id]: {
              ...(prev.products.updatable?.comment?.[product.id] ?? {
                product_id: product.product_id,
                variant: product.variant,
              }),
              comment: change.value,
            },
          },
        },
      },
    }));
    setHasUnsavedChanges(true)
  };

  const handleClauseChange = (product, change) => {
    setUpdatableData((prev) => ({
      ...prev,
      products: {
        ...prev.products,
        updatable: {
          ...prev.products.updatable,
          techEval: {
            ...(prev.products.updatable?.techEval ?? {}),
            [product.id]: {
              ...(prev.products.updatable?.techEval?.[product.id] ?? {
                product_id: product.product_id,
                variant: product.variant,
              }),
              techEval: [
                ...(prev.products.updatable?.techEval?.[product.id]?.techEval ??
                  []),
                change.action,
              ],
            },
          },
        },
      },
    }));
    setHasUnsavedChanges(true)
  };

  const handleRefreshVendors = async () => {
    if (!rfqDetails || rfqDetails === -1) return;
    try {
      setRefreshingVendors(true);
      const response = await refreshVendors(rfqDetails);
      const result = response?.data || response;

      const totalAdded = result?.data?.totalAdded || 0;
      if (totalAdded > 0) {
        toast.info(`${totalAdded} new vendor${totalAdded > 1 ? 's' : ''} found`);
      } else {
        toast.info('No additional vendors found');
      }

      if (result?.data?.productsWithNoVendors?.length > 0) {
        const names = result.data.productsWithNoVendors
          .map(p => p.product_name).filter(Boolean).join(', ');
        toast.warn(`Products without vendors: ${names || 'some products'}`);
      }

      // Clear stale error/vendor states before reloading
      setErrorProducts(new Set());
      setVendors({});

      await getDraftInitialData();
    } catch (error) {
      console.error("Error refreshing vendors:", error);
      toast.error("Failed to refresh vendors. Please try again.");
    } finally {
      setRefreshingVendors(false);
    }
  };

  const handleRemoveProduct = (product) => {
    if (
      updatableData.products.deletable.length + 1 ===
      rfqProducts?.length
    )
      toast.warning(
        `You cannot delete all products from ${getEntityLabel(rfqFormDataFromStore?.is_tender)}, at least one product is required`
      );
    else {
      setPendingProductToRemove(product);
      setShowRemoveProductConfirmModal(true);
    }
  };

  const handleRemoveProductConfirm = () => {
    if (!pendingProductToRemove) return;

    // If the product does NOT have a persisted RFQ product id yet,
    // remove it directly from the Redux rfqProducts list using product_id + variant.
    if (!pendingProductToRemove.id) {
      dispatch(
        removeRfqProduct({
          product_id: pendingProductToRemove.product_id,
          variant: pendingProductToRemove.variant,
        })
      );
    } else {
      // For existing RFQ products (with an id), mark them as deletable so
      // they are hidden in UI and sent to backend in updatableData.deletable.
      setUpdatableData((prev) => ({
        ...prev,
        products: {
          ...prev.products,
          deletable: [
            ...(prev.products?.deletable ?? []),
            pendingProductToRemove.id,
          ],
        },
      }));
    }

    setHasUnsavedChanges(true);
    setShowRemoveProductConfirmModal(false);
    setPendingProductToRemove(null);
  };

  const handleRemoveProductCancel = () => {
    setShowRemoveProductConfirmModal(false);
    setPendingProductToRemove(null);
  };


  const populateVendorFilters = (newProducts) => {
    if(!newProducts || !Array.isArray(newProducts) || newProducts.length <= 0) return;

    setVendorFilters(prev => {
      const updatableFilters = { ...prev };

      let localFilters = { ...updatableFilters.local };

      newProducts.forEach(product => {
        if(localFilters?.[product.id]) return;

        localFilters[product.id] = {};
      })

      return { ...updatableFilters, local: { ...localFilters } };
    })
  }

  const handleFilterUpdate = (isGlobal, product = null, data) => {
    if (!isGlobal && !product)
      throw new Error("Local filter updation requires a product");

    setVendorFilters((prev) => {
      let updatedFilters = { ...prev };

      const dataKeys = Object.keys(data)

      if(dataKeys.includes('country')) {
        data.state = [];
        data.city = [];
      }

      if(dataKeys.includes('state')) {
        data.city = [];
      }

      if (isGlobal) {
        // Update global
        updatedFilters.global = {
          ...updatedFilters.global,
          ...data,
        };

        // Reflect changes in all local filters
        const updatedLocal = {};

        Object.keys(updatedFilters.local || {}).forEach((productId) => {
          const existingLocal = updatedFilters.local[productId] ?? {};

          // Override global keys with global values, but preserve other local keys
          const merged = {
            ...existingLocal,
            ...data, // this will override the global filters only
          };

          updatedLocal[productId] = merged;
        });

        updatedFilters.local = updatedLocal;

        setVendors({})
      } else {
        // Local update for a specific product
        const productId = product.id;
        updatedFilters.local = {
          ...updatedFilters.local,
          [productId]: {
            ...(updatedFilters.local?.[productId] ?? {}),
            ...data,
          },
        };
      }

      return updatedFilters;
    });
    setHasUnsavedChanges(true);
  };

  const fetchAvailableVendorsForProduct = async (searchTerm = null) => {
      if(!selectedProduct || !selectedProduct.product) return;

      const key = `${selectedProduct.product.id}`;
  
      try {
        const body = {
          productId: selectedProduct.product.product_id,
          excludeIds: vendors?.[key]?.map(vendor => vendor.user_id) ?? [],
          searchTerm,
        }
        const response = await getVendorsForProduct(body)
        setAddableVendors(response.data)
      } catch (error) {
        toast.error(error.message)
      }
    }

  const handleSyncApplyToOtherVariants = async () => {
    const sourceRfqProductId = selectedProduct.product.id?.toString();
    if (!sourceRfqProductId) return;

    const sourceVendorData = updatableData.vendors?.[sourceRfqProductId];

    const sourceDeletable = sourceVendorData?.deletable || [];
    const sourceAddable = sourceVendorData?.addable || [];
    const productId = selectedProduct.product?.product_id;

    // Ensure current vendors of source are loaded
    let sourceCurrentVendors = vendors[sourceRfqProductId];
    if (!sourceCurrentVendors) {
      sourceCurrentVendors = await fetchVendorsForProduct(sourceRfqProductId);
    }

    // Simulate updated source vendor list
    const updatedSourceVendors = [
      ...sourceCurrentVendors
        .filter(v => !sourceDeletable.includes(v.user_id)),
      ...sourceAddable.map(id => ({ user_id: id }))
    ];

    const updatedSourceVendorIds = updatedSourceVendors.map(v => v.user_id);

    for (const rfqProduct of rfqProducts) {
      // A product added in this session has no server id yet. Reading
      // `.id.toString()` off it threw and took the whole sync down; and there
      // is nothing to sync anyway, since its vendor list only exists once the
      // row does (otherRfqProductId is fetched against below, so a synthetic
      // key would not work here the way it does for the edit buffers).
      if (rfqProduct.id === undefined || rfqProduct.id === null) continue;
      if (
        rfqProduct.product_id === productId &&
        rfqProduct.id.toString() !== sourceRfqProductId
      ) {
        const otherRfqProductId = rfqProduct.id.toString();

        // Ensure current vendors of target loaded
        let currentVendors = vendors[otherRfqProductId];
        if (!currentVendors) {
          currentVendors = await fetchVendorsForProduct(otherRfqProductId);
        }

        const currentVendorIds = currentVendors.map(v => v.user_id);

        // Vendors that should be added to sync
        const syncAddable = updatedSourceVendorIds.filter(
          id => !currentVendorIds.includes(id)
        );

        // Vendors that should be removed to sync (those in current but not in updated source)
        const syncDeletable = currentVendorIds.filter(
          id => !updatedSourceVendorIds.includes(id)
        );

        // Ensure updatableData entry exists
        if (!updatableData.vendors[otherRfqProductId]) {
          updatableData.vendors[otherRfqProductId] = {
            product_id: rfqProduct.product_id,
            variant: rfqProduct.variant,
            deletable: [],
            addable: [],
          };
        }

        const otherVendorData = updatableData.vendors[otherRfqProductId];

        otherVendorData.deletable = [];
        otherVendorData.addable = [];

        otherVendorData.deletable = syncDeletable;
        otherVendorData.addable = syncAddable;
      }
    }
    toast.info("Success! The change has been applied across all product variants.");

  };


  useEffect(() => {
    if(activeKey) {
      activeKey?.forEach((key) => {
        const rfqProductId = key;
        fetchVendorsForProduct(rfqProductId, true);
      });
    }
  }, [vendorFilters.local])

  useEffect(() => {
      fetchAvailableVendorsForProduct();
    }, [selectedProduct])

  // Dynamic filters inside Single RFQ Product Item.
  // Vendor filters were removed (vendors auto-added for all modes); the
  // header slot is kept so callers stay wired up, but always renders nothing.
  const generateDynamicFilter = () => null;

  useEffect(() => {
    const { draft_id, sheet_id } = router.query;
    setQueryMeta({
      draft_id,
      sheet_id,
    })
  }, [router.query])

  useEffect(() => {
    try {
      getVendorApproveList();
      fetchCountryCodes();
      fetchHospitalityContexts();
      refreshUnits();
    } catch (error) {
      console.log("SOMETHING WENT WRONG DURING INITIAL FETCHING");
      toast.error(error.message)
    }
  }, []);

  // Re-fetch processes whenever the user's process scope changes (e.g. after
  // hotel/department selection updates the permission set). When
  // allowedProcessIds is null (wildcard / legacy) the list is unfiltered;
  // when it's a specific array, the dropdown narrows to those processes.
  // Using JSON.stringify keeps the dep array stable when the underlying
  // arrays are referentially fresh but contain the same IDs.
  useEffect(() => {
    fetchProcesses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(allowedProcessIds || [])]);

  // Fetch departments scoped to the selected hotel (covers manual selection, draft loading, auto-selection)
  // Skip when no hotel is selected — department dropdown won't show until hotel is chosen anyway
  useEffect(() => {
    if (selectedHotelIds && selectedHotelIds.length > 0) {
      fetchDepartments(selectedHotelIds[0]);
    }
  }, [selectedHotelIds]);
  // Watch for changes in the draft_id from URL
  useEffect(() => {
    // Edit-RFQ flow: URL is `?id=<rfqId>` (no draft_id). Load via getRFQById
    // and seed Redux from the response so the rest of the form behaves
    // exactly as it does for a draft.
    if (isEditMode) {
      const loadEditRfq = async () => {
        dispatch(clearRfqState());
        dispatch(setStoreLoading(true));
        try {
          const editRes = await getRFQById(editRfqId, null, true);
          const rfq = editRes?.data || editRes || {};

          // Split the stored "+CC-NNNNNN" contact_number into country code +
          // raw number so the phone input + onecountrycode dropdown both
          // round-trip correctly. Without this, edit-mode saves drop the
          // country code (the backend then sees "-6789456793").
          if (rfq?.contact_number?.includes('-')) {
            const [cc, ...rest] = rfq.contact_number.split('-');
            const country = (cc || '').trim();          // e.g. "+91"
            const number = rest.join('').trim();
            rfq.contact_number = number;
            rfq.country_code = country;
            setonecountrycode(country);
          }

          // Seed selectedHotelIds — the backend rejects updates that change
          // hotel mappings, so we MUST round-trip whatever the RFQ already
          // has. Prefer mappedHotels[] when the API includes it; otherwise
          // fall back to the single hotel_id field.
          const mappedIds = Array.isArray(rfq?.mappedHotels)
            ? rfq.mappedHotels.map((h) => h.hotel_id).filter(Boolean)
            : [];
          const hotelIds = mappedIds.length > 0
            ? mappedIds
            : (rfq?.hotel_id ? [rfq.hotel_id] : []);
          setSelectedHotelIds(hotelIds);

          dispatch(intializeRfq(reshapeRfqForStore(rfq, editRfqId)));
          document.title = `Edit ${getEntityLabel(rfq?.is_tender)} #${editRfqId}`;
          getTermsData();
        } catch (error) {
          console.error("Error loading RFQ for edit:", error);
          toast.error(error.message || "Failed to load RFQ for edit");
        } finally {
          dispatch(setStoreLoading(false));
        }
      };
      loadEditRfq();
      return;
    }

    // Changes by Agnij 2025-06-17 [Reset state when draft_id changes]
    // If no draft_id is present, clear state and force a fresh draft
    if (!draft_id) {
      dispatch(clearRfqState());
      // Create a fresh draft
      const loadFreshDraft = async () => {
        dispatch(setStoreLoading(true));
        try {
          const draftRes = await getDraftData(true);
          dispatch(intializeRfq(draftRes.data));
          document.title = `Create New ${getEntityLabel(rfqFormDataFromStore?.is_tender)}`;
          getTermsData();
        } catch (error) {
          console.error("Error creating fresh draft:", error);
          toast.error(error.message || `Error creating fresh ${getEntityLabel(rfqFormDataFromStore?.is_tender)} draft`);
        } finally {
          dispatch(setStoreLoading(false));
        }
      };

      loadFreshDraft();
      return;
    }

    // If draft_id is present, load that specific draft
    if (draft_id) {
      try {
        const id = parseInt(draft_id);
        if (!isNaN(id) && id > 0) {
          setDraftRfqId(id);
          
          dispatch(clearRfqState());
          
          loadDraft(id);
        }
      } catch (error) {
        console.error("Error processing draft_id:", error);
      }
    }
  }, [draft_id, editRfqId]);

  // Add a useEffect to set the company name in the store when userProfile is loaded
  useEffect(() => {
    if (userProfile && userProfile.company_name) {
      // If we have a company name in the user profile and none in the form data, set it
      if (!rfqFormDataFromStore.company_name || rfqFormDataFromStore.company_name === '') {
        dispatch(setOtherFormFields({ 
          field_name: 'company_name', 
          value: userProfile.company_name 
        }));
      }
    }
  }, [userProfile]);

  // Changes by Agnij 2025-09-04 [Fixed duplicate products issue and handling of undefined state]
  useEffect(() => {
    // Handle the case where rfqProductsFromStore might be undefined
    if (!rfqProductsFromStore) {
      return;
    }
    
    // Only filter by vendor presence if not a magic search RFQ
    if (!isMagicRfq) {
      const validProducts = rfqProductsFromStore.filter(
        (prodItem) => prodItem);

      setRfqProducts(validProducts);
      rfqProductsRef.current = validProducts;
    } else if (selectedSheet) {
      // For magic search RFQs, also ensure products are filtered by the selected sheet
      
      const enhancedProducts = rfqProductsFromStore.map(product => {
        if (!product) return null;
        
        // Create a copy with the current sheet info
        const enhancedProduct = {...product};
        enhancedProduct.sheet_id = selectedSheet.value;
        enhancedProduct.sheet_name = selectedSheet.label;
        
        return enhancedProduct;
      }).filter(Boolean);
      
      setRfqProducts(enhancedProducts);
      rfqProductsRef.current = enhancedProducts;
    }
  }, [rfqProductsFromStore, isMagicRfq, selectedSheet])

  useEffect(() => {
    if (
      rfqProducts &&
      rfqProducts.some(
        (product) =>
          !Object.keys(vendorFilters.local)
            .map((key) => parseInt(key))
            .includes(product.id)
      )
    ) {
      populateVendorFilters(rfqProducts);
    }
  }, [rfqProducts])

  useEffect(() => {
    rfqFormDataRef.current = rfqFormDataFromStore;
  }, [rfqFormDataFromStore]);

  // Keep the synchronous ref in sync with state changes that come from
  // anywhere other than handleFilesChange (e.g. resetUpdatableData after a
  // successful save).
  useEffect(() => {
    updatableDataRef.current = updatableData;
  }, [updatableData]);

  // Clear "tried Next" highlights whenever the user moves to a different
  // step (Previous, pill click, or successful Next). Without this, switching
  // back to a step would still show stale red borders from a prior failed
  // Next click. We only clear when the flag points to a *different* step
  // than the new currentStep — so a forward jump that lands the user on the
  // first invalid step (with triedNextOnStep already set to that step by
  // flagInvalidStep) keeps its red borders intact.
  // Maps a flagged field name back to the step it lives on, so the effect
  // below can decide whether to clear the highlight on step change.
  const submitFieldStep = (key) => {
    switch (key) {
      case "tender_publish_date":
      case "vendor_clarification_date":
      case "bid_end_date":
      case "ra_start_date":
      case "ra_end_date":
        return 3;
      case "department_id":
      case "process_id":
      case "tender_fees":
      case "hotel_ids":
        return 2;
      case "products":
        return 1;
      case "terms":
      case "term_and_condition_files":
        return 4;
      default:
        return null;
    }
  };

  useEffect(() => {
    setTriedNextOnStep((prev) => (prev === currentStep ? prev : null));
    // The submit-time invalid-field flag is per-field, so we let it persist
    // when the user lands on the offending step (validateRFQFields just set
    // both currentStep and submitInvalidField in the same tick) but clear
    // it the moment they navigate elsewhere.
    setSubmitInvalidField((prev) => (prev && currentStep !== submitFieldStep(prev) ? null : prev));
  }, [currentStep]);

  // Hydrate currentStep / maxStepReached from URL once the router is
  // ready. A page refresh on `?step=4` lands the user back on step 4
  // instead of step 1.
  useEffect(() => {
    if (!router.isReady || stepHydratedFromUrlRef.current) return;
    stepHydratedFromUrlRef.current = true;
    const stepParam = parseInt(router.query.step, 10);
    const maxParam = parseInt(router.query.max, 10);
    const inRange = (n) => Number.isFinite(n) && n >= 1 && n <= STEPS.length;
    if (inRange(stepParam) || inRange(maxParam)) {
      // Tell the sync effect (which runs in this same render with the
      // pre-update state still visible) not to fight us back to step 1.
      skipFirstUrlSyncRef.current = true;
    }
    if (inRange(stepParam)) setCurrentStep(stepParam);
    const seed = inRange(maxParam) ? maxParam : (inRange(stepParam) ? stepParam : 1);
    setMaxStepReached((m) => Math.max(m, seed));
  }, [router.isReady, router.query.step, router.query.max]);

  // Mirror currentStep / maxStepReached back into the URL so a refresh
  // restores them. shallow:true keeps the page from re-running data
  // fetches and preserves wizard state. Skipped until hydration has run
  // so we don't blow away an incoming `?step=4` with an initial 1.
  useEffect(() => {
    if (!router.isReady || !stepHydratedFromUrlRef.current) return;
    if (skipFirstUrlSyncRef.current) {
      skipFirstUrlSyncRef.current = false;
      return;
    }
    const queryStep = parseInt(router.query.step, 10);
    const queryMax = parseInt(router.query.max, 10);
    if (queryStep === currentStep && queryMax === maxStepReached) return;
    router.replace(
      {
        pathname: router.pathname,
        query: { ...router.query, step: currentStep, max: maxStepReached },
      },
      undefined,
      { shallow: true }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, maxStepReached, router.isReady]);

  useEffect(() => {
    // Debug terms selection state
    if (allTerms?.length > 0 && selectedTerms?.length > 0) {
      
    }
  }, [allTerms, selectedTerms]);

  useEffect(() => {
    // Changes by Agnij 2025-05-03 [Removed auto-setting of default dates for reverse auction]
    // This effect has been intentionally disabled to ensure users explicitly set dates for reverse auction
    
    // Only validate the dates if both are provided
    if (
      rfqFormDataFromStore.reverse_auction === 1 &&
      rfqFormDataFromStore.ra_start_date && 
      rfqFormDataFromStore.ra_end_date
    ) {
      // Validate dates
      const startError = validateDates('ra_start_date', rfqFormDataFromStore.ra_start_date, rfqFormDataFromStore);
      const endError = validateDates('ra_end_date', rfqFormDataFromStore.ra_end_date, rfqFormDataFromStore);
      
      // Update validation errors
      setValidationErrors(prev => ({
        ...prev,
        ra_start_date: startError,
        ra_end_date: endError
      }));
    }
  }, [rfqFormDataFromStore.reverse_auction, rfqFormDataFromStore.bid_end_date]);

  const countryCodeMatch = rfqFormDataFromStore.contact_number.match(/^\+(\d{1,4})-/);
  const countryCode1 = countryCodeMatch ? countryCodeMatch[0].slice(0, -1) : null; // Extracting country code from contact number


  
  
  const selectedCountry = countryCode.find(
    (item) => item.phone_code === countryCode1
  );           // Getting selected country from country code list

  // Changes by Agnij 2025-05-25 [Fixed undefined rfqProductsFromStore error]
  useEffect(() => {
    // Guard against undefined rfqProductsFromStore
    if (!rfqProductsFromStore || !Array.isArray(rfqProductsFromStore)) {
      return;
    }

    if (isMagicRfq && selectedSheet && draftRfqId && rfqProductsFromStore.length > 0) {      
      // Force ALL products to be shown for Magic Search RFQs
      // This is a temporary fix until we can properly associate products with sheets
      const allProductsWithSheet = rfqProductsFromStore.map(product => {
        if (!product) return null;
        
        // Create a copy with the current sheet info
        const enhancedProduct = {...product};
        enhancedProduct.sheet_id = selectedSheet.value;
        enhancedProduct.sheet_name = selectedSheet.label;
        
        // Ensure product has vendors
        if (!enhancedProduct.vendors || !Array.isArray(enhancedProduct.vendors) || enhancedProduct.vendors.length === 0) {
          enhancedProduct.vendors = [{
            id: 1, 
            name: "Default Vendor", 
            company_name: "Auto-assigned Vendor"
          }];
        }
        
        return enhancedProduct;
      }).filter(Boolean);
      
      setRfqProducts(allProductsWithSheet);
      rfqProductsRef.current = allProductsWithSheet;
    }
  }, [selectedSheet, isMagicRfq, draftRfqId, rfqProductsFromStore]);

  useEffect(() => {
    if (selectedSheet) setSelectedSheetsForRFQ([selectedSheet.value]);
  }, [selectedSheet]);

  // Handle permission loading state — render the structured skeleton so
  // the page transition is consistent and the user never sees a stray
  // full-screen spinner.
  if (permissionsLoading && selectedHotelIds.length > 0) {
    return <CreateRFQSkeleton />;
  }

  // Handle access denied (no create/update permission for drafts)
  // For new RFQs we check canCreate, for existing drafts we check canUpdate
  // View-only drafts (someone else's) are always read-only regardless of RBAC permissions
  const hasPermission = isViewOnlyDraft ? false : (draft_id ? (canUpdate || canCreate) : canCreate);
  if (!isViewOnlyDraft && selectedHotelIds.length > 0 && !permissionsLoading && !hasPermission && !canRead) {
    return (
      <AccessDeniedPage
        title="Access Denied"
        message="You do not have permission to create or edit this for the selected business units."
        backUrl="/dashboard/buyer/rfq-management"
        backLabel="Back to RFQ Management"
      />
    );
  }

  const formatLocalDateTime = (d) => {
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  const minPublishDate = formatLocalDateTime(new Date(Date.now() + 5 * 60 * 1000));
  // Edit mode: floors are "now + N min", independent of the other dates so the
  // buyer can compress the timeline when fixing a saved RFQ. Create mode keeps
  // the chronological gap rules (clarification > publish + 5 min, bid_end >
  // clarification + 24 h).
  const minClarificationDate = isEditMode
    ? formatLocalDateTime(new Date(Date.now() + 60 * 60 * 1000))
    : formatLocalDateTime(
        rfqFormDataFromStore.tender_publish_date
          ? new Date(new Date(rfqFormDataFromStore.tender_publish_date).getTime() + 5 * 60 * 1000)
          : new Date(Date.now() + 5 * 60 * 1000)
      );
  const minBidEndDate = isEditMode
    ? formatLocalDateTime(new Date(Date.now() + 120 * 60 * 1000))
    : formatLocalDateTime(
        rfqFormDataFromStore.vendor_clarification_date
          ? new Date(new Date(rfqFormDataFromStore.vendor_clarification_date).getTime() + 24 * 60 * 60 * 1000)
          : new Date(Date.now() + 5 * 60 * 1000)
      );

  // Initial load = no draft hydrated into Redux yet. Until that's done, show
  // the structured skeleton so the user sees the page taking shape instead of
  // being blocked behind a full-screen overlay.
  const isHydrated = Boolean(
    rfqFormDataFromStore?.id ||
    (rfqProducts && rfqProducts.length > 0) ||
    rfqFormDataFromStore?.title
  );
  const isPageLoading = mainLoading || storeLoading;

  if (isPageLoading && !isHydrated) {
    return <CreateRFQSkeleton />;
  }

  return (
    <>
      <div className="create-rfq-page">
        {/* In-flight action (submit / sheet switch) with the form already
            populated — thin non-blocking progress bar replaces the legacy
            black-overlay spinner. */}
        {isPageLoading && isHydrated && (
          <div className="rfq-progress-bar" aria-hidden="true">
            <div className="rfq-progress-bar__indicator" />
          </div>
        )}
        {/* Context strip — page title lives in TwoPanelPage; this strip
            shows fine-grained context (entity + hotel) or the hotel picker
            when nothing has been chosen yet. */}
        {(selectedHotelIds.length > 0 || (userHotelMappings.length > 0 && selectedHotelIds.length === 0)) && (
          <header className="rfq-page-header">
            {selectedHotelIds.length > 0 && userHotelMappings.length > 0 && (
              <span className="rfq-page-header__context">
                <span className="rfq-page-header__context-label">
                  {isViewOnlyDraft || (!hasPermission && canRead) ? "Viewing" : isEditMode ? "Editing" : "Creating"}
                </span>
                <span>{getEntityLabel(rfqFormDataFromStore.is_tender)}</span>
                <span className="rfq-page-header__context-dot" aria-hidden="true" />
                <span className="rfq-page-header__context-label">for</span>
                <span className="rfq-page-header__hotels">
                  {userHotelMappings
                    .filter(m => selectedHotelIds.includes(m.hospitality_hotel_id))
                    .map(m => m.hotel_name)
                    .join(", ")}
                </span>
              </span>
            )}
            {userHotelMappings.length > 0 && selectedHotelIds.length === 0 && (
              <div className="rfq-page-header__hotel-picker">
                <label className="rfq-label">Business Units <span className="rfq-required">*</span></label>
                <Select
                  id="select_hotels-create_rfq_page"
                  isMulti
                  options={userHotelMappings}
                  value={[]}
                  onChange={(selectedOptions) => {
                    const ids = selectedOptions ? selectedOptions.map(opt => opt.hospitality_hotel_id) : [];
                    handleHotelSelectionChange(ids);
                  }}
                  placeholder="Select Business Units..."
                  closeMenuOnSelect={false}
                  classNamePrefix="react-select"
                  isClearable
                  formatOptionLabel={(option) => (<div><span>{option.hotel_name}</span></div>)}
                  getOptionValue={(option) => option.hospitality_hotel_id}
                />
              </div>
            )}
          </header>
        )}

        {/* Read-only banner - viewing someone else's draft */}
        {isViewOnlyDraft && (
          <ReadOnlyBanner
            title="View Only Mode"
            message="This draft was created by another user. You can view it but cannot make changes."
            noMarginTop
          />
        )}

        {/* Read-only banner - Show when user has read but not create/update permission */}
        {!isViewOnlyDraft && selectedHotelIds.length > 0 && !hasPermission && canRead && (
          <ReadOnlyBanner
            title="View Only Mode"
            message="You don't have create/edit permissions for the selected business units. Contact your administrator to request access."
            noMarginTop
          />
        )}

        {/* Edit-mode lockdown banners — explain WHY fields are disabled.
            Driven by the same flags that gate every input below; so the user
            doesn't think the form is broken when nothing accepts changes. */}
        {!isViewOnlyDraft && isReadOnly && (
          <ReadOnlyBanner
            title="This RFQ can no longer be edited"
            message="The bid window has closed and quotes have been received, or the RFQ is closed. Edits are no longer accepted."
            noMarginTop
          />
        )}
        {!isViewOnlyDraft && !isReadOnly && isRestrictedEdit && (
          <ReadOnlyBanner
            title="Restricted Edit Mode"
            message="A vendor has already submitted a quote (or a product is dead-ended / tech-stuck). Only the Quote Submission Deadline can be changed; vendor refresh is still allowed."
            noMarginTop
          />
        )}
        {!isViewOnlyDraft && !isReadOnly && !isRestrictedEdit && isPostPublish && (
          <ReadOnlyBanner
            title="Published RFQ"
            message="This RFQ has been published. Publish Date and BU Selection is locked; everything else can still be updated."
            noMarginTop
          />
        )}

        <Formik
          enableReinitialize={true}
          validateOnMount={true}
          initialValues={{
            is_published: rfqFormDataFromStore.is_published,
            comment: rfqFormDataFromStore.comment,
            response_email: rfqFormDataFromStore.response_email,
            contact_name: rfqFormDataFromStore.contact_name,
            contact_number: rfqFormDataFromStore.contact_number.replace(/^\+\d{1,4}-/, ""),
            company_name: rfqFormDataFromStore.company_name || userProfile?.company_name || "",
            bid_end_date: rfqFormDataFromStore.bid_end_date,
            reverse_auction: rfqFormDataFromStore.reverse_auction,
            is_tender: rfqFormDataFromStore.is_tender || 0,
            tender_fees: rfqFormDataFromStore.tender_fees ? Number(rfqFormDataFromStore.tender_fees) / 100 : 0,
            tender_publish_date: rfqFormDataFromStore.tender_publish_date,
            vendor_clarification_date: rfqFormDataFromStore.vendor_clarification_date,
            location: rfqFormDataFromStore.location,
            countryCode: "+91",
            title: rfqFormDataFromStore.title || "",
          }}
          validationSchema={CreateRFQSchema}
          onSubmit={(values) => {
            const result = validateRFQFields(values);
            if (result?.ok) {
              if (sheetNameList.length > 0) {
                setFinalRFQValues(values);
                setShowRFQModal(true);
              } else {
                setPendingFormValues(values);
                setShowCreateConfirmModal(true);
              }
            } else if (result?.step) {
              // Park the user on the step that owns the failing field so
              // they don't have to hunt for it from Step 5.
              setCurrentStep(result.step);
              setTriedNextOnStep(result.step);
              setSubmitInvalidField(result.field || null);
              setMaxStepReached((m) => Math.max(m, result.step));
            }
          }}
        >
          {({ errors, touched, isValid }) => {
            const isStepValid = (step) => {
              switch (step) {
                case 1: {
                  if (rfqProducts.length === 0) return false;
                  // Every active product must have Quantity AND Unit before
                  // the user can leave Step 1. Skip products marked deletable
                  // (already pending removal in the edit flow).
                  const hasInvalid = rfqProducts.some(
                    (p) =>
                      !updatableData.products.deletable.includes(p.id) &&
                      specFieldsToValidate.some((f) => isSpecFieldEmpty(p, f))
                  );
                  return !hasInvalid;
                }
                case 2:
                  // Combined Details step: Basics + Contact must both pass.
                  return Boolean(rfqFormDataFromStore.title) &&
                         (departments.length === 0 || rfqFormDataFromStore.department_id) &&
                         (processes.length === 0 || rfqFormDataFromStore.process_id) &&
                         Boolean(
                           rfqFormDataFromStore.contact_name &&
                           rfqFormDataFromStore.response_email &&
                           rfqFormDataFromStore.contact_number
                         );
                case 3: {
                  // Gate is "all three set and chronologically ordered".
                  // Strict 5-min/24h windows are enforced at submit-time; the
                  // <input min=...> attributes plus that submit-time check are
                  // the source of truth — checking them again here would
                  // fail any user who picks the minimum (the relative gap
                  // shrinks by elapsed time between render and click).
                  const pd = rfqFormDataFromStore.tender_publish_date ? new Date(rfqFormDataFromStore.tender_publish_date) : null;
                  const cd = rfqFormDataFromStore.vendor_clarification_date ? new Date(rfqFormDataFromStore.vendor_clarification_date) : null;
                  const bd = rfqFormDataFromStore.bid_end_date ? new Date(rfqFormDataFromStore.bid_end_date) : null;
                  if (!pd || !cd || !bd) return false;
                  if (cd <= pd) return false;
                  if (bd <= cd) return false;
                  // Reverse Auction now lives inside Timeline as a collapsible
                  // block — when enabled, both auction dates must be set.
                  if (rfqFormDataFromStore.reverse_auction === 1 &&
                      !(rfqFormDataFromStore.ra_start_date && rfqFormDataFromStore.ra_end_date)) {
                    return false;
                  }
                  return true;
                }
                case 4: return true;
                case 5: return true;
                default: return false;
              }
            };

            // Human-readable labels for required fields — used in the
            // "Please fill …" toast so the user knows exactly what's empty.
            const FIELD_LABELS = {
              title: " RFQ Title",
              department_id: "Department",
              process_id: "Process",
              contact_name: "Contact person",
              response_email: "Email",
              contact_number: "Contact Number",
              tender_publish_date: "Publish Date & Time",
              vendor_clarification_date: "Vendor Clarification End Date",
              bid_end_date: "Quote Submission End Date",
              ra_start_date: "Auction Start Date & Time",
              ra_end_date: "Auction End Date & Time",
            };
            const STEP_REQUIRED_KEYS = {
              2: ["title", "department_id", "process_id", "contact_name", "response_email", "contact_number"],
              3: ["tender_publish_date", "vendor_clarification_date", "bid_end_date", "ra_start_date", "ra_end_date"],
            };

            // Pure "is this required field empty right now" check —
            // independent of whether the user has clicked Next yet, so it can
            // also drive the field-name list inside the toast.
            const isFieldMissing = (key) => {
              const f = rfqFormDataFromStore || {};
              switch (key) {
                case "title":           return !f.title;
                case "department_id":   return departments.length > 0 && !f.department_id;
                case "process_id":      return processes.length > 0 && !f.process_id;
                case "contact_name":    return !f.contact_name;
                case "response_email":  return !f.response_email;
                case "contact_number":  return !f.contact_number;
                case "tender_publish_date":       return !f.tender_publish_date;
                case "vendor_clarification_date": return !f.vendor_clarification_date;
                case "bid_end_date":              return !f.bid_end_date;
                case "ra_start_date":   return f.reverse_auction === 1 && !f.ra_start_date;
                case "ra_end_date":     return f.reverse_auction === 1 && !f.ra_end_date;
                default: return false;
              }
            };

            // Used by each required input to render its red border + hint.
            // Returns true when:
            //  • The user clicked Next/Submit on this step and the field is
            //    actually empty (existing missing-field UX), or
            //  • Submit's business-rule check rejected this specific field
            //    (e.g. publish-date must be 5 min from now). The submit path
            //    also lands them on the right step, so this branch fires on
            //    the same render as the navigation.
            const isMissing = (key) =>
              (triedNextOnStep === currentStep && isFieldMissing(key)) ||
              submitInvalidField === key;

            // Park the user on `step` and surface a toast that names the
            // empty required fields (or a generic ordering-error fallback
            // for Step 3 when every field is filled but out of sequence).
            const flagInvalidStep = (step) => {
              setCurrentStep(step);
              setTriedNextOnStep(step);
              if (step === 1) {
                if (rfqProducts.length === 0) {
                  toast.warning("Add at least one product before continuing");
                  return;
                }
                // List each product that's missing Quantity and/or Unit so
                // the user knows exactly which row(s) to fix.
                const offenders = rfqProducts
                  .filter((p) => !updatableData.products.deletable.includes(p.id))
                  .map((p) => {
                    const missing = specFieldsToValidate
                      .filter((f) => isSpecFieldEmpty(p, f))
                      .map((f) => f.charAt(0).toUpperCase() + f.slice(1));
                    return missing.length > 0
                      ? `${p.name || `Product #${p.product_id}`} (${missing.join(", ")})`
                      : null;
                  })
                  .filter(Boolean);
                if (offenders.length > 0) {
                  toast.warning(`Please fill the required fields for: ${offenders.join("; ")}`);
                }
                return;
              }
              const missingNames = (STEP_REQUIRED_KEYS[step] || [])
                .filter(isFieldMissing)
                .map((k) => FIELD_LABELS[k]);
              if (missingNames.length > 0) {
                toast.warning(
                  `Please fill the required ${missingNames.length === 1 ? "field" : "fields"}: ${missingNames.join(", ")}`
                );
              }
            };

            const goNext = () => {
              if (currentStep >= STEPS.length) return;
              if (!isStepValid(currentStep)) {
                flagInvalidStep(currentStep);
                return;
              }
              // Edit mode posts the full snapshot to /rfq/update on every save,
              // so a required field cleared on an earlier step would only blow
              // up after the user has already advanced. Run the cross-step
              // validator here and park the user on the offending step.
              if (isEditMode) {
                const result = validateRFQFields({
                  company_name: rfqFormDataRef.current?.company_name || ''
                });
                if (!result?.ok) {
                  if (result?.step) {
                    setCurrentStep(result.step);
                    setTriedNextOnStep(result.step);
                    setSubmitInvalidField(result.field || null);
                    setMaxStepReached((m) => Math.max(m, result.step));
                  }
                  return;
                }
              }
              // Step is valid — clear any stale errors, fire a background
              // save if the user has unsaved edits (don't await, the step
              // change shouldn't wait for the network), and advance.
              setTriedNextOnStep(null);
              if (hasUnsavedChanges) {
                handleSaveDraft();
              }
              const next = currentStep + 1;
              setCurrentStep(next);
              setMaxStepReached((m) => Math.max(m, next));
            };
            const goPrev = () => setCurrentStep((s) => Math.max(1, s - 1));
            // Stepper-pill jump:
            //  • Backwards / same step → always allowed.
            //  • Forward → walk every intermediate step and stop at the
            //    first invalid one with the same error treatment as Next,
            //    so the user can't bypass validation by clicking ahead.
            const goToStep = (n) => {
              if (n > maxStepReached) return;
              if (n <= currentStep) {
                setCurrentStep(n);
                setTriedNextOnStep(null);
                return;
              }
              if (!isEditMode) {
                for (let s = currentStep; s < n; s++) {
                  if (!isStepValid(s)) {
                    flagInvalidStep(s);
                    return;
                  }
                }
              } else {
                // Edit mode posts the full snapshot on every save, so a
                // forward jump that leaves an earlier required field empty
                // would only blow up after the user lands on the new step.
                // Gate the jump on the same cross-step validator the Save
                // Changes / Save and Next paths use.
                const result = validateRFQFields({
                  company_name: rfqFormDataRef.current?.company_name || ''
                });
                if (!result?.ok) {
                  if (result?.step) {
                    setCurrentStep(result.step);
                    setTriedNextOnStep(result.step);
                    setSubmitInvalidField(result.field || null);
                    setMaxStepReached((m) => Math.max(m, result.step));
                  }
                  return;
                }
              }
              setTriedNextOnStep(null);
              if (hasUnsavedChanges) {
                handleSaveDraft();
              }
              setCurrentStep(n);
              setMaxStepReached((m) => Math.max(m, n));
            };
            const formattedDate = (iso) => iso ? formatISOToDateTimeLocal(iso).replace('T', ' ') : "—";

            return (
              <Form className="rfq-form">
                {/* Process-scope / missing-policy banner. Renders only when
                    the backend has surfaced a typed error code. Clears on
                    next successful submit attempt. */}
                <ProcessScopeErrorBanner
                  error={scopeError}
                  onDismiss={() => setScopeError(null)}
                />
                {/* Stepper progress bar — hidden in view-only mode where the
                    user only sees the read-only review summary. */}
                {!isViewOnlyDraft && (
                <div className="rfq-stepper-card">
                  {/* `--rfq-stepper-progress` drives the brand-blue fill on
                      the rail. We fill up to the furthest reached step so
                      the bar always reflects the user's overall progress,
                      even when they step back to revisit an earlier one. */}
                  <ol
                    className="rfq-stepper"
                    aria-label="Create RFQ steps"
                    style={{
                      "--rfq-stepper-progress": STEPS.length > 1
                        ? ((Math.max(currentStep, maxStepReached) - 1) / (STEPS.length - 1)) * 100
                        : 0,
                    }}
                  >
                    {STEPS.map((s, idx) => {
                      // Status:
                      //   active  → on it now (amber)
                      //   done    → behind current, visited (green ✓)
                      //   pending → ahead of current but previously visited
                      //             (yellow !) — the user stepped back, so
                      //             these need a re-look but aren't locked
                      //   locked  → never reached (grey, disabled)
                      const statusFor = (id) =>
                        id === currentStep ? 'active'
                        : id < currentStep ? 'done'
                        : id <= maxStepReached ? 'pending'
                        : 'locked';
                      const status = statusFor(s.id);
                      const nextStep = STEPS[idx + 1];
                      // Connector after this pill turns yellow when the
                      // pill it leads into is in the pending state.
                      const connectorWarn = nextStep && statusFor(nextStep.id) === 'pending';
                      const clickable = s.id <= maxStepReached;
                      return (
                        <li
                          key={s.id}
                          className={`rfq-step-pill rfq-step-pill--${status}${connectorWarn ? ' rfq-step-pill--connector-warn' : ''}`}
                        >
                          <button
                            type="button"
                            className="rfq-step-pill__btn"
                            onClick={() => clickable && goToStep(s.id)}
                            disabled={!clickable}
                            aria-current={s.id === currentStep ? 'step' : undefined}
                            aria-label={`Step ${s.id}: ${s.label}`}
                          >
                            <span className="rfq-step-pill__num">
                              {status === 'done' ? (
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              ) : (
                                s.id
                              )}
                            </span>
                            <span className="rfq-step-pill__text">
                              <span className="rfq-step-pill__label">{s.label}</span>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ol>
                </div>
                )}
                {!isViewOnlyDraft && (
                <p className="rfq-stepper-mobile">Step {currentStep} of {STEPS.length} — {STEPS[currentStep-1]?.label}</p>
                )}

                <fieldset
                  className="rfq-fieldset"
                  disabled={(selectedHotelIds.length > 0 && !hasPermission) || isViewOnlyDraft}
                >
                  {/* STEP 1 — PRODUCTS */}
                  {!isViewOnlyDraft && currentStep === 1 && (
                    <section className="rfq-section">
                      <header className="rfq-section__header">
                        <h3>1. Products</h3>
                        <p>Review the products and assigned vendors. You need at least one product before continuing.</p>
                      </header>

                      {!loading && rfqProducts.length === 0 ? (
                        <div className="rfq-products-empty">
                          <p className="rfq-products-empty__title">No products yet</p>
                          <p className="rfq-products-empty__hint">Add products from the catalog to start building this {getEntityLabel(rfqFormDataFromStore.is_tender)}.</p>
                          <button
                            type="button"
                            className="rfq-btn rfq-btn--primary"
                            id="add_products-create_rfq_page"
                            onClick={() => setShowAddProductsModal(true)}
                          >
                            Add Products
                          </button>
                        </div>
                      ) : (
                        <>
                          {isMagicRfq && sheetNameList.length > 0 && (
                            <div className="rfq-field rfq-field--narrow">
                              <label className="rfq-label">Select Sheet</label>
                              <Select
                                id="select_sheet-create_rfq_page"
                                name="sheetName"
                                options={sheetNameList}
                                value={selectedSheet}
                                placeholder="Select Sheet"
                                onChange={handleSheetChange}
                                classNamePrefix="react-select"
                              />
                            </div>
                          )}

                          {rfqFormDataFromStore.is_tender !== 1 && (
                            <div className="rfq-dynamic-filter">
                              {generateDynamicFilter()}
                            </div>
                          )}

                          <div className="rfq-products-toolbar">
                            <h4 className="rfq-section__subhead">Review Products</h4>
                            <div className="rfq-products-toolbar__actions">
                              {rfqDetails && rfqDetails !== -1 && (
                                <button
                                  className="rfq-refresh-vendors-btn"
                                  onClick={handleRefreshVendors}
                                  disabled={refreshingVendors || (selectedHotelIds.length > 0 && !hasPermission)}
                                  title="Add any missing eligible vendors to all products"
                                  id="refresh_vendors-product_actions-create_rfq_page"
                                  type="button"
                                >
                                  <BsArrowRepeat className={refreshingVendors ? "spin-animation" : ""} size={14} />
                                  {refreshingVendors ? "Refreshing..." : "Refresh Vendors"}
                                </button>
                              )}
                              {!isViewOnlyDraft && !isReadOnly && !isRestrictedEdit && (
                                <button
                                  type="button"
                                  className="rfq-btn rfq-btn--primary rfq-btn--sm"
                                  id="add_more_products-create_rfq_page"
                                  onClick={() => setShowAddProductsModal(true)}
                                >
                                  + Add Products
                                </button>
                              )}
                            </div>
                          </div>

                          <div
                            className="rfq-products-card"
                            style={{ borderColor: hasEmptySpecFields ? "#dc2626" : undefined }}
                          >
                            <div className="rfq-products-card__list">
                              <Accordion
                                flush
                                alwaysOpen
                                activeKey={activeKey}
                                onSelect={(k) => {
                                  setActiveKey(k);
                                  k?.forEach((key) => {
                                    const rfqProductId = key;
                                    fetchVendorsForProduct(rfqProductId);
                                    const rfqProduct = rfqProducts.find((product) => product.id == rfqProductId);
                                    if (rfqProduct) {
                                      getMakesProductWise(rfqProductId, rfqProduct.product_id);
                                    }
                                  });
                                }}
                              >
                                {rfqProducts && rfqProducts.length > 0 && rfqProducts.map((product) => {
                                  if (updatableData.products.deletable.includes(product.id)) {
                                    return null;
                                  }
                                  return (
                                    <Item
                                      is_tender={rfqFormDataFromStore?.is_tender}
                                      activeKey={activeKey}
                                      vendors={vendors?.[product.id] ?? []}
                                      fetchVendors={async () => await fetchVendorsForProduct(product.id)}
                                      updatableData={updatableData}
                                      vendorApprovedList={vendorApprovedList}
                                      data={product}
                                      rfq_id={rfqDetails}
                                      setHasUnsavedChanges={setHasUnsavedChanges}
                                      getDraftInitialData={getDraftInitialData}
                                      saveDraft={handleSaveDraft}
                                      selectedSheet={selectedSheet}
                                      onSpecValueChange={(change) => handleSpecChange(product, change)}
                                      onFilesChange={(change) => handleFilesChange(product, change)}
                                      onCommentChange={(change) => handleCommentChange(product, change)}
                                      onClauseChange={(change) => handleClauseChange(product, change)}
                                      handleViewVendorInEdit={null}
                                      handleRemoveProductInEdit={() => handleRemoveProduct(product)}
                                      handleAddVendorInEdit={null}
                                      header={generateDynamicFilter}
                                      hasVendorError={errorProducts.has(product.id)}
                                      // Per-product fields go read-only whenever the user lacks
                                      // RBAC, the RFQ is fully locked (assertEditAllowed-style),
                                      // OR we're in restricted-edit mode (backend rejects every
                                      // product-level change in that mode — see updateRFQ guard
                                      // in rfqController.js). The one carve-out backend permits
                                      // is `vendors.added` per existing product (Refresh
                                      // Vendors); if you want to surface that, add a separate
                                      // `allowVendorRefresh` prop to Item rather than relaxing
                                      // this gate.
                                      readOnly={(selectedHotelIds.length > 0 && !hasPermission) || isReadOnly || isRestrictedEdit}
                                      units={units}
                                      refreshUnits={refreshUnits}
                                    />
                                  );
                                })}
                              </Accordion>
                            </div>
                          </div>

                          {loading && (
                            <div className="rfq-inline-loading" role="status" aria-live="polite">
                              <span className="rfq-inline-loading__spinner" aria-hidden="true" />
                              <span className="rfq-inline-loading__text">Loading…</span>
                            </div>
                          )}

                          {sheetNameList && sheetNameList.length > 0 && (
                            <ValidationErrorsDisplay
                              rfq_id={draft_id}
                              selectedSheet={selectedSheet}
                              refetchRFQ={getDraftInitialData}
                              setLoading={(loading => dispatch(setStoreLoading(loading)))}
                            />
                          )}
                        </>
                      )}
                    </section>
                  )}

                  {/* STEP 2 — DETAILS (Basics + Contact) */}
                  {!isViewOnlyDraft && currentStep === 2 && (
                    <section className="rfq-section">
                      <header className="rfq-section__header">
                        <h3>2. Details</h3>
                        <p>Title and assignment plus the contact info vendors will use to reach you.</p>
                      </header>
                      <h4 className="rfq-section__subhead">Basics</h4>
                      <div className={`rfq-field${isMissing("title") ? " rfq-field--has-error" : ""}`}>
                        <label className="rfq-label">{getEntityLabel(rfqFormDataFromStore.is_tender)} Title <span className="rfq-required">*</span></label>
                        <input
                          type="text"
                          id="title-input-create_rfq_page"
                          name="title"
                          className="rfq-input"
                          value={rfqFormDataFromStore.title || ""}
                          onChange={handleFormFieldChange}
                          placeholder={`Enter ${getEntityLabel(rfqFormDataFromStore.is_tender)} Title`}
                          disabled={isFieldLocked('title')}
                        />
                        {isMissing("title") && <small className="rfq-field__required-hint">Required</small>}
                      </div>
                      <div className="rfq-grid-2">
                        {departments.length > 0 && (
                          <div className={`rfq-field${isMissing("department_id") ? " rfq-field--has-error" : ""}`}>
                            <label className="rfq-label">Department <span className="rfq-required">*</span></label>
                            <Select
                              id="select_department-create_rfq_page"
                              options={departments}
                              value={departments.find(d => d.value === rfqFormDataFromStore.department_id) || null}
                              onChange={(selected) => {
                                dispatch(setOtherFormFields({ field_name: "department_id", value: selected?.value || null }));
                                setHasUnsavedChanges(true);
                              }}
                              placeholder="Select Department"
                              classNamePrefix="react-select"
                              isClearable
                              isDisabled={isViewOnlyDraft || isEditMode}
                            />
                            {isMissing("department_id") && <small className="rfq-field__required-hint">Required</small>}
                            {rfqFormDataFromStore.department_id && (
                              <small className="rfq-helper-text">
                                Approvers with this department scope or All Departments can approve
                              </small>
                            )}
                          </div>
                        )}
                        {processes.length > 0 && (
                          <div className={`rfq-field${isMissing("process_id") ? " rfq-field--has-error" : ""}`}>
                            <label className="rfq-label">Process <span className="rfq-required">*</span></label>
                            <Select
                              id="select_process-create_rfq_page"
                              options={processes}
                              value={processes.find(p => p.value === rfqFormDataFromStore.process_id) || null}
                              onChange={(selected) => {
                                dispatch(setOtherFormFields({ field_name: "process_id", value: selected?.value || null }));
                                setHasUnsavedChanges(true);
                              }}
                              placeholder="Select Process"
                              classNamePrefix="react-select"
                              isDisabled={isViewOnlyDraft || isEditMode}
                            />
                            {isMissing("process_id") && <small className="rfq-field__required-hint">Required</small>}
                          </div>
                        )}
                      </div>
                      <h4 className="rfq-section__subhead">Contact</h4>
                      <div className="rfq-grid-2">
                        <div className={`rfq-field${isMissing("contact_name") ? " rfq-field--has-error" : ""}`}>
                          <label className="rfq-label" htmlFor="contact_person_input-contact_info-create_rfq_page">
                            Contact person <span className="rfq-required">*</span>
                          </label>
                          <Field
                            id="contact_person_input-contact_info-create_rfq_page"
                            type="text"
                            name="contact_name"
                            className={`rfq-input ${touched.contact_name && errors.contact_name ? "rfq-input--invalid" : ""}`}
                            placeholder="Enter contact person"
                            value={rfqFormDataFromStore.contact_name || ""}
                            onChange={handleFormFieldChange}
                            disabled={isFieldLocked('contact_name')}
                          />
                          {touched.contact_name && errors.contact_name && (
                            <div className="rfq-error">{errors.contact_name}</div>
                          )}
                          {isMissing("contact_name") && <small className="rfq-field__required-hint">Required</small>}
                        </div>
                        <div className={`rfq-field${isMissing("response_email") ? " rfq-field--has-error" : ""}`}>
                          <label className="rfq-label" htmlFor="email_input-contact_info-create_rfq_page">
                            Email <span className="rfq-required">*</span>
                          </label>
                          <Field
                            id="email_input-contact_info-create_rfq_page"
                            type="email"
                            name="response_email"
                            className={`rfq-input ${touched.response_email && errors.response_email ? "rfq-input--invalid" : ""}`}
                            placeholder="Enter email"
                            value={rfqFormDataFromStore.response_email || ""}
                            onChange={handleFormFieldChange}
                            disabled={isFieldLocked('response_email')}
                          />
                          {touched.response_email && errors.response_email && (
                            <div className="rfq-error">{errors.response_email}</div>
                          )}
                          {isMissing("response_email") && <small className="rfq-field__required-hint">Required</small>}
                        </div>
                      </div>
                      <div className="rfq-grid-2">
                        <div className={`rfq-field${isMissing("contact_number") ? " rfq-field--has-error" : ""}`}>
                          <label className="rfq-label">Contact Number <span className="rfq-required">*</span></label>
                          <div className="rfq-phone-row">
                            <Field
                              id="country_code-dropdown-contact_info-create_rfq_page"
                              as="select"
                              name="countryCode"
                              className="rfq-input rfq-input--country"
                              value={onecountrycode}
                              onChange={(e) => setonecountrycode(e.target.value)}
                              disabled={isFieldLocked('contact_number')}
                            >
                              <option value="countryCode">{selectedCountry?.country_code} ({selectedCountry?.phone_code})</option>
                              {countryCode.map((country) => (
                                <option key={country.id} value={country.phone_code}>
                                  {country.country_code} ({country.phone_code})
                                </option>
                              ))}
                            </Field>
                            <Field
                              id="contact_number-input-contact_info-create_rfq_page"
                              type="text"
                              name="contact_number"
                              className={`rfq-input ${touched.contact_number && errors.contact_number ? "rfq-input--invalid" : ""}`}
                              placeholder="Enter mobile number"
                              value={rfqFormDataFromStore.contact_number?.replace(/^\+\d{1,4}-/, "") || ""}
                              onChange={handleFormFieldChange}
                              disabled={isFieldLocked('contact_number')}
                            />
                          </div>
                          {touched.contact_number && errors.contact_number && (
                            <div className="rfq-error">{errors.contact_number}</div>
                          )}
                          {isMissing("contact_number") && <small className="rfq-field__required-hint">Required</small>}
                        </div>
                        <div className="rfq-field">
                          <label className="rfq-label">Company Name</label>
                          <input
                            type="text"
                            className="rfq-input rfq-input--readonly"
                            value={rfqFormDataFromStore.company_name || userProfile?.company_name || ""}
                            disabled
                          />
                          <input
                            type="hidden"
                            name="company_name"
                            value={rfqFormDataFromStore.company_name || userProfile?.company_name || ""}
                          />
                        </div>
                      </div>
                      {(() => {
                        const LOCATION_MAX = 300;
                        const locLen = (rfqFormDataFromStore.location || "").length;
                        const locOver = locLen > LOCATION_MAX;
                        const locNear = !locOver && locLen === LOCATION_MAX;
                        return (
                          <div className="rfq-field">
                            <label className="rfq-label" htmlFor="delivery_location-rfq_details-create_rfq_page">
                              Delivery location
                            </label>
                            <Field
                              id="delivery_location-rfq_details-create_rfq_page"
                              type="text"
                              name="location"
                              className={`rfq-input${locOver ? " rfq-input--invalid" : locNear ? " rfq-input--warn" : ""}`}
                              placeholder="Enter delivery location"
                              value={rfqFormDataFromStore.location || ""}
                              onChange={handleFormFieldChange}
                              maxLength={LOCATION_MAX}
                              disabled={isFieldLocked('location')}
                            />
                            <div
                              className={`rfq-char-count${locOver ? " rfq-char-count--over" : locNear ? " rfq-char-count--warn" : ""}`}
                              aria-live="polite"
                            >
                              {locLen} / {LOCATION_MAX}
                            </div>
                          </div>
                        );
                      })()}
                    </section>
                  )}

                  {/* STEP 3 — TIMELINE */}
                  {!isViewOnlyDraft && currentStep === 3 && (
                    <section className="rfq-section">
                      <header className="rfq-section__header">
                        <h3>3. Timeline</h3>
                        <p>All three dates are required, and must follow this order: Publish → Vendor Clarification End → Quote Submission End.</p>
                      </header>
                      <div className="rfq-grid-3">
                        <div className={`rfq-field${isMissing("tender_publish_date") ? " rfq-field--has-error" : ""}`}>
                          <label className="rfq-label">Publish Date & Time <span className="rfq-required">*</span></label>
                          <input
                            id="tender_publish_date-rfq_details-create_rfq_page"
                            type="datetime-local"
                            name="tender_publish_date"
                            className="rfq-input"
                            min={minPublishDate}
                            value={rfqFormDataFromStore.tender_publish_date ? formatISOToDateTimeLocal(rfqFormDataFromStore.tender_publish_date) : ""}
                            onChange={handleFormFieldChange}
                            disabled={isFieldLocked('tender_publish_date')}
                          />
                          {isMissing("tender_publish_date") && <small className="rfq-field__required-hint">Required</small>}
                        </div>
                        <div className={`rfq-field${isMissing("vendor_clarification_date") ? " rfq-field--has-error" : ""}`}>
                          <label className="rfq-label">Vendor Clarification End Date <span className="rfq-required">*</span></label>
                          <input
                            id="vendor_clarification_date-rfq_details-create_rfq_page"
                            type="datetime-local"
                            name="vendor_clarification_date"
                            className="rfq-input"
                            min={minClarificationDate}
                            value={rfqFormDataFromStore.vendor_clarification_date ? formatISOToDateTimeLocal(rfqFormDataFromStore.vendor_clarification_date) : ""}
                            onChange={handleFormFieldChange}
                            disabled={isFieldLocked('vendor_clarification_date')}
                          />
                          {validationErrors.vendor_clarification_date && (
                            <div className="rfq-error">{validationErrors.vendor_clarification_date}</div>
                          )}
                          {isMissing("vendor_clarification_date") && <small className="rfq-field__required-hint">Required</small>}
                        </div>
                        <div className={`rfq-field${isMissing("bid_end_date") ? " rfq-field--has-error" : ""}`}>
                          <label className="rfq-label">Quote Submission End Date <span className="rfq-required">*</span></label>
                          <input
                            id="procurement_end_date-rfq_details-create_rfq_page"
                            type="datetime-local"
                            name="bid_end_date"
                            className="rfq-input"
                            min={minBidEndDate}
                            value={rfqFormDataFromStore.bid_end_date ? formatISOToDateTimeLocal(rfqFormDataFromStore.bid_end_date) : ""}
                            onChange={handleFormFieldChange}
                            disabled={isFieldLocked('bid_end_date')}
                          />
                          {isMissing("bid_end_date") && <small className="rfq-field__required-hint">Required</small>}
                        </div>
                      </div>
                      {rfqFormDataFromStore.is_tender === 1 && (
                        <div className="rfq-field rfq-field--narrow">
                          <label className="rfq-label">Tender Fees (INR)</label>
                          <input
                            id="tender_fees-input-rfq_details-create_rfq_page"
                            type="number"
                            className="rfq-input"
                            value={rfqFormDataFromStore.tender_fees != null && rfqFormDataFromStore.tender_fees !== "" ? Number(rfqFormDataFromStore.tender_fees) / 100 : ""}
                            onChange={(e) => {
                              const raw = e.target.value;
                              if (raw === "") {
                                dispatch(setOtherFormFields({ field_name: "tender_fees", value: null }));
                              } else {
                                const numericValue = parseFloat(raw);
                                const paise = isNaN(numericValue) ? 0 : Math.max(0, Math.round(numericValue * 100));
                                dispatch(setOtherFormFields({ field_name: "tender_fees", value: paise }));
                              }
                              setHasUnsavedChanges(true);
                            }}
                            placeholder="Enter fees in INR"
                            min="0"
                            disabled={isFieldLocked('tender_fees')}
                          />
                        </div>
                      )}

                      {/* Reverse Auction — disabled by default. Toggling the switch
                          on enables it and reveals the auction-window date fields. */}
                      <div className={`rfq-reverse-auction${rfqFormDataFromStore.reverse_auction === 1 ? " is-on" : ""}`}>
                        <div className="rfq-reverse-auction__head">
                          <div className="rfq-reverse-auction__head-text">
                            <span className="rfq-reverse-auction__title">Reverse Auction</span>
                            <span className="rfq-reverse-auction__sub">
                              Optional — enable a live reverse-auction phase after the quote-submission window closes.
                            </span>
                          </div>
                          <label className="rfq-switch" htmlFor="reverse_auction-toggle-rfq_details-create_rfq_page">
                            <input
                              id="reverse_auction-toggle-rfq_details-create_rfq_page"
                              type="checkbox"
                              name="reverse_auction"
                              checked={rfqFormDataFromStore.reverse_auction === 1}
                              onChange={(e) => handleFormFieldChange({ target: { name: "reverse_auction", value: e.target.checked ? 1 : 0 } })}
                              disabled={isFieldLocked('reverse_auction')}
                            />
                            <span className="rfq-switch__track" aria-hidden="true">
                              <span className="rfq-switch__thumb" />
                            </span>
                            <span className="rfq-switch__label">{rfqFormDataFromStore.reverse_auction === 1 ? "Enabled" : "Disabled"}</span>
                          </label>
                        </div>
                        {rfqFormDataFromStore.reverse_auction === 1 && (
                          <div className="rfq-reverse-auction__body">
                            <div className="rfq-grid-2">
                              <div className={`rfq-field${isMissing("ra_start_date") ? " rfq-field--has-error" : ""}`}>
                                <label className="rfq-label">Auction Start Date & Time <span className="rfq-required">*</span></label>
                                <input
                                  id="auction_start_date-rfq_details-create_rfq_page"
                                  type="datetime-local"
                                  name="ra_start_date"
                                  className="rfq-input"
                                  value={formatISOToDateTimeLocal(rfqFormDataFromStore.ra_start_date)}
                                  onChange={handleFormFieldChange}
                                  min={rfqFormDataFromStore.bid_end_date ? formatISOToDateTimeLocal(rfqFormDataFromStore.bid_end_date) : new Date().toISOString().slice(0, 16)}
                                  disabled={isFieldLocked('ra_start_date')}
                                />
                                {validationErrors.ra_start_date && (<div className="rfq-error">{validationErrors.ra_start_date}</div>)}
                                {isMissing("ra_start_date") && <small className="rfq-field__required-hint">Required</small>}
                              </div>
                              <div className={`rfq-field${isMissing("ra_end_date") ? " rfq-field--has-error" : ""}`}>
                                <label className="rfq-label">Auction End Date & Time <span className="rfq-required">*</span></label>
                                <input
                                  id="auction_end_date-rfq_details-create_rfq_page"
                                  type="datetime-local"
                                  name="ra_end_date"
                                  className="rfq-input"
                                  value={formatISOToDateTimeLocal(rfqFormDataFromStore.ra_end_date)}
                                  onChange={handleFormFieldChange}
                                  min={rfqFormDataFromStore.ra_start_date ? formatISOToDateTimeLocal(rfqFormDataFromStore.ra_start_date) : ""}
                                  disabled={!rfqFormDataFromStore.ra_start_date || isFieldLocked('ra_end_date')}
                                />
                                {validationErrors.ra_end_date && (<div className="rfq-error">{validationErrors.ra_end_date}</div>)}
                                {isMissing("ra_end_date") && <small className="rfq-field__required-hint">Required</small>}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </section>
                  )}

                  {/* STEP 4 — TERMS & CONDITIONS */}
                  {!isViewOnlyDraft && currentStep === 4 && (
                    <section className="rfq-section">
                      <header className="rfq-section__header">
                        <h3>4. Terms & Conditions</h3>
                        <p>Pick from suggested terms, write your own, and attach any reference documents.</p>
                      </header>
                      {!loading && allTerms.length > 0 && (
                        <div className="rfq-terms-suggested">
                          <div className="rfq-terms-suggested__head">
                            <h4 className="rfq-section__subhead">Suggested Terms</h4>
                            {(() => {
                              const allSelected = allTerms.every((item) =>
                                selectedTerms?.some(
                                  (term) => String(term.id || term.term_id) === String(item.id || item.term_id)
                                )
                              );
                              const someSelected = !allSelected && allTerms.some((item) =>
                                selectedTerms?.some(
                                  (term) => String(term.id || term.term_id) === String(item.id || item.term_id)
                                )
                              );
                              return (
                                <label className="rfq-checkbox rfq-terms-suggested__select-all" htmlFor="rfq-terms-select-all">
                                  <input
                                    type="checkbox"
                                    id="rfq-terms-select-all"
                                    checked={allSelected}
                                    disabled={isViewOnlyDraft || isFieldLocked('terms')}
                                    ref={(el) => { if (el) el.indeterminate = someSelected; }}
                                    onChange={(e) => {
                                      const check = e.target.checked;
                                      const next = check
                                        ? allTerms.map((item) => {
                                            const id = Number(item.id || item.term_id);
                                            const name = item.term_content || item.name || item.term_text ||
                                              (item.content && Array.isArray(item.content) && item.content[0]?.title) ||
                                              `Term ${id}`;
                                            return { id, name };
                                          })
                                        : [];
                                      dispatch(setTermsData(next));
                                      setTermsChanged(true);
                                      setHasUnsavedChanges(true);
                                    }}
                                  />
                                  <span>{allSelected ? "Deselect all" : "Select all"}</span>
                                </label>
                              );
                            })()}
                          </div>
                          <ul className="rfq-terms-list">
                            {allTerms.map((item) => {
                              const termContent =
                                item.term_content || item.name || item.term_text ||
                                (item.content && Array.isArray(item.content) && item.content[0]?.title) ||
                                `Term ${item.id}`;
                              const isSelected = selectedTerms?.some(
                                (term) => String(term.id || term.term_id) === String(item.id || item.term_id)
                              );
                              return (
                                <li key={`term-${item.id}`}>
                                  <label className="rfq-checkbox" htmlFor={`term-${item.id}`}>
                                    <input
                                      type="checkbox"
                                      id={`term-${item.id}`}
                                      checked={isSelected}
                                      disabled={isViewOnlyDraft || isFieldLocked('terms')}
                                      onChange={(e) => handleTermChange(e, item)}
                                    />
                                    <span>{termContent}</span>
                                  </label>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}
                      <div className="rfq-terms-add">
                        <h4 className="rfq-section__subhead">Add your own terms</h4>
                        <FormikField
                          nolabel
                          placeholder="You can mention your terms regarding Freight Charges, Payment Terms, Performance Bank Guarantee, Packing & Forwarding Charges, Delivery Period, Liquidated Damages, Transit Insurance and more"
                          type="editor"
                          rows="5"
                          name="comment"
                          touched={touched}
                          errors={errors}
                          enableHandleChange={true}
                          handleChange={(html) => {
                            dispatch(setOtherFormFields({ field_name: "comment", value: html }));
                            setHasUnsavedChanges(true);
                          }}
                          showOptionalLabel={false}
                          isDisabled={isViewOnlyDraft || isFieldLocked('comment')}
                          className="rfq-terms-editor"
                        />
                      </div>
                      <div className="rfq-upload">
                        <h4 className="rfq-section__subhead">Upload Your Terms</h4>
                        <div className="rfq-file-card">
                          <label
                            htmlFor="upload_terms-create_rfq_page"
                            className={`rfq-file-drop ${(isViewOnlyDraft || isFieldLocked('term_and_condition_files')) ? "rfq-file-drop--disabled" : ""}`}
                            aria-disabled={isViewOnlyDraft || isFieldLocked('term_and_condition_files')}
                          >
                            <span className="rfq-file-drop__label">Upload Your Terms</span>
                            <span className="rfq-file-drop__hint">Click to browse</span>
                            <input
                              id="upload_terms-create_rfq_page"
                              type="file"
                              accept=".pdf, .docx, .doc, .xlsx, .xls, .csv, .png, .jpg, .jpeg"
                              multiple
                              onChange={(e) => handleTermFiles("add", e)}
                              disabled={isViewOnlyDraft || isFieldLocked('term_and_condition_files')}
                            />
                          </label>
                          {termFiles.length > 0 && (
                            <button
                              type="button"
                              className="rfq-file-show-btn"
                              onClick={() => setTermsFileModalOpen(true)}
                            >
                              <FontAwesomeIcon icon={faEye} />
                              <span>Show file{termFiles.length > 1 ? "s" : ""} ({termFiles.length})</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </section>
                  )}

                  {termsFileModalOpen && (
                    <div
                      className="rfq-doc-modal__overlay"
                      role="dialog"
                      aria-modal="true"
                      onClick={() => setTermsFileModalOpen(false)}
                    >
                      <div
                        className="rfq-doc-modal"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="rfq-doc-modal__header">
                          <h3 className="rfq-doc-modal__title">Upload Your Terms — Documents</h3>
                          <button
                            type="button"
                            className="rfq-doc-modal__close"
                            aria-label="Close"
                            onClick={() => setTermsFileModalOpen(false)}
                          >
                            <FontAwesomeIcon icon={faXmark} />
                          </button>
                        </div>
                        <div className="rfq-doc-modal__body">
                          {(!termFiles || termFiles.length === 0) ? (
                            <p className="rfq-doc-modal__empty">No documents uploaded.</p>
                          ) : (
                            <ul className="rfq-doc-list">
                              {termFiles.map((fileUrl, idx) => (
                                <li key={fileUrl} className="rfq-doc-list__row">
                                  <span className="rfq-doc-list__label">Document {idx + 1}</span>
                                  <div className="rfq-doc-list__actions">
                                    <a
                                      href={fileUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="rfq-doc-list__view"
                                    >
                                      <FontAwesomeIcon icon={faEye} />
                                      <span>View doc</span>
                                    </a>
                                    {!isViewOnlyDraft && !isFieldLocked('term_and_condition_files') && (
                                      <button
                                        type="button"
                                        className="rfq-doc-list__remove"
                                        aria-label="Remove file"
                                        title={extractfileName(fileUrl)}
                                        onClick={() => handleTermFiles("remove", fileUrl)}
                                      >
                                        <FontAwesomeIcon icon={faTrash} />
                                      </button>
                                    )}
                                  </div>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                        <div className="rfq-doc-modal__footer">
                          <button
                            type="button"
                            className="rfq-doc-modal__btn"
                            onClick={() => setTermsFileModalOpen(false)}
                          >
                            Close
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 5 — REVIEW & SUBMIT */}
                  {(isViewOnlyDraft || currentStep === 5) && (
                    <section className="rfq-section">
                      {!isViewOnlyDraft && (
                        <header className="rfq-section__header">
                          <h3>5. Review & Submit</h3>
                          <p>Final check before sending this {getEntityLabel(rfqFormDataFromStore.is_tender)} to vendors.</p>
                        </header>
                      )}
                      {isEditMode && (
                        <div className="rfq-edit-saved-banner" role="status">
                          All changes have been saved. You can review or edit your changes!
                        </div>
                      )}
                      {!isEditMode && !isViewOnlyDraft && !(selectedHotelIds.length > 0 && !hasPermission) && (
                        <div className="rfq-submit-info-banner" role="status">
                          Clicking “Submit” will send this {getEntityLabel(rfqFormDataFromStore?.is_tender)} to relevant vendors for the selected products.
                        </div>
                      )}
                      <div className="rfq-review">
                        <div className="rfq-review-group">
                          <div className="rfq-review-group__head">
                            <h4>Products {rfqProducts.length > 0 && <span className="rfq-review-group__count">({rfqProducts.length})</span>}</h4>
                            {!isViewOnlyDraft && (<button type="button" className="rfq-review-edit" onClick={() => setCurrentStep(1)}>Edit</button>)}
                          </div>
                          {rfqProducts.length === 0 ? (
                            <p className="rfq-review-line">No products added.</p>
                          ) : (
                            <div className="rfq-review-product-grid">
                              {rfqProducts.map((p) => {
                                const qty = getSpecFieldValue(p, "quantity");
                                const unit = getSpecFieldValue(p, "unit");
                                return (
                                  <button
                                    type="button"
                                    key={p.id || `${p.product_id}-${p.variant}`}
                                    className="rfq-review-product-card"
                                    onClick={() => setViewProduct(p)}
                                  >
                                    <span className="rfq-review-product-card__name">{p.name || `Product #${p.product_id}`}</span>
                                    <span className="rfq-review-product-card__meta">
                                      <span><strong>Qty:</strong> {qty || "—"}</span>
                                      <span className="rfq-review-product-card__sep">·</span>
                                      <span><strong>Unit:</strong> {unit || "—"}</span>
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        <div className="rfq-review-group">
                          <div className="rfq-review-group__head">
                            <h4>Details</h4>
                            {!isViewOnlyDraft && (<button type="button" className="rfq-review-edit" onClick={() => setCurrentStep(2)}>Edit</button>)}
                          </div>
                          <dl className="rfq-review-dl">
                            <dt>Title</dt><dd>{rfqFormDataFromStore.title || "—"}</dd>
                            <dt>Department</dt><dd>{departments.find(d => d.value === rfqFormDataFromStore.department_id)?.label || "—"}</dd>
                            <dt>Process</dt><dd>{processes.find(p => p.value === rfqFormDataFromStore.process_id)?.label || "—"}</dd>
                            <dt>Contact person</dt><dd>{rfqFormDataFromStore.contact_name || "—"}</dd>
                            <dt>Email</dt><dd>{rfqFormDataFromStore.response_email || "—"}</dd>
                            <dt>Phone</dt><dd>{rfqFormDataFromStore.contact_number || "—"}</dd>
                            <dt>Company</dt><dd>{rfqFormDataFromStore.company_name || userProfile?.company_name || "—"}</dd>
                            <dt>Delivery location</dt><dd>{rfqFormDataFromStore.location || "—"}</dd>
                          </dl>
                        </div>
                        <div className="rfq-review-group">
                          <div className="rfq-review-group__head">
                            <h4>Timeline</h4>
                            {!isViewOnlyDraft && (<button type="button" className="rfq-review-edit" onClick={() => setCurrentStep(3)}>Edit</button>)}
                          </div>
                          <dl className="rfq-review-dl">
                            <dt>Publish</dt><dd>{formattedDate(rfqFormDataFromStore.tender_publish_date)}</dd>
                            <dt>Vendor Clarification End</dt><dd>{formattedDate(rfqFormDataFromStore.vendor_clarification_date)}</dd>
                            <dt>Quote Submission End</dt><dd>{formattedDate(rfqFormDataFromStore.bid_end_date)}</dd>
                            {rfqFormDataFromStore.is_tender === 1 && (
                              <>
                                <dt>Tender Fees</dt>
                                <dd>{rfqFormDataFromStore.tender_fees != null ? `₹${(Number(rfqFormDataFromStore.tender_fees)/100).toFixed(2)}` : "—"}</dd>
                              </>
                            )}
                            <dt>Reverse Auction</dt>
                            <dd>
                              {rfqFormDataFromStore.reverse_auction === 1
                                ? `${formattedDate(rfqFormDataFromStore.ra_start_date)} → ${formattedDate(rfqFormDataFromStore.ra_end_date)}`
                                : "Disabled"}
                            </dd>
                          </dl>
                        </div>
                        <div className="rfq-review-group">
                          <div className="rfq-review-group__head">
                            <h4>Terms & Conditions</h4>
                            {!isViewOnlyDraft && (<button type="button" className="rfq-review-edit" onClick={() => setCurrentStep(4)}>Edit</button>)}
                          </div>
                          {(() => {
                            const customPlain = (rfqFormDataFromStore.comment || "")
                              .replace(/<br\s*\/?>(\s*)/gi, "\n")
                              .replace(/<\/p>\s*<p[^>]*>/gi, "\n")
                              .replace(/<[^>]*>/g, "")
                              .replace(/&nbsp;/g, " ")
                              .replace(/&amp;/g, "&")
                              .replace(/&lt;/g, "<")
                              .replace(/&gt;/g, ">")
                              .trim();
                            return (
                              <div className="rfq-review-tc">
                                <div className="rfq-review-tc__block">
                                  <span className="rfq-review-tc__label">
                                    Suggested Terms
                                    <span className="rfq-review-tc__count">({selectedTerms?.length || 0})</span>
                                  </span>
                                  {selectedTerms?.length ? (
                                    <ul className="rfq-review-tc__terms">
                                      {selectedTerms.map((t) => {
                                        const termText = t.term_content || t.name || t.term_text || `Term ${t.id || t.term_id}`;
                                        return (
                                          <li key={t.id || t.term_id}>{termText}</li>
                                        );
                                      })}
                                    </ul>
                                  ) : (
                                    <span className="rfq-review-tc__empty">No suggested terms selected.</span>
                                  )}
                                </div>

                                <div className="rfq-review-tc__block">
                                  <span className="rfq-review-tc__label">Custom Terms</span>
                                  {customPlain ? (
                                    <p className="rfq-review-tc__custom">{customPlain}</p>
                                  ) : (
                                    <span className="rfq-review-tc__empty">No custom terms.</span>
                                  )}
                                </div>

                                <div className="rfq-review-tc__block">
                                  <span className="rfq-review-tc__label">
                                    Attached Files
                                    <span className="rfq-review-tc__count">({termFiles.length})</span>
                                  </span>
                                  {termFiles.length ? (
                                    <ul className="rfq-review-tc__files">
                                      {termFiles.map((url, idx) => (
                                        <li key={url}>
                                          <a href={url} target="_blank" rel="noopener noreferrer" title={extractfileName(url)}>
                                            Document {idx + 1}
                                          </a>
                                        </li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <span className="rfq-review-tc__empty">No files attached.</span>
                                  )}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                      {!isViewOnlyDraft && selectedHotelIds.length > 0 && !hasPermission && (
                        <p className="rfq-readonly-msg">
                          This is a Read-Only {rfqFormDataFromStore?.is_tender === 1 ? "Tender" : "RFQ"}. You do not have permission to make changes.
                        </p>
                      )}
                    </section>
                  )}
                </fieldset>

                {/* Sticky action bar.
                    View-only mode collapses this to a single Close button
                    that returns the user to the Draft RFQ list — they can't
                    edit or submit, so Previous / Save / Next / Submit are
                    all irrelevant. */}
                {isViewOnlyDraft ? (
                  <div className="rfq-actions-bar rfq-actions-bar--end">
                    <button
                      type="button"
                      className="rfq-btn rfq-btn--secondary"
                      onClick={() => router.push('/dashboard/buyer/rfq-management?tab=draft-rfq')}
                    >
                      Close
                    </button>
                  </div>
                ) : (
                  <div className="rfq-actions-bar">
                    <button
                      type="button"
                      className="rfq-btn rfq-btn--ghost"
                      onClick={goPrev}
                      disabled={currentStep === 1}
                    >
                      ← Previous
                    </button>
                    <div className="rfq-actions-bar__right">
                      {!(isEditMode && currentStep === STEPS.length) && (
                        <button
                          type="button"
                          className="rfq-btn rfq-btn--secondary"
                          onClick={handleSaveDraft}
                          disabled={!hasUnsavedChanges || isReadOnly || (selectedHotelIds.length > 0 && !hasPermission)}
                          id="save_draft-rfq_actions-create_rfq_page"
                          title={
                            selectedHotelIds.length > 0 && !hasPermission
                              ? "You don't have permission to save changes"
                              : isReadOnly
                                ? "This RFQ can no longer be edited"
                                : !hasUnsavedChanges
                                  ? "No changes to save"
                                  : ""
                          }
                        >
                          Save Changes
                        </button>
                      )}
                      {currentStep < STEPS.length && (
                        <button
                          type="button"
                          className="rfq-btn rfq-btn--primary"
                          onClick={goNext}
                        >
                          Save and Next →
                        </button>
                      )}
                      {currentStep === STEPS.length && !isEditMode && (
                        <button
                          type="submit"
                          className="rfq-btn rfq-btn--success"
                          disabled={!isValid || isReadOnly || (selectedHotelIds.length > 0 && !hasPermission)}
                          id="create_rfq-rfq_actions-create_rfq_page"
                          title={
                            selectedHotelIds.length > 0 && !hasPermission ? "You don't have permission to create RFQ/Tender"
                            : isReadOnly ? "This RFQ can no longer be edited"
                            : ""
                          }
                        >
                          Submit
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </Form>
            );
          }}
        </Formik>
      </div>

      {/* Product detail modal — opened from the Review section's product
          card grid. Wide horizontal grid so big payloads stay readable. */}
      {viewProduct && (
        <ProductDetailModal
          product={viewProduct}
          getSpecFieldValue={getSpecFieldValue}
          updatableData={updatableData}
          onClose={() => setViewProduct(null)}
        />
      )}

      {/* Modals */}
      <ViewVendorModal
        productData={selectedProduct}
        updatableData={updatableData}
        isOpen={showModal.vendorModal}
        applyToOtherVariants={handleSyncApplyToOtherVariants}
        onClose={() =>
          setShowModal((prev) => ({
            ...prev,
            vendorModal: false,
          }))
        }
        onSelectAll={(isChecked) => {
          setUpdatableData((prev) => ({
            ...prev,
            vendors: {
              ...prev.vendors,
              [selectedProduct.product.id]: {
                ...(prev.vendors?.[selectedProduct.product.id] ?? {
                  product_id: selectedProduct.product.product_id,
                  variant: selectedProduct.product.variant,
                }),
                deletable: [
                  ...(isChecked ? selectedProduct.vendors.map(vendor => vendor.user_id) : [])
                ],
              },
            },
          }));
        }}
        onAdd={(item) => {
          const key = `${selectedProduct.product.id}`;
          const totalVendors = vendors?.[key]?.length ?? 0;

          const deletableVendors =
            (
              updatableData.vendors?.[selectedProduct.product.id]?.deletable ??
              []
            ).length + 1;
          const addableVendors = (
            updatableData.vendors?.[selectedProduct.product.id]?.addable ?? []
          ).length;

          if (totalVendors + addableVendors - deletableVendors <= 0) {
            toast.error("At least one vendor is required for the product");
            return;
          }
          setUpdatableData((prev) => ({
            ...prev,
            vendors: {
              ...prev.vendors,
              [selectedProduct.product.id]: {
                ...(prev.vendors?.[selectedProduct.product.id] ?? {
                  product_id: selectedProduct.product.product_id,
                  variant: selectedProduct.product.variant,
                }),
                deletable: [
                  ...(prev.vendors?.[selectedProduct.product.id]?.deletable ??
                    []),
                  item.user_id,
                ],
              },
            },
          }));
        }}
        onRemove={(item) => {
          setUpdatableData((prev) => ({
            ...prev,
            vendors: {
              ...prev.vendors,
              [selectedProduct.product.id]: {
                ...(prev.vendors?.[selectedProduct.product.id] ?? {
                  product_id: selectedProduct.product.product_id,
                  variant: selectedProduct.product.variant,
                }),
                deletable: (
                  prev.vendors?.[selectedProduct.product.id]?.deletable ?? []
                ).filter(
                  (deletableVendorId) => deletableVendorId != item.user_id
                ),
              },
            },
          }));
        }}
      />

      <AddVendorModal
        headerTitle={`Add Vendor in ${selectedProduct?.product?.name}`}
        vendors={addableVendors}
        productData={selectedProduct}
        updatableData={updatableData}
        applyToOtherVariants={handleSyncApplyToOtherVariants}
        isOpen={showModal.addVendorModal}
        onClose={() => {
          setShowModal((prev) => ({ ...prev, addVendorModal: false }));
          setAddableVendors([]);
        }}
        addedVendorsList={
          updatableData?.vendors?.[selectedProduct?.product?.id]?.addable ?? []
        }
        fetchVendors={fetchAvailableVendorsForProduct}
        onSelectAll={(isChecked) => {
          setUpdatableData((prev) => ({
            ...prev,
            vendors: {
              ...prev.vendors,
              [selectedProduct.product.id]: {
                ...(prev.vendors?.[selectedProduct.product.id] ?? {
                  product_id: selectedProduct.product.product_id,
                  variant: selectedProduct.product.variant,
                }),
                addable: [
                  ...(isChecked ? addableVendors.map(vendor => vendor.id) : [])
                ],
              },
            },
          }));
        }}
        onAdd={(item) => {
          setUpdatableData((prev) => ({
            ...prev,
            vendors: {
              ...prev.vendors,
              [selectedProduct.product.id]: {
                ...(prev.vendors?.[selectedProduct.product.id] ?? {
                  product_id: selectedProduct.product.product_id,
                  variant: selectedProduct.product.variant,
                }),
                addable: [
                  ...(prev.vendors?.[selectedProduct.product.id]?.addable ??
                    []),
                  item.id,
                ],
              },
            },
          }));
        }}
        onRemove={(item) => {
          const key = `${selectedProduct.product.id}`;
          const totalVendors = vendors?.[key]?.length ?? 0;

          const deletableVendors = (
            updatableData.vendors?.[selectedProduct.product.id]?.deletable ?? []
          ).length;
          const addableVendors =
            (updatableData.vendors?.[selectedProduct.product.id]?.addable ?? [])
              .length - 1;

          if (totalVendors + addableVendors - deletableVendors <= 0) {
            toast.error("At least one vendor is required for the product");
            return;
          }
          setUpdatableData((prev) => ({
            ...prev,
            vendors: {
              ...prev.vendors,
              [selectedProduct.product.id]: {
                ...(prev.vendors?.[selectedProduct.product.id] ?? {
                  product_id: selectedProduct.product.product_id,
                  variant: selectedProduct.product.variant,
                }),
                addable: (
                  prev.vendors?.[selectedProduct.product.id]?.addable ?? []
                ).filter((deletableVendorId) => deletableVendorId != item.id),
              },
            },
          }));
        }}
      />

      <CreateRFQModal
        show={showRFQModal}
        onHide={() => setShowRFQModal(false)}
        onConfirm={() => handleCreateRFQ(finalRFQValues)}
        sheets={sheetNameList}
        selectedSheets={selectedSheetsForRFQ}
        setSelectedSheets={setSelectedSheetsForRFQ}
        is_tender={rfqFormDataFromStore?.is_tender}
      />

      {/* Submit RFQ Confirmation Modal */}
      <ConfirmationModal
        isOpen={showCreateConfirmModal}
        onClose={handleCreateCancel}
        onConfirm={handleCreateConfirm}
        title={`Submit ${getEntityLabel(rfqFormDataFromStore?.is_tender)}`}
        description={`Are you sure you want to submit this ${getEntityLabel(rfqFormDataFromStore?.is_tender)}?\nThis action will send the ${getEntityLabel(rfqFormDataFromStore?.is_tender)} to selected vendors.`}
        confirmButtonColor="success"
        confirmButtonText="Submit"
        cancelButtonText="Cancel"
      />

      {/* Remove Product Confirmation Modal */}
      <ConfirmationModal
        isOpen={showRemoveProductConfirmModal}
        onClose={handleRemoveProductCancel}
        onConfirm={handleRemoveProductConfirm}
        title="Remove Product"
        description={`Are you sure you want to remove this product from the ${getEntityLabel(rfqFormDataFromStore?.is_tender)}?\nThis action will remove the product and all its associated data.`}
        confirmButtonColor="danger"
        confirmButtonText="Remove"
        cancelButtonText="Cancel"
      />

      <AddProductsModal
        isOpen={showAddProductsModal}
        onClose={() => setShowAddProductsModal(false)}
        hotelIds={selectedHotelIds}
        isRestrictedEdit={isRestrictedEdit}
        rfqLabel={getEntityLabel(rfqFormDataFromStore?.is_tender)}
      />
      <style jsx>{`
        .refresh-vendors-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border: 1px solid #000080;
          border-radius: var(--border-radius, 6px);
          background: #fff;
          color: #000080;
          font-weight: 500;
          font-size: 14px;
          line-height: 20px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .refresh-vendors-btn:hover:not(:disabled) {
          background: #000080;
          color: #fff;
        }
        .refresh-vendors-btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }
        .spin-animation {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
};


export default CreateRFQ;