import React, { useEffect, useState } from "react";
import Link from "next/link";
import { getVendorQuoteStatus, getVendorRfqList, sendFollowUpEmail } from "@/services/rfq";
import moment from "moment";
import Pagination from "@/components/shared/Pagination";
import PlaceholderLoading from "react-placeholder-loading";
import { checkBidExpired, textCapitalize } from "@/utils/sharedFunctions";
import QuoteStatus from "@/components/modal/QuoteStatus";
import { toast } from "react-toastify";

const InquiriesReceived = ({ pageType = 0 }) => {
  const [page, setpage] = useState(1);
  const [totalData, setTotalData] = useState(100);
  const [limit, setLimit] = useState(10);
  const [rfqList, setrfqList] = useState([]);
  const [loading, setloading] = useState(false);
  const [quoteStatus, setQuoteStatus] = useState([]);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    getRFQs();
  }, [page, limit]);

  const getRFQs = () => {
    setloading(true);
    getVendorRfqList({ page, limit })
      .then((res) => {
        setloading(false);
        setrfqList(res.data);
        setTotalData(res.totalRFQ?.count)
      })
      .catch((err) => {
        setloading(false);
      });
  };

  const getProductsList = (item) => {
    if (item.products.length > 0) {
      let p = [];
      item.products.map((product) => {
        if (product?.product_details?.length > 0) {
          let n = product?.product_details[0]?.name;

          if (!p.includes(n)) {
            p.push(n);
          }
        }
      });
      return p.join(", ");
    }
  };
  const getCategories = (item) => {
    let allCats = [];
    if (item.products.length > 0) {
      item.products.map((product) => {
        if (
          product.product_categories &&
          product.product_categories.length > 0
        ) {
          product.product_categories.map((cat) =>
            allCats.push(cat.category_name)
          );
        }
      });
    }
    if (allCats.length > 0) {
      let uniqueArray = allCats.filter(function (item, pos) {
        return allCats.indexOf(item) == pos;
      });
      return uniqueArray.join(", ");
    } else {
      return "-";
    }
  };

const getQuoteStatus = async (rfq_id) => {
  try {
    const quoteStatusResponse = await getVendorQuoteStatus(rfq_id);
    if (quoteStatusResponse.data && quoteStatusResponse.data.length > 0) {
      setQuoteStatus(quoteStatusResponse.data);
    } else {
      setQuoteStatus([]); // clear if nothing
    }
    setShowModal(true); // open modal here
  } catch (err) {
    console.error("Error fetching quote status:", err);
    setQuoteStatus([]);
    setShowModal(true); // still open modal even if error
  }
};

const handleSendMail = async (item) => {
  // Build payload
  const payload = {
    buyer: {
      name: item.company_name,
      email: item.response_email,
    },
    vendor: {
      name: item.products?.[0]?.vendor_details?.[0]?.user_details?.name || "Unknown Vendor",
    },
    rfqNumber: item.rfq_no,
    rfq_id: item.id,
  };

  try {
    const response = await sendFollowUpEmail(payload);

    if (response?.status === 1) {
      toast.success(response.message || "Reminder email sent successfully!");
    } else {
      toast.error(response?.message || "Failed to send reminder email.");
    }
  } catch (error) {
    console.error("Error sending reminder email:", error);
    toast.error("An error occurred while sending the reminder email.");
  }
};




  return (
    <>
      {pageType == 0 && (
        <section className="vendor-common-header sc-pt-80">
          <div className="container-fluid">
            <h1 className="heading">Inquiries Received</h1>
          </div>
        </section>
      )}

      <section className="vendor-mngt-sec-1 hasFullLoader">
        <div className={`container-fluid ${pageType == 1 ? 'nopaddingtop' : ''}`} >
          <div className="row">
            <div className="col-md-12">
              <div className="vendor-mngt-con">

                {!loading && rfqList.length == 0 && (
                  <p className="mb-0 text-center">
                    You've not received any inqueries yet.
                  </p>
                )}

                {/* Content for Manage RFQs tab */}
                {!loading && rfqList.length > 0 && (
                  <span className="title">

                    {pageType == 0 && <>You have received { totalData } Inquiries</>}
                    {pageType == 1 && <>{rfqList.length} Latest Received Inquiries </>}
                  </span>
                )}

                <div className="details-table mb-3">
                  {loading ?
                    <div className="table-responsive">
                      <table className="table table-striped border-0 mb-0 ">
                        <thead>
                          <tr>
                            <th>RFQ ID</th>
                            <th>Products</th>
                            <th>Company</th>
                            <th>Received Date</th>
                            <th>End Date</th>
                            <th>RFQ Type</th>
                            <th>Quote Sent</th>
                            <th>Reverse Auction</th>
                            <th>RFQ Status</th>
                            <th>Action</th>
                            <th>Query</th>
                            <th>Follow Up</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td><PlaceholderLoading shape="rect" width={100} height={50} /></td>
                            <td><PlaceholderLoading shape="rect" width={100} height={50} /></td>
                            <td><PlaceholderLoading shape="rect" width={100} height={50} /></td>
                            <td><PlaceholderLoading shape="rect" width={100} height={50} /></td>
                            <td><PlaceholderLoading shape="rect" width={100} height={50} /></td>
                            <td><PlaceholderLoading shape="rect" width={100} height={50} /></td>
                            <td><PlaceholderLoading shape="rect" width={100} height={50} /></td>
                            <td><PlaceholderLoading shape="rect" width={100} height={50} /></td>
                            <td><PlaceholderLoading shape="rect" width={100} height={50} /></td>
                            <td><PlaceholderLoading shape="rect" width={100} height={50} /></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    : rfqList.length > 0 && (
                      <div className="table-responsive">
                        <table className="table table-striped border-0 mb-0 ">
                          <thead>
                            <tr>
                              <th>RFQ ID</th>
                              <th>Products</th>
                              <th>Company</th>
                              <th>Received Date</th>
                              <th>End Date</th>
                              <th>RFQ Type</th>
                              <th>Quote Sent</th>
                              <th>Reverse Auction</th>
                              <th>RFQ Status</th>
                              <th>Action</th>
                              <th>Query</th>
                              <th>Follow Up</th>
                            </tr>
                          </thead>
                          <tbody>
                            {!loading &&
                              rfqList.length > 0 &&
                              rfqList.map((item) => {
                                return (
                                  <tr key={`rfq-item-${item.rfq_no}`}>
                                    <td>#{item.rfq_no}</td>
                                    <td>{getProductsList(item)}</td>
                                    <td>{item.company_name}</td>
                                    <td>
                                      {item.timestamp != ""
                                        ? moment(item.timestamp).format(
                                            "DD/MM/YYYY"
                                          )
                                        : "--"}
                                    </td>
                                    <td>
                                      {item.bid_end_date != ""
                                        ? moment(item.bid_end_date).format(
                                            "DD/MM/YYYY"
                                          )
                                        : "--"}
                                    </td>
                                    <td>
                                      {item.rfq_type == "firm"
                                        ? "Firm"
                                        : item.rfq_type == "budgetary"
                                        ? "Budgetary"
                                        : "---"}
                                    </td>
                                    <td>
                                      {item.quote_status &&
                                        textCapitalize(item.quote_status)}
                                    </td>
                                    <td>
                                      {item.reverse_auction === 1
                                        ? "Enabled"
                                        : "Disabled"}
                                    </td>
                                    <td>
                                      {item.status === 1 ? "Open" : "Closed"}
                                    </td>
                                    <td>
                                      <span>
                                        <Link
                                          href={`/dashboard/vendor/inquiries-details?id=${item.id}`}
                                        // className="page-link"
                                        id={`${checkBidExpired(item.bid_end_date) ? "view_quote" : (item.status === 1) ? (item.quote_status === "pending" ? "send_quote" : item.quote_status === "sent" ? "edit_quote" : "view_quote") : "view_quote"}_${item.rfq_no}-rfq_actions-inquiries_received`}
                                        >
                                          {checkBidExpired(
                                            item.bid_end_date
                                          ) ? (
                                            <span className="fw-medium text-decoration-underline">
                                              View Quote
                                            </span>
                                          ) : item.status === 1 ? (
                                            item.quote_status === "pending" ? (
                                              <span className="fw-medium text-success text-decoration-underline">
                                                Send Quote
                                              </span>
                                            ) : item.quote_status === "sent" ? (
                                              <span className="fw-medium text-warning text-decoration-underline">
                                                Edit Quote
                                              </span>
                                            ) : (
                                              <span className="fw-medium text-decoration-underline">
                                                View Quote
                                              </span>
                                            )
                                          ) : (
                                            <span className="fw-medium text-decoration-underline">
                                              View Quote
                                            </span>
                                          )}
                                        </Link>
                                      </span>
                                      {/* 👇 View Status trigger */}
                                      <span
                                        className="fw-medium text-decoration-underline"
                                        onClick={() => getQuoteStatus(item.id)}
                                      >
                                        View Status
                                      </span>
                                    </td>
                                    <td>
                                      <Link
                                        href={`/dashboard/vendor/query?rfq_id=${item?.id}&role=vendor`}
                                        className={`page-link me-2 ${item.unseen_query_count!=0 && "text-danger"}`}
                                        id={`view_queries_${item.rfq_no}-rfq_actions-inquiries_received`}
                                      >
                                        {item.unseen_query_count != 0
                                          ? `View Queries (${item.unseen_query_count} New)`
                                          : "View Queries"}
                                      </Link>
                                    </td>
                                    <td>
                                      <button
                                        className="class"
                                        onClick={() => handleSendMail(item)}
                                      >
                                        Send Reminder
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>
                    )}
                </div>

                <Pagination
                  page={page}
                  setPage={setpage}
                  totalData={totalData}
                  limit={limit}
                  setLimit={setLimit}
                />

                {/* 👇 Modal - moved outside the loop and table to render only once */}
                {showModal && (
                  <QuoteStatus
                    quoteStatus={quoteStatus}
                    onClose={() => setShowModal(false)}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default InquiriesReceived;