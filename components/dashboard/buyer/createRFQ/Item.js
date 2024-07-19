import {
  addComment,
  addDatasheet,
  addFiles,
  addProductSpec,
  addProductSpecValue,
  addQAP,
  addRfqProduct,
  removeRfqProduct,
  setUserSelectedDefaultFile,
} from "@/redux/slice";
import { handleUploadFile } from "@/services/rfq";
import { faPlusCircle, faTrash } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";

const Item = ({ data, handleProductSpec, vendorApprovedList }) => {
  const dispatch = useDispatch();
  const rfqProductsFromStore = useSelector((data) => data.rfqProducts);
  const [specSize, setspecSize] = useState("");
  const [specSpec, setspecSpec] = useState("");
  const [quantity, setquantity] = useState("");

  const [comment, setComment] = useState(data?.comment);
  const [datasheet, setDatasheet] = useState(
    data?.datasheet != "0" ? data?.datasheet : data.defaultSelectedVAB
  );
  const [qap, setQAP] = useState(
    data?.qap != "0" ? data?.qap : data.defaultSelectedVAB
  );

  const [uploadedQapFile, setuploadedQapFile] = useState(data?.qap_file);
  const [uploadedSpecFile, setuploadedSpecFile] = useState(data?.spec_file);
  const [uploadedDatasheetFile, setuploadedDatasheetFile] = useState(
    data?.datasheet_file
  );

  const [selectedVendors, setselectedVendors] = useState(data?.vendors);

  useEffect(() => {
    console.log("data", data);
    data.spec.map((item) => {
      if (item.title == "Size") {
        setspecSize(item.value);
      }
      if (item.title == "Spec") {
        setspecSpec(item.value);
      }
      if (item.title == "Quantity") {
        setquantity(item.value);
      }
    });
  }, []);

  const handleSelectDefaultTDSQAPFile = (e,type,data) =>{
    
    dispatch(setUserSelectedDefaultFile({
      file_type: type,
      is_selected: e.target.checked,
      product_id: data.product_id,
      variant:data.variant
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
          variant:data.variant
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
          variant:data.variant
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
          variant:data.variant
        })
      );
    }
  };

  const handleUpload = (event, type) => {
    if (event.target.files && event.target.files[0]) {
      const fileExtension = event.target.files[0].name.split(".").pop();
      if (fileExtension == "pdf") {
        const i = event.target.files[0];
        uploadToServer(i, type);
      }
    }
  };

  const uploadToServer = async (supplied_img, type) => {
    handleUploadFile(supplied_img)
      .then((res) => {
        if (res?.data.length > 0) {
          let uploadedFile = res.data[0].file_path;
          if (type == "qap_file") {
            setuploadedQapFile(uploadedFile);
          }
          if (type == "spec_file") {
            setuploadedSpecFile(uploadedFile);
          }
          if (type == "datasheet_file") {
            setuploadedDatasheetFile(uploadedFile);
          }
          dispatch(
            addFiles({
              type,
              value: uploadedFile,
              product_id: data.product_id,
              variant:data.variant
            })
          );
        }
      })
      .catch((err) =>{
        let message = err.message.response.data.errors.file.message;
        alert(message)
        // toast.error(message,
        //   {
        //     position: "top-right",
        //   }
        // );

      });
  };

  const handleAddComment = (e) => {
    setComment(e.target.value);
    dispatch(
      addComment({
        value: e.target.value,
        product_id: data.product_id,
        variant:data.variant
      })
    );
  };

  const handleAddDatasheet = (e) => {
    setDatasheet(e.target.value);
    dispatch(
      addDatasheet({
        value: e.target.value,
        product_id: data.product_id,
        variant:data.variant
      })
    );
  };
  const handleAddQap = (e) => {
    setQAP(e.target.value);
    dispatch(
      addQAP({
        value: e.target.value,
        product_id: data.product_id,
        variant:data.variant
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

  return (
    <>
      <tr>
        <td>{data?.name}</td>
        <td>
          <div>
            <input
              type="text"
              value={specSize}
              onChange={(e) => handleSpecValue("size", e.target.value)}
              name="Size"
              id={`spec_${data.product_id}_size`}
              placeholder="Size"
            />
            <input
              type="text"
              value={specSpec}
              onChange={(e) => handleSpecValue("spec", e.target.value)}
              name="Spec"
              id={`spec_${data.product_id}_spec`}
              placeholder="Spec"
            />
            <input
              type="number"
              value={quantity}
              onChange={(e) => handleSpecValue("quantity", e.target.value)}
              name="Quantity"
              id={`spec_${data.product_id}_size`}
              placeholder="Quantity"
            />
            <span>OR</span>
            {uploadedSpecFile != "" && (
              <a href={uploadedSpecFile} className="page-link" target="_blank">
                View file
              </a>
            )}
            {uploadedSpecFile != "" && (
              <label className="upload uploadInlineFile">
                Change
                <input
                  type="file"
                  onChange={(e) => handleUpload(e, "spec_file")}
                  accept={".pdf"}
                  multiple={false}
                />
              </label>
            )}
            {uploadedSpecFile == "" && (
              <label className="upload uploadInlineFile">
                Upload{" "}
                <input
                  type="file"
                  onChange={(e) => handleUpload(e, "spec_file")}
                  accept={".pdf"}
                  multiple={false}
                />
              </label>
            )}
          </div>
        </td>
        <td className="w200">
          <p>
            <div>
            {data.predefined_tds_file != '' ?
              <>
                <label>
                  <input type="checkbox" checked={data.user_selected_predefined_tds} onClick={(e)=>handleSelectDefaultTDSQAPFile(e,'TDS',data)}/> Select file
                </label>
                <a href={data.predefined_tds_file} className="view-file-link" target="_blank">View File</a>
                
              </>: <p>No TDS file found in our system!</p>}
            </div>
            {/* {vendorApprovedList && (
              <select
                name="datesheet"
                id="datesheet"
                onChange={handleAddDatasheet}
                value={datasheet}
              >
                <option value="0">Select</option>
                {vendorApprovedList.map((item) => {
                  return (
                    <option key={`datesheet_${item.id}`} value={item.id}>
                      {item.vendor_approve}
                    </option>
                  );
                })}
              </select>
            )} */}
            <p className="m-4">
              <span>OR</span>
            </p>
            <p>
              {uploadedDatasheetFile != "" && (
                <a
                  href={uploadedDatasheetFile}
                  className="page-link"
                  target="_blank"
                >
                  View file
                </a>
              )}
              {uploadedDatasheetFile != "" && (
                <label className="upload uploadInlineFile">
                  Change
                  <input
                    type="file"
                    onChange={(e) => handleUpload(e, "datasheet_file")}
                    multiple={false}
                    accept={".pdf"}
                  />
                </label>
              )}
              {uploadedDatasheetFile == "" && (
                <label className="upload uploadInlineFile">
                  Upload own file{" "}
                  <input
                    type="file"
                    onChange={(e) => handleUpload(e, "datasheet_file")}
                    multiple={false}
                    accept={".pdf"}
                  />
                </label>
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
                    <input type="checkbox" checked={data.user_selected_predefined_qap} onClick={(e)=>handleSelectDefaultTDSQAPFile(e,'QAP',data)}/> Select file
                  </label>
                  <a
                    href={data.predefined_qap_file}
                    className="view-file-link"
                    target="_blank"
                  >
                  View File
                  </a>
                </>: <p>No QAP file found in our system!</p>
              }
            </div>
            {/* {vendorApprovedList && (
              <select
                name="datesheet"
                id="datesheet"
                onChange={handleAddQap}
                value={qap}
              >
                <option value="0">Select</option>
                {vendorApprovedList.map((item) => {
                  return (
                    <option key={`datesheet_${item.id}`} value={item.id}>
                      {item.vendor_approve}
                    </option>
                  );
                })}
              </select>
            )} */}
            <p className="m-4">
              <span>OR</span>
            </p>
            <p>
            {uploadedQapFile != "" && (
              <a href={uploadedQapFile} className="page-link" target="_blank">
                View file
              </a>
            )}
            {uploadedQapFile != "" && (
              <label className="upload uploadInlineFile">
                Change
                <input
                  type="file"
                  onChange={(e) => handleUpload(e, "qap_file")}
                  multiple={false}
                  accept={".pdf"}
                />
              </label>
            )}
            {uploadedQapFile == "" && (
              <>
                <label className="upload uploadInlineFile">
                  Upload own file{" "}
                  <input
                    type="file"
                    onChange={(e) => handleUpload(e, "qap_file")}
                    multiple={false}
                    accept={".pdf"}
                  />
                </label>
              </>
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
            onChange={handleAddComment}
          />
        </td>
        <td>
          <span>
            <Link
              href={`rfq-management-vendor?vendors=${selectedVendors
                .map((approved) => approved.user_id)
                .join(",")}&productid=${data.product_id}`}
              className="page-link"
            >
              View selected vendors ({selectedVendors.length})
            </Link>

            {/* <button className="upload">Select vendors</button> */}
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
      </tr>
    </>
  );
};

export default Item;
