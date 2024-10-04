import React, { useEffect, useState } from "react";
import Link from "next/link";
import { getVendorRfqList } from "@/services/rfq";
import moment from "moment";
import Pagination from "@/components/shared/Pagination";
import PlaceholderLoading from "react-placeholder-loading";

const InquiriesReceived = ({ pageType = 0 }) => {
  const [page, setpage] = useState(1);
  const [totalData, setTotalData] = useState(100);
  const [limit, setLimit] = useState(10);
  const [rfqList, setrfqList] = useState([]);
  const [loading, setloading] = useState(false);

  useEffect(() => {
    getRFQs();
  }, [page, limit]);

  const getRFQs = () => {
    setloading(true);
    getVendorRfqList({ page, limit })
      .then((res) => {
        setloading(false);
        setrfqList(res.data);
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

  const textCapitalize = (str) => {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

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

                    {pageType == 0 && <>You have received {rfqList.length} Inquiries</>}
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
                            <th>Quote Sent</th>
                            <th>RFQ Status</th>
                            <th>Action</th>
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
                              <th>Quote Sent</th>
                              <th>RFQ Status</th>
                              <th>Action</th>
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
                                      {item.quote_status && <span class={`fw-semibold ${item.quote_status == "sent" ? 'text-success' : item.quote_status == "regret" ? 'text-danger' : 'text-warning'}`}>{textCapitalize(item.quote_status)}</span>}
                                    </td>
                                    <td>
                                      {item.status == 1 ?
                                        <span className="fw-medium">Open</span> :
                                        <span className="fw-semibold text-danger">Closed</span>
                                      }
                                    </td>
                                    <td>
                                      <span>
                                        <Link
                                          href={`/dashboard/vendor/inquiries-details?id=${item.id}`}
                                          className="page-link"
                                        >
                                          View
                                        </Link>
                                      </span>
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
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default InquiriesReceived;
