import Accordion from "react-bootstrap/Accordion";
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
import { extractfileName, handleFileUpload } from "@/utils/sharedFunctions";
import { faEye, faFile, faEdit } from "@fortawesome/free-regular-svg-icons";
import { faPlusCircle, faTrash } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useDispatch } from "react-redux";
import AddClause from "./AddClause";
import { addProductToDraft, addProductToExistingRfq, getClausesByRfqProductId } from "@/services/rfq";
import CommonFormInput from "@/components/shared/CommonFormInput";
import ConfirmationModal from "@/components/modal/ConfirmationModal";

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
    setShowRemoveConfirmModal(true);
  };

  const handleRemoveConfirm = () => {
    if(handleRemoveProductInEdit)
      handleRemoveProductInEdit(data)
    else
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
      toast.error(<h6>Failed to add vendors to RFQ. Please try again.</h6>, {
        position: "top-right",
      });
    } finally {
      setLoading(false);
    }
  };

  const getProductClauses = useCallback(async () => {
    const productId = data.id || data.product_id || (data.variant_id ? data.variant_id : null);    
    const payload = {
      rfq_product_id: productId,
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
  }, [data.id]);

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
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

    // Remove dot if at the start or end
    if (val.startsWith(".")) val = val.slice(1);
    if (val.endsWith(".")) val = val.slice(0, -1);

    // Prevent empty string
    if (val === "") val = "0";

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

  return (
    <Accordion.Item
      key={`rfqp_${rfqProduct.product_id}_${rfqProduct.variant}`}
      eventKey={eventKey}
    >
      <Accordion.Header>
        {/* start: Accrodian header */}
      <div
        className="d-flex justify-content-between w-100 align-items-center"
  //       style={{
  //      backgroundColor: (() => {
  //       // if vendors not loaded yet, fallback to rfqProduct.vendor_count
  //       if (vendors?.length == 0) {
  //         return rfqProduct?.vendor_count == 0 ? "#ffe6e6" : "transparent";
  //       }
      
  //       // vendors are loaded -> calculate effective selected vendor count
  //       const selectedVendorCount =
  //         (vendors?.length || 0) +
  //         ((updatableData?.vendors?.[data.id]?.addable?.length ?? 0) -
  //           (updatableData?.vendors?.[data.id]?.deletable?.length ?? 0));
      
  //       return selectedVendorCount === 0 ? "#e6e6fe" : "transparent";
  //     })(),
  // }}
>



<div>
          <h2 className="h6 mb-0"> {rfqProduct?.name}</h2>

    {(() => {
        // ✅ same logic reused exactly for error condition
        let isError = false;

        if (vendors?.length == 0) {
          isError = rfqProduct?.vendor_count == 0;
        } else {
          // Get current vendor IDs (after filtering)
          const currentVendorIds = vendors?.map(v => v.user_id || v.id) || [];
          // Only count deletable vendors that are still present in current vendors
          const deletableVendors = (updatableData?.vendors?.[data.id]?.deletable ?? []).filter(
            deletableId => currentVendorIds.includes(deletableId)
          );
          
          const selectedVendorCount =
            (vendors?.length || 0) +
            ((updatableData?.vendors?.[data.id]?.addable?.length ?? 0) -
              deletableVendors.length);
          isError = selectedVendorCount === 0;
        }

        // helper: read a spec field (check updatableData first, then local specs, then rfqProduct.spec array)
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
            // case-insensitive fallback
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

        return (
          <>
            {(hasVendorError || isError) && (
              <small className="text-danger fw-bold">
                Select atleast one vendor
              </small>
            )}

            {missing.length > 0 && (
              <small className="text-danger fw-bold d-block">
                {missing.length === 1
                  ? `${missing[0]} is required`
                  : `${missing.join(" and ")} are required`}
              </small>
            )}
          </>
        );
      })()}

    </div>

          {/* start: remove and add variant button container */}
          <div className="d-flex gap-3 mr-4 ">
            {/* start: remove button container */}
            <button
              id={`remove_product_${rfqProduct?.id}-product_actions-${pageRoute}`}
              className="upload btn btn-danger pt-2 btn-sm"
              style={{ height: "40px", width: "120px" }}
              onClick={handleRemoveProduct}
              disabled={readOnly}
              title={readOnly ? "You don't have permission to remove products" : ""}
            >
              <FontAwesomeIcon icon={faTrash} /> Remove
            </button>
            {/* end: remove button container */}

            {/* start: add variant button container */}
            <button
              id={`add_variant_${rfqProduct?.id}-product_actions-${pageRoute}`}
              className="upload  btn btn-primary  pt-2 btn-sm"
              style={{ height: "40px", width: "150px" }}
              onClick={handleAddVarient}
              disabled={loading || readOnly}
              title={readOnly ? "You don't have permission to add variants" : ""}
            >
              {loading ? (
                "Adding..."
              ) : (
                <>
                  <FontAwesomeIcon icon={faPlusCircle} /> Add variant
                </>
              )}
            </button>
            
            {/* end: remove button container */}
          </div>

          {/* end: remove and add variant button container */}
        </div>
        {/* end: Accrodian header */}
      </Accordion.Header>

      <Accordion.Body>
        { is_tender && header ? (
          <div
            className="d-flex flex-wrap justify-content-between align-items-start"
            style={{ height: "fit-content" }}
          >
            {header(data)}
          </div>
        ):""}
        <div
          className="d-flex flex-wrap   justify-content-between align-items-start "
          style={{ height: "fit-content" }}
        >
          {/*start: spec, files conteiner  */}
          <div className="d-flex flex-column justify-content-center align-items-center  gap-2">
            {/*start: prodiuct spec */}
            <div style={{ width: "100%" }}>
              <CommonFormInput
                type="textarea"
                name={"product_size"}
                label={"Product Size"}
                values={specs?.size || ""}
                onChange={(e) => handleSpecValue("size", e.target.value)}
                placeholder="Size"
                className=" form-control"
                style={{ height: "40px" }}
                disabled={readOnly}
              />
            </div>
            {/*end: prodiuct spec */}

            {/* start: qap, tds, spec container */}
            <div style={{ width: "100%" }}>
              <span> Files </span>
              <div
                className=" d-flex gap-2 justify-content-between px-2 pt-2"
                style={{
                  border: "1px solid #dcdbeb",
                  borderRadius: "5px",
                  height: "100px",
                  overflow: "auto",
                }}
              >
                {/*start: tds  */}
                <div
                  // className=" col-4"
                  style={{
                    height: "auto",
                    width: "130px",
                  }}
                >
                  {
                    <label
                      id={`upload_tds_${rfqProduct?.id}-file_uploads-${pageRoute}`}
                      className={`upload uploadInlineFile d-flex align-items-center ${readOnly ? 'disabled' : ''}`}
                      style={{ maxWidth: "100%", opacity: readOnly ? 0.6 : 1, pointerEvents: readOnly ? 'none' : 'auto' }}
                    >
                      {/* <FontAwesomeIcon icon={faFile} className="me-2" />  */}
                      Upload TDS
                      <input
                        type="file"
                        accept=".pdf, .docx, .doc, .xlsx, .xls, .csv, .png, .jpg, .jpeg"
                        onChange={(e) => uploadToServer(e, "datasheet_file")}
                        multiple={true}
                        disabled={readOnly}
                      />
                    </label>
                  }
                  {uploadedDatasheetFile &&
                    uploadedDatasheetFile.length > 0 &&
                    uploadedDatasheetFile.map((datasheet_file) => {
                      return (
                        <div
                          key={datasheet_file}
                          className="d-flex justify-content-between"
                        >
                          <a
                            href={datasheet_file}
                            className="page-link text-truncate"
                            target="_blank"
                            style={{ width: "100%" }}
                          >
                            {extractfileName(datasheet_file)}
                          </a>
                          {!readOnly && (
                            <span
                              className="btn-close btn-close-sm"
                              aria-label="Close"
                              onClick={(e) => {
                                e.preventDefault();
                                handleRemoveFile(
                                  datasheet_file,
                                  "datasheet_file"
                                );
                              }}
                            ></span>
                          )}
                        </div>
                      );
                    })}
                </div>
                {/*end: tds  */}

                {/*start: qap  */}
                <div
                  // className=" col-4"
                  style={{
                    height: "auto",
                    width: "130px",
                  }}
                >
                  {
                                                            <label
                        id={`upload_qap_${rfqProduct?.id}-file_uploads-${pageRoute}`}
                        className={`upload uploadInlineFile ${readOnly ? 'disabled' : ''}`}
                        style={{ maxWidth: "100%", opacity: readOnly ? 0.6 : 1, pointerEvents: readOnly ? 'none' : 'auto' }}
                        // style={{ borderBottom: "1px solid rgba(45, 92, 167, 0.59)" }}
                      >
                        {/* <FontAwesomeIcon icon={faQAP" */}
                        Upload QAP
                        <input
                          type="file"
                          accept=".pdf, .docx, .doc, .xlsx, .xls, .csv, .png, .jpg, .jpeg"
                          onChange={(e) => uploadToServer(e, "qap_file")}
                          multiple={true}
                          disabled={readOnly}
                        />
                      </label>
                  }
                  {uploadedQapFile &&
                    uploadedQapFile.length > 0 &&
                    uploadedQapFile.map((qap_file) => {
                      return (
                        <div
                          key={qap_file}
                          className="d-flex justify-content-between m-2"
                        >
                          <a
                            href={qap_file}
                            className="page-link text-truncate"
                            target="_blank"
                            style={{ width: "100%" }}
                          >
                            {extractfileName(qap_file)}
                          </a>
                          {!readOnly && (
                            <span
                              className="btn-close btn-close-sm"
                              aria-label="Close"
                              onClick={(e) => {
                                e.preventDefault();
                                handleRemoveFile(qap_file, "qap_file");
                              }}
                            ></span>
                          )}
                        </div>
                      );
                    })}
                </div>
                {/*end: qap  */}

                {/* start: spec file */}
                <div
                  // className=" col-4"
                  style={{
                    height: "auto",
                    width: "130px",
                  }}
                >
                                      <label
                      id={`upload_spec_${rfqProduct?.id}-file_uploads-${pageRoute}`}
                      className={`upload uploadInlineFile ${readOnly ? 'disabled' : ''}`}
                      style={{ maxWidth: "100%", opacity: readOnly ? 0.6 : 1, pointerEvents: readOnly ? 'none' : 'auto' }}
                    >
                      {/* <FontAwesomeIcon icon={faFile} className="me-2" /> */}
                      Upload Spec
                      <input
                        type="file"
                        accept=".pdf, .docx, .doc, .xlsx, .xls, .csv, .png, .jpg, .jpeg"
                        onChange={(e) => uploadToServer(e, "spec_file")}
                        multiple={true}
                        disabled={readOnly}
                      />
                    </label>

                  {uploadedSpecFile &&
                    uploadedSpecFile.length > 0 &&
                    uploadedSpecFile.map((spec_file) => {
                      return (
                        <div
                          key={spec_file}
                          className="d-flex justify-content-between"
                        >
                          <a
                            href={spec_file}
                            className="page-link text-truncate"
                            target="_blank"
                            style={{ width: "100%" }}
                          >
                            {extractfileName(spec_file)}
                          </a>
                          {!readOnly && (
                            <span
                              className="btn-close btn-close-sm"
                              aria-label="Close"
                              onClick={() =>
                                handleRemoveFile(spec_file, "spec_file")
                              }
                            ></span>
                          )}
                        </div>
                      );
                    })}
                </div>
                {/* end: spec file */}
              </div>
            </div>
            {/*end: spec, files conteiner  */}
          </div>
          {/*end: spec, files conteiner  */}

          {/*start: product spec qty and unit  */}
          <div className=" px-2">
            {/*start: product spec */}
            <div style={{ width: "100%" }} className="mb-2">
              <CommonFormInput
                type="textarea"
                name={"product_specification"}
                label={"Product Specification"}
                values={specs.spec || ""}
                onChange={(e) => handleSpecValue("spec", e.target.value)}
                placeholder="Grade, Material and other Specs"
                className=" form-control"
                style={{ height: "100px" }}
                disabled={readOnly}
              />
            </div>
            {/*end: product spec */}

            {/* start: qty and unit container */}
            <div className="d-flex  justify-content-start align-items-start gap-2">
              <div className="" style={{ width: "200px" }}>
                <CommonFormInput
                  required
                  type="simple-text"
                  name={"quantity"}
                  label={"Quantity"}
                  values={specs.quantity}
                  onChange={handleQuantityChange}
                  placeholder="Quantity"
                  className=" form-control"
                  validation="float_number"
                  disabled={readOnly}
                />
              </div>

              <div style={{ width: "210px" }}>
                <CommonFormInput
                  type="simple-text"
                  name={"unit"}
                  label={"Unit"}
                  required={true}
                  values={specs.unit}
                  onChange={(e) => handleSpecValue("unit", e.target.value)}
                  placeholder="Unit"
                  className=" form-control"
                  disabled={readOnly}
                />
              </div>
            </div>
            {/* end: qty and unit ocntainer */}
          </div>
          {/*end: product spec qty and unit  */}

          {/*  */}
          <div className="  ">
            {/* fix here */}

            <div className="d-flex flex-wrap gap-4 ">
              {/* start tech evaluation container */}
              <div>
                <span> Tech Evaluation </span>
                <div
                  className="d-flex flex-column gap-2"
                  style={{
                    // border: "1px solid #dcdbeb",  p-2
                    // borderRadius: "5px",
                    height: "fit-content",
                  }}
                >
                  <button
                    id={`add_clauses_${rfqProduct?.id}-tech_evaluation-${pageRoute}`}
                    className="upload  btn btn-secondary  "
                    // style={{ height: "40px" }} btn-sm  pt-2
                    onClick={handleOpenModal}
                    disabled={readOnly}
                    title={readOnly ? "You don't have permission to add clauses" : ""}
                  >
                    <FontAwesomeIcon icon={faPlusCircle} /> Add Clauses
                  </button>

                  {buyerClauses?.length > 0 && (
                    <button
                      id={`view_clauses_${rfqProduct?.id}-tech_evaluation-${pageRoute}`}
                      className="upload btn btn-warning text-white pt-2 btn-sm"
                      style={{ height: "40px" }}
                      onClick={handleOpenModal}
                    >
                      <FontAwesomeIcon icon={faEye} />{" "}
                      {`View ${buyerClauses.length} Clauses`}
                    </button>
                  )}

                  {minimumPassingScore !== null && minimumPassingScore !== undefined && (
                    <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 p-2 border rounded bg-white shadow-sm">
                      <div className="d-flex align-items-center gap-2">
                        <span className="small text-muted">Minimum Score</span>
                        <span className="badge bg-primary">{minimumPassingScore}/100</span>
                      </div>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary"
                        onClick={handleOpenModal}
                        disabled={readOnly}
                      >
                        <FontAwesomeIcon icon={faEdit} /> Edit Score
                      </button>
                    </div>
                  )}
                </div>
              </div>
              {/* end tech evaluation container */}

              {/* <div>
              <span> Vendors </span> */}

              {/* Vendor buttons removed - vendors are auto-added for all modes */}
              
            </div>

            <div className="mt-4">
              <CommonFormInput
                type="simple-text"
                name={"comment"}
                label={"Add Comments"}
                values={comment}
                onChange={handleaddProductComment}
                placeholder="Add Comments..."
                className="form-control me-0 mb-3"
                disabled={readOnly}
              />
            </div>

            {/* </div> */}
          </div>
          {/* </tr> */}
          <div>
            {isModelOpen && (
              <AddClause
                show={isModelOpen}
                onClose={handleCloseModal}
                product={data}
                rfq_id={rfq_id}
                onClauseChange={onClauseChange}
              />
            )}
          </div>
        </div>
        {footer && (
          <div
            className="d-flex flex-wrap justify-content-between align-items-start"
            style={{ height: "fit-content" }}
          >
            {footer(data)}
          </div>
        )}

        {/* Remove Product Confirmation Modal */}
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
      </Accordion.Body>
    </Accordion.Item>
  );
};

export default Item;
