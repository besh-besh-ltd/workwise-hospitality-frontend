import Accordion from "react-bootstrap/Accordion";
import { OverlayTrigger, Tooltip } from "react-bootstrap";
import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "react-toastify";
import {
  addProductComment,
  addFiles,
  addProductSpecValue,
  removeFiles,
  removeRfqProduct,
  setUserSelectedDefaultFile,
} from "@/redux/slice";
import { extractfileName, handleFileUpload, getEntityLabel } from "@/utils/sharedFunctions";
import { faEye, faFile, faEdit } from "@fortawesome/free-regular-svg-icons";
import { faPlusCircle, faTrash, faClone, faCheck, faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useDispatch } from "react-redux";
import AddClause from "./AddClause";
import { addProductToDraft, addProductToExistingRfq, getClausesByRfqProductId } from "@/services/rfq";
import { addCustomUnit, deleteCustomUnit } from "@/services/units";
import Select, { components as RSComponents } from "react-select";
import CommonFormInput from "@/components/shared/CommonFormInput";
import ConfirmationModal from "@/components/modal/ConfirmationModal";
// WH-69: PrevHint chip — only renders something when this product field
// has a recorded prior value in /rfq/:id/edit-history.
import PrevHint from "@/components/shared/PrevHint";

// Defined at module scope so react-select doesn't see a new component
// reference on every Item render — that previously caused the menu to
// remount and immediately fire onMenuClose, which reset the inline editor
// before the click could take effect. State is threaded through
// `selectProps` (any unknown props on <Select> land there).
const UnitMenuList = (props) => {
  const {
    unitFooterEditing,
    unitFooterValue,
    unitFooterSaving,
    setUnitFooterEditing,
    setUnitFooterValue,
    submitNewUnit,
    closeUnitFooter,
  } = props.selectProps;

  return (
    <RSComponents.MenuList {...props}>
      {props.children}
      {/*
        Footer wrapper preventDefaults mousedown so clicking inside it
        doesn't blur react-select's hidden search input — that blur is
        what closes the menu. Each interactive child ALSO uses
        onMouseDown for its action (instead of onClick) so the handler
        runs in the same event that we just preventDefault'd, leaving
        no window for react-select to close the menu between mousedown
        and click. stopPropagation belt-and-braces against bubbling.
      */}
      <div
        className="rfq-unit-add-footer"
        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
      >
        {!unitFooterEditing ? (
          <button
            type="button"
            className="rfq-unit-add-footer__trigger"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setUnitFooterEditing(true);
            }}
          >
            + Add custom unit
          </button>
        ) : (
          <div className="rfq-unit-add-footer__form">
            <input
              type="text"
              autoFocus
              className="rfq-unit-add-footer__input"
              value={unitFooterValue}
              maxLength={50}
              placeholder="e.g. Carton"
              // Native input gets focus from autoFocus; we DON'T preventDefault
              // mousedown here because the user needs to be able to click into
              // the input to focus it (preventDefault would block that).
              onMouseDown={(e) => e.stopPropagation()}
              onChange={(e) => setUnitFooterValue(e.target.value)}
              onKeyDown={(e) => {
                // Stop every keystroke from bubbling up to react-select —
                // otherwise its menu-level handler swallows Backspace (and
                // others) and the user can't edit the inline custom-unit
                // input. We still handle the navigation keys ourselves.
                e.stopPropagation();
                if (e.key === "Enter") { e.preventDefault(); submitNewUnit(); }
                if (e.key === "Escape") { e.preventDefault(); closeUnitFooter(); }
              }}
            />
            <button
              type="button"
              className="rfq-unit-add-footer__icon-btn rfq-unit-add-footer__icon-btn--save"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (unitFooterSaving || !unitFooterValue.trim()) return;
                submitNewUnit();
              }}
              disabled={unitFooterSaving || !unitFooterValue.trim()}
              aria-label="Save custom unit"
              title="Save"
            >
              {unitFooterSaving
                ? <span className="rfq-unit-add-footer__spinner" aria-hidden="true" />
                : <FontAwesomeIcon icon={faCheck} />}
            </button>
            <button
              type="button"
              className="rfq-unit-add-footer__icon-btn rfq-unit-add-footer__icon-btn--cancel"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                closeUnitFooter();
              }}
              aria-label="Cancel"
              title="Cancel"
            >
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </div>
        )}
      </div>
    </RSComponents.MenuList>
  );
};

const UNIT_SELECT_COMPONENTS = { MenuList: UnitMenuList, IndicatorSeparator: null };

const Item = ({
  is_tender,
  rfq_id,
  data,
  setHasUnsavedChanges,
  getDraftInitialData,
  saveDraft,
  type = "create",
  handleRemoveProductInEdit,
  handleViewVendorInEdit,
  handleAddVendorInEdit,
  onSpecValueChange,
  onFilesChange,
  onCommentChange,
  onClauseChange,
  selectedSheet,
  activeKey,
  vendors,
  fetchVendors,
  updatableData,
  pageRoute = "create_rfq_page", // Default fallback
  // WH-69: Composite-key map of "value just before the most recent save"
  // built in EditRFQ.js. Optional — only present in the edit flow.
  previousValues,

  // Behavioural Html injection props
  header,
  footer,
  hasVendorError,
  readOnly = false, // Permission-based read-only mode
  units = [],          // Global defaults + this user's customs (passed from CreateRFQ.js)
  refreshUnits,        // Callback to re-fetch the units list after add / delete
}) => {
  const dispatch = useDispatch();
  const [rfqProduct, setRfqProduct] = useState(data);
  const [uploadedQapFile, setUploadedQapFile] = useState(data?.qap_file);
  const [uploadedSpecFile, setUploadedSpecFile] = useState(data?.spec_file);
  const [uploadedDatasheetFile, setUploadedDatasheetFile] = useState(
    data?.datasheet_file
  );
  const [comment, setComment] = useState(data?.comment);
  const [isModelOpen, setIsModalOpen] = useState(false);
  const [openToMinimumScore, setOpenToMinimumScore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [buyerClauses, setBuyerClauses] = useState(null);
  const [minimumPassingScore, setMinimumPassingScore] = useState(null);
  const [showRemoveConfirmModal, setShowRemoveConfirmModal] = useState(false);
  // ---- Unit dropdown state ----
  // The sticky footer toggles between an "+ Add custom unit" button (default)
  // and an inline input + Save / Cancel pair (active). State lives at the Item
  // level so each accordion row owns its own footer; opening one product's
  // dropdown doesn't reset another's.
  const [unitFooterEditing, setUnitFooterEditing] = useState(false);
  const [unitFooterValue, setUnitFooterValue] = useState("");
  const [unitFooterSaving, setUnitFooterSaving] = useState(false);
  const [unitDeleteTarget, setUnitDeleteTarget] = useState(null); // { id, name } or null
  // When non-null, the Documents modal is open for this uploader.
  // Shape: { label, fileType, files }
  const [fileModalState, setFileModalState] = useState(null);
  // Controlled menu-open state. Lets us refuse to close the menu while the
  // user is mid-edit on the "Add custom unit" inline form — react-select's
  // own outside-click logic would otherwise close it as soon as the button
  // is clicked.
  const [unitMenuOpen, setUnitMenuOpen] = useState(false);
  const [specs, setSpecs] = useState({
    size: '',
    spec: '',
    quantity: '',
    unit: ''
  })

  const eventKey = `${rfqProduct.id}`;
  const isActive = activeKey?.includes(eventKey);

  const handleSpecValue = (type, value) => {
    value = type == 'quantity' ? parseFloat(value) || '' : value

    // if (rfqProduct.spec) {
    //   setRfqProduct((prev) => ({
    //     ...prev,
    //     spec: prev.spec.map((item) =>
    //       item.title === type ? { ...item, value } : item
    //     ),
    //   }));
    // }
    dispatch(
      addProductSpecValue({
        title: type.charAt(0).toUpperCase() + type.slice(1),
        value,
        product_id: rfqProduct.product_id,
        variant: rfqProduct.variant,
      })
    );
    if(onSpecValueChange)
      onSpecValueChange({
        title: type.charAt(0).toUpperCase() + type.slice(1),
        value,
        product_id: rfqProduct.product_id,
        variant: rfqProduct.variant,
      })
    setHasUnsavedChanges(true);
  };

  const uploadToServer = async (e, fileType) => {
    try {
      const filePath = await handleFileUpload(e);
      const updatedFiles = [
        ...(fileType === "qap_file"
          ? uploadedQapFile
          : fileType === "spec_file"
          ? uploadedSpecFile
          : uploadedDatasheetFile),
        filePath,
      ];

      if (fileType === "qap_file") setUploadedQapFile(updatedFiles);
      if (fileType === "spec_file") setUploadedSpecFile(updatedFiles);
      if (fileType === "datasheet_file") setUploadedDatasheetFile(updatedFiles);

      if(onFilesChange)
        onFilesChange({
          type: fileType,
          value: updatedFiles,
          product_id: rfqProduct.product_id,
          variant: rfqProduct.variant,
        })
      if(type != 'edit')
        dispatch(
          addFiles({
            type: fileType,
            value: filePath,
            product_id: rfqProduct.product_id,
            variant: rfqProduct.variant,
          })
        );
      setHasUnsavedChanges(true);

      // Persist the new file to the backend. In create flow we re-save the
      // draft so the upload survives a refresh; edit flow lets the parent
      // handle persistence via onFilesChange.
      if (type !== "edit" && typeof saveDraft === "function") {
        try {
          await saveDraft();
        } catch (err) {
          toast.error("File uploaded but failed to save. Please try again.");
        }
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleRemoveFile = async (fileUrl, fileType) => {
    const updatedFiles = (
      fileType === "qap_file"
        ? uploadedQapFile
        : fileType === "spec_file"
        ? uploadedSpecFile
        : uploadedDatasheetFile
    ).filter((file) => file !== fileUrl);

    if (fileType === "qap_file") setUploadedQapFile(updatedFiles);
    if (fileType === "spec_file") setUploadedSpecFile(updatedFiles);
    if (fileType === "datasheet_file") setUploadedDatasheetFile(updatedFiles);

    if (onFilesChange)
      onFilesChange({
        type: fileType,
        value: updatedFiles,
        product_id: rfqProduct.product_id,
        variant: rfqProduct.variant,
      });
    dispatch(
      removeFiles({
        type: fileType,
        value: fileUrl,
        product_id: rfqProduct.product_id,
        variant: rfqProduct.variant,
      })
      );
    setHasUnsavedChanges(true);

    // Persist removal to the backend. In create flow we re-save the draft;
    // edit flow lets the parent handle persistence via onFilesChange.
    if (type !== "edit" && typeof saveDraft === "function") {
      try {
        await saveDraft();
      } catch (error) {
        toast.error("Failed to remove file. Please try again.");
      }
    }
  };

  const handleaddProductComment = (e) => {
    const newComment = e.target.value;
    setComment(newComment);
    if(onCommentChange)
      onCommentChange({
        value: newComment,
        product_id: rfqProduct.product_id,
        variant: rfqProduct.variant,
      })
      dispatch(
        addProductComment({
          value: newComment,
          product_id: rfqProduct.product_id,
          variant: rfqProduct.variant,
        })
      );
    setHasUnsavedChanges(true);
  };

  const handleRemoveProduct = (e) => {
    e.stopPropagation();
    if (handleRemoveProductInEdit) {
      // Let the parent (CreateRFQ) handle validation and confirmation
      handleRemoveProductInEdit(data);
    } else {
      setShowRemoveConfirmModal(true);
    }
  };

  const handleRemoveConfirm = () => {
    dispatch(removeRfqProduct(data));
    setHasUnsavedChanges(true);
    setShowRemoveConfirmModal(false);
  };

  const handleRemoveCancel = () => {
    setShowRemoveConfirmModal(false);
  };

  const handleAddVarient = async (e) => {
    e.stopPropagation();
    try {
      setHasUnsavedChanges(true);
      let variantVendors = vendors ?? [];

      if(variantVendors.length <= 0 && fetchVendors) {
        variantVendors = await fetchVendors();
      }

      await saveDraft();
      setLoading(true);

      let addablePayload = {};

      if(type == 'edit') {
        addablePayload = {
          specs: {
            Quantity: specs.quantity,
            Unit: specs.unit,
          }
        }
      }

      const payload = {
        rfq_id,
        sheet_id: selectedSheet?.value,
        variant_id: data.product_id,
        vendors: variantVendors.map((vendor) => type == 'edit' ? vendor.user_id : ({
          vendor_id: vendor.user_id,
        })),
        ...addablePayload,
      };
      if(type == 'edit')
        await addProductToExistingRfq(payload);
      else
        await addProductToDraft(payload);
      
      getDraftInitialData();
    } catch (error) {
      toast.error(<h6>Failed to add vendors to {getEntityLabel(is_tender)}. Please try again.</h6>, {
        position: "top-right",
      });
    } finally {
      setLoading(false);
    }
  };

  // WH-69: Newly-added products in the edit flow have `data.id == null`
  // until the user clicks "Update RFQ" and the snapshot apply assigns them
  // a real `tbl_rfq_products.id`. Tech-eval clauses are keyed by that id,
  // so any tech-eval action on an unsaved product would either send a null
  // (backend rejects with "rfq_product_id must be a number") or silently
  // fall back to product_variant_id and write to the wrong product. Treat
  // unsaved products as a hard block until the next Update RFQ save.
  const isUnsavedNewProduct = data?.id == null;

  const getProductClauses = useCallback(async () => {
    // Skip the fetch entirely for unsaved new products — there are no
    // clauses yet and we don't have a valid id to query against.
    if (isUnsavedNewProduct) {
      setBuyerClauses([]);
      setMinimumPassingScore(null);
      return;
    }
    const payload = {
      rfq_product_id: data.id,
      vendor_id: null,
    };
    try {
      const res = await getClausesByRfqProductId(payload);
      if(!res.success) {
        setBuyerClauses([]);
        setMinimumPassingScore(null);
      } else {
        setBuyerClauses(res.data);
        // Extract minimum passing score from response
        const minimumScore = res.minimum_passing_score;
        if (minimumScore !== undefined && minimumScore !== null) {
          const score = Number(minimumScore);
          setMinimumPassingScore(isNaN(score) ? null : score);
        } else {
          setMinimumPassingScore(null);
        }
      }
    } catch (error) {
      setBuyerClauses([]);
      setMinimumPassingScore(null);
    }
  }, [data?.id, isUnsavedNewProduct]);

  const handleOpenModal = () => {
    setOpenToMinimumScore(false);
    setIsModalOpen(true);
  };

  const handleOpenModalToMinimumScore = () => {
    setOpenToMinimumScore(true);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setOpenToMinimumScore(false);
    getProductClauses();
  };

  const handleQuantityChange = (e) => {
    let val = e.target.value;

    // Remove all except digits and dots
    val = val.replace(/[^0-9.]/g, "");

    // Remove all dots except the first one
    const firstDot = val.indexOf(".");
    if (firstDot !== -1) {
      val =
        val.slice(0, firstDot + 1) + val.slice(firstDot + 1).replace(/\./g, "");
    }

    // Don't allow dot as first character
    if (val.startsWith(".")) val = val.slice(1);

    // Limit to 3 decimal places
    const dotIndex = val.indexOf(".");
    if (dotIndex !== -1 && val.length - dotIndex - 1 > 3) {
      val = val.slice(0, dotIndex + 4);
    }

    // Remove leading zeros but allow "0." and "0"
    val = val.replace(/^0+(?=\d)/, (match) => {
      return val[match.length] === "." ? "0" : "";
    });

    handleSpecValue("quantity", val);
  };

  function cleanNumberInput(val) {
    // Step 1: Remove all except digits and dot
    val = val.replace(/[^0-9.]/g, '');

    // Step 2: Allow only the first dot
    let parts = val.split('.');
    val = parts.shift() + (parts.length ? '.' + parts.join('') : '');

    // Step 3: Remove leading zeros before a digit (but keep "0." and "0")
    if (val.startsWith("0") && val.length > 1 && val[1] !== ".") {
        val = val.replace(/^0+/, "");
    }
    if (val.startsWith(".")) val = "0" + val; // Ensure leading zero for decimals

    return val;
  }

  useEffect(() => {
    const initial = rfqProduct?.spec
    
    const size = initial?.find(
      (item) => item.title === "Size"
    )?.value;
    const spec = initial?.find(
      (item) => item.title === "Spec"
    )?.value;
    const quantity = initial?.find(
      (item) => item.title === "Quantity"
    )?.value;
    const unit = initial?.find(
      (item) => item.title === "Unit"
    )?.value;

    const updatable = {};

    if (initial) {
      if(size !== undefined && size !== specs.size) {
        updatable.size = size;
      } 
      if(spec !== undefined && spec !== specs.spec) {
        updatable.spec = spec;
      };
      if(quantity !== undefined && quantity !== specs.quantity) {
        updatable.quantity = quantity
      };
      if(unit !== undefined && unit !== specs.unit) {
        updatable.unit = unit;
      };
    }
    if(Object.keys(updatable).length > 0) {
      setSpecs(prev => ({
        ...prev,
        ...updatable
      }));
    }
  }, [rfqProduct.spec]);

  useEffect(() => {
    if (isActive && buyerClauses == null) {
      // This runs when this specific item is expanded and we dont have any buyer clause fetched
      getProductClauses();
    }
  }, [isActive]);

  useEffect(() => {
    if (data) {
      setRfqProduct(data);
      const qapFiles = data?.qap_file || data?.QAP_files || [];
      const specFiles = data?.spec_file || data?.SPEC_files || [];
      const dsFiles = data?.datasheet_file || data?.TDS_flies || [];
      
      setUploadedQapFile(Array.isArray(qapFiles) ? qapFiles : []);
      setUploadedSpecFile(Array.isArray(specFiles) ? specFiles : []);
      setUploadedDatasheetFile(Array.isArray(dsFiles) ? dsFiles : []);
      setComment(data?.comment || "");
    }
  }, [data]);

  // Vendor + spec validation pills shown in the collapsed row.
  // Reads exactly the same sources as the previous IIFE — keep behaviour identical.
  const validationPills = (() => {
    let isError = false;
    if (vendors?.length == 0) {
      isError = rfqProduct?.vendor_count == 0;
    } else {
      const currentVendorIds = vendors?.map(v => v.user_id || v.id) || [];
      const deletableVendors = (updatableData?.vendors?.[data.id]?.deletable ?? []).filter(
        deletableId => currentVendorIds.includes(deletableId)
      );
      const selectedVendorCount =
        (vendors?.length || 0) +
        ((updatableData?.vendors?.[data.id]?.addable?.length ?? 0) -
          deletableVendors.length);
      isError = selectedVendorCount === 0;
    }

    const getSpecValue = (fieldName) => {
      const specsUp = updatableData?.products?.updatable?.specs?.[data.id];
      if (specsUp) {
        const candidates = [
          fieldName,
          fieldName.toLowerCase(),
          fieldName.charAt(0).toUpperCase() + fieldName.slice(1),
        ];
        for (const k of candidates) {
          if (Object.prototype.hasOwnProperty.call(specsUp, k)) return specsUp[k];
        }
        for (const k of Object.keys(specsUp)) {
          if (k.toLowerCase() === fieldName.toLowerCase()) return specsUp[k];
        }
      }
      if (specs && Object.prototype.hasOwnProperty.call(specs, fieldName)) return specs[fieldName];
      const pSpecs = rfqProduct?.spec || rfqProduct?.specs;
      if (Array.isArray(pSpecs)) {
        const found = pSpecs.find((s) => ((s.title || s.label || "").toLowerCase() === fieldName.toLowerCase()));
        if (found) return found.value ?? found.val ?? "";
      }
      if (Object.prototype.hasOwnProperty.call(rfqProduct, fieldName)) return rfqProduct[fieldName];
      return undefined;
    };

    const missing = [];
    const qVal = getSpecValue("quantity");
    const uVal = getSpecValue("unit");
    if (qVal === undefined || qVal === null || qVal === "" || qVal <= 0 || qVal === '0') missing.push("Quantity");
    if (uVal === undefined || uVal === null || uVal === "" || uVal === "N/A") missing.push("Unit");
    return { isError, missing };
  })();

  // ---- Unit dropdown helpers ----
  // Group the global defaults and this user's custom units into the two
  // sections react-select expects. Custom units include their `id` so the
  // delete affordance has a target.
  const unitOptions = (() => {
    const list = Array.isArray(units) ? units : [];
    const defaults = list.filter((u) => u.is_default).map((u) => ({
      value: u.name,
      label: u.name,
      id: u.id,
      isCustom: false,
    }));
    const customs = list.filter((u) => !u.is_default).map((u) => ({
      value: u.name,
      label: u.name,
      id: u.id,
      isCustom: true,
    }));
    const groups = [];
    if (defaults.length) groups.push({ label: "Common units", options: defaults });
    if (customs.length) groups.push({ label: "Your units", options: customs });
    return groups;
  })();

  // Resolve the current Unit specs value to a Select option, falling back
  // to a synthetic "legacy" option when the saved unit isn't in the list
  // (e.g. an edit-RFQ flow with a free-text value typed before this feature
  // existed). Without this fallback react-select would render the field as
  // empty and force the user to re-pick.
  const unitSelectValue = (() => {
    const v = specs?.unit;
    if (!v) return null;
    const flat = unitOptions.flatMap((g) => g.options);
    const match = flat.find((o) => o.value === v);
    if (match) return match;
    return { value: v, label: v, isLegacy: true, isCustom: false };
  })();

  const handleUnitChange = (option) => {
    handleSpecValue("unit", option?.value || "");
  };

  // Reset the footer editor whenever the menu re-opens so we don't show stale
  // input the user typed last time. Wired via Select's onMenuClose / onMenuOpen.
  const closeUnitFooter = () => {
    setUnitFooterEditing(false);
    setUnitFooterValue("");
  };

  const submitNewUnit = async () => {
    const name = (unitFooterValue || "").trim();
    if (!name) return;
    setUnitFooterSaving(true);
    try {
      const res = await addCustomUnit({ name });
      const created = res?.data?.data;
      // refetch the page-level list so any other Item using the same prop
      // sees the new option immediately.
      if (refreshUnits) await refreshUnits();
      handleSpecValue("unit", (created && created.name) || name);
      toast.success("Custom unit added");
      closeUnitFooter();
      setUnitMenuOpen(false);
    } catch (err) {
      // axios interceptor surfaces conflicts as response.data; on 409 the
      // backend returns the existing matching row so we just select it.
      const status = err?.response?.status || err?.message?.response?.status;
      const existing = err?.response?.data?.data || err?.message?.response?.data?.data;
      if (status === 409) {
        if (refreshUnits) await refreshUnits();
        if (existing?.name) handleSpecValue("unit", existing.name);
        closeUnitFooter();
        setUnitMenuOpen(false);
      } else {
        toast.error(err?.message?.response?.data?.message || err?.message || "Failed to add unit");
      }
    } finally {
      setUnitFooterSaving(false);
    }
  };

  const confirmDeleteCustomUnit = async () => {
    if (!unitDeleteTarget?.id) return;
    try {
      await deleteCustomUnit(unitDeleteTarget.id);
      // If the unit being deleted was the one selected on this product,
      // clear it so the field doesn't display a stale value.
      if (specs?.unit && specs.unit === unitDeleteTarget.name) {
        handleSpecValue("unit", "");
      }
      if (refreshUnits) await refreshUnits();
      toast.success("Custom unit removed");
    } catch (err) {
      toast.error(err?.message?.response?.data?.message || err?.message || "Failed to delete unit");
    } finally {
      setUnitDeleteTarget(null);
    }
  };

  // UnitMenuList lives at module scope and reads its state from selectProps
  // below — see the top of this file for why.

  // Custom Option renderer: shows the unit name plus a × delete affordance
  // for user-owned customs. Stops propagation so clicking × doesn't also
  // select the option.
  const formatUnitOptionLabel = (option) => (
    <div className="rfq-unit-option">
      <span className="rfq-unit-option__name">{option.label}</span>
      {option.isCustom && option.id && !readOnly && (
        <button
          type="button"
          className="rfq-unit-option__delete"
          aria-label={`Remove ${option.label}`}
          title="Remove custom unit"
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setUnitDeleteTarget({ id: option.id, name: option.label });
          }}
        >
          <FontAwesomeIcon icon={faTrash} />
        </button>
      )}
    </div>
  );

  const renderFileCard = (label, fileType, files) => (
    <div className="rfq-file-card">
      <label
        id={`upload_${fileType === "datasheet_file" ? "tds" : fileType === "qap_file" ? "qap" : "spec"}_${rfqProduct?.id}-file_uploads-${pageRoute}`}
        className={`rfq-file-drop ${readOnly ? "rfq-file-drop--disabled" : ""}`}
        aria-disabled={readOnly}
      >
        <span className="rfq-file-drop__label">{label}</span>
        <span className="rfq-file-drop__hint">Click to browse</span>
        <input
          type="file"
          accept=".pdf, .docx, .doc, .xlsx, .xls, .csv, .png, .jpg, .jpeg"
          onChange={(e) => uploadToServer(e, fileType)}
          multiple={true}
          disabled={readOnly}
        />
      </label>
      {files && files.length > 0 && (
        <button
          type="button"
          className="rfq-file-show-btn"
          onClick={() => setFileModalState({ label, fileType, files })}
        >
          <FontAwesomeIcon icon={faEye} />
          <span>Show file{files.length > 1 ? "s" : ""} ({files.length})</span>
        </button>
      )}
    </div>
  );

  return (
    <Accordion.Item
      key={`rfqp_${rfqProduct.product_id}_${rfqProduct.variant}`}
      eventKey={eventKey}
      className={`rfq-products-item${hasVendorError ? " rfq-products-item--invalid" : ""}`}
    >
      <Accordion.Header>
        <div className="rfq-products-row">
          <div className="rfq-products-row__main">
            <span className="rfq-products-row__name">{rfqProduct?.name}</span>
            {(validationPills.isError || hasVendorError || validationPills.missing.length > 0) && (
              <div className="rfq-products-row__badges">
                {(hasVendorError || validationPills.isError) && (
                  <span className="rfq-tag rfq-tag--red">No vendor for this Product</span>
                )}
                {validationPills.missing.includes("Quantity") && (
                  <span className="rfq-tag rfq-tag--red">Quantity required</span>
                )}
                {validationPills.missing.includes("Unit") && (
                  <span className="rfq-tag rfq-tag--red">Unit required</span>
                )}
              </div>
            )}
          </div>
          <div className="rfq-products-row__cell">
            <span className="rfq-products-row__overline">Qty</span>
            <span className="rfq-products-row__value">{specs?.quantity || "—"}</span>
          </div>
          <div className="rfq-products-row__cell">
            <span className="rfq-products-row__overline">Unit</span>
            <span className="rfq-products-row__value">{specs?.unit || "—"}</span>
          </div>
          <div className="rfq-products-row__actions" onClick={(e) => e.stopPropagation()}>
            <OverlayTrigger
              placement="top"
              overlay={<Tooltip id={`add-variant-tip-${rfqProduct?.id}`}>Add variant</Tooltip>}
            >
              <span className="d-inline-block">
                <button
                  type="button"
                  id={`add_variant_${rfqProduct?.id}-product_actions-${pageRoute}`}
                  className="rfq-products-row__icon-btn rfq-products-row__icon-btn--primary"
                  onClick={handleAddVarient}
                  disabled={loading || readOnly}
                  title={readOnly ? "You don't have permission to add variants" : "Add variant"}
                  aria-label="Add variant"
                >
                  <FontAwesomeIcon icon={faClone} />
                </button>
              </span>
            </OverlayTrigger>
            <OverlayTrigger
              placement="top"
              overlay={<Tooltip id={`remove-product-tip-${rfqProduct?.id}`}>Remove product</Tooltip>}
            >
              <span className="d-inline-block">
                <button
                  type="button"
                  id={`remove_product_${rfqProduct?.id}-product_actions-${pageRoute}`}
                  className="rfq-products-row__icon-btn rfq-products-row__icon-btn--danger"
                  onClick={handleRemoveProduct}
                  disabled={readOnly}
                  title={readOnly ? "You don't have permission to remove products" : "Remove product"}
                  aria-label="Remove product"
                >
                  <FontAwesomeIcon icon={faTrash} />
                </button>
              </span>
            </OverlayTrigger>
          </div>
        </div>
      </Accordion.Header>

      <Accordion.Body>
        <div className="rfq-product-body">
          {is_tender === 1 && typeof header === "function" && (
            <div className="rfq-product-section rfq-product-section--filter">
              {header(data)}
            </div>
          )}

          {/* Specifications */}
          <div className="rfq-product-section">
            <h5 className="rfq-product-section__title">Specifications</h5>
            <div className="rfq-spec-rows">
              {/* Row 1 — prominent: Size + Spec */}
              <div className="rfq-spec-row rfq-spec-row--prominent">
                <div className="rfq-spec-field">
                  <CommonFormInput
                    type="textarea"
                    name={"product_size"}
                    label={"Product Size"}
                    values={specs?.size || ""}
                    onChange={(e) => handleSpecValue("size", e.target.value)}
                    placeholder="Size"
                    className="form-control"
                    disabled={readOnly}
                    maxLength={200}
                    showCharCount
                  />
                  <PrevHint
                    keyName={`spec:${data?.id}:Size`}
                    previousValues={previousValues}
                    currentValue={specs?.size}
                    compact
                  />
                </div>
                <div className="rfq-spec-field">
                  <CommonFormInput
                    type="textarea"
                    name={"product_specification"}
                    label={"Product Specification"}
                    values={specs.spec || ""}
                    onChange={(e) => handleSpecValue("spec", e.target.value)}
                    placeholder="Grade, Material and other Specs"
                    className="form-control"
                    disabled={readOnly}
                    maxLength={2000}
                    showCharCount
                  />
                  <PrevHint
                    keyName={`spec:${data?.id}:Spec`}
                    previousValues={previousValues}
                    currentValue={specs.spec}
                    compact
                  />
                </div>
              </div>

              {/* Row 2 — compact: [Qty | Unit] + Comments */}
              <div className="rfq-spec-row rfq-spec-row--secondary">
                <div className="rfq-spec-combo">
                  <label className="rfq-spec-combo__label">
                    Quantity &amp; Unit <span className="rfq-required">*</span>
                  </label>
                  <div className="rfq-spec-combo__field">
                    <div className="rfq-spec-combo__quantity">
                      <CommonFormInput
                        required
                        type="simple-text"
                        name={"quantity"}
                        label={"Quantity"}
                        values={specs.quantity}
                        onChange={handleQuantityChange}
                        placeholder="Quantity"
                        className="form-control"
                        validation="float_number"
                        disabled={readOnly}
                      />
                    </div>
                    <span className="rfq-spec-combo__sep" aria-hidden="true" />
                    <div className="rfq-spec-combo__unit">
                      <Select
                        inputId={`unit-${rfqProduct?.id || rfqProduct?.product_id}`}
                        classNamePrefix="rfq-unit-select"
                        className="rfq-unit-select"
                        options={unitOptions}
                        value={unitSelectValue}
                        onChange={(option) => {
                          handleUnitChange(option);
                          setUnitMenuOpen(false);
                        }}
                        // Controlled open state — see unitMenuOpen.
                        menuIsOpen={unitMenuOpen}
                        onMenuOpen={() => {
                          setUnitMenuOpen(true);
                          // Fresh open should always start at the "+ Add custom unit"
                          // trigger, never with stale typed input.
                          closeUnitFooter();
                        }}
                        onMenuClose={() => {
                          // Refuse to close while user is mid-edit; otherwise
                          // react-select would clobber the inline form when its
                          // own outside-click handler fires on the footer click.
                          if (unitFooterEditing) return;
                          setUnitMenuOpen(false);
                        }}
                        placeholder="Unit"
                        isDisabled={readOnly}
                        isSearchable
                        isClearable={false}
                        components={UNIT_SELECT_COMPONENTS}
                        formatOptionLabel={formatUnitOptionLabel}
                        unitFooterEditing={unitFooterEditing}
                        unitFooterValue={unitFooterValue}
                        unitFooterSaving={unitFooterSaving}
                        setUnitFooterEditing={setUnitFooterEditing}
                        setUnitFooterValue={setUnitFooterValue}
                        submitNewUnit={submitNewUnit}
                        closeUnitFooter={closeUnitFooter}
                        // Render menu in a portal so it can spill outside the
                        // bordered combo (which has overflow:hidden) and be
                        // clipped only by the viewport.
                        menuPortalTarget={typeof document !== "undefined" ? document.body : null}
                        menuPlacement="auto"
                        styles={{
                          menuPortal: (base) => ({ ...base, zIndex: 1080 }),
                        }}
                        noOptionsMessage={() => "No units"}
                      />
                    </div>
                  </div>
                  <div className="rfq-spec-combo__hints">
                    <PrevHint
                      keyName={`spec:${data?.id}:Quantity`}
                      previousValues={previousValues}
                      currentValue={specs.quantity}
                      compact
                    />
                    <PrevHint
                      keyName={`spec:${data?.id}:Unit`}
                      previousValues={previousValues}
                      currentValue={specs.unit}
                      compact
                    />
                  </div>
                </div>
                <div className="rfq-spec-field rfq-spec-field--single">
                  <CommonFormInput
                    type="simple-text"
                    name={"comment"}
                    label={"Comments"}
                    values={comment}
                    onChange={handleaddProductComment}
                    placeholder="Add comments..."
                    className="form-control"
                    disabled={readOnly}
                    maxLength={1000}
                    showCharCount
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Files */}
          <div className="rfq-product-section">
            <h5 className="rfq-product-section__title">Files</h5>
            <div className="rfq-file-grid">
              {renderFileCard("Upload TDS", "datasheet_file", uploadedDatasheetFile)}
              {renderFileCard("Upload QAP", "qap_file", uploadedQapFile)}
              {renderFileCard("Upload Spec", "spec_file", uploadedSpecFile)}
            </div>
          </div>

          {/* Marks and Clauses */}
          <div className="rfq-product-section">
            <h5 className="rfq-product-section__title">Marks and Clauses</h5>
            <div className="rfq-techeval-row">
              <OverlayTrigger
                placement="top"
                overlay={
                  isUnsavedNewProduct ? (
                    <Tooltip id={`tech-eval-disabled-${rfqProduct?.clientId || rfqProduct?.id}`}>
                      Click "Update RFQ" to save this product first, then you can add clauses.
                    </Tooltip>
                  ) : (<span />)
                }
              >
                <span className="d-inline-block">
                  <button
                    type="button"
                    id={buyerClauses?.length > 0 ? `view_clauses_${rfqProduct?.id}-tech_evaluation-${pageRoute}` : `add_clauses_${rfqProduct?.id}-tech_evaluation-${pageRoute}`}
                    className="rfq-techeval-btn"
                    onClick={handleOpenModal}
                    disabled={readOnly || isUnsavedNewProduct}
                    title={readOnly ? "You don't have permission to add clauses" : ""}
                    style={{
                      pointerEvents: isUnsavedNewProduct ? 'none' : 'auto',
                      opacity: isUnsavedNewProduct ? 0.55 : 1,
                    }}
                  >
                    <FontAwesomeIcon icon={faEye} />
                    {(() => {
                      // Sampling clauses are managed separately in the modal,
                      // so they shouldn't pad the "N clauses" count shown here.
                      const visibleCount = (buyerClauses || []).filter((c) => c?.clause_type !== 'sampling').length;
                      return <span>{visibleCount > 0 ? `View and Edit (${visibleCount} clauses)` : "View and Edit"}</span>;
                    })()}
                  </button>
                </span>
              </OverlayTrigger>
            </div>
          </div>

          {isModelOpen && (
            <AddClause
              show={isModelOpen}
              onClose={handleCloseModal}
              product={data}
              rfq_id={rfq_id}
              onClauseChange={onClauseChange}
              openToMinimumScore={openToMinimumScore}
            />
          )}

          {footer && (
            <div className="rfq-product-section rfq-product-section--footer">
              {footer(data)}
            </div>
          )}

          <ConfirmationModal
            isOpen={showRemoveConfirmModal}
            onClose={handleRemoveCancel}
            onConfirm={handleRemoveConfirm}
            title="Remove Product"
            description={`Are you sure you want to remove this product from the RFQ?\nThis action will remove the product and all its associated data.`}
            confirmButtonColor="danger"
            confirmButtonText="Remove"
            cancelButtonText="Cancel"
          />

          {/* Delete-custom-unit confirmation. Triggered from the × icon on
              a user's own unit option in the dropdown. Globals can't be
              targeted because formatUnitOptionLabel only renders the × for
              isCustom rows. */}
          <ConfirmationModal
            isOpen={!!unitDeleteTarget}
            onClose={() => setUnitDeleteTarget(null)}
            onConfirm={confirmDeleteCustomUnit}
            title="Remove custom unit"
            description={`Are you sure you want to remove "${unitDeleteTarget?.name || ''}" from your custom units? This won't change any RFQ that already uses it.`}
            confirmButtonColor="danger"
            confirmButtonText="Remove"
            cancelButtonText="Cancel"
          />

          {/* Documents modal — opened from the "Show file" button under each
              uploader. Lists uploaded files as Document 1, 2, ... with view
              and remove actions. Custom SCSS overlay (no bootstrap). */}
          {fileModalState && (() => {
            const liveFiles = fileModalState.fileType === "datasheet_file"
              ? uploadedDatasheetFile
              : fileModalState.fileType === "qap_file"
              ? uploadedQapFile
              : uploadedSpecFile;
            return (
              <div
                className="rfq-doc-modal__overlay"
                role="dialog"
                aria-modal="true"
                onClick={() => setFileModalState(null)}
              >
                <div
                  className="rfq-doc-modal"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="rfq-doc-modal__header">
                    <h3 className="rfq-doc-modal__title">
                      {fileModalState.label} — Documents
                    </h3>
                    <button
                      type="button"
                      className="rfq-doc-modal__close"
                      aria-label="Close"
                      onClick={() => setFileModalState(null)}
                    >
                      <FontAwesomeIcon icon={faXmark} />
                    </button>
                  </div>
                  <div className="rfq-doc-modal__body">
                    {(!liveFiles || liveFiles.length === 0) ? (
                      <p className="rfq-doc-modal__empty">No documents uploaded.</p>
                    ) : (
                      <ul className="rfq-doc-list">
                        {liveFiles.map((fileUrl, idx) => (
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
                              {!readOnly && (
                                <button
                                  type="button"
                                  className="rfq-doc-list__remove"
                                  aria-label="Remove file"
                                  title={extractfileName(fileUrl)}
                                  onClick={() => handleRemoveFile(fileUrl, fileModalState.fileType)}
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
                      onClick={() => setFileModalState(null)}
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </Accordion.Body>
    </Accordion.Item>
  );
};

export default Item;
