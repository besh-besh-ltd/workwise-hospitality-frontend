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
import { faPlusCircle, faTrash, faClone } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useDispatch } from "react-redux";
import AddClause from "./AddClause";
import { addProductToDraft, addProductToExistingRfq, getClausesByRfqProductId } from "@/services/rfq";
import CommonFormInput from "@/components/shared/CommonFormInput";
import ConfirmationModal from "@/components/modal/ConfirmationModal";
// WH-69: PrevHint chip — only renders something when this product field
// has a recorded prior value in /rfq/:id/edit-history.
import PrevHint from "@/components/shared/PrevHint";

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
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleRemoveFile = (fileUrl, fileType) => {
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
        <div className="rfq-file-list">
          {files.map((fileUrl) => (
            <div key={fileUrl} className="rfq-file-row">
              <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="rfq-file-row__name">
                {extractfileName(fileUrl)}
              </a>
              {!readOnly && (
                <button
                  type="button"
                  className="rfq-file-row__remove"
                  aria-label="Remove file"
                  onClick={(e) => {
                    e.preventDefault();
                    handleRemoveFile(fileUrl, fileType);
                  }}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <Accordion.Item
      key={`rfqp_${rfqProduct.product_id}_${rfqProduct.variant}`}
      eventKey={eventKey}
      className="rfq-products-item"
    >
      <Accordion.Header>
        <div className="rfq-products-row">
          <div className="rfq-products-row__main">
            <span className="rfq-products-row__name">{rfqProduct?.name}</span>
            {(validationPills.isError || hasVendorError || validationPills.missing.length > 0) && (
              <div className="rfq-products-row__badges">
                {(hasVendorError || validationPills.isError) && (
                  <span className="rfq-tag rfq-tag--red">Select at least one vendor</span>
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
                      <CommonFormInput
                        type="simple-text"
                        name={"unit"}
                        label={"Unit"}
                        required={true}
                        values={specs.unit}
                        onChange={(e) => handleSpecValue("unit", e.target.value)}
                        placeholder="Unit"
                        className="form-control"
                        disabled={readOnly}
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

          {/* Tech Evaluation */}
          <div className="rfq-product-section">
            <h5 className="rfq-product-section__title">Tech Evaluation</h5>
            <div className="rfq-techeval-row">
              <OverlayTrigger
                placement="top"
                overlay={
                  isUnsavedNewProduct ? (
                    <Tooltip id={`tech-eval-disabled-${rfqProduct?.clientId || rfqProduct?.id}`}>
                      Click "Update RFQ" to save this product first, then you can add tech evaluation clauses.
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
                    <span>{buyerClauses?.length > 0 ? `View and Edit (${buyerClauses.length} clauses)` : "View and Edit"}</span>
                  </button>
                </span>
              </OverlayTrigger>

              <OverlayTrigger
                placement="top"
                overlay={
                  isUnsavedNewProduct ? (
                    <Tooltip id={`min-score-disabled-${rfqProduct?.clientId || rfqProduct?.id}`}>
                      Click "Update RFQ" to save this product first, then you can set a minimum passing score.
                    </Tooltip>
                  ) : (<span />)
                }
              >
                <span className="d-inline-block">
                  {minimumPassingScore !== null && minimumPassingScore !== undefined ? (
                    <button
                      type="button"
                      id={`edit_min_score_${rfqProduct?.id}-tech_evaluation-${pageRoute}`}
                      className="rfq-techeval-btn rfq-techeval-btn--score"
                      onClick={handleOpenModalToMinimumScore}
                      disabled={readOnly || isUnsavedNewProduct}
                      style={{
                        pointerEvents: isUnsavedNewProduct ? 'none' : 'auto',
                        opacity: isUnsavedNewProduct ? 0.55 : 1,
                      }}
                    >
                      <FontAwesomeIcon icon={faEdit} />
                      <span>Minimum score</span>
                      <span className="rfq-techeval-btn__pill">{minimumPassingScore}%</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      id={`set_min_score_${rfqProduct?.id}-tech_evaluation-${pageRoute}`}
                      className="rfq-techeval-btn rfq-techeval-btn--score"
                      onClick={handleOpenModalToMinimumScore}
                      disabled={readOnly || isUnsavedNewProduct}
                      style={{
                        pointerEvents: isUnsavedNewProduct ? 'none' : 'auto',
                        opacity: isUnsavedNewProduct ? 0.55 : 1,
                      }}
                    >
                      <FontAwesomeIcon icon={faEdit} />
                      <span>Set minimum score</span>
                    </button>
                  )}
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
        </div>
      </Accordion.Body>
    </Accordion.Item>
  );
};

export default Item;
