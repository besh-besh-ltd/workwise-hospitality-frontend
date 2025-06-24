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
import { faEye, faFile } from "@fortawesome/free-regular-svg-icons";
import { faPlusCircle, faTrash } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useDispatch } from "react-redux";
import AddClause from "./AddClause";
import { addProductToDraft, addProductToExistingRfq, getClausesByRfqProductId } from "@/services/rfq";
import CommonFormInput from "@/components/shared/CommonFormInput";

const Item = ({
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

  // Behavioural Html injection props
  header,
  footer,
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
  const [specs, setSpecs] = useState({
    size: '',
    spec: '',
    quantity: '',
    unit: ''
  })

  const eventKey = `${rfqProduct.id}`;
  const isActive = activeKey?.includes(eventKey);

  const handleSpecValue = (type, value) => {
    value = type == 'quantity' ? parseInt(value) || '' : value

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

  const handleRemoveProduct = () => {
    if(handleRemoveProductInEdit)
      handleRemoveProductInEdit(data)
    else
      dispatch(removeRfqProduct(data));
    setHasUnsavedChanges(true);
  };

  const handleAddVarient = async () => {
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
      if(!res.success) setBuyerClauses([])
      else
        setBuyerClauses(res.data);
    } catch (error) {
      setBuyerClauses([]);
    }
  }, [data.id]);

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    getProductClauses();
  };

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
        <div className="d-flex justify-content-between w-100 align-items-center">
          <h2 className="h6 mb-0"> {rfqProduct?.name}</h2>

          {/* start: remove and add variant button container */}
          <div className="d-flex gap-3 mr-4 ">
            {/* start: add variant button container */}
            <button
              className="upload btn btn-danger pt-2 btn-sm"
              style={{ height: "40px", width: "120px" }}
              onClick={handleRemoveProduct}
            >
              <FontAwesomeIcon icon={faTrash} /> Remove
            </button>
            {/* end: add variant button container */}

            {/* start: remove button container */}
            <button
              className="upload  btn btn-primary  pt-2 btn-sm"
              style={{ height: "40px", width: "150px" }}
              onClick={handleAddVarient}
              disabled={loading}
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
        {header && (
          <div
            className="d-flex flex-wrap justify-content-between align-items-start"
            style={{ height: "fit-content" }}
          >
            {header(data)}
          </div>
        )}
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
                values={specs?.size || ''}
                onChange={(e) => handleSpecValue("size", e.target.value)}
                placeholder="Size"
                className=" form-control"
                style={{ height: "40px" }}
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
                      className="upload uploadInlineFile d-flex align-items-center"
                      style={{ maxWidth: "100%" }}
                    >
                      {/* <FontAwesomeIcon icon={faFile} className="me-2" />  */}
                      Upload TDS
                      <input
                        type="file"
                        accept=".pdf, .docx, .doc, .xlsx, .xls, .csv, .png, .jpg, .jpeg"
                        onChange={(e) => uploadToServer(e, "datasheet_file")}
                        multiple={true}
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
                      className="upload uploadInlineFile "
                      style={{ maxWidth: "100%" }}
                      // style={{ borderBottom: "1px solid rgba(45, 92, 167, 0.59)" }}
                    >
                      {/* <FontAwesomeIcon icon={faFile} className="me-2" /> */}
                      Upload QAP
                      <input
                        type="file"
                        accept=".pdf, .docx, .doc, .xlsx, .xls, .csv, .png, .jpg, .jpeg"
                        onChange={(e) => uploadToServer(e, "qap_file")}
                        multiple={true}
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
                          <span
                            className="btn-close btn-close-sm"
                            aria-label="Close"
                            onClick={(e) => {
                              e.preventDefault();
                              handleRemoveFile(qap_file, "qap_file");
                            }}
                          ></span>
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
                    className="upload uploadInlineFile"
                    style={{ maxWidth: "100%" }}
                  >
                    {/* <FontAwesomeIcon icon={faFile} className="me-2" /> */}
                    Upload Spec
                    <input
                      type="file"
                      accept=".pdf, .docx, .doc, .xlsx, .xls, .csv, .png, .jpg, .jpeg"
                      onChange={(e) => uploadToServer(e, "spec_file")}
                      multiple={true}
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
                          <span
                            className="btn-close btn-close-sm"
                            aria-label="Close"
                            onClick={() =>
                              handleRemoveFile(spec_file, "spec_file")
                            }
                          ></span>
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
              />
            </div>
            {/*end: product spec */}

            {/* start: qty and unit ocntainer */}
            <div className="d-flex  justify-content-start align-items-start gap-2">
              <div className="" style={{ width: "200px" }}>
                <CommonFormInput
                  required
                  type="simple-text"
                  name={"quantity"}
                  label={"Quantity"}
                  values={specs.quantity}
                  onChange={(e) => {
                    const val = e.target.value;
                    const cleaned = val.replace(/\D+/g, '').replace(/^0+/, '');
                    if (cleaned === "" || /^\d+$/.test(cleaned)) {
                      handleSpecValue("quantity", cleaned);
                    }
                  }}
                  placeholder="Quantity"
                  className=" form-control"
                />
              </div>

              <div style={{ width: "210px" }}>
                <CommonFormInput
                  type="simple-text"
                  name={"unit"}
                  label={"Unit"}
                  values={specs.unit}
                  onChange={(e) => handleSpecValue("unit", e.target.value)}
                  placeholder="Unit"
                  className=" form-control"
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
                    className="upload  btn btn-secondary  "
                    // style={{ height: "40px" }} btn-sm  pt-2
                    onClick={handleOpenModal}
                  >
                    <FontAwesomeIcon icon={faPlusCircle} /> Add Clauses
                  </button>

                  {buyerClauses?.length > 0 && (
                    <button
                      className="upload btn btn-warning text-white pt-2 btn-sm"
                      style={{ height: "40px" }}
                      onClick={handleOpenModal}
                    >
                      <FontAwesomeIcon icon={faEye} />{" "}
                      {`View ${buyerClauses.length} Clauses`}
                    </button>
                  )}
                </div>
              </div>
              {/* end tech evaluation container */}

              {/* <div>
              <span> Vendors </span> */}
              <div
                className="d-flex flex-column gap-2 "
                style={{
                  // border: "1px solid #dcdbeb",
                  borderRadius: "5px",
                  height: "fit-content",
                }}
              >
                <span style={{ marginBottom: "-8px" }}>
                  {" "}
                  Selected Vendors - <strong>
                    {" "}
                    {vendors ? vendors.length == 0 ? '0' : vendors.length : data.vendors?.length}
                  </strong>{" "}
                </span>
                {
                  !handleViewVendorInEdit ? (
                  <Link
                    href={`rfq-management-vendor?productid=${rfqProduct.product_id}&variant=${rfqProduct.variant}&id=${rfq_id}`}
                    className="btn btn-primary "
                    // style={{ height: "40px" }}
                  >
                    {/* <FontAwesomeIcon icon={faEye} />{" "} */}
                    View vendors
                  </Link>
                ) : (
                  <button
                    onClick={handleViewVendorInEdit}
                    className="btn btn-primary "
                    // style={{ height: "40px" }}
                  >
                    {/* <FontAwesomeIcon icon={faEye} />{" "} */}
                    View vendors
                  </button>
                  )
                }
                {handleAddVendorInEdit && (
                  <button onClick={handleAddVendorInEdit} style={{ height: "40px" }} className="upload btn btn-success text-white pt-2 btn-sm">
                    Add Vendors
                  </button>
                )}
              </div>
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
      </Accordion.Body>
    </Accordion.Item>
  );
};

export default Item;
