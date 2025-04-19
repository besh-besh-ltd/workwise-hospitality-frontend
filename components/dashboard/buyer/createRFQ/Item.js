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
import { addProductToDraft, getClausesByRfqProductId } from "@/services/rfq";

const Item = ({
  rfq_id,
  data,
  vendorApprovedList,
  setHasUnsavedChanges,
  getDraftInitialData,
  saveDraft,
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

  const handleSpecValue = (type, value) => {
    if (rfqProduct.spec) {
      setRfqProduct((prev) => ({
        ...prev,
        spec: prev.spec.map((item) =>
          item.title === type ? { ...item, value } : item
        ),
      }));
    }
    dispatch(
      addProductSpecValue({
        title: type.charAt(0).toUpperCase() + type.slice(1),
        value,
        product_id: rfqProduct.product_id,
        variant: rfqProduct.variant,
      })
    );
    setHasUnsavedChanges(true);
  };

  const uploadToServer = async (e, type) => {
    try {
      const filePath = await handleFileUpload(e);
      const updatedFiles = [
        ...(type === "qap_file"
          ? uploadedQapFile
          : type === "spec_file"
          ? uploadedSpecFile
          : uploadedDatasheetFile),
        filePath,
      ];

      if (type === "qap_file") setUploadedQapFile(updatedFiles);
      if (type === "spec_file") setUploadedSpecFile(updatedFiles);
      if (type === "datasheet_file") setUploadedDatasheetFile(updatedFiles);

      dispatch(
        addFiles({
          type,
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

  const handleRemoveFile = (fileUrl, type) => {
    const updatedFiles = (
      type === "qap_file"
        ? uploadedQapFile
        : type === "spec_file"
        ? uploadedSpecFile
        : uploadedDatasheetFile
    ).filter((file) => file !== fileUrl);

    if (type === "qap_file") setUploadedQapFile(updatedFiles);
    if (type === "spec_file") setUploadedSpecFile(updatedFiles);
    if (type === "datasheet_file") setUploadedDatasheetFile(updatedFiles);

    dispatch(
      removeFiles({
        type,
        value: fileUrl,
        product_id: rfqProduct.product_id,
        variant: rfqProduct.variant,
      })
    );
    setHasUnsavedChanges(true);
  };

  const handleSelectDefaultTDSQAPFile = (e, type, data) => {
    dispatch(
      setUserSelectedDefaultFile({
        file_type: type,
        is_selected: e.target.checked,
        product_id: data.product_id,
        variant: data.variant,
      })
    );
    setHasUnsavedChanges(true);
  };

  const handleaddProductComment = (e) => {
    const newComment = e.target.value;
    setComment(newComment);
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
    dispatch(removeRfqProduct(data));
    setHasUnsavedChanges(true);
  };

  const handleAddVarient = async () => {
    try {
      setHasUnsavedChanges(true);

      await saveDraft();
      setLoading(true);

      const payload = {
        product_id: data.product_id,
        vendors: data.vendors.map((vendor) => ({
          vendor_id: vendor.user_id,
        })),
      };
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
    const payload = {
      rfq_product_id: data.id,
      vendor_id: null,
    };
    try {
      const res = await getClausesByRfqProductId(payload);
      setBuyerClauses(res.data);
    } catch (error) {
      console.error(error);
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
    getProductClauses();
  }, []);

  useEffect(() => {
    setRfqProduct(data);
    setUploadedQapFile(data?.qap_file || []);
    setUploadedSpecFile(data?.spec_file || []);
    setUploadedDatasheetFile(data?.datasheet_file || []);
    setComment(data?.comment || "");
  }, [data]);

  return (
    <Accordion.Item
      key={`rfqp_${rfqProduct.product_id}_${rfqProduct.variant}`}
      eventKey={`acc_event_key_${rfqProduct.product_id}_${rfqProduct.variant}`}
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
        <div
          className="d-flex flex-wrap   justify-content-between align-items-start "
          style={{ height: "fit-content" }}
        >
          {/*start: spec, files conteiner  */}
          <div className="d-flex flex-column justify-content-center align-items-center  gap-2">
            {/*start: prodiuct spec */}
            <div style={{ width: "100%" }}>
              <label> Product Size </label>
              <textarea
                type="text"
                value={
                  rfqProduct?.spec?.find((item) => item.title === "Size")
                    ?.value || ""
                }
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
                      className="upload uploadInlineFile d-flex align-items-center "
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
              <label> Product Specification </label>
              <textarea
                type="text"
                value={
                  rfqProduct?.spec?.find((item) => item.title === "Spec")
                    ?.value || ""
                }
                onChange={(e) => handleSpecValue("spec", e.target.value)}
                placeholder="Grade, Material and other Specs"
                className="w-100 form-control"
                style={{ height: "100px" }}
              />
            </div>
            {/*end: product spec */}

            {/* start: qty and unit ocntainer */}
            <div className="d-flex  justify-content-start align-items-start gap-2">
              <div className="" style={{ width: "200px" }}>
                <label> Quantity * </label>
                <input
                  type="number"
                  value={
                    rfqProduct?.spec?.find((item) => item.title === "Quantity")
                      ?.value || ""
                  }
                  onChange={(e) => handleSpecValue("quantity", e.target.value)}
                  min={0}
                  placeholder="Quantity"
                  className="form-control me-0 mb-3"
                  aria-label="Quantity input with dropdown button"
                  onWheel={(e) => e.target.blur()}
                />
              </div>

              <div style={{ width: "210px" }}>
                <label> Unit * </label>
                <input
                  type="text"
                  value={
                    rfqProduct?.spec?.find((item) => item.title === "Unit")
                      ?.value || ""
                  }
                  onChange={(e) => handleSpecValue("unit", e.target.value)}
                  placeholder="Unit"
                  className="form-control me-0 mb-2"
                  aria-label="Unit Details"
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
                  Selected Vendors - <strpng>
                    {" "}
                    {data.vendors.length}{" "}
                  </strpng>{" "}
                </span>
                <Link
                  href={`rfq-management-vendor?productid=${rfqProduct.product_id}&variant=${rfqProduct.variant}`}
                  className="btn btn-primary "
                  // style={{ height: "40px" }}
                >
                  {/* <FontAwesomeIcon icon={faEye} />{" "} */}
                  View vendors
                </Link>
              </div>
            </div>

            <div className=" mt-1">
              <span>Add comments</span>
              <input
                // style={{ height: "170px" }}
                className="form-control me-0 mb-3"
                type="text"
                value={comment}
                placeholder="Add Comments..."
                // className="item_comment"
                onChange={handleaddProductComment}
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
              />
            )}
          </div>
        </div>
      </Accordion.Body>
    </Accordion.Item>
  );
};

export default Item;
