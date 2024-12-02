import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { getRFQById, sendQuotation, updateQuotation } from "@/services/rfq";
import PlaceholderLoading from "react-placeholder-loading";
import Loader from "@/components/shared/Loader";
import { toast } from "react-toastify";
import RegretQuoteReasonModal from "@/components/modal/RegretQuoteReasonModal";
import ReadMore from "@/components/shared/ReadMore";
import { faFile } from "@fortawesome/free-regular-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { extractfileName, handleFileUpload } from "@/utils/sharedFunctions";
import { faDownload } from "@fortawesome/free-solid-svg-icons";
import { renderFileLink } from "@/utils/elementFunctions";


const SendQuotePageComp = () => {
  const router = useRouter();
  const { id, token } = router.query;
  const pageType = router.query.type;
  const [regretModal, setregretModal] = useState(false);
  const [rfqDetails, setrfqDetails] = useState(null);
  const [loading, setloading] = useState(false);
  const [quoteProducts, setquoteProducts] = useState([]);
  const [submitLoading, setsubmitLoading] = useState(false);

  const [globalFreight, setglobalFreight] = useState(3);
  const [globalPackaging, setglobalPackaging] = useState(4);
  const [globalTax, setglobalTax] = useState(18);
  const [globalPaymentTerms, setglobalPaymentTerms] = useState("");
  const [globalComment, setglobalComment] = useState("");
  const [previousGlobalFiles, setPreviousGlobalFiles] = useState(null);
  const [globalDocumentFiles, setGlobalDocumentFiles] = useState([]);
  const [alreadyQuoted, setalreadyQuoted] = useState(null);

  useEffect(() => {
    if (id) {
      getRFQdetails();
    }
  }, [router]);

  const getProductSpecValueByTitle = (productSpecs, title) => {
    const spec = productSpecs.find(spec => spec.title === title);
    return spec ? spec.value : "";
  }

  const getRFQdetails = () => {
    setloading(true);
    getRFQById(id, token)
      .then((res) => {
        setloading(false);

        if (res.data.quote_details) {
          setglobalComment(res.data.quote_details.global_comment || ""); // Set globalComment from API or fallback to empty string
          setglobalPaymentTerms(res.data.quote_details.global_payment_term || ""); // Set globalPaymentTerms from API or fallback to empty string
        }

        if (res.data.terms_and_conditions_files) {
          setPreviousGlobalFiles(res.data?.terms_and_conditions_files?.map((item) => { return item.file_url }))
        }
        // Array to store each quote
        let bidProducts = [];

        // Map to store already quoted data if exists
        const quotationsMap = new Map();
        res.data.quotations[0]?.products?.forEach((quoteItem) => {
          const key = `${quoteItem.product_id}_${quoteItem.variant}`;
          quotationsMap[key] = quoteItem;
        });

        if (res.data.products.length > 0) {
          res.data.products.map((productItem) => {
            const key = `${productItem.product_id}_${productItem.variant}`;
            const quoteItem = quotationsMap[key] || {}; // Fallback to empty if not found

            bidProducts.push({
              id: productItem.id,
              product_id: productItem.product_id,
              variant: productItem.variant,
              quantity: getProductSpecValueByTitle(productItem?.product_specs, "Quantity"),
              // quantity: productItem?.product_specs[2]?.value || "",
              product_name: productItem.product_details
                ? productItem.product_details[0].name
                : "",
              unit_price: quoteItem.unit_price || "",
              package_price: quoteItem.package_price || globalPackaging,
              tax: quoteItem.tax || globalTax,
              freight_price: quoteItem.freight_price || globalFreight,
              total_price: quoteItem.total_price || 0,
              comment: quoteItem.comment || "",
              delivery_period: quoteItem.delivery_period || "",
              previous_document_files: quoteItem?.previous_document_files?.map((item) => { return item.file_url }) || [],
              document_files: []
            });
          });
          setquoteProducts(bidProducts);
          if (res.data.quotations.length > 0)
            setalreadyQuoted(res.data.quotations)
        }
        setrfqDetails(res.data);
      })
      .catch((error) => {
        setloading(false);
      });
  };

  const handleUpdateData = (
    item_id,
    e,
    product_id,
    variant,
    type,
    valueType = "integer",
    total_qty,
    file,
    fileOperation
  ) => {
    let value = e.target.value;
    let d = quoteProducts.map((item) => {
      if (item.id == item_id && item.product_id == product_id && item.variant == variant) {
        if (valueType == "integer") {
          item[type] = parseFloat(value);
        } else if (valueType == "array") {
          let doc_list = item[type];
          if (fileOperation && fileOperation == "remove") {
            let newFileList = doc_list.filter((fileItem) => fileItem !== file);
            item[type] = newFileList;
          }
          else
            item[type].push(file)

        } else {
          item[type] = value;
        }

        const totalWithoutFPT = item.unit_price * total_qty; // Total Price before Freight, Packaging, and Tax

        // Calculate Freight (percentage of totalWithoutFPT)
        const freightPrice = (totalWithoutFPT * parseFloat(item.freight_price || 0)) / 100;

        // Calculate Packaging (percentage of totalWithoutFPT)
        const packagePrice = (totalWithoutFPT * parseFloat(item.package_price || 0)) / 100;

        // Subtotal before Tax
        const subtotalBeforeTax = totalWithoutFPT + freightPrice + packagePrice;

        // Calculate Tax (percentage of subtotalBeforeTax)
        const tax = (subtotalBeforeTax * parseFloat(item.tax || 0)) / 100;

        // Final total price
        const getTotalPrice = subtotalBeforeTax + tax;
        item.total_price = getTotalPrice ? Math.round(getTotalPrice) : 0;

      }
      return item;
    });
    setquoteProducts(d);
  };

  // const calculateTotal = () => {
  //   let d = quoteProducts.map((item) => {
  //     let p = rfqDetails.products.filter(
  //       (pi) => pi.product_id == item.product_id
  //     );
  //     let total_qty = getProductSpecValueByTitle(p[0].product_specs, "Quantity");
  //     // let total_qty = p[0].product_specs[2]?.value;

  //     let total_without_fpt = item.unit_price * parseInt(total_qty);
  //     let FP = (total_without_fpt * parseFloat(item.freight_price)) / 100;
  //     let PP = (total_without_fpt * parseFloat(item.package_price)) / 100;

  //     let total_with_fpt = total_without_fpt + FP + PP;
  //     let T = (total_without_fpt * parseFloat(item.tax)) / 100;

  //     let getTotalPrice = +total_with_fpt + +T;
  //     item.total_price = getTotalPrice ? Math.round(getTotalPrice) : 0;
  //     return item;
  //   });
  //   setquoteProducts(d);
  // };

  const calculateTotal = () => {

    let d = quoteProducts.map((item) => {
      let p = rfqDetails.products.filter(
        (pi) => pi.product_id == item.product_id
      );
      let total_qty = getProductSpecValueByTitle(p[0].product_specs, "Quantity");
      // let total_qty = p[0].product_specs[2]?.value;

      const totalWithoutFPT = item.unit_price * total_qty; // Total Price before Freight, Packaging, and Tax

      // Calculate Freight (percentage of totalWithoutFPT)
      const freightPrice = (totalWithoutFPT * parseFloat(item.freight_price || 0)) / 100;

      // Calculate Packaging (percentage of totalWithoutFPT)
      const packagePrice = (totalWithoutFPT * parseFloat(item.package_price || 0)) / 100;

      // Subtotal before Tax
      const subtotalBeforeTax = totalWithoutFPT + freightPrice + packagePrice;

      // Calculate Tax (percentage of subtotalBeforeTax)
      const tax = (subtotalBeforeTax * parseFloat(item.tax || 0)) / 100;

      // Final total price
      const totalPrice = subtotalBeforeTax + tax;

      // Return the rounded total price
      const total = Math.round(totalPrice) || 0;
      item.total_price = total ? Math.round(total) : 0;

      console.log(item, total)
      return item;
    });

    setquoteProducts(d);
  }

  const handleSendQuote = () => {
    let payload = {
      rfq_id: rfqDetails.id,
      rfq_no: rfqDetails.rfq_no,
      status: 1,
      products: [],
      globalPaymentTerms,
      globalComment,
      term_and_condition_files: globalDocumentFiles
    };

    if (alreadyQuoted) {
      let quote_id = rfqDetails.quotations[0].id;
      payload = { ...payload, products: quoteProducts };

      setsubmitLoading(true);
      updateQuotation(quote_id, payload)
        .then((res) => {
          setsubmitLoading(false);
          router.push(`/dashboard/vendor/inquiries-details?id=${id}${token !== undefined ? `&token=${token}` : ''}`);
        })
        .catch((error) => {
          setsubmitLoading(false)
        })
    }
    else {
      let isEmpty = false;
      let allFinalizedProducts = [];
      rfqDetails.finalizations.map((item) =>
        allFinalizedProducts.push(item.product_id)
      );
      let filteredquoteProducts = quoteProducts.filter((item) => {
        if (!allFinalizedProducts.includes(item.product_id)) {
          return item;
        }
      });

      // filteredquoteProducts.map((item) => {
      //   if (item.total_price <= 0) {
      //     isEmpty = true;
      //   }
      // });

      // if (isEmpty) {
      //   toast.error("One or more product's total amount is 0");
      //   return;
      // }

      payload = { ...payload, products: filteredquoteProducts };

      setsubmitLoading(true);
      sendQuotation(payload, token)
        .then((res) => {
          setsubmitLoading(false);
          router.push(`/dashboard/vendor/inquiries-details?id=${id}${token !== undefined ? `&token=${token}` : ''}`);
        })
        .catch((err) => {
          setsubmitLoading(false);
        });
    }
  };

  const isAvailableForQuote = (item) => {
    if (rfqDetails.finalizations && rfqDetails.finalizations.length > 0) {
      let itemFound = rfqDetails.finalizations.find((f_item) => f_item.product_id == item.product_id && f_item.variant == item.variant);
      return itemFound ? false : true;
    } else {
      return true;
    }
  };

  const handleRegretQuote = ({ reqret_reason }, resetForm) => {
    let isEmpty = false;
    let allFinalizedProducts = [];
    rfqDetails.finalizations.map((item) =>
      allFinalizedProducts.push(item.product_id)
    );
    let filteredquoteProducts = quoteProducts.filter((item) => {
      if (!allFinalizedProducts.includes(item.product_id)) {
        return item;
      }
    });

    let payload = {
      rfq_id: rfqDetails.id,
      rfq_no: rfqDetails.rfq_no,
      status: 1,
      products: filteredquoteProducts,
      is_regret: 1,
      regret_reason: reqret_reason,
      globalPaymentTerms,
      globalComment,
    };
    sendQuotation(payload, token)
      .then((res) => {
        setsubmitLoading(false);
        router.push(`/dashboard/vendor/inquiries-details?id=${id}${token !== undefined ? `&token=${token}` : ''}`);
      })
      .catch((err) => {
        setsubmitLoading(false);
      });
  };

  const uploadQuoteItemFiles = async (e, item) => {
    try {
      const filePath = await handleFileUpload(e);
      handleUpdateData(
        item.id,
        e,
        item.product_id,
        item.variant,
        "document_files",
        "array",
        getProductSpecValueByTitle(item?.product_specs, "Quantity"),
        // item?.product_specs[2]?.value,
        filePath
      )
    } catch (error) {
      console.log(error)
      let message = error.message?.response?.data?.errors?.file?.message;
      toast.error(message);
    }
  };

  const uploadGlobalDocumentFiles = async (e) => {
    try {
      const filePath = await handleFileUpload(e);

      setGlobalDocumentFiles((prevGlobalDocumentFiles) => [
        ...prevGlobalDocumentFiles,
        filePath
      ]);

    } catch (error) {
      let message = error.message;
      toast.error(message);
    }
  };

  const removeGlobalFiles = (file_url) => {
    const newFileLinks = globalDocumentFiles.filter((fileItem) => fileItem !== file_url);
    setGlobalDocumentFiles(newFileLinks);
  }

  useEffect(() => {
    let p = quoteProducts.map((item) => {
      item["freight_price"] = globalFreight;
      item["package_price"] = globalPackaging;
      item["tax"] = globalTax;
      return item;
    });
    setquoteProducts(p);
    calculateTotal();
  }, [globalTax, globalPackaging, globalFreight]);

  return (
    <>
      {submitLoading && <Loader />}
      <section className="quote-common-header sc-pt-80">
        <div className="container-fluid">
          <div className="row">
            <div className="col-md-6">
              <h3 className="heading">Send Quotation</h3>
            </div>
            <div className="col-md-6"></div>
          </div>
        </div>
      </section>

      {/* Table Placeholder */}
      {loading && (
        <section className="quote-send-sec-1">
          <div className="container-fluid">
            <div className="row">
              <div className="col-md-12">
                <div className="quote-sec-table">
                  <div className="quote-sec-table-top">
                    <h3 className="title">
                      <PlaceholderLoading
                        shape="rect"
                        width={600}
                        height={50}
                      />
                    </h3>

                    <p>
                      <PlaceholderLoading
                        shape="rect"
                        width={300}
                        height={20}
                      />
                    </p>
                    <p>
                      <PlaceholderLoading
                        shape="rect"
                        width={300}
                        height={20}
                      />
                    </p>
                    <p>
                      <PlaceholderLoading
                        shape="rect"
                        width={300}
                        height={20}
                      />
                    </p>
                    <p>
                      <PlaceholderLoading
                        shape="rect"
                        width={300}
                        height={20}
                      />
                    </p>
                  </div>

                  <div className="table-responsive">
                    <div className="table-container">
                      <table>
                        <thead>
                          <tr>
                            <th>Sl No.</th>
                            <th>Item</th>
                            <th>Qty</th>
                            {/* <th>Unit</th> */}
                            <th>Base Price</th>
                            <th>Freight</th>
                            <th>Package</th>
                            <th>Taxes</th>
                            <th>Total</th>
                            <th>Vendor Comments</th>
                            <th>Delivery Period</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>
                              <PlaceholderLoading
                                shape="rect"
                                width={50}
                                height={20}
                              />
                            </td>
                            <td>
                              <PlaceholderLoading
                                shape="rect"
                                width={100}
                                height={20}
                              />
                            </td>
                            <td>
                              <PlaceholderLoading
                                shape="rect"
                                width={300}
                                height={20}
                              />
                            </td>
                            <td>
                              <PlaceholderLoading
                                shape="rect"
                                width={50}
                                height={20}
                              />
                            </td>
                            {/* <td>
                            <PlaceholderLoading
                              shape="rect"
                              width={50}
                              height={20}
                            />
                          </td> */}
                            <td>
                              <PlaceholderLoading
                                shape="rect"
                                width={50}
                                height={20}
                              />
                            </td>

                            <td>
                              <PlaceholderLoading
                                shape="rect"
                                width={50}
                                height={20}
                              />
                            </td>

                            <td>
                              <PlaceholderLoading
                                shape="rect"
                                width={50}
                                height={20}
                              />
                            </td>

                            <td>
                              <PlaceholderLoading
                                shape="rect"
                                width={50}
                                height={20}
                              />
                            </td>

                            <td>
                              <PlaceholderLoading
                                shape="rect"
                                width={50}
                                height={20}
                              />
                            </td>
                            <td>
                              <div className="comment">
                                <div className="comment-group">
                                  <PlaceholderLoading
                                    shape="rect"
                                    width={200}
                                    height={20}
                                  />
                                </div>

                                <PlaceholderLoading
                                  shape="rect"
                                  width={150}
                                  height={40}
                                />
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="quote-sec-btm">
                    <div className="row">
                      <div className="col-md-6">
                        <PlaceholderLoading
                          shape="rect"
                          width={150}
                          height={40}
                        />
                      </div>
                      <div className="col-md-6">
                        <div className="float-end">
                          <PlaceholderLoading
                            shape="rect"
                            width={150}
                            height={40}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* // Actual Data area */}

      {!loading && rfqDetails && (
        <section className="quote-send-sec-1">
          <div className="container-fluid ">
            <div className="row">
              <div className="col-md-12">
                <div className="quote-sec-table">
                  <div className="quote-sec-table-top">
                    <h3 className="title">RFQ No. #{rfqDetails.rfq_no}</h3>
                    <div className="row">

                      {/* RFQ Details Section */}
                      <div className="col-md-4 col-xs-12">
                        {rfqDetails?.company_name && (
                          <p>
                            <b>Buyer</b> : {rfqDetails?.company_name}.
                          </p>
                        )}
                        {rfqDetails?.contact_name && (
                          <p>
                            <b>Contact Person</b> : {rfqDetails?.contact_name}
                          </p>
                        )}
                        {rfqDetails?.response_email && (
                          <p>
                            <b>Email</b> : {rfqDetails?.response_email}
                          </p>
                        )}
                        {rfqDetails?.contact_number && (
                          <p>
                            <b>Contact Number</b> :
                            {rfqDetails?.contact_number}
                          </p>
                        )}
                      </div>

                      {/* Global Inputs Section */}
                      <div className="col-md-4 col-xs-12 ">
                        <h3 className="fs-6 fw-semibold mb-2">
                          Global Costing (in Percentage)
                        </h3>
                        <div className="row mb-4">
                          <div className="inputBox form-group col-4">
                            <label>Freight %</label>
                            <input
                              type="number"
                              className="form-control"
                              min={0}
                              value={globalFreight}
                              onChange={(e) => setglobalFreight(e.target.value)}
                              onWheel={(e) => e.target.blur()}
                            />
                          </div>
                          <div className="inputBox form-group col-4">
                            <label>Packaging %</label>
                            <input
                              type="number"
                              className="form-control"
                              min={0}
                              value={globalPackaging}
                              onChange={(e) => setglobalPackaging(e.target.value)}
                              onWheel={(e) => e.target.blur()}
                            />
                          </div>
                          <div className="inputBox form-group col-4">
                            <label>TAX %</label>
                            <input
                              type="number"
                              className="form-control"
                              min={0}
                              value={globalTax}
                              onChange={(e) => setglobalTax(e.target.value)}
                              onWheel={(e) => e.target.blur()}
                            />
                          </div>
                        </div>

                        <div className="row">
                          <div className="col-md-12 col-lg-6 pe-2 mb-4">
                            <h3 className="fs-6 fw-semibold mb-2">Payment Terms</h3>
                            <div className="inputBox form-group">
                              <textarea
                                type="text"
                                className="form-control"
                                value={globalPaymentTerms}
                                placeholder="100% Against Proforma Invoice"
                                onChange={(e) =>
                                  setglobalPaymentTerms(e.target.value)
                                }
                              />
                            </div>
                          </div>
                          <div className="col-md-12 col-lg-6 pe-2 mb-4">
                            <h3 className="fs-6 fw-semibold mb-2">Global Comment</h3>
                            <div className="inputBox form-group">
                              <textarea
                                type="text"
                                className="form-control"
                                value={globalComment}
                                placeholder="Placeholder text for global comment"
                                onChange={(e) => setglobalComment(e.target.value)}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="col-lg-1"></div>

                      {/* Global File Upload Section */}
                      <div className="col-md-6 col-lg-3">
                        <h3 className="fs-6 fw-semibold mb-2">Quote Document</h3>

                        {previousGlobalFiles && previousGlobalFiles.length > 0 &&
                          <div className="border rounded-2 px-2 mb-2">
                            <p className="fw-medium text-sm text-center mb-1 ">Previously Uploaded Files</p>
                            <div className="row">
                              {previousGlobalFiles.map((prev_file) => {
                                return (
                                  <div key={prev_file} className="col-md-6">
                                    <a href={prev_file} target="_blank" className="page-link text-truncate mb-1" style={{ maxWidth: "200px" }}>
                                      <FontAwesomeIcon icon={faDownload} className="ms-0 me-2" />
                                      {extractfileName(prev_file)}
                                    </a>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        }

                        <label className="upload uploadInlineFile d-flex align-items-center justify-content-center mb-1">
                          <FontAwesomeIcon icon={faFile} className="me-2" /> Upload Quotation Document
                          <input
                            type="file"
                            accept=".pdf, .docx, .doc, .xlsx, .xls, .csv, .png, .jpg, .jpeg"
                            onChange={(e) => uploadGlobalDocumentFiles(e)}
                            multiple={true}
                          />
                        </label>


                        <div className="row">
                          {globalDocumentFiles && globalDocumentFiles.length > 0 && (
                            globalDocumentFiles.map((doc_file) => {
                              return (
                                <div key={doc_file} className="col-md-6 d-flex justify-content-center align-items-center gap-2 mb-1">
                                  <a href={doc_file} className="page-link text-truncate" target="_blank" style={{ maxWidth: "140px" }}>{extractfileName(doc_file)}</a>
                                  <span className="btn-close btn-close-sm"
                                    aria-label="Close"
                                    onClick={(e) => {
                                      e.preventDefault()
                                      removeGlobalFiles(doc_file)
                                    }}>
                                  </span>
                                </div>
                              )
                            })
                          )}
                        </div>

                      </div>

                    </div>
                  </div>
                  <div className="table-responsive">
                    <div className="table-container">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Sl No.</th>
                            <th>Item</th>
                            <th>Qty</th>
                            {/* <th>Unit</th> */}
                            <th>Base Price</th>
                            <th>
                              Freight <small>(In %)</small>
                            </th>
                            <th>
                              Package <small>(In %)</small>
                            </th>
                            <th>
                              Taxes <small>(In %)</small>
                            </th>
                            <th>Total</th>
                            {rfqDetails?.products[0]?.lowest_quotation ? <th>Current Lowest</th> : null}
                            <th>Product Specific Comments</th>
                            <th>
                              Delivery Period <small>(In Weeks)</small>
                            </th>
                            <th>Add Documents</th>
                            {alreadyQuoted ? <th>Previous Documents</th> : null}
                          </tr>
                        </thead>
                        <tbody>
                          {rfqDetails.products &&
                            rfqDetails.products.length > 0 &&
                            rfqDetails.products.map((item, index) => {

                              if (isAvailableForQuote(item)) {
                                return (
                                  <tr key={`q_${item.id}_${item.product_id}_${item.variant}}`}>
                                    <td>{index + 1}</td>
                                    <td>
                                      <p className="fw-semibold text-nowrap mb-1">{item?.product_details[0]?.name}</p>
                                      <p className="text-sm mb-1">{getProductSpecValueByTitle(item?.product_specs, "Size")}</p>
                                      {item?.product_specs[1]?.value?.length > 70
                                        ? <ReadMore content={`- ${getProductSpecValueByTitle(item?.product_specs, "Spec")}`} maxLength={70} textSmall={true} />
                                        : <p className="mb-1 text-sm">{`- ${getProductSpecValueByTitle(item?.product_specs, "Spec")}`}</p>
                                      }
                                    </td>
                                    <td>
                                      {`${getProductSpecValueByTitle(item?.product_specs, "Quantity")} - ${getProductSpecValueByTitle(item?.product_specs, "Unit")}`}
                                    </td>
                                    <td>
                                      <input
                                        type="number"
                                        name=""
                                        id=""
                                        placeholder="₹"
                                        value={quoteProducts[index].unit_price}
                                        min={0}
                                        onChange={(e) =>
                                          handleUpdateData(
                                            item.id,
                                            e,
                                            item.product_id,
                                            item.variant,
                                            "unit_price",
                                            "",
                                            getProductSpecValueByTitle(item?.product_specs, "Quantity")
                                          )
                                        }
                                        onWheel={(e) => e.target.blur()}
                                      />
                                    </td>

                                    <td>
                                      <input
                                        type="number"
                                        min={0}
                                        name=""
                                        id=""
                                        placeholder="%"
                                        value={quoteProducts[index].freight_price}
                                        onChange={(e) =>
                                          handleUpdateData(
                                            item.id,
                                            e,
                                            item.product_id,
                                            item.variant,
                                            "freight_price",
                                            "",
                                            getProductSpecValueByTitle(item?.product_specs, "Quantity")
                                          )
                                        }
                                        onWheel={(e) => e.target.blur()}
                                      />
                                    </td>

                                    <td>
                                      <input
                                        type="number"
                                        min={0}
                                        name=""
                                        id=""
                                        placeholder="%"
                                        value={quoteProducts[index].package_price}
                                        onChange={(e) =>
                                          handleUpdateData(
                                            item.id,
                                            e,
                                            item.product_id,
                                            item.variant,
                                            "package_price",
                                            "",
                                            getProductSpecValueByTitle(item?.product_specs, "Quantity")
                                          )
                                        }
                                        onWheel={(e) => e.target.blur()}
                                      />
                                    </td>

                                    <td>
                                      <input
                                        type="number"
                                        min={0}
                                        name=""
                                        id=""
                                        placeholder="%"
                                        value={quoteProducts[index].tax}
                                        onChange={(e) =>
                                          handleUpdateData(
                                            item.id,
                                            e,
                                            item.product_id,
                                            item.variant,
                                            "tax",
                                            "",
                                            getProductSpecValueByTitle(item?.product_specs, "Quantity")
                                          )
                                        }
                                        onWheel={(e) => e.target.blur()}
                                      />
                                    </td>

                                    <td>
                                      <input
                                        type="number"
                                        name=""
                                        id=""
                                        placeholder="₹"
                                        value={quoteProducts[index].total_price}
                                        disabled
                                      />
                                    </td>
                                    {
                                      rfqDetails?.products[index]?.lowest_quotation ?
                                        <td>
                                          <input
                                            type="number"
                                            name=""
                                            id=""
                                            placeholder="₹"
                                            value={rfqDetails?.products[index]?.lowest_quotation?.total_price}
                                            disabled
                                          />
                                        </td>
                                        : 
                                        <td>
                                          <input
                                            type="number"
                                            name=""
                                            id=""
                                            placeholder="--"
                                            disabled
                                          />
                                        </td>
                                    }
                                    <td>
                                      <div className="comment">
                                        <div className="comment-group">
                                          <textarea
                                            name="comment"
                                            id="comment"
                                            cols="30"
                                            rows="3"
                                            value={quoteProducts[index].comment}
                                            onChange={(e) =>
                                              handleUpdateData(
                                                item.id,
                                                e,
                                                item.product_id,
                                                item.variant,
                                                "comment",
                                                "string",
                                                getProductSpecValueByTitle(item?.product_specs, "Quantity")
                                              )
                                            }
                                          ></textarea>
                                          <span htmlFor="comment">0/300</span>
                                        </div>

                                        {/* <button className="btn btn-secondary">
                                        No Quote
                                      </button> */}
                                      </div>
                                    </td>
                                    <td style={{ width: 250 }}>
                                      <input
                                        style={{ width: 150 }}
                                        name="delivery_period"
                                        id="delivery_period"
                                        type="number"
                                        placeholder="E.g. 7"
                                        value={quoteProducts[index].delivery_period}
                                        onChange={(e) =>
                                          handleUpdateData(
                                            item.id,
                                            e,
                                            item.product_id,
                                            item.variant,
                                            "delivery_period",
                                            "string",
                                            getProductSpecValueByTitle(item?.product_specs, "Quantity")
                                          )
                                        }
                                        onWheel={(e) => e.target.blur()}
                                      />
                                    </td>
                                    <td style={{ maxWidth: 250 }}>
                                      <label className="upload uploadInlineFile d-flex align-items-center justify-content-center">
                                        <FontAwesomeIcon icon={faFile} className="me-2" /> Upload
                                        <input
                                          type="file"
                                          accept=".pdf, .docx, .doc, .xlsx, .xls, .csv, .png, .jpg, .jpeg"
                                          onChange={(e) => uploadQuoteItemFiles(e, item)}
                                          multiple={true}
                                        />
                                      </label>

                                      {quoteProducts[index].document_files && quoteProducts[index].document_files.length > 0 && (
                                        quoteProducts[index].document_files.map((doc_file) => {
                                          return (

                                            <div key={doc_file} className="d-flex justify-content-between align-items-center">
                                              <a href={doc_file} className="page-link text-truncate" target="_blank" style={{ maxWidth: "140px" }}>{extractfileName(doc_file)}</a>
                                              <span
                                                className="btn-close btn-close-sm"
                                                aria-label="Close"
                                                onClick={(e) => handleUpdateData(
                                                  item.id,
                                                  e,
                                                  item.product_id,
                                                  item.variant,
                                                  "document_files",
                                                  "array",
                                                  getProductSpecValueByTitle(item?.product_specs, "Quantity"),
                                                  doc_file,
                                                  "remove"
                                                )}></span>
                                            </div>
                                          )
                                        })
                                      )}

                                    </td>
                                    {alreadyQuoted &&
                                      <td>
                                        {quoteProducts[index].previous_document_files && quoteProducts[index].previous_document_files.length > 0 && (
                                          renderFileLink(quoteProducts[index].previous_document_files)
                                        )}
                                      </td>
                                    }
                                  </tr>
                                );
                              }
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="quote-sec-btm">
                    <div className="row">
                      <div className="col-md-6">
                        {pageType != "update-quote" &&

                          <button
                            type="submit"
                            className="btn btn-primary"
                            onClick={() => setregretModal(true)}
                          >
                            Regret Quote
                          </button>
                        }
                      </div>
                      <div className="col-md-6">
                        <button
                          type="submit"
                          className="btn btn-secondary float-end"
                          onClick={handleSendQuote}
                        >
                          Send Quote
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
      <RegretQuoteReasonModal
        handleRegretReason={handleRegretQuote}
        showModal={regretModal}
        closeModal={() => {
          setregretModal(false);
        }}
      />
    </>
  );
};

export default SendQuotePageComp;
