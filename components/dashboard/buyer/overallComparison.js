import Select from "react-select";
import FullLoader from "@/components/shared/FullLoader";
import LPRModal from "@/components/shared/LPRModal";
import ReadMore from "@/components/shared/ReadMore";
import { downloadQuotesDetails } from "@/services/rfq";
import { renderFileLink } from "@/utils/elementFunctions";
import { extractfileName } from "@/utils/sharedFunctions";
import { faDownload } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useEffect, useState } from "react";
import { Button } from "react-bootstrap";
import "react-tooltip/dist/react-tooltip.css";


const OverallComparison = ({ rfq_id, TA_Filter , RFQ_no }) => {
  const [loading, setloading] = useState(false);
  const [allvendors, setallvendors] = useState(null);
  const [data, setdata] = useState([]);
  const [l1total, setl1total] = useState(0);
  const [totalRfqProducts, settotalRfqProducts] = useState(0);
  const [attachedFiles, setAttachedFiles] = useState(null);
  const [breakupStates, setBreakupStates] = useState({});
  const [freightInfo, setFreightInfo] = useState("all");
  const [showLPRModal, setShowLPRModal] = useState(false);

  useEffect(() => {
    handleDownloadQuote();
  }, [rfq_id, TA_Filter]);

  const toggleBreakup = (id) => {
  setBreakupStates(prev => ({
    ...prev,
    [id]: !prev[id]
  }));
};
  const handleDownloadQuote = () => {
    setloading(true);
    downloadQuotesDetails(rfq_id, TA_Filter)
      .then((res) => {
        setdata(res.data);

        let data = res.data;
        setallvendors(data[0]?.all_vendors?.length > 0 ? data[0]?.all_vendors : null);
        let globalFiles = FilterOutGlobalTermsFiles(res.data);
        setAttachedFiles(globalFiles);
        getLowestBidAmount(res.data);
        setloading(false);
      })
      .catch((err) => {
        setloading(false);
      });
  };

  const FilterOutGlobalTermsFiles = (all_data) => {
    let fileArr = Array.from({ length: all_data[0]?.all_vendors.length || 0 }, () => []);

    all_data.forEach((prodItem) => {
      if (
        prodItem.quotations &&
        prodItem.quotations.length > 0
      ) {
        prodItem.quotations.forEach((quoteItem, index) => {
          if (fileArr[index].length == 0)
            fileArr[index] = quoteItem.quote_details[0]?.document_files ? quoteItem.quote_details[0]?.document_files : [];
        })
      }
    });
    return fileArr;
  }

  const getQty = (item, index) => {
    let qq = item.quotations.filter((qi) => qi.id != null);
    if (qq.length > 0) {
      return qq[0]?.quote_details[0]?.quantity;
    } else {
      return "-";
    }
  };

  const getLowestBidAmount = (all_data) => {
    let l1totaltemp = 0;
    let totalRFQItems = 0;

    let edited_data = all_data.map((item) => {
      totalRFQItems = totalRFQItems + parseInt(item.product_specs.find((specItem) => specItem.title == 'Quantity')?.value);

      const array = (
        freightInfo == "all"
          ? item.quotations
          : freightInfo == "with"
          ? item.quotations.filter(
              (quoteItem) => !!quoteItem.quote_details[0]?.freight_price
            )
          : item.quotations.filter(
              (quoteItem) => (!quoteItem.quote_details[0]?.freight_price || quoteItem.quote_details[0]?.freight_price == 0) 
            )
      ).filter((Q_item) => Q_item.id != null && Q_item.is_regret != 1);

      let lowest = null;

      if (array.length === 1) {
        // Handle single-element case
        if (array[0].quote_details[0].total_price > 0) {
          lowest = array[0];
        }
      } else {
        // Reduce logic for multiple elements
        lowest = array.reduce((lowest, currentItem) => {
          const curItemQuoteDetails = currentItem.quote_details[0];
          const curItemVendorDetails = currentItem.vendor_details[0];

          const lowestQuoteDetails = lowest.quote_details[0];
          const lowestVendorDetails = lowest.vendor_details[0];

          if (curItemQuoteDetails.total_price > 0) {
            let curLowest = lowest;
            if (
              curItemQuoteDetails.total_price <
              lowestQuoteDetails.total_price
            )
              curLowest = currentItem;
            else if (
              curItemQuoteDetails.total_price ==
              lowestQuoteDetails.total_price
            ) {
              const curPrevWorked = curItemVendorDetails.prev_worked == 1
              const lowestPrevWorked = lowestVendorDetails.prev_worked == 1

              if(curPrevWorked && !lowestPrevWorked) curLowest = currentItem;
              else if (!curPrevWorked && lowestPrevWorked) curLowest = lowest;
              else {
                const curTimestamp = new Date(currentItem.timestamp.slice(0, 23));
                const lowestTimestamp = new Date(lowest.timestamp.slice(0, 23));

                if(curTimestamp < lowestTimestamp) curLowest = currentItem;
                else curLowest = lowest;
              }
            }

            return curLowest;
          }
          return lowest;
        }, array[0]);
      }

      if (lowest) {
        l1totaltemp = l1totaltemp + lowest.quote_details[0].total_price;
        item.quotations.map((q) => {
          if (q.id == lowest.id) {
            q.is_lowest = true;
          } else {
            q.is_lowest = false;
          }
        });
      }

      return item;
    });

    settotalRfqProducts(totalRFQItems);
    setdata(edited_data);
    setl1total(l1totaltemp);
  };

  let calculateVendorwiseTotalBid = () => {
    if (!allvendors) return;

    let updated_vendors = allvendors.map((vendor) => {
      let priceInfo = {
        total: 0,
        packaging: 0,
        tax: 0,
        freight: 0,
        totalWithFreight: 0,
        totalWithoutFreight: 0,
      };
      data.map((item) => {
        let q_item = item.quotations.filter(
          (q) => q.created_by == vendor.id && q.id != null && q.is_regret != 1
        );

        if (q_item.length > 0) {
          const quoteDetails = q_item[0]?.quote_details[0]
          priceInfo.total = priceInfo.total + parseInt(quoteDetails?.total_price);
          priceInfo.packaging = priceInfo.packaging + parseInt(quoteDetails?.package_price);
          priceInfo.tax = priceInfo.tax + parseInt(quoteDetails?.tax);
          priceInfo.freight = priceInfo.freight + parseInt(quoteDetails?.freight_price);

          priceInfo.totalWithFreight = priceInfo.totalWithFreight + parseInt(quoteDetails?.freight_price ? quoteDetails?.total_price : 0)
          priceInfo.totalWithoutFreight = priceInfo.totalWithoutFreight + parseInt(!quoteDetails?.freight_price ? quoteDetails?.total_price : 0);
        }
      });

      Object.assign(vendor, priceInfo);
      return vendor;
    });

    setallvendors(updated_vendors);
  };

  useEffect(() => {
    if (data.length > 0) {
      calculateVendorwiseTotalBid();
      getDeliveryDetails();
    }
  }, [data]);

  useEffect(() => {
    getLowestBidAmount(data);
  }, [freightInfo])

  const addCommasToNumber = (number) => {

    if (number <= 0 || !number) {
      return 0
    }

    // Convert number to string
    let numberString = number.toString();

    // Split the number string into parts
    let parts = numberString.split(".");

    // Add commas to the integer part
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    //parts[0] = parts[0].replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",");

    // Join the parts back together with decimal point if applicable
    return parts.join(".");
  };

  const getDeliveryDetails = () => {
    if (!allvendors) return;

    let ev = allvendors.map((vendor) => {
      let vq = [];
      data.map((product) => {
        let q = product.quotations.filter(
          (quotation) =>
            quotation.created_by == vendor.id &&
            quotation.id != null &&
            quotation.is_regret != 1
        );
        if (q.length > 0) {
          vq.push(parseInt(q[0]?.quote_details[0]?.delivery_period));
        }
      });
      vendor.quoted_products = vq;
      return vendor;
    });
    setallvendors(ev);
  };

  const getDeliveryRange = (items) => {
    const validItems = items.filter(num => typeof num === "number" && !isNaN(num) && num > 0);

    if (validItems.length > 0) {
      // Find the smallest delivery week
      let smallest = Math.min(...validItems);

      // Find the largest delivery week
      let largest = Math.max(...validItems);

      if (smallest === largest) {
        return smallest === 1 ? `Within 1 week` : `Within ${smallest} weeks`;
      }

      let smallestStr = smallest === 1 ? "1 week" : `${smallest} weeks`;
      let largestStr = largest === 1 ? "1 week" : `${largest} weeks`;

      return `Within ${smallestStr} - ${largestStr}`;
    } else {
      return "-";
    }
  };

  const calculateTotal = (item, quantity) => {
    let total_qty = parseInt(quantity) || 0;
    let unit_price = item.unit_price || 0;
    
    // Handle null values by defaulting to 0
    let freight_price = item.freight_price !== null ? parseFloat(item.freight_price) : 0;
    let package_price = item.package_price !== null ? parseFloat(item.package_price) : 0;
    let tax = item.tax !== null ? parseFloat(item.tax) : 0;

    let total_without_fpt = unit_price * total_qty;
    let FP = (total_without_fpt * freight_price) / 100;
    let PP = (total_without_fpt * package_price) / 100;

    let total_with_fpt = total_without_fpt + FP + PP;
    let T = (total_without_fpt * tax) / 100;

    let TotalPrice = total_with_fpt + T;
    return Math.round(TotalPrice);
  }

  console.log("checking rfq number in over all", RFQ_no);

  return (
    <>
      {loading ? (
        <FullLoader />
      ) : (
        <div className="quote-sec-table-sub hasFullLoader">
          {allvendors && allvendors.length > 0 ? (
            <div className="table-responsive">
              <table className="table table-bordered overall-table">
                <colgroup>
                  <col style={{ width: "75px" }} />
                  <col style={{ width: "250px" }} />
                  <col style={{ width: "250px" }} />
                  <col style={{ width: "120px" }} />
                  <col style={{ width: "250px" }} />
                  {allvendors.length > 0 &&
                    allvendors.map((_, index) => {
                      return (
                        <col
                          key={`col_item_${index}`}
                          style={{ width: "250px" }}
                        />
                      );
                    })}
                </colgroup>
                <thead class="thead-dark">
                  <tr>
                    <th
                      scope="col"
                      className="sl_no heading"
                      colSpan={allvendors.length + 5}
                    >
                      OVERALL COMPARISON CHART
                      <br />
                      <small>(Incl. Packaging , Freight &amp; GST)</small>
                      <div className="d-flex">
                        <div className="ms-auto d-flex flex-column gap-2">
                          <Select
                            className="fw-normal fs-6 text-left"
                            defaultValue={{ label: "All Quotes", value: "all" }}
                            options={[
                              { label: "All Quotes", value: "all" },
                              { label: "Quotes with Freight", value: "with" },
                              {
                                label: "Quotes without Freight",
                                value: "without",
                              },
                            ]}
                            onChange={(change) => setFreightInfo(change.value)}
                          />
                        </div>
                      </div>
                    </th>
                  </tr>
                  <tr style={{ backgroundColor: "#2d5ba7", color: "white" }}>
                    <th
                      scope="col"
                      className="sl_no"
                      rowSpan={2}
                      style={{ backgroundColor: "#2d5ba7", color: "white" }}
                    >
                      Sl. No
                    </th>
                    <th
                      scope="col"
                      className="description"
                      rowSpan={2}
                      style={{ backgroundColor: "#2d5ba7", color: "white" }}
                    >
                      Product Name
                    </th>
                    <th
                      scope="col"
                      className="description"
                      rowSpan={2}
                      style={{ backgroundColor: "#2d5ba7", color: "white" }}
                    >
                      Product Variant Details
                    </th>
                    <th
                      scope="col"
                      className="sl_no"
                      rowSpan={2}
                      style={{ backgroundColor: "#2d5ba7", color: "white" }}
                    >
                      Quantity
                    </th>
                    <th scope="col" className="all_vendors" rowSpan={2}>
                      Last Purchase Details
                    </th>
                    {allvendors &&
                      allvendors.length > 0 &&
                      allvendors.map((item) => {
                        return (
                          <th
                            key={`v_${item.id}`}
                            scope="col"
                            className="all_vendors"
                            rowSpan={2}
                          >
                            {item.organization_name || item.name}
                          </th>
                        );
                      })}
                  </tr>
                </thead>
                <tbody className="last_row">
                  {data &&
                    data.length > 0 &&
                    data.map((item, index) => {
                      const size = item.product_specs.find(
                        (spec) => spec.title === "Size"
                      );
                      const spec = item.product_specs.find(
                        (spec) => spec.title === "Spec"
                      );

                      const quantity = item.product_specs.find(
                        (spec) => spec.title === "Quantity"
                      );
                      const unit = item.product_specs.find(
                        (spec) => spec.title === "Unit"
                      );

                      return (
                        <tr key={item.id}>
                          <td>{index + 1} </td>
                          <td>
                            {item.product_details.length > 0
                              ? item.product_details[0]?.name
                              : "-"}
                          </td>
                          <td>
                            <div className="row">
                              {
                                <p className="col-12 mb-1">
                                  <strong>Size: </strong>
                                  {size?.value ?? "--"}
                                </p>
                              }
                              {
                                <p
                                  className="col-12 mb-1 truncate-text"
                                  style={{
                                    maxHeight: "100px",
                                    WebkitLineClamp: 3,
                                  }}
                                >
                                  <strong>Spec: </strong>
                                  {spec?.value ?? "--"}
                                </p>
                              }
                            </div>
                          </td>
                          <td>{`${quantity?.value ?? "NA"}-${
                            unit?.value ?? "NA"
                          }`}</td>

                          {item.last_purchase_rate ? (
                            <td className="total_amt_field">
                              <label className="view_breakup">
                                <div className="tooltip_custom">
                                  Show/hide Breakup
                                </div>
                                <span></span>
                                <input type="checkbox" />
                                <table className="table has_inner_border_table">
                                  <tr>
                                    <th>Base Price</th>
                                    <td>
                                      {item.last_purchase_rate?.unit_price
                                        ? addCommasToNumber(
                                            item.last_purchase_rate?.unit_price
                                          )
                                        : "0"}
                                    </td>
                                  </tr>
                                  <tr>
                                    <th>Total Rate</th>
                                    <td>
                                      {item.last_purchase_rate?.unit_price
                                        ? addCommasToNumber(
                                            item.last_purchase_rate.unit_price *
                                              parseInt(quantity.value)
                                          )
                                        : "0"}
                                    </td>
                                  </tr>
                                  <tr>
                                    <th>Packaging(%)</th>
                                    <td>
                                      {item.last_purchase_rate
                                        ?.package_price !== null
                                        ? `${addCommasToNumber(
                                            item.last_purchase_rate
                                              ?.package_price
                                          )}%`
                                        : "0%"}
                                    </td>
                                  </tr>
                                  <tr>
                                    <th>Freight(%)</th>
                                    <td>
                                      {item.last_purchase_rate
                                        ?.freight_price !== null
                                        ? `${addCommasToNumber(
                                            item.last_purchase_rate
                                              ?.freight_price
                                          )}%`
                                        : "0%"}
                                    </td>
                                  </tr>
                                  <tr>
                                    <th>GST(%)</th>
                                    <td>
                                      {item.last_purchase_rate?.tax !== null
                                        ? `${addCommasToNumber(
                                            item.last_purchase_rate?.tax
                                          )}%`
                                        : "0%"}
                                    </td>
                                  </tr>
                                  <tr className="is_lowest ">
                                    <th>Sub Total</th>
                                    <td>
                                      {item.last_purchase_rate
                                        ? addCommasToNumber(
                                            calculateTotal(
                                              item.last_purchase_rate,
                                              quantity.value
                                            )
                                          )
                                        : "0"}
                                    </td>
                                  </tr>
                                  
                                  <Button
                                        variant="link"
                                        size="sm"
                                        onClick={() => {
                                          // or item.userId
                                          setShowLPRModal(true);
                                        }}
                                      >
                                        View LPR
                                  </Button>
                                </table>
                                <LPRModal
                                  show={showLPRModal}
                                  onHide={() => setShowLPRModal(false)}
                                  variantId={item.product_variant_id}
                                  RFQ_no={-1}
                                />

                                <p>
                                  {item.last_purchase_rate?.unit_price
                                    ? addCommasToNumber(
                                        calculateTotal(
                                          item.last_purchase_rate,
                                          quantity.value
                                        )
                                      )
                                    : "0"}
                                </p>
                              </label>
                            </td>
                          ) : (
                            <td>
                              <label className="view_breakup">
                                <span></span>
                                <input type="checkbox" />
                                <Button
                                        variant="link"
                                        size="sm"
                                        onClick={() => {
                                          // or item.userId
                                          setShowLPRModal(true);
                                        }}
                                      >
                                        View LPR
                                  </Button>
                              </label>
                              <LPRModal
                                  show={showLPRModal}
                                  onHide={() => setShowLPRModal(false)}
                                  variantId={item.product_variant_id}
                                  RFQ_no={RFQ_no}
                                  
                                />
                            </td>
                            
                          )}

                          {item.quotations.length > 0 &&
                            item.quotations.map((quote_item) => {
                              const isSomeoneFinalized =
                                item?.all_vendors?.find(
                                  (vendor) => vendor.is_finalized
                                );

                              let finalizedClass = "";
                              let showQuote = true;

                              if(freightInfo == 'with' && !quote_item?.quote_details[0]?.freight_price) showQuote = false;
                              if(freightInfo == 'without' && quote_item?.quote_details[0]?.freight_price) showQuote = false;

                              if (
                                isSomeoneFinalized &&
                                isSomeoneFinalized?.id == quote_item?.created_by
                              ) {
                                finalizedClass = "is_lowest_not_finalised";
                              } else if (
                                isSomeoneFinalized &&
                                isSomeoneFinalized?.id !=
                                  quote_item?.created_by &&
                                quote_item?.is_lowest
                              ) {
                                finalizedClass = "is_lowest";
                              } else if (
                                !isSomeoneFinalized &&
                                quote_item?.is_lowest
                              ) {
                                finalizedClass = "is_lowest";
                              }

                              if (quote_item.is_regret == 1) {
                                const quoteDetails = quote_item.quote_details?.[0]
                                const [productId, variant] = [quoteDetails.product_id, quoteDetails.variant]

                                const key = `${productId}_${variant}`

                                const showBreakup = breakupStates[key] || false;
                                return (
                                  <td
                                    className={`total_amt_field text-center align-middle ${
                                      showBreakup
                                        ? "bg-white"
                                        : "is_regret text-white"
                                    }`}
                                    key={`quote_item_${key}`}
                                  >
                                    {!showBreakup && (
                                      <p className="m-0">REGRET</p>
                                    )}

                                    <label className="view_breakup d-block mt-2">
                                      <div className="tooltip_custom">
                                        Show/hide Breakup
                                      </div>
                                      <span></span>
                                      <input
                                        type="checkbox"
                                        checked={showBreakup}
                                        onChange={() => toggleBreakup(key)}
                                        style={{
                                          backgroundColor: showBreakup
                                            ? "white"
                                            : undefined,
                                        }}
                                      />
                                    </label>

                                    {showBreakup && (
                                      <div className="mt-2">
                                        <ReadMore
                                          content={
                                            quote_item?.regret_reason ??
                                            "Not Reason Provided"
                                          }
                                        />
                                      </div>
                                    )}
                                  </td>
                                );
                              } else {
                                return (
                                  <td
                                    className={`${showQuote && finalizedClass} total_amt_field`}
                                    key={`quote_item_${quote_item?.created_by}`}
                                  >
                                    {showQuote && quote_item?.quote_details?.length > 0 &&
                                    quote_item?.quote_details[0]
                                      ?.total_price ? (
                                      <label className="view_breakup">
                                        <div className="tooltip_custom">
                                          Show/hide Breakup
                                        </div>
                                        <span></span>
                                        <input type="checkbox" />
                                        <table className="table has_inner_border_table">
                                          <tr>
                                            <th>Base Price</th>
                                            <td>
                                              {quote_item?.quote_details
                                                ?.length > 0
                                                ? addCommasToNumber(
                                                    quote_item?.quote_details[0]
                                                      ?.unit_price
                                                  )
                                                : "-"}
                                            </td>
                                          </tr>
                                          <tr>
                                            <th>Total Rate</th>
                                            <td>
                                              {quote_item?.quote_details
                                                ?.length > 0
                                                ? addCommasToNumber(
                                                    quote_item?.quote_details[0]
                                                      ?.unit_price *
                                                      getQty(item)
                                                  )
                                                : "-"}
                                            </td>
                                          </tr>
                                          <tr>
                                            <th>Packaging(%)</th>
                                            <td>
                                              {quote_item?.quote_details
                                                ?.length > 0
                                                ? addCommasToNumber(
                                                    quote_item?.quote_details[0]
                                                      ?.package_price
                                                  ) + "%"
                                                : "-"}
                                            </td>
                                          </tr>
                                          <tr>
                                            <th>Freight(%)</th>
                                            <td>
                                              {quote_item?.quote_details
                                                ?.length > 0
                                                ? addCommasToNumber(
                                                    quote_item?.quote_details[0]
                                                      ?.freight_price
                                                  ) + "%"
                                                : "-"}
                                            </td>
                                          </tr>
                                          <tr>
                                            <th>GST(%)</th>
                                            <td>
                                              {quote_item?.quote_details
                                                ?.length > 0
                                                ? addCommasToNumber(
                                                    quote_item?.quote_details[0]
                                                      ?.tax
                                                  ) + "%"
                                                : "-"}
                                            </td>
                                          </tr>
                                          <tr>
                                            <th>Delivery</th>
                                            <td>
                                              {
                                                quote_item?.quote_details[0]
                                                  ?.delivery_period
                                              }{" "}
                                              (in weeks)
                                            </td>
                                          </tr>
                                          <tr>
                                            <th>Comments</th>
                                            <td>
                                              {quote_item?.quote_details?.[0]
                                                ?.comment || "--"}
                                            </td>
                                          </tr>
                                          <tr>
                                            <th>Files</th>
                                            <td>
                                              {renderFileLink(
                                                quote_item?.quote_details?.[0]
                                                  ?.document_files?.[0]
                                                  ?.file_url,
                                                "View File"
                                              )}
                                            </td>
                                          </tr>
                                          <tr
                                            className={`${
                                              quote_item?.quote_details[0]
                                                ?.total_price
                                                ? "is_lowest"
                                                : ""
                                            }`}
                                          >
                                            <th>Sub Total</th>
                                            <td>
                                              {quote_item?.quote_details
                                                .length > 0 &&
                                              quote_item.quote_details[0]
                                                ?.total_price
                                                ? addCommasToNumber(
                                                    quote_item.quote_details[0]
                                                      ?.total_price
                                                  )
                                                : "-"}
                                            </td>
                                          </tr>
                                        </table>
                                        <p>
                                          {quote_item?.quote_details?.length >
                                            0 &&
                                          quote_item.quote_details[0]
                                            ?.total_price
                                            ? addCommasToNumber(
                                                quote_item?.quote_details[0]
                                                  ?.total_price
                                              )
                                            : "-"}
                                        </p>
                                      </label>
                                    ) : (
                                      "-"
                                    )}
                                  </td>
                                );
                              }
                            })}
                        </tr>
                      );
                    })}
                </tbody>
                <tfoot>
                  <tr>
                    <th scope="col">&nbsp;</th>
                    <th scope="col">&nbsp;</th>
                    <th scope="col">&nbsp;</th>
                    <th scope="col">&nbsp;</th>
                    <th scope="col">&nbsp;</th>
                    {allvendors.length > 0 && (
                      <th scope="col" colSpan={allvendors.length}>
                        &nbsp;
                      </th>
                    )}
                  </tr>
                  <tr>
                    <th scope="col">&nbsp;</th>
                    <th scope="col">&nbsp;</th>
                    <th scope="col">&nbsp;</th>
                    <th scope="col">&nbsp;</th>
                    <th scope="col">&nbsp;</th>
                    {allvendors.length > 0 && (
                      <th scope="col" colSpan={allvendors.length}>
                        &nbsp;
                      </th>
                    )}
                  </tr>
                  <tr>
                    <th scope="col">&nbsp;</th>
                    <th scope="col">&nbsp;</th>
                    <th scope="col">&nbsp;</th>
                    <th scope="col">&nbsp;</th>
                    <th scope="col">&nbsp;</th>
                    {allvendors.length > 0 && (
                      <th scope="col" colSpan={allvendors.length}>
                        &nbsp;
                      </th>
                    )}
                  </tr>
                  <tr className="last_row small">
                    <th scope="col"></th>
                    <th scope="col"></th>
                    <th scope="col"></th>
                    <th scope="col"></th>
                    <th scope="col"></th>
                    {allvendors.length > 0 && (
                      <th scope="col" colSpan={allvendors.length}></th>
                    )}
                  </tr>
                  <tr className="last_row">
                    <th colSpan={5} scope="col">
                      TOTAL
                    </th>

                    {allvendors &&
                      allvendors.length > 0 &&
                      allvendors.map((item) => {
                        return (
                          <th key={`tp_${item.id}_total`}>
                            {/* {item.total ? addCommasToNumber(item.total) : "-"} */}
                            {addCommasToNumber(freightInfo == "all"
                              ? item.total
                              : freightInfo == "with"
                              ? item.totalWithFreight
                              : item.totalWithoutFreight) ?? "-"}
                          </th>
                        );
                      })}
                  </tr>
                  <tr className="last_row">
                    <th colSpan={5} scope="col">
                      FINALIZED VENDOR
                    </th>

                    {allvendors &&
                      allvendors.length > 0 &&
                      allvendors
                        .filter((item) => item.is_finalized)
                        ?.map((item) => {
                          return (
                            <th
                              colSpan={allvendors.length}
                              scope="col"
                              className="l1total"
                            >
                              {item.total ? addCommasToNumber(item.total) : "-"}
                            </th>
                          );
                        })}
                  </tr>

                  <tr className="last_row">
                    <th colSpan={5} scope="col" className="bggray">
                      LOWEST TOTAL ( L1 Total )
                    </th>

                    {allvendors && allvendors.length > 0 && (
                      <th
                        colSpan={allvendors.length}
                        scope="col"
                        className="l1total"
                      >
                        {addCommasToNumber(l1total)}
                      </th>
                    )}
                  </tr>

                  <tr className="last_row">
                    <th colSpan={5} scope="col">
                      Delivery{" "}
                    </th>

                    {allvendors &&
                      allvendors.length > 0 &&
                      allvendors.map((item) => {
                        return (
                          <td key={`tp_${item.id}_total`}>
                            {item?.quoted_products &&
                              getDeliveryRange(item.quoted_products)}
                          </td>
                        );
                      })}
                  </tr>
                  <tr className="last_row">
                    <th colSpan={5} scope="col">
                      Payment{" "}
                    </th>

                    {allvendors &&
                      allvendors.length > 0 &&
                      allvendors.map((item) => {
                        return (
                          <td key={`tp_${item.id}_total`}>
                            <ReadMore
                              content={
                                item.global_payment_term[0].details
                                  ? item.global_payment_term[0].details
                                  : "-"
                              }
                            />
                          </td>
                        );
                      })}
                  </tr>
                  <tr className="last_row">
                    <th colSpan={5} scope="col">
                      Vendor comment{" "}
                    </th>

                    {allvendors &&
                      allvendors.length > 0 &&
                      allvendors.map((item) => {
                        return (
                          <td key={`tp_${item.id}_total`}>
                            <ReadMore
                              content={
                                item.global_payment_term[0].comment
                                  ? item.global_payment_term[0].comment
                                  : "-"
                              }
                            />
                          </td>
                        );
                      })}
                  </tr>
                  <tr className="last_row">
                    <th colSpan={5} scope="col">
                      Attached Files{" "}
                    </th>

                    {attachedFiles &&
                      attachedFiles.length > 0 &&
                      attachedFiles.map((vendor_files, index) => {
                        return (
                          <td
                            key={`gloal_files_${index}`}
                            style={{ maxWidth: "200px" }}
                          >
                            {vendor_files?.map((file_item) => {
                              return (
                                <a
                                  href={file_item.file_url}
                                  target="_blank"
                                  key={file_item.file_url}
                                  className="file-badge mb-2"
                                  type="button"
                                  style={{ maxWidth: "100%" }}
                                >
                                  <FontAwesomeIcon
                                    icon={faDownload}
                                    className="ms-0 me-2"
                                  />
                                  <span className="text-truncate">
                                    {extractfileName(file_item.file_url)}
                                  </span>
                                </a>
                              );
                            })}
                          </td>
                        );
                      })}
                  </tr>
                  {/* <tr className="last_row">
                  <th colSpan={3} scope="col">
                    Manufacturer Location
                  </th>

                  {allvendors &&
                    allvendors.length > 0 &&
                    allvendors.map((item) => {
                      return <th key={`tp_${item.id}_total`}>Location</th>;
                    })}
                </tr> */}
                </tfoot>
              </table>
            </div>
          ) : (
            <h4 className="mt-4 text-center">
              No Technically Accepted Quotes Yet!
            </h4>
          )}
        </div>
      )}
    </>
  );
};

export default OverallComparison;
