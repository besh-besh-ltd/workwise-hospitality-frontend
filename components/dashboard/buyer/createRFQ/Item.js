import React, { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "react-toastify";
import {
  addProductComment,
  addFiles,
  addProductSpecValue,
  addRfqProduct,
  removeFiles,
  removeRfqProduct,
  setUserSelectedDefaultFile,
} from "@/redux/slice";
import { extractfileName, handleFileUpload } from "@/utils/sharedFunctions";
import { faFile } from "@fortawesome/free-regular-svg-icons";
import { faPlusCircle, faTrash } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useDispatch } from "react-redux";


const Item = ({ data, vendorApprovedList, setHasUnsavedChanges }) => {
  const dispatch = useDispatch();
  const [rfqProduct, setRfqProduct] = useState(data);
  const [uploadedQapFile, setUploadedQapFile] = useState(data?.qap_file);
  const [uploadedSpecFile, setUploadedSpecFile] = useState(data?.spec_file);
  const [uploadedDatasheetFile, setUploadedDatasheetFile] = useState(data?.datasheet_file);
  const [comment, setComment] = useState(data?.comment);

  useEffect(() => {
    // console.log(data)
    setRfqProduct(data);
    setUploadedQapFile(data?.qap_file || []);
    setUploadedSpecFile(data?.spec_file || []);
    setUploadedDatasheetFile(data?.datasheet_file || []);
    setComment(data?.comment || "");
  }, [data]);

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
      const updatedFiles = [...(type === "qap_file"
        ? uploadedQapFile
        : type === "spec_file"
          ? uploadedSpecFile
          : uploadedDatasheetFile), filePath];

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
    const updatedFiles = (type === "qap_file"
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
    dispatch(setUserSelectedDefaultFile({
      file_type: type,
      is_selected: e.target.checked,
      product_id: data.product_id,
      variant: data.variant
    }));
    setHasUnsavedChanges(true);
  }

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

  const handleAddVarient = () => {
    const item = {
      product_id: data.product_id,
      product_name: data?.name,
      vendors: data?.vendors,
      pd_tds_file_url: data.predefined_tds_file,
      pd_qap_file_url: data.predefined_qap_file,
      //fix here (can add datasheet and qap)
    };
    dispatch(addRfqProduct(item));
    setHasUnsavedChanges(true);
  };


  return (
    <>
      <tr key={`rfqp_${rfqProduct.product_id}_${rfqProduct.variant}`}>
        <td>{rfqProduct?.name}</td>
        <td >
          <div className="d-flex flex-column justify-content-center align-items-center">
            <input
              type="text"
              value={rfqProduct?.spec?.find((item) => item.title === "Spec")?.value || ""}
              onChange={(e) => handleSpecValue("spec", e.target.value)}
              placeholder="Grade, Material and other Specs"
              className="w-100 mb-3"
            />
            <div className="d-flex gap-2 mb-2">
              <input
                type="text"
                value={rfqProduct?.spec?.find((item) => item.title === "Size")?.value || ""}
                onChange={(e) => handleSpecValue("size", e.target.value)}
                placeholder="Size"
                className="w-100"
              />
              <span>OR</span>
              <label className="upload uploadInlineFile d-flex align-items-center">
                <FontAwesomeIcon icon={faFile} className="me-2" /> Upload
                <input
                  type="file"
                  accept=".pdf, .docx, .doc, .xlsx, .xls, .csv, .png, .jpg, .jpeg"
                  onChange={(e) => uploadToServer(e, "spec_file")}
                  multiple={true}
                />
              </label>
            </div>
            {uploadedSpecFile && uploadedSpecFile.length > 0 && (
              uploadedSpecFile.map((spec_file) => {
                return (
                  <div key={spec_file} className="d-flex justify-content-between">
                    <a href={spec_file} className="page-link text-truncate" target="_blank" style={{ maxWidth: "140px" }}>{extractfileName(spec_file)}</a>
                    <span
                      className="btn-close btn-close-sm"
                      aria-label="Close"
                      onClick={() => handleRemoveFile(spec_file, "spec_file")}></span>
                  </div>
                )
              })
            )}
          </div>
        </td>
        <td>
          <div className="d-flex flex-column">
            <input
              type="number"
              value={rfqProduct?.spec?.find((item) => item.title === "Quantity")?.value || ""}
              onChange={(e) => handleSpecValue("quantity", e.target.value)}
              min={0}
              placeholder="Quantity"
              className="form-control me-0 mb-3"
              aria-label="Quantity input with dropdown button"
              onWheel={(e) => e.target.blur()}
            />
            <input
              type="text"
              value={rfqProduct?.spec?.find((item) => item.title === "Unit")?.value || ""}
              onChange={(e) => handleSpecValue("unit", e.target.value)}
              placeholder="Unit"
              className="form-control me-0 mb-2"
              aria-label="Unit Details"
            />
          </div>
        </td>
        <td className="w200">
          <p>
            <div>
              {rfqProduct.predefined_tds_file != '' ?
                <>
                  <label>
                    <input type="checkbox" checked={rfqProduct.user_selected_predefined_tds} onClick={(e) => handleSelectDefaultTDSQAPFile(e, 'TDS', rfqProduct)} /> Select file
                  </label>
                  <a href={rfqProduct.predefined_tds_file} className="view-file-link" target="_blank">View File</a>

                </> : <p>No TDS file found in our system!</p>}
            </div>
            <p className="m-4">
              <span>OR</span>
            </p>
            <p>
              {
                <label className="upload uploadInlineFile d-flex align-items-center">
                  <FontAwesomeIcon icon={faFile} className="me-2" /> Upload
                  <input
                    type="file"
                    accept=".pdf, .docx, .doc, .xlsx, .xls, .csv, .png, .jpg, .jpeg"
                    onChange={(e) => uploadToServer(e, "datasheet_file")}
                    multiple={true}
                  />
                </label>
              }
              {uploadedDatasheetFile && uploadedDatasheetFile.length > 0 && (
                uploadedDatasheetFile.map((datasheet_file) => {
                  return (
                    <div key={datasheet_file} className="d-flex justify-content-between">
                      <a href={datasheet_file} className="page-link text-truncate" target="_blank" style={{ maxWidth: "140px" }}>{extractfileName(datasheet_file)}</a>
                      <span
                        className="btn-close btn-close-sm"
                        aria-label="Close"
                        onClick={(e) => {
                          e.preventDefault();
                          handleRemoveFile(datasheet_file, "datasheet_file")
                        }}></span>
                    </div>
                  )
                })
              )}
            </p>
          </p>
        </td>
        <td className="w200">
          <p>
            <div>
              {rfqProduct.predefined_qap_file != '' ?
                <>
                  <label>
                    <input type="checkbox" checked={rfqProduct.user_selected_predefined_qap} onClick={(e) => handleSelectDefaultTDSQAPFile(e, 'QAP', rfqProduct)} /> Select file
                  </label>
                  <a
                    href={rfqProduct.predefined_qap_file}
                    className="view-file-link"
                    target="_blank"
                  >
                    View File
                  </a>
                </> : <p>No QAP file found in our system!</p>
              }
            </div>
            <p className="m-4">
              <span>OR</span>
            </p>
            <p>
              {
                <label className="upload uploadInlineFile ">
                  <FontAwesomeIcon icon={faFile} className="me-2" /> Upload
                  <input
                    type="file"
                    accept=".pdf, .docx, .doc, .xlsx, .xls, .csv, .png, .jpg, .jpeg"
                    onChange={(e) => uploadToServer(e, "qap_file")}
                    multiple={true}
                  />
                </label>
              }
              {uploadedQapFile && uploadedQapFile.length > 0 && (
                uploadedQapFile.map((qap_file) => {
                  return (
                    <div key={qap_file} className="d-flex justify-content-between">
                      <a href={qap_file} className="page-link text-truncate" target="_blank" style={{ maxWidth: "140px" }}>{extractfileName(qap_file)}</a>
                      <span
                        className="btn-close btn-close-sm"
                        aria-label="Close"
                        onClick={(e) => {
                          e.preventDefault();
                          handleRemoveFile(qap_file, "qap_file")
                        }}></span>
                    </div>
                  )
                })
              )}
            </p>
          </p>
        </td>

        <td>
          <input
            type="text"
            value={comment}
            placeholder="Add Comments..."
            className="item_comment"
            onChange={handleaddProductComment}
          />
        </td>

        <td>
          <span>
            <Link
              href={`rfq-management-vendor?productid=${rfqProduct.product_id}&variant=${rfqProduct.variant}`}
              className="page-link"
            >
              View selected vendors ({data.vendors.length})
            </Link>
          </span>
        </td>

        <td>
          <button className="upload mr-2 mb-2" onClick={handleRemoveProduct}>
            <FontAwesomeIcon icon={faTrash} /> Remove
          </button>
          {/* fix here */}
          <button className="upload" onClick={handleAddVarient}>
            <FontAwesomeIcon icon={faPlusCircle} /> Add variant
          </button>
          {/* {data?.variant == 0 &&
            <button className="upload" onClick={handleAddVarient}>
              <FontAwesomeIcon icon={faPlusCircle} /> Add variant
            </button>} */}
        </td>
      </tr>
    </>
  );
};

export default Item;
