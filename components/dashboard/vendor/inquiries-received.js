import React, { useEffect, useState } from "react";
import Link from "next/link";
import { getVendorRfqList } from "@/services/rfq";
import FullLoader from "@/components/shared/FullLoader";
import moment from "moment";

const InquiriesReceived = ({pageType = 0}) => {
  const [page, setpage] = useState(1);
  const [limit, setlimit] = useState(10);
  const [rfqList, setrfqList] = useState([]);
  const [loading, setloading] = useState(false);

  useEffect(() => {
    getRFQs();
  }, []);

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
    console.log("prod", item.products);
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
        {loading && <FullLoader />}

        <div className={`container-fluid ${pageType == 1?'nopaddingtop':''}`} >    
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

                <div className="details-table">
                  {!loading && rfqList.length > 0 && (
                    <div className="table-responsive">
                      <table className="table table-striped ">
                        <thead>
                          <tr>
                            <th>RFQ ID</th>
                            {/* <th style={{ width: 300 }}>Category</th> */}
                            <th>Products</th>
                            <th>Company</th>
                            <th>End Date</th>
                            <th>Received Date</th>
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
                                  {/* <td>{getCategories(item)}</td> */}
                                  <td>{getProductsList(item)}</td>
                                  <td>{item.company_name}</td>
                                  <td>
                                    {item.bid_end_date != ""
                                      ? moment(item.bid_end_date).format(
                                          "DD/MM/YYYY"
                                        )
                                      : "--"}
                                  </td>
                                  <td>
                                    {item.timestamp != ""
                                      ? moment(item.timestamp).format(
                                          "DD/MM/YYYY"
                                        )
                                      : "--"}
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
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default InquiriesReceived;
