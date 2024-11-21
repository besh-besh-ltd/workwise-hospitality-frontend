import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
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
import AddClause from "./AddClause";

const Item = ({ rfq_id, data, vendorApprovedList }) => {
  const dispatch = useDispatch();
  const [specSize, setspecSize] = useState("");
  const [specSpec, setspecSpec] = useState("");
  const [quantity, setquantity] = useState("");
  const [unit, setUnit] = useState("");

  const [uploadedQapFile, setuploadedQapFile] = useState(data?.qap_file);
  const [uploadedSpecFile, setuploadedSpecFile] = useState(data?.spec_file);
  const [uploadedDatasheetFile, setuploadedDatasheetFile] = useState(data?.datasheet_file);
  
  const [selectedVendors, setselectedVendors] = useState(data?.vendors);
  const [comment, setComment] = useState(data?.comment);
  const [isModelOpen,setIsModalOpen] = useState(false);

  
  useEffect(() => {
    data.spec?.map((item) => {
      switch (item.title) {
        case 'Size':
          setspecSize(item.value);
          break;
        case 'Spec':
          setspecSpec(item.value);
          break;
        case 'Quantity':
          setquantity(item.value);
          break;
        case 'Unit':
          setUnit(item.value);
          break;
        default:
          console.log('Invalid Title');
      }
    });
  }, []);

  const handleSelectDefaultTDSQAPFile = (e, type, data) => {
    dispatch(setUserSelectedDefaultFile({
      file_type: type,
      is_selected: e.target.checked,
      product_id: data.product_id,
      variant: data.variant
    }));
  }

  const handleSpecValue = (type, value) => {
    if (type == "size") {
      setspecSize(value);
      dispatch(
        addProductSpecValue({
          title: "Size",
          value: value,
          product_id: data.product_id,
          variant: data.variant
        })
      );
    }
    if (type == "spec") {
      setspecSpec(value);
      dispatch(
        addProductSpecValue({
          title: "Spec",
          value: value,
          product_id: data.product_id,
          variant: data.variant
        })
      );
    }
    if (type == "quantity") {
      setquantity(value);
      dispatch(
        addProductSpecValue({
          title: "Quantity",
          value: value,
          product_id: data.product_id,
          variant: data.variant
        })
      );
    }
    if (type == "unit") {
      setUnit(value);
      dispatch(
        addProductSpecValue({
          title: "Unit",
          value: value,
          product_id: data.product_id,
          variant: data.variant
        })
      );
    }
  };

  const uploadToServer = async (e, type) => {
    try {
      const filePath = await handleFileUpload(e);
      if (type == "qap_file") {
        setuploadedQapFile((prevFiles) => ([
          ...prevFiles,
          filePath
        ]));
      }
      if (type == "spec_file") {
        setuploadedSpecFile((prevFiles) => ([
          ...prevFiles,
          filePath
        ]));
      }
      if (type == "datasheet_file") {
        setuploadedDatasheetFile((prevFiles) => ([
          ...prevFiles,
          filePath
        ]));
      }
      dispatch(
        addFiles({
          type,
          value: filePath,
          product_id: data.product_id,
          variant: data.variant
        })
      );

    } catch (error) {
      let message = error.message;
      toast.error(message);
    }
  };

  const handleRemoveFile = (file_url, type) => {
    dispatch(
      removeFiles({
        type,
        value: file_url,
        product_id: data.product_id,
        variant: data.variant
      })
    );

    let newList = [];
    switch (type) {
      case "spec_file":
        newList = uploadedSpecFile.filter((spec_file_item) => spec_file_item !== file_url)
        setuploadedSpecFile(newList);
        break;
      case "datasheet_file":
        newList = uploadedDatasheetFile.filter((datasheet_file_item) => datasheet_file_item !== file_url)
        setuploadedDatasheetFile(newList);
        break;
      case "qap_file":
        newList = uploadedQapFile.filter((qap_file_item) => qap_file_item !== file_url)
        setuploadedQapFile(newList);
        break;
      default:
        console.log("Invalid file");
    }
  }

  const handleaddProductComment = (e) => {
    setComment(e.target.value);
    dispatch(
      addProductComment({
        value: e.target.value,
        product_id: data.product_id,
        variant: data.variant
      })
    );
  };

  const handleRemoveProduct = () => {
    dispatch(removeRfqProduct(data));
  };

  const handleAddVarient = () => {
    const item = {
      product_id: data.product_id,
      product_name: data?.name,
      vendors: data?.vendors,
      pd_tds_file_url: data.predefined_tds_file,
      pd_qap_file_url: data.predefined_qap_file,
    };
    dispatch(addRfqProduct(item));
  };

  const handleOpenModal = () => {
    setIsModalOpen(true);
  }

  const handleCloseModal = () => {
    setIsModalOpen(false);
  }

  return (
    <>
      <tr key={`rfqpp_${data?.product_id}_${data?.variant}`}>
        <td>{data?.name}</td>
        <td >
          <div className="d-flex flex-column justify-content-center align-items-center">
            <input
              type="text"
              value={specSpec}
              onChange={(e) => handleSpecValue("spec", e.target.value)}
              name="Spec"
              id={`spec_${data.product_id}_${data.variant}_spec`}
              placeholder="Grade, Material and other Specs"
              className="w-100 mb-3"
            />
            <div className="d-flex gap-2 mb-2">
              <input
                type="text"
                value={specSize}
                onChange={(e) => handleSpecValue("size", e.target.value)}
                name="Size"
                id={`spec_${data.product_id}_${data.variant}_size`}
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
            <input type="number"
              value={quantity}
              onChange={(e) => handleSpecValue("quantity", e.target.value)}
              name="Quantity"
              min={0}
              id={`spec_${data.product_id}_${data.variant}_quantity`}
              placeholder="Quantity"
              className="form-control me-0 mb-3"
              aria-label="Quantity input with dropdown button"
              onWheel={(e) => e.target.blur()}
            />
            <input type="text"
              value={unit}
              onChange={(e) => handleSpecValue("unit", e.target.value)}
              name="Unit"
              id={`spec_${data.product_id}_${data.variant}_unit`}
              placeholder="Unit"
              className="form-control me-0 mb-2"
              aria-label="Unit Details"
            />
          </div>
        </td>
        <td className="w200">
          <p>
            <div>
              {data.predefined_tds_file != '' ?
                <>
                  <label>
                    <input type="checkbox" checked={data.user_selected_predefined_tds} onClick={(e) => handleSelectDefaultTDSQAPFile(e, 'TDS', data)} /> Select file
                  </label>
                  <a href={data.predefined_tds_file} className="view-file-link" target="_blank">View File</a>

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
              {data.predefined_qap_file != '' ?
                <>
                  <label>
                    <input type="checkbox" checked={data.user_selected_predefined_qap} onClick={(e) => handleSelectDefaultTDSQAPFile(e, 'QAP', data)} /> Select file
                  </label>
                  <a
                    href={data.predefined_qap_file}
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
              href={`rfq-management-vendor?productid=${data.product_id}&variant=${data.variant}`}
              className="page-link"
            >
              View selected vendors ({selectedVendors.length})
            </Link>
          </span>
        </td>
        <td>
          <button className="upload mr-2 mb-2" onClick={handleRemoveProduct}>
            <FontAwesomeIcon icon={faTrash} /> Remove
          </button>
          {data?.variant == 0 &&
            <button className="upload" onClick={handleAddVarient}>
              <FontAwesomeIcon icon={faPlusCircle} /> Add variant
            </button>}
        </td>
        <td>
            <button className="upload" onClick={handleOpenModal}>
              <FontAwesomeIcon icon={faPlusCircle} /> Add Clause
            </button>
        </td>
      </tr>
      <div>
        {isModelOpen && <AddClause show = {isModelOpen} onClose = {handleCloseModal} product = {data} rfq_id={rfq_id} />}
      </div>
    </>
  );
};

export default Item;
