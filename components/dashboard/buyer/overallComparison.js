
import FullLoader from "@/components/shared/FullLoader";
import LPRModal from "@/components/shared/LPRModal";
import ReadMore from "@/components/shared/ReadMore";
import { downloadQuotesDetails } from "@/services/rfq";
import { renderFileLink } from "@/utils/elementFunctions";
import { calculateTotal, extractfileName, handleNormalize } from "@/utils/sharedFunctions";
import { faDownload } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useEffect, useState } from "react";
import { Button, Badge } from "react-bootstrap";

/**
 * @note We have left the View LPR button to be displayed even if the Previous quotes are not there which needs to be corrected later 
 * @Updated Ayush Singh 22 JUNE 2025
 * @updated by mukul 08-08-2025 - normilize total
 */
const OverallComparison = ({ rfq_id, TA_Filter, freightFilter, RFQ_no, normalizeFilter }) => {
  const [loading, setloading] = useState(false);
  const [allvendors, setallvendors] = useState(null);
  const [data, setdata] = useState([]);
  const [originalData, setOriginalData] = useState([]); // Store original data before normalization
  const [l1total, setl1total] = useState(0);
  const [finalizedTotal, setFinalizedTotal] = useState(0);
  const [attachedFiles, setAttachedFiles] = useState(null);
  const [breakupStates, setBreakupStates] = useState({});
  const [openModals, setOpenModals] = useState({});

  // Helper function to check if vendor has missing freight or packaging costs
  const hasMissingCosts = (vendorId) => {
    // Don't show highlighting when freight filter is active
    if (freightFilter) return false;
    
    // Use original data before normalization to check for missing costs
    const dataToCheck = originalData.length > 0 ? originalData : data;
    if (!dataToCheck || dataToCheck.length === 0) return false;
    
    return dataToCheck.some(item => {
      const vendorQuote = item.quotations.find(q => q.created_by === vendorId && q.id != null && q.is_regret != 1);
      if (!vendorQuote || !vendorQuote.quote_details || vendorQuote.quote_details.length === 0) return false;
      
      const quoteDetails = vendorQuote.quote_details[0];
      const freightPrice = parseFloat(quoteDetails.freight_price) || 0;
      const packagePrice = parseFloat(quoteDetails.package_price) || 0;
      
      return freightPrice === 0 || packagePrice === 0;
    });
  };
  
  useEffect(() => {
    handleDownloadQuote();
  }, [rfq_id, TA_Filter, freightFilter, normalizeFilter]);

  const toggleBreakup = (key) => {
    setBreakupStates(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
};

const closeModalForVariant = (variantId) => {
  setOpenModals(prev => ({ ...prev, [variantId]: false }));
};

const openModalForVariant = (variantId) => {
  setOpenModals(prev => ({ ...prev, [variantId]: true }));
};
  const handleDownloadQuote = () => {
    setloading(true);
    downloadQuotesDetails(rfq_id, TA_Filter, freightFilter)
      .then((res) => {
        // Store original data before normalization for highlighting logic
        setOriginalData(res.data);
        
        const data = normalizeFilter ? handleNormalize(res.data) : res.data;

        setdata(data);
        setallvendors(data[0]?.all_vendors?.length > 0 ? data[0]?.all_vendors : null);
        let globalFiles = FilterOutGlobalTermsFiles(data);
        setAttachedFiles(globalFiles);
        getLowestBidAmount(data);
        getFinalizedTotal(data);
        setloading(false);
      })
      .catch((err) => {
        setloading(false);
      });
  };

  const FilterOutGlobalTermsFiles = (all_data) => {
    let fileArr = Array.from({ length: all_data[0]?.all_vendors.length || 0 }, () => []);

    // Get global document files from all_vendors instead of product-specific files
    if (all_data[0]?.all_vendors) {
      all_data[0].all_vendors.forEach((vendor, index) => {
        fileArr[index] = vendor.global_document_files ? vendor.global_document_files : [];
      });
    }
    
    return fileArr;
  }


  const getLowestBidAmount = (all_data) => {
    let l1totaltemp = 0;
    let totalRFQItems = 0;

    let edited_data = all_data.map((item) => {
      totalRFQItems = totalRFQItems + parseInt(item.product_specs.find((specItem) => specItem.title == 'Quantity')?.value || 0);

      const array = item.quotations.filter((Q_item) => Q_item.id != null && Q_item.is_regret != 1);

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

          const curQuantity = curItemQuoteDetails.rfq_details.find(spec => spec.title == 'Quantity')?.value || curItemQuoteDetails.quantity
          const lowQuantity = lowestQuoteDetails.rfq_details.find(spec => spec.title == 'Quantity')?.value || lowestQuoteDetails.quantity

          const currentTotal = calculateTotal(curItemQuoteDetails, curQuantity)
          const lowestTotal = calculateTotal(lowestQuoteDetails, lowQuantity)

          if (curItemQuoteDetails.unit_price > 0) {
            let curLowest = lowest;
            if (currentTotal < lowestTotal) curLowest = currentItem;
            else if (currentTotal == lowestTotal) {
              const curPrevWorked = curItemVendorDetails.prev_worked == 1;
              const lowestPrevWorked = lowestVendorDetails.prev_worked == 1;

              if (curPrevWorked && !lowestPrevWorked) curLowest = currentItem;
              else if (!curPrevWorked && lowestPrevWorked) curLowest = lowest;
              else {
                const curTimestamp = new Date(
                  currentItem.timestamp.slice(0, 23)
                );
                const lowestTimestamp = new Date(lowest.timestamp.slice(0, 23));

                if (curTimestamp < lowestTimestamp) curLowest = currentItem;
                else curLowest = lowest;
              }
            }

            return curLowest;
          }
          return lowest;
        }, array[0]);
      }

      if (lowest) {
        const lowestQuoteDetails = lowest.quote_details[0];
        const lowestQuantity = lowestQuoteDetails.rfq_details.find(spec => spec.title == 'Quantity')?.value || lowestQuoteDetails.quantity;

        l1totaltemp = l1totaltemp + calculateTotal(lowestQuoteDetails, lowestQuantity, normalizeFilter);
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

    setdata(edited_data);
    setl1total(l1totaltemp);
  };
   

  const getFinalizedTotal = (all_data) => {
    let l1totaltemp = 0;
    let totalRFQItems = 0;

    all_data.filter(item => item.all_vendors && item.all_vendors.some(vendor => vendor.is_finalized)).forEach((item) => {
      totalRFQItems = totalRFQItems + parseInt(item.product_specs.find((specItem) => specItem.title == 'Quantity')?.value || 0);

      const array = item.quotations.filter(item => item.vendor_details && item.vendor_details.some(vendor => vendor.is_finalized)).filter((Q_item) => Q_item.id != null && Q_item.is_regret != 1);

      if (array.length === 1) {
        if (array[0].quote_details[0].unit_price > 0) {
          const lowestQuoteDetails = array[0].quote_details[0];
          const lowestQuantity = lowestQuoteDetails.rfq_details.find(spec => spec.title == 'Quantity')?.value || lowestQuoteDetails.quantity;
          l1totaltemp = l1totaltemp + calculateTotal(lowestQuoteDetails, lowestQuantity);
        }
      } else {
        const finalized = array.find(item => {
          const curItemVendorDetails = item.vendor_details[0];
          return curItemVendorDetails.is_finalized
        })

        if(finalized) {
          const curItemQuoteDetails = finalized.quote_details[0];
          const lowestQuantity = curItemQuoteDetails.rfq_details.find(spec => spec.title == 'Quantity')?.value || lowestQuoteDetails.quantity;

          l1totaltemp = l1totaltemp + calculateTotal(curItemQuoteDetails);
        }
      }
    });

    setFinalizedTotal(l1totaltemp);
  };

  let calculateVendorwiseTotalBid = () => {
    if (!allvendors) return;

    let updated_vendors = allvendors.map((vendor) => {
      let priceInfo = {
        total: 0,
        packaging: 0,
        tax: 0,
        freight: 0,
      };

      data.map((item) => {
        let q_item = item.quotations.filter(
          (q) => q.created_by == vendor.id && q.id != null && q.is_regret != 1
        );

        if (q_item.length > 0) {
          const quoteDetails = q_item[0]?.quote_details[0]
          const quantity = quoteDetails.rfq_details.find(spec => spec.title == 'Quantity')?.value || quoteDetails.quantity
          
          priceInfo.total = priceInfo.total + parseInt(calculateTotal(quoteDetails, quantity, normalizeFilter));
          priceInfo.packaging = priceInfo.packaging + parseInt(quoteDetails?.package_price);
          priceInfo.tax = priceInfo.tax + parseInt(quoteDetails?.tax);
          priceInfo.freight = priceInfo.freight + parseInt(quoteDetails?.freight_price);
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
        return smallest === 1 ? `Within 1 day` : `Within ${smallest} days`;
      }

      let smallestStr = smallest === 1 ? "1 day" : `${smallest} days`;
      let largestStr = largest === 1 ? "1 day" : `${largest} days`;

      return `Within ${smallestStr} - ${largestStr}`;
    } else {
      return "-";
    }
  };

  return (
    <>
      {loading ? (
        <FullLoader />
      ) : (
      <div className="quote-sec-table-sub hasFullLoader">
          {allvendors && allvendors.length > 0 ? (
            // ✅ SCROLL CONTAINER (vertical + horizontal)
            <div className="table-scroll-wrap">
              <table className="table table-bordered overall-table">
                <colgroup>
                  <col style={{ width: "75px" }} />
                  <col style={{ width: "250px" }} />
                  <col style={{ width: "250px" }} />
                  <col style={{ width: "120px" }} />
                  <col style={{ width: "250px" }} />
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

                {/* ✅ FIXED HEADER */}
                <thead className="">
                  <tr className="title-row">
                    <th
                      scope="col"
                      className="sl_no heading"
                      colSpan={allvendors.length + 7}
                    >
                      Category Wise Comparison
                      <br />
                      <small>(Incl. Packaging , Freight &amp; GST)</small>
                    </th>
                  </tr>
                  <tr className="title-row" >
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
                      <div>
                        Last Purchase Rate
                        <div className=" text-gray-500" style = {{"font-size" : "12px"}}>
                          (Please Review Freight)
                        </div>
                      </div>
                    </th>
                    <th scope="col" className="all_vendors" rowSpan={2}>
                      <p>
                        Selling Price
                      </p>
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
                            style={{
                              backgroundColor: "#2d5ba7",
                              color: "white"
                            }}
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
                      const rfq_product_id = item.id;
                      const productName =  item.product_details.map((prod)=>prod.name);
                      const key = item.product_variant_id + item.variant;
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
                      const selling_price = item.product_specs.find(
                        (spec) => spec.title === "total_price"
                      )?.value;

                      return (
                        <tr key={item.id}>
                          <td>{index + 1} </td>
                          <td>
                            <p className="fw-semibold mb-1">
                              {item.product_details.length > 0
                                ? item.product_details[0]?.name
                                : "-"}
                            </p>
                            {selling_price && (
                              <div className="d-flex justify-content-center">
                                <Badge
                                  bg="success"
                                  className="d-flex gap-1 px-3"
                                >
                                  <p className="fw-medium">Selling Price: </p>
                                  <p className="fw-semibold">
                                    {addCommasToNumber(selling_price)}
                                  </p>
                                </Badge>
                              </div>
                            )}
                          </td>
                          <td>
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 4,
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "flex-start",
                                  gap: "0.2rem",
                                }}
                              >
                                <p style={{ fontWeight: "bold", minWidth: 40 }}>
                                  Size:
                                </p>
                                <span>
                                  {size?.value ? (
                                    <ReadMore
                                      content={size.value}
                                      maxLength={1000}
                                      maxLines={3}
                                    />
                                  ) : (
                                    "--"
                                  )}
                                </span>
                              </div>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "flex-start",
                                  gap: "0.2rem",
                                }}
                              >
                                <p style={{ fontWeight: "bold", minWidth: 40 }}>
                                  Spec:
                                </p>
                                <span>
                                  {spec?.value ? (
                                    <ReadMore
                                      content={spec.value}
                                      maxLength={1000}
                                      maxLines={3}
                                    />
                                  ) : (
                                    "--"
                                  )}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td>{`${quantity?.value ?? "NA"}-${
                            unit?.value ?? "NA"
                          }`}</td>
                          {item.last_purchase_rate || item.last_quote_rate ? (
                            <td className="total_amt_field">
                              <label className="view_breakup">
                                <div className="tooltip_custom">
                                  Show/hide Breakup
                                </div>
                                <span></span>
                                <input type="checkbox" />
                                {item.last_purchase_rate ? (
                                  <table className="table has_inner_border_table">
                                    <tr>
                                      <th>Base Price</th>
                                      <td style={{ width: "50%" }}>
                                        {item.last_purchase_rate?.unit_price
                                          ? addCommasToNumber(
                                              item.last_purchase_rate
                                                ?.unit_price
                                            )
                                          : "0"}
                                      </td>
                                    </tr>
                                    <tr>
                                      <th>Total Rate</th>
                                      <td style={{ width: "50%" }}>
                                        {item.last_purchase_rate?.unit_price &&
                                        quantity?.value
                                          ? addCommasToNumber(
                                              item.last_purchase_rate
                                                .unit_price *
                                                parseInt(quantity.value)
                                            )
                                          : "0"}
                                      </td>
                                    </tr>
                                    <tr>
                                      <th>
                                        Packaging(
                                        {item.last_purchase_rate
                                          ?.package_mode == "absolute"
                                          ? "IN ₹"
                                          : "IN %"}
                                        )
                                      </th>
                                      <td>
                                        {item.last_purchase_rate
                                          ?.package_price !== null
                                          ? `${
                                              item.last_purchase_rate
                                                ?.package_mode == "absolute"
                                                ? "₹"
                                                : ""
                                            }${addCommasToNumber(
                                              item.last_purchase_rate
                                                ?.package_price
                                            )}${
                                              item.last_purchase_rate
                                                ?.freight_mode == "percentage"
                                                ? "%"
                                                : ""
                                            }`
                                          : "0%"}
                                      </td>
                                    </tr>
                                    <tr>
                                      <th>
                                        Freight(
                                        {item.last_purchase_rate
                                          ?.freight_mode == "absolute"
                                          ? "IN ₹"
                                          : "IN %"}
                                        )
                                      </th>
                                      <td>
                                        {item.last_purchase_rate
                                          ?.freight_price !== null
                                          ? `${
                                              item.last_purchase_rate
                                                ?.freight_mode == "absolute"
                                                ? "₹"
                                                : ""
                                            }${addCommasToNumber(
                                              item.last_purchase_rate
                                                ?.freight_price
                                            )}${
                                              item.last_purchase_rate
                                                ?.freight_mode == "percentage"
                                                ? "%"
                                                : ""
                                            }`
                                          : "0%"}
                                      </td>
                                    </tr>
                                    <tr>
                                      <th>
                                        GST(
                                        {item.last_purchase_rate?.tax_mode ==
                                        "absolute"
                                          ? "IN ₹"
                                          : "IN %"}
                                        )
                                      </th>
                                      <td>
                                        {item.last_purchase_rate?.tax !== null
                                          ? `${
                                              item.last_purchase_rate
                                                ?.tax_mode == "absolute"
                                                ? "₹"
                                                : ""
                                            }${addCommasToNumber(
                                              item.last_purchase_rate?.tax
                                            )} ${
                                              item.last_purchase_rate
                                                ?.tax_mode == "percentage"
                                                ? "%"
                                                : ""
                                            }`
                                          : "0%"}
                                      </td>
                                    </tr>
                                    <tr className="is_lowest ">
                                      <th>Sub Total</th>
                                      <td>
                                         {item.last_purchase_rate &&
                                        quantity?.value
                                          ? addCommasToNumber(
                                              calculateTotal(
                                                item.last_purchase_rate,
                                                quantity.value 
                                            )
                                            )
                                          : "0"}
                                      </td>
                                    </tr>
                                  </table>
                                ) : item.last_quote_rate ? (
                                  <table className="table has_inner_border_table">
                                    <tr>
                                      <th>Base Price</th>
                                      <td style={{ width: "50%" }}>
                                        {item.last_quote_rate?.unit_price
                                          ? addCommasToNumber(
                                              item.last_quote_rate?.unit_price
                                            )
                                          : "0"}
                                      </td>
                                    </tr>
                                    <tr>
                                      <th>Total Rate</th>
                                      <td style={{ width: "50%" }}>
                                        {item.last_quote_rate?.unit_price &&
                                        quantity?.value
                                          ? addCommasToNumber(
                                              item.last_quote_rate.unit_price *
                                                parseInt(quantity.value)
                                            )
                                          : "0"}
                                      </td>
                                    </tr>
                                    <tr>
                                      <th>
                                        Packaging(
                                        {item.last_quote_rate?.package_mode ==
                                        "absolute"
                                          ? "IN ₹"
                                          : "IN %"}
                                        )
                                      </th>
                                      <td>
                                        {item.last_quote_rate?.package_price !==
                                        null
                                          ? `${
                                              item.last_quote_rate
                                                ?.package_mode == "absolute"
                                                ? "₹"
                                                : ""
                                            }${addCommasToNumber(
                                              item.last_quote_rate
                                                ?.package_price
                                            )}${
                                              item.last_quote_rate
                                                ?.package_mode == "percentage"
                                                ? "%"
                                                : ""
                                            }`
                                          : "0%"}
                                      </td>
                                    </tr>
                                    <tr>
                                      <th>
                                        Freight(
                                        {item.last_quote_rate?.freight_mode ==
                                        "absolute"
                                          ? "IN ₹"
                                          : "IN %"}
                                        )
                                      </th>
                                      <td>
                                        {item.last_quote_rate?.freight_price !==
                                        null
                                          ? `${
                                              item.last_quote_rate
                                                ?.freight_mode == "absolute"
                                                ? "₹"
                                                : ""
                                            }${addCommasToNumber(
                                              item.last_quote_rate
                                                ?.freight_price
                                            )}${
                                              item.last_quote_rate
                                                ?.freight_mode == "percentage"
                                                ? "%"
                                                : ""
                                            }`
                                          : "0%"}
                                      </td>
                                    </tr>
                                    <tr>
                                      <th>
                                        GST(
                                        {item.last_quote_rate?.tax_mode ==
                                        "absolute"
                                          ? "IN ₹"
                                          : "IN %"}
                                        )
                                      </th>
                                      <td>
                                        {item.last_quote_rate?.tax !== null
                                          ? `${
                                              item.last_quote_rate?.tax_mode ==
                                              "absolute"
                                                ? "₹"
                                                : ""
                                            }${addCommasToNumber(
                                              item.last_quote_rate?.tax
                                            )} ${
                                              item.last_quote_rate?.tax_mode ==
                                              "percentage"
                                                ? "%"
                                                : ""
                                            }`
                                          : "0%"}
                                      </td>
                                    </tr>
                                    <tr className="is_lowest ">
                                      <th>Sub Total</th>
                                      <td>
                                        {item.last_quote_rate && quantity?.value
                                          ? addCommasToNumber(
                                              calculateTotal(
                                                item.last_quote_rate,
                                                quantity.value)
                                            )
                                          : "0"}
                                      </td>
                                    </tr>
                                  </table>
                                ) : null}
                                <LPRModal
                                  show={openModals[key] || false}
                                  onHide={() => closeModalForVariant(key)}
                                  variantId={item.product_variant_id}
                                  RFQ_no={-1}
                                />

                                <p>
                                  {item.last_purchase_rate?.unit_price &&
                                  quantity?.value
                                    ? addCommasToNumber(
                                        calculateTotal(
                                          item.last_purchase_rate,
                                          quantity.value
                                        )
                                      )
                                    : item.last_quote_rate?.unit_price &&
                                      quantity?.value
                                    ? addCommasToNumber(
                                        calculateTotal(
                                          item.last_quote_rate,
                                          quantity.value,
                                          normalizeFilter
                                        )
                                      )
                                    : "0"}
                                </p>
                                {!item.last_purchase_rate &&
                                  item.last_quote_rate && (
                                    <small className="text-muted">
                                      (Last quoted rate)
                                    </small>
                                  )}
                                <Button
                                  variant="link"
                                  size="sm"
                                  onClick={() => openModalForVariant(key)}
                                    id={`view_lpr_history_${key}-lpr_section-overall_comparison_page`}
                                >
                                  View LPR History
                                </Button>
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
                                  onClick={() => openModalForVariant(key)}
                                  id={`view_lpr_history_${key}_no_lpr-lpr_section-overall_comparison_page`}
                                >
                                  View LPR History
                                </Button>
                              </label>
                              <LPRModal
                                show={openModals[key] || false}
                                onHide={() => closeModalForVariant(key)}
                                variantId={item.product_variant_id}
                                RFQ_no={RFQ_no}
                              />
                            </td>
                          )}

                          <td>
                            <table className="w-100">
                              {/* Selling Price Row */}
                              {selling_price && (
                                <tr>
                                  <td
                                    className="pe-2 fw-bold"
                                    style={{ whiteSpace: "nowrap" }}
                                  >
                                    Selling Price:
                                  </td>
                                  <td>₹{addCommasToNumber(selling_price)}</td>
                                </tr>
                              )}

                              {/* Target Price Row
                              {item.latest_target_price && (
                                <tr>
                                  <td
                                    className="pe-2 fw-bold"
                                    style={{ whiteSpace: "nowrap" }}
                                  >
                                    Target Price:
                                  </td>
                                  <td>
                                    ₹
                                    {addCommasToNumber(
                                      item.latest_target_price
                                    )}
                                  </td>
                                </tr>
                              )} */}

                              {/* Set Target Price Row */}
                              {/* <tr>
                                <td colSpan="2" className="pt-2">
                                  <Button
                                    variant="outline-primary"
                                    size="sm"
                                    className="border-0 py-1 px-2"
                                    onClick={async () => {
                                      await getPricehistory(item.id);
                                      setOpenModalId(item.id);
                                    }}
                                  >
                                    Set Target
                                  </Button>

                                  <InputModal
                                    show={openModalId === item.id}
                                    onHide={() => setOpenModalId(null)}
                                    onSubmit={(targetPrice) =>
                                      handleSubmitTargetPrice(
                                        targetPrice,
                                        rfq_product_id
                                      )
                                    }
                                    productName={productName}
                                    initialValue={item.latest_target_price}
                                    numericLabel="Target Price"
                                    modalTitle="Set Target Price"
                                    historyData={targetPriceHistory}
                                  />
                                </td>
                              </tr> */}
                            </table>
                          </td>

                          {item.quotations.length > 0 &&
                            item.quotations.map((quote_item, vIdx) => {
                              const isSomeoneFinalized =
                                item?.all_vendors?.find(
                                  (vendor) => vendor.is_finalized
                                );

                              let finalizedClass = "";

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
                                const quoteDetails =
                                  quote_item.quote_details?.[0];
                                const [productId, variant] = [
                                  quoteDetails.product_id,
                                  quoteDetails.variant,
                                ];
                                const key = `${index}_${item.product_variant_id}_${quote_item.created_by}`;
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
                                const freight_mode =
                                  quote_item?.quote_details[0]?.freight_mode ??
                                  "percentage";
                                const package_mode =
                                  quote_item?.quote_details[0]?.package_mode ??
                                  "percentage";
                                const tax_mode =
                                  quote_item?.quote_details[0]?.tax_mode ??
                                  "percentage";

                                return (
                                  <td
                                    className={`${finalizedClass} total_amt_field`}
                                    key={`quote_item_${quote_item?.created_by}`}
                                  >
                                    {quote_item?.quote_details?.length > 0 &&
                                    (parseInt(
                                      quote_item.quote_details[0]?.unit_price
                                    ) || 0) > 0 ? (
                                      <label className="view_breakup">
                                        <div className="tooltip_custom">
                                          Show/hide Breakup
                                        </div>
                                        <span></span>
                                        <input
                                          type="checkbox"
                                          checked={
                                            breakupStates[
                                              `${index}_${item.product_variant_id}_${quote_item.created_by}`
                                            ] || false
                                          }
                                          onChange={() =>
                                            toggleBreakup(
                                              `${index}_${item.product_variant_id}_${quote_item.created_by}`
                                            )
                                          }
                                        />
                                        {breakupStates[
                                          `${index}_${item.product_variant_id}_${quote_item.created_by}`
                                        ] && (
                                          <table className="table has_inner_border_table">
                                            <tr>
                                              <th>Base Price</th>
                                              <td>
                                                ₹
                                                {quote_item?.quote_details
                                                  ?.length > 0
                                                  ? addCommasToNumber(
                                                      quote_item
                                                        ?.quote_details[0]
                                                        ?.unit_price
                                                    )
                                                  : "-"}
                                              </td>
                                            </tr>
                                            <tr>
                                              <th>Total Rate</th>
                                              <td>
                                                ₹
                                                {quote_item?.quote_details
                                                  ?.length > 0 &&
                                                quote_item?.quote_details[0]
                                                  ?.unit_price &&
                                                quantity?.value
                                                  ? addCommasToNumber(
                                                      quote_item
                                                        ?.quote_details[0]
                                                        ?.unit_price *
                                                        parseFloat(
                                                          quantity.value
                                                        )
                                                    )
                                                  : "-"}
                                              </td>
                                            </tr>
                                           

                                            <tr>
                                              <th>
                                                Packaging (
                                                {package_mode == "percentage"
                                                  ? "%"
                                                  : "IN ₹"}
                                                )
                                              </th>
                                              <td>
                                                {quote_item?.quote_details
                                                  ?.length > 0
                                                  ? package_mode == "percentage"
                                                    ? addCommasToNumber(
                                                        quote_item
                                                          ?.quote_details[0]
                                                          ?.package_price
                                                      ) + "%"
                                                    : "₹" +
                                                      addCommasToNumber(
                                                        quote_item
                                                          ?.quote_details[0]
                                                          ?.package_price
                                                      )
                                                  : "-"}
                                              </td>
                                            </tr>
                                            <tr>
                                              <th>
                                                Freight (
                                                {freight_mode == "percentage"
                                                  ? "%"
                                                  : "IN ₹"}
                                                )
                                              </th>
                                              <td>
                                                {quote_item?.quote_details
                                                  ?.length > 0
                                                  ? freight_mode == "percentage"
                                                    ? addCommasToNumber(
                                                        quote_item
                                                          ?.quote_details[0]
                                                          ?.freight_price
                                                      ) + "%"
                                                    : "₹" +
                                                      addCommasToNumber(
                                                        quote_item
                                                          ?.quote_details[0]
                                                          ?.freight_price
                                                      )
                                                  : "-"}
                                              </td>
                                            </tr>
                                            <tr>
                                              <th>
                                                GST ({tax_mode ? "%" : "IN ₹"})
                                              </th>
                                              <td>
                                                {quote_item?.quote_details
                                                  ?.length > 0
                                                  ? tax_mode
                                                    ? addCommasToNumber(
                                                        quote_item
                                                          ?.quote_details[0]
                                                          ?.tax
                                                      ) + "%"
                                                    : "₹" +
                                                      addCommasToNumber(
                                                        quote_item
                                                          ?.quote_details[0]
                                                          ?.tax
                                                      )
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
                                                (in days)
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
                                                ₹
                                                {quote_item?.quote_details
                                                  .length > 0 &&
                                                (parseInt(
                                                  quote_item.quote_details[0]
                                                    ?.unit_price
                                                ) || 0) > 0
                                                  ? addCommasToNumber(
                                                      calculateTotal(
                                                        quote_item
                                                          .quote_details[0],
                                                        quantity.value,
                                                      normalizeFilter
                                                      )
                                                    )
                                                  : "-"}
                                              </td>
                                            </tr>
                                          </table>
                                        )}
                                        {(() => { const isHighlightedCell = finalizedClass === "is_lowest" || finalizedClass === "is_lowest_not_finalised"; return (
                                        <>
                                        <p style={{ color: isHighlightedCell ? "#fff" : undefined }}>
                                          {quote_item?.quote_details?.length >
                                            0 &&
                                          (parseInt(
                                            quote_item.quote_details[0]
                                              ?.unit_price
                                          ) || 0) > 0
                                            ? addCommasToNumber(
                                                calculateTotal(
                                                  quote_item.quote_details[0],
                                                  quantity.value,
                                                  normalizeFilter
                                                )
                                              )
                                            : "-"}
                                        </p>
                                        {(originalData.length > 0 ? (() => {
                                          const prod = originalData.find(p => p.product_variant_id === item.product_variant_id && p.variant === item.variant);
                                          const oq = prod?.quotations?.find(q => q.created_by === quote_item.created_by && q.id != null && q.is_regret != 1);
                                          const d = oq?.quote_details?.[0] ?? oq;
                                          if (!d) return false;
                                          const parts = [];
                                          const pp0 = (parseFloat(d?.package_price) || 0) === 0;
                                          const fp0 = (parseFloat(d?.freight_price) || 0) === 0;
                                          if (pp0) parts.push('Package');
                                          if (!freightFilter && fp0) parts.push('Freight');
                                          return parts.length ? parts.join(',') : false;
                                        })() : false) && ((missing => (
                                          <div style={{ fontSize: "12px", marginTop: 6, lineHeight: 1.2, whiteSpace: "normal", wordBreak: "break-word", color: isHighlightedCell ? "#fff" : undefined }}>
                                            {`Missing - ${missing.replace(',', ', ')}`}
                                          </div>
                                        ))((originalData.length > 0 ? (() => {
                                          const prod = originalData.find(p => p.product_variant_id === item.product_variant_id && p.variant === item.variant);
                                          const oq = prod?.quotations?.find(q => q.created_by === quote_item.created_by && q.id != null && q.is_regret != 1);
                                          const d = oq?.quote_details?.[0] ?? oq;
                                          const parts = [];
                                          const pp0 = (parseFloat(d?.package_price) || 0) === 0;
                                          const fp0 = (parseFloat(d?.freight_price) || 0) === 0;
                                          if (pp0) parts.push('Package');
                                          if (!freightFilter && fp0) parts.push('Freight');
                                          return parts.join(',');
                                        })() : '')) )}
                                        </> ); })()}
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
                    <th colSpan={6} scope="col">
                      TOTAL
                    </th>

                    {allvendors &&
                      allvendors.length > 0 &&
                      allvendors.map((item) => {
                        return (
                          <th key={`tp_${item.id}_total`}>
                            {addCommasToNumber(item.total) ?? "-"}
                          </th>
                        );
                      })}
                  </tr>
                  <tr className="last_row">
                    <th colSpan={6} scope="col">
                      FINALIZED VENDOR
                    </th>

                    <th
                      colSpan={allvendors.length}
                      scope="col"
                      className="l1total"
                    >
                      {finalizedTotal ? addCommasToNumber(finalizedTotal) : "-"}
                    </th>
                  </tr>

                  <tr className="last_row">
                    <th colSpan={6} scope="col" className="bggray">
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
                    <th colSpan={6} scope="col">
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
                    <th colSpan={6} scope="col">
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
                                  : ""
                              }
                            />

                        {item?.payment_terms?.length ? (
                          <p className="text-start">
                            {item.payment_terms.map((t,i) => {
                              const label =
                                (t.type || "").toLowerCase() === "other"
                                  ? (t.comment || "")
                                  : `${t.type}${t.days ? ` (${t.days} days)` : ""}`;
                              return <span key={t.id ?? i} className="mt-3" >{label} - {t.value ?? 0}%</span>;
                            })}
                          </p>
                        ) : (
                          item?.global_payment_term?.[0]?.details || "-"
                        )}

                          </td>
                        );
                      })}
                  </tr>
                  <tr className="last_row">
                    <th colSpan={6} scope="col">
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
                    <th colSpan={6} scope="col">
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


<style jsx>{`
  /* ===== TUNABLE SIZES ===== */

  /* Scroll area */
  .table-scroll-wrap {
    max-height: 85vh;
    overflow-y: auto;
    overflow-x: auto;
    position: relative;
  }

  /* Keep column widths steady and borders clean while sticky */
  .overall-table {
    min-width: 960px;          /* avoid squishing on narrow screens */
  }

  /* Make header cells sticky */
  .overall-table thead th {
    position: sticky;
    z-index: 3;
  }

  /* First header row (title) */
  .overall-table thead .title-row th {
    top: 0;
    height: 60px;
    line-height: 1.1;
    padding: 12px 16px;
    background-color: #2d5ba7;
    color: white;
    font-weight: 600;
  }



`}</style>

    </>
  );
};

export default OverallComparison;
