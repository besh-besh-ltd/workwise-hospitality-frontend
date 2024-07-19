import FullLoader from "@/components/shared/FullLoader";
import Loader from "@/components/shared/Loader";
import { downloadQuotesDetails } from "@/services/rfq";
import { faEye } from "@fortawesome/free-regular-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useEffect, useState } from "react";
import "react-tooltip/dist/react-tooltip.css";
import { Tooltip } from "react-tooltip";

const OverallComparison = ({ rfq_id }) => {
  const [loading, setloading] = useState(false);
  const [allvendors, setallvendors] = useState([]);
  const [data, setdata] = useState([]);
  const [l1total, setl1total] = useState(0);
  const [totalRfqProducts, settotalRfqProducts] = useState(0);
  useEffect(() => {
    handleDownloadQuote();
  }, [rfq_id]);

  const handleDownloadQuote = () => {
    setloading(true);
    downloadQuotesDetails(rfq_id)
      .then((res) => {
        setdata(res.data);

        let data = res.data;
        if (
          data.length > 0 &&
          data[0].all_vendors &&
          data[0].all_vendors.length > 0
        ) {
          setallvendors(data[0].all_vendors);
        }
        getLowestBidAmount(res.data);
        setloading(false);
      })
      .catch((err) => {
        setloading(false);
      });
  };

  const getQty = (item, index) => {
    // console.log("item====>>>>>>>>>>>>>", item);
    let qq = item.quotations.filter((qi) => qi.id != null);
    if (qq.length > 0) {
      // return qq[0].quote_details[0].rfq_details[2]?.value;
      return qq[0].quote_details[0].quantity;
    } else {
      return "-";
    }
  };

  const getLowestBidAmount = (all_data) => {
    let l1totaltemp = 0;
    let totalRFQItems = 0;
    let edited_data = all_data.map((item) => {
      totalRFQItems =
        totalRFQItems + parseInt(getQty(item) == "-" ? 0 : getQty(item));
      settotalRfqProducts(totalRFQItems);
      const array = item.quotations.filter(
        (item) => item.id != null && item.is_regret != 1
      );
      let lowest = array.reduce((lowest, currentItem) => {
        return currentItem.quote_details[0].total_price <
          lowest.quote_details[0].total_price
          ? currentItem
          : lowest;
      }, array[0]);

      if (lowest) {
        l1totaltemp = l1totaltemp + lowest.quote_details[0].total_price;

        setl1total(l1totaltemp);
      }
      item.quotations.map((q) => {
        if (q.id == lowest.id) {
          q.is_lowest = true;
        } else {
          q.is_lowest = false;
        }
      });
      return item;
    });
    setdata(edited_data);
    //setl1total(l1totaltemp);
    //settotalRfqProducts(totalRFQItems);
  };

  let calculateVendorwiseTotalBid = () => {
    let updated_vendors = allvendors.map((vendor) => {
      let total = 0;
      data.map((item) => {
        let q_item = item.quotations.filter(
          (q) => q.created_by == vendor.id && q.id != null && q.is_regret != 1
        );

        if (q_item.length > 0) {
          total = total + parseInt(q_item[0].quote_details[0].total_price);
        }
      });

      vendor.total = total;
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
          vq.push(parseInt(q[0].quote_details[0].delivery_period));
        }
      });
      vendor.quoted_products = vq;
      return vendor;
    });
    setallvendors(ev);
  };
  const getDeliveryRange = (items) => {
    if (items && items.length > 0) {
      // Find the smallest number
      let smallest = Math.min(...items);

      // Find the largest number
      let largest = Math.max(...items);

      return `Within ${smallest || 0} - ${largest || 0} Weeks`;
    } else {
      return "-";
    }
  };

  return (
    <>
      <div className="quote-sec-table-sub hasFullLoader">
        {loading && <FullLoader />}
        {!loading && (
          <div className="table-responsive">
            <table className="table table-responsive table-bordered overall-table">
              <thead class="thead-dark">
                <tr>
                  <th
                    scope="col"
                    className="sl_no heading"
                    colSpan={allvendors.length + 3}
                  >
                    OVERALL COMPARISON CHART
                    <br />
                    <small>(Incl. Packaging , Freight &amp; GST)</small>
                  </th>
                </tr>
                <tr>
                  <th scope="col" className="sl_no" rowSpan={2}>
                    Sl. No
                  </th>
                  <th scope="col" className="description" rowSpan={2}>
                    Description
                  </th>
                  <th scope="col" className="sl_no" rowSpan={2}>
                    Qty<small>(Nos.)</small>
                  </th>
                  {allvendors &&
                    allvendors.length > 0 &&
                    allvendors.map((item) => {
                      return (
                        <th
                          key={`v_${item.id}`}
                          className="all_vendors"
                          scope="col"
                        >
                          {item.organization_name}
                        </th>
                      );
                    })}
                </tr>
                <tr>
                  {allvendors &&
                    allvendors.length > 0 &&
                    allvendors.map((item) => {
                      return (
                        <th key={`tp_${item.id}`}>
                          <small>
                            Total Amount
                            {/* <small>(Incl. Packaging , Freight & GST)</small> */}
                          </small>
                        </th>
                      );
                    })}
                </tr>
              </thead>
              <tbody className="last_row">
                {data &&
                  data.length > 0 &&
                  data.map((item, index) => {
                    return (
                      <tr>
                        <td>{index + 1} </td>
                        <td>
                          {item.product_details.length > 0
                            ? item.product_details[0].name
                            : "-"}
                        </td>
                        <td>{getQty(item)}</td>
                        {item.quotations.length > 0 &&
                          item.quotations.map((quote_item) => {
                            if (quote_item.is_regret == 1) {
                              return (
                                <td key={`quote_item_${quote_item.created_by}`}>
                                  -
                                </td>
                              );
                            } else {
                              return (
                                <td
                                  className={`${
                                    quote_item.is_lowest
                                      ? "is_lowest total_amt_field"
                                      : "total_amt_field"
                                  }`}
                                  key={`quote_item_${quote_item.created_by}`}
                                >
                                  {quote_item.quote_details.length > 0 ? (
                                    <label className="view_breakup">
                                      <div className="tooltip_custom">
                                        Show/hide Breakup
                                      </div>
                                      <span></span>
                                      <input type="checkbox" />
                                      <table className="table has_inner_border_table">
                                        <tr>
                                          <th>Unit Rate</th>
                                          <td>
                                            {quote_item.quote_details.length > 0
                                              ? addCommasToNumber(
                                                  quote_item.quote_details[0]
                                                    .unit_price
                                                )
                                              : "-"}
                                          </td>
                                        </tr>
                                        <tr>
                                          <th>Total Rate</th>
                                          <td>
                                            {quote_item.quote_details.length > 0
                                              ? addCommasToNumber(
                                                  quote_item.quote_details[0]
                                                    .unit_price * getQty(item)
                                                )
                                              : "-"}
                                          </td>
                                        </tr>
                                        <tr>
                                          <th>Packaging(%)</th>
                                          <td>
                                            {quote_item.quote_details.length > 0
                                              ? addCommasToNumber(
                                                  quote_item.quote_details[0]
                                                    .package_price
                                                ) + "%"
                                              : "-"}
                                          </td>
                                        </tr>
                                        <tr>
                                          <th>Freight(%)</th>
                                          <td>
                                            {quote_item.quote_details.length > 0
                                              ? addCommasToNumber(
                                                  quote_item.quote_details[0]
                                                    .freight_price
                                                ) + "%"
                                              : "-"}
                                          </td>
                                        </tr>
                                        <tr>
                                          <th>GST(%)</th>
                                          <td>
                                            {quote_item.quote_details.length > 0
                                              ? addCommasToNumber(
                                                  quote_item.quote_details[0]
                                                    .tax
                                                ) + "%"
                                              : "-"}
                                          </td>
                                        </tr>
                                        <tr className="is_lowest ">
                                          <th>Sub Total</th>
                                          <td>
                                            {quote_item.quote_details.length > 0
                                              ? addCommasToNumber(
                                                  quote_item.quote_details[0]
                                                    .total_price
                                                )
                                              : "-"}
                                          </td>
                                        </tr>
                                      </table>
                                      <p>
                                        {quote_item.quote_details.length > 0
                                          ? addCommasToNumber(
                                              quote_item.quote_details[0]
                                                .total_price
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
                  <th scope="col" colSpan={3 + allvendors.length}>
                    &nbsp;
                  </th>
                </tr>
                <tr>
                  <th scope="col">&nbsp;</th>
                  <th scope="col">&nbsp;</th>
                  <th scope="col">&nbsp;</th>
                  <th scope="col" colSpan={3 + allvendors.length}>
                    &nbsp;
                  </th>
                </tr>
                <tr>
                  <th scope="col">&nbsp;</th>
                  <th scope="col">&nbsp;</th>
                  <th scope="col">&nbsp;</th>
                  <th scope="col" colSpan={3 + allvendors.length}>
                    &nbsp;
                  </th>
                </tr>
                <tr className="last_row small">
                  <th scope="col"></th>
                  <th scope="col"></th>
                  <th scope="col"></th>
                  <th scope="col" colSpan={3 + allvendors.length}></th>
                </tr>
                <tr className="last_row">
                  <th colSpan={2} scope="col">
                    TOTAL
                  </th>
                  <th scope="col">{totalRfqProducts}</th>
                  {allvendors &&
                    allvendors.length > 0 &&
                    allvendors.map((item) => {
                      return (
                        <th key={`tp_${item.id}_total`}>
                          {item.total ? addCommasToNumber(item.total) : "-"}
                        </th>
                      );
                    })}
                </tr>
                <tr className="last_row">
                  <th colSpan={3} scope="col" className="bggray">
                    LOWEST TOTAL ( L1 Total )
                  </th>
                  <th
                    colSpan={allvendors.length}
                    scope="col"
                    className="l1total"
                  >
                    {addCommasToNumber(l1total)}
                  </th>
                </tr>
                <tr className="last_row">
                  <th colSpan={3} scope="col">
                    Delivery{" "}
                  </th>

                  {allvendors &&
                    allvendors.length > 0 &&
                    allvendors.map((item) => {
                      return (
                        <td key={`tp_${item.id}_total`}>
                          {item?.quoted_products &&
                          item?.quoted_products?.length == 1
                            ? `Within ${
                                item.quoted_products[0] == 1
                                  ? item.quoted_products[0] || 0 + "Week"
                                  : item.quoted_products[0] || 0 + " Weeks"
                              }`
                            : `${getDeliveryRange(item.quoted_products)}`}
                        </td>
                      );
                    })}
                </tr>
                <tr className="last_row">
                  <th colSpan={3} scope="col">
                    Payment{" "}
                  </th>

                  {allvendors &&
                    allvendors.length > 0 &&
                    allvendors.map((item) => {
                      return (
                        <td key={`tp_${item.id}_total`}>
                          {item.global_payment_term[0].details
                            ? item.global_payment_term[0].details
                            : "-"}{" "}
                        </td>
                      );
                    })}
                </tr>
                <tr className="last_row">
                  <th colSpan={3} scope="col">
                    Vendor comment{" "}
                  </th>

                  {allvendors &&
                    allvendors.length > 0 &&
                    allvendors.map((item) => {
                      return (
                        <td key={`tp_${item.id}_total`}>
                          {item.global_payment_term[0].comment
                            ? item.global_payment_term[0].comment
                            : "-"}{" "}
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
        )}
      </div>
    </>
  );
};

export default OverallComparison;
