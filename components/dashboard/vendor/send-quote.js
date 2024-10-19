import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { getRFQById, sendQuotation, updateQuotation } from "@/services/rfq";
import PlaceholderLoading from "react-placeholder-loading";
import Loader from "@/components/shared/Loader";
import { toast } from "react-toastify";
import RegretQuoteReasonModal from "@/components/modal/RegretQuoteReasonModal";
import ReadMore from "@/components/shared/ReadMore";


const SendQuotePageComp = () => {
  const router = useRouter();
  const { id, token } = router.query;
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
  const [alreadyQuoted, setalreadyQuoted] = useState(null);

  useEffect(() => {
    if (id) {
      getRFQdetails();
    }
  }, [router]);

  const getRFQdetails = () => {
    setloading(true);
    getRFQById(id, token)
      .then((res) => {
        setloading(false);

        if (res.data.quote_details) {
          setglobalComment(res.data.quote_details.global_comment || ""); // Set globalComment from API or fallback to empty string
          setglobalPaymentTerms(res.data.quote_details.global_payment_term || ""); // Set globalPaymentTerms from API or fallback to empty string
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
              quantity: productItem?.product_specs[2]?.value || "",
              product_name: productItem.product_details
                ? productItem.product_details[0].name
                : "",
              unit_price: quoteItem.unit_price || "",
              package_price: quoteItem.package_price || globalPackaging,
              tax: quoteItem.tax || globalTax,
              freight_price: quoteItem.freight_price || globalFreight,
              total_price: quoteItem.total_price || 0,
              comment: quoteItem.comment || "",
              delivery_period: quoteItem.delivery_period || ""
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
    total_qty
  ) => {
    let value = e.target.value;
    let d = quoteProducts.map((item) => {
      if (item.id == item_id && item.product_id == product_id && item.variant == variant) {
        if (valueType == "integer") {
          item[type] = parseFloat(value);
        } else {
          item[type] = value;
        }

        let total_without_fpt = item.unit_price * parseInt(total_qty);
        let FP = (total_without_fpt * parseFloat(item.freight_price)) / 100;
        let PP = (total_without_fpt * parseFloat(item.package_price)) / 100;

        let total_with_fpt = total_without_fpt + (FP > 0 ? FP : 0) + PP;
        let T = (total_without_fpt * parseFloat(item.tax)) / 100;

        let getTotalPrice = +total_with_fpt + +T;
        item.total_price = getTotalPrice ? Math.round(getTotalPrice) : 0;
      }
      return item;
    });
    setquoteProducts(d);
  };

  const calculateTotal = () => {
    let d = quoteProducts.map((item) => {
      let p = rfqDetails.products.filter(
        (pi) => pi.product_id == item.product_id
      );

      let total_qty = p[0].product_specs[2]?.value;

      let total_without_fpt = item.unit_price * parseInt(total_qty);
      let FP = (total_without_fpt * parseFloat(item.freight_price)) / 100;
      let PP = (total_without_fpt * parseFloat(item.package_price)) / 100;

      let total_with_fpt = total_without_fpt + FP + PP;
      let T = (total_without_fpt * parseFloat(item.tax)) / 100;

      let getTotalPrice = +total_with_fpt + +T;
      item.total_price = getTotalPrice ? Math.round(getTotalPrice) : 0;
      return item;
    });
    setquoteProducts(d);
  };

  const handleSendQuote = () => {
    let payload = {
      rfq_id: rfqDetails.id,
      rfq_no: rfqDetails.rfq_no,
      status: 1,
      products: [],
      globalPaymentTerms,
      globalComment
    };

    if (alreadyQuoted) {
      let quote_id = rfqDetails.quotations[0].id;
      payload = {...payload, products: quoteProducts};

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

      filteredquoteProducts.map((item) => {
        if (item.total_price <= 0) {
          isEmpty = true;
        }
      });
      if (isEmpty) {
        toast.error("One or more product's total amount is 0");
        return;
      }

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
      {loading && (
        <section className="quote-send-sec-1">
          <div className="container-fluid">
            {/* <Link
              href={`/dashboard/vendor/inquiries-details?id=${id}`}
              className="page-link backBtn"
              onClick={(e) => {
                e.preventDefault();
                router.back()
              }}
            >
              {" "}
              <FontAwesomeIcon icon={faArrowLeft} /> Go back
            </Link> */}
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
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Sl No.</th>
                          <th>Item</th>
                          <th>Qty</th>
                          {/* <th>Unit</th> */}
                          <th>Unit Rate</th>
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
          <div className="container-fluid">
            {/* <Link
              href={`/dashboard/vendor/inquiries-details?id=${id}`}
              className="page-link backBtn"
            >
              {" "}
              <FontAwesomeIcon icon={faArrowLeft} /> Go back
            </Link> */}
            <div className="row">
              <div className="col-md-12">
                <div className="quote-sec-table">
                  <div className="quote-sec-table-top">
                    <div className="row">
                      <div className="col-md-6 col-xs-12">
                        <h3 className="title">RFQ No. #{rfqDetails.rfq_no}</h3>

                        {/* <span className="btn btn-primary download-btn">
                            Download as Excel/PDF
                          </span> */}
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
                      <div className="col-md-4 col-xs-12">
                        <h3 className="title mb-0">
                          Global Costing (in Percentage)
                        </h3>
                        <div className="row">
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
                          <div className="inputBox form-group col-lg-6 col-md-12 col-sm-12 col-xs-12 mb-4">
                            <h3 className="title mb-0 mt-4">Payment Terms</h3>
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
                          <div className="inputBox form-group col-lg-6 col-md-12 col-sm-12 col-xs-12  mb-4">
                            <h3 className="title mb-0 mt-4">Global Comment</h3>
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
                  </div>
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Sl No.</th>
                          <th>Item</th>
                          <th>Qty</th>
                          {/* <th>Unit</th> */}
                          <th>Unit Rate</th>
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
                        </tr>
                      </thead>
                      <tbody>
                        {rfqDetails.products &&
                          rfqDetails.products.length > 0 &&
                          rfqDetails.products.map((item, index) => {

                            if (isAvailableForQuote(item)) {
                              return (
                                <tr key={`q_${item.id}_${item.product_id}_${item.variant}`}>
                                  <td>{index + 1}</td>
                                  <td className="w-350">
                                    <p className="mb-1"><strong>{item?.product_details[0]?.name}</strong> - {item?.product_specs[0]?.value}</p>
                                    {item?.product_specs[1]?.value?.length > 70
                                      ? <ReadMore content={item?.product_specs[1]?.value} maxLength={70} textSmall={true} />
                                      : <p className="mb-1 text-sm">{item?.product_specs[1]?.value}</p>
                                    }
                                  </td>
                                  <td>
                                    {item?.product_specs[2]?.value}
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
                                          item?.product_specs[2]?.value
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
                                          item?.product_specs[2]?.value
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
                                          item?.product_specs[2]?.value
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
                                          item?.product_specs[2]?.value
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
                                  : null
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
                                              item?.product_specs[2]?.value
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
                                          item?.product_specs[2]?.value
                                        )
                                      }
                                      onWheel={(e) => e.target.blur()}
                                    />
                                  </td>
                                </tr>
                              );
                            }
                          })}
                      </tbody>
                    </table>
                  </div>

                  <div className="quote-sec-btm">
                    <div className="row">
                      <div className="col-md-6">
                        <button
                          type="submit"
                          className="btn btn-primary"
                          onClick={() => setregretModal(true)}
                        >
                          Regret Quote
                        </button>
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
