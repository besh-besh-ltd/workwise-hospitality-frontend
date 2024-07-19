import Image from "next/image";
import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser } from "@fortawesome/free-solid-svg-icons";
import { Chart } from "chart.js";
import Head from "next/head";
import { getVendorDashboardData } from "@/services/cms";
import { getDashboardData } from "@/services/Auth";
import FullLoader from "@/components/shared/FullLoader";
import InquiriesReceived from "./inquiries-received";
import StarRating from "@/components/StarRating";
import moment from "moment";

const Vendor = () => {
  const canvasRef = useRef();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setloading] = useState(false);

  // useEffect(() => {
  //   var config = {
  //     type: "line",
  //     data: {
  //       labels: [
  //         "Jan",
  //         "Mar",
  //         "May",
  //         "Jul",
  //         "Aug",
  //         "Oct",
  //         "Dec",
  //       ],
  //       datasets: [
  //         {
  //           label: 'Earning',
  //           fill: false,
  //           backgroundColor: "#FFA500",
  //           borderColor: "#FFA500",
  //           data: [25, 38, 12, 66, 44, 5, 56,],
  //         },
  //         {
  //           label: 'Invested',
  //           fill: false,
  //           backgroundColor: "#000080",
  //           borderColor: "#000080",
  //           data: [15, 28, 22, 56, 34, 52, 36],
  //         },
  //         {
  //           label: 'Expenses',
  //           fill: false,
  //           backgroundColor: "#18CE98",
  //           borderColor: "#18CE98",
  //           data: [56, 34, 52, 36, 15, 28, 22],
  //         },
  //       ],
  //     },
  //     options: {
  //       maintainAspectRatio: false,
  //       responsive: true,
  //       title: {
  //         display: false,
  //         text: "Sales Charts",
  //         fontColor: "#525252",
  //       },
  //       legend: {
  //         labels: {
  //           fontColor: "#525252",
  //         },
  //         align: "end",
  //         position: "bottom",
  //       },
  //       tooltips: {
  //         mode: "index",
  //         intersect: false,
  //       },
  //       hover: {
  //         mode: "nearest",
  //         intersect: false,
  //       },
  //       scales: {
  //         xAxes: [
  //           {
  //             ticks: {
  //               fontColor: "#525252",
  //             },
  //             display: true,
  //             scaleLabel: {
  //               display: false,
  //               labelString: "Month",
  //               fontColor: "#525252",
  //             },
  //             gridLines: {
  //               display: false,
  //               borderDash: [2],
  //               borderDashOffset: [2],
  //               color: "#D3D3D3",
  //               zeroLineColor: "#D3D3D3",
  //               zeroLineBorderDash: [2],
  //               zeroLineBorderDashOffset: [2],
  //             },
  //           },
  //         ],
  //         yAxes: [
  //           {
  //             ticks: {
  //               fontColor: "#525252",
  //             },
  //             display: true,
  //             scaleLabel: {
  //               display: false,
  //               labelString: "Value",
  //               fontColor: "#525252",
  //             },
  //             gridLines: {
  //               borderDash: [3],
  //               borderDashOffset: [3],
  //               drawBorder: true,
  //               color: "#D3D3D3",
  //               zeroLineColor: "#D3D3D3",
  //               zeroLineBorderDash: [4],
  //               zeroLineBorderDashOffset: [4],
  //             },
  //           },
  //         ],
  //       },
  //     },
  //   };
  //   var ctx = document.getElementById("line-chart").getContext("2d");
  //   window.myLine = new Chart(ctx, config);
  // }, []);

  useEffect(() => {
    setloading(true);
    getDashboardData()
      .then((res) => {
        setloading(false);
        setDashboardData(res.data);
      })
      .catch((err) => {
        setloading(true);
        console.error(err);
      });
  }, []);

  // useEffect(() => {
  //   getVendorDashboardDetails()
  // }, [])
  // const getVendorDashboardDetails = ()=>{
  //   getVendorDashboardData().then(res=>{
  //     console.log(res)
  //   }).catch(err=>{
  //     console.log(err)
  //   })
  // }

  const get_notification_title = (item, type) => {
    if (type == "title") {
      if (item.notification_type == "new_rfq_received") {
        return "New RFQ Received";
      } else if (item.notification_type == "quote_submitted") {
        return "You've submitted a quotation!";
      } else if (item.notification_type == "add_product") {
        return "You've added a product";
      }
    } else {
      if (item.notification_type == "new_rfq_received") {
        return `#${item.rfq_no} Received a new RFQ request from ${item.company_name}`;
      } else if (item.notification_type == "quote_submitted") {
        return `You've submitted a quotation for RFQ #${item.rfq_no}`;
      } else if (item.notification_type == "add_product") {
        return `You've added ${item.product_name}`;
      }
    }
  };

  return (
    <>
      <Head>
        <title>Dashboard | Vendor</title>
      </Head>
      <section className="vendor-common-header sc-pt-80">
        <div className="container-fluid">
          <h1 className="heading">Dashboard</h1>
        </div>
      </section>

      <section className="vendor-sec-1">
        <div className="container-fluid">
          <div className="row">
            <div className="col-lg-3 col-md-6 buyer-col hasFullLoader">
              {loading && <FullLoader />}
              <div className="detail-con">
                <div className="detail-con-text">
                  <h2>{dashboardData?.total_rfq_received}</h2>
                  <span>Total Enquiries Received</span>
                </div>

                <div className="detail-con-icon buy">
                  <Image
                    src="/assets/images/buy-icon.png"
                    alt="Workwise"
                    width={30}
                    height={30}
                    priority={true}
                  />
                </div>
              </div>
            </div>
            <div className="col-lg-3 col-md-6 buyer-col hasFullLoader">
              {loading && <FullLoader />}
              <div className="detail-con">
                <div className="detail-con-text">
                  <h2>{dashboardData?.quotes_sent}</h2>
                  <span>Total Quotes sent</span>
                </div>
                <div className="detail-con-icon p-order">
                  <Image
                    src="/assets/images/p-order-icon.png"
                    alt="Workwise"
                    width={26}
                    height={30}
                    priority={true}
                  />
                </div>
              </div>
            </div>

            <div className="col-lg-3 col-md-6 buyer-col hasFullLoader">
              {loading && <FullLoader />}
              <div className="detail-con">
                <div className="detail-con-text">
                  <h2>
                    {dashboardData?.total_rfq_received -
                      dashboardData?.quotes_sent}
                  </h2>
                  <span>Pending Quotes</span>
                </div>
                <div className="detail-con-icon reject">
                  <Image
                    src="/assets/images/earn-icon.png"
                    alt="Workwise"
                    width={24}
                    height={30}
                    priority={true}
                  />
                </div>
              </div>
            </div>
            <div className="col-lg-3 col-md-6 buyer-col hasFullLoader">
              {loading && <FullLoader />}
              <div className="detail-con">
                <div className="detail-con-text">
                  <h2>{dashboardData?.closed_rfqs}</h2>
                  <span>Closed RFQs</span>
                </div>
                <div className="detail-con-icon reject">
                  <Image
                    src="/assets/images/earn-icon.png"
                    alt="Workwise"
                    width={24}
                    height={30}
                    priority={true}
                  />
                </div>
              </div>
            </div>
            <div className="col-lg-3 col-md-6 buyer-col hasFullLoader">
              {loading && <FullLoader />}
              <div className="detail-con">
                <div className="detail-con-text">
                  <h2>{dashboardData?.totalProducts}</h2>
                  <span>Total Products</span>
                </div>
                <div className="detail-con-icon reject">
                  <Image
                    src="/assets/images/box.png"
                    alt="Workwise"
                    width={24}
                    height={30}
                    priority={true}
                  />
                </div>
              </div>
            </div>
            <div className="col-lg-3 col-md-6 buyer-col hasFullLoader">
              {loading && <FullLoader />}
              <div className="detail-con">
                <div className="detail-con-text">
                  <h2>{dashboardData?.totalReviewedProducts}</h2>
                  <span>Reviewed Products</span>
                </div>
                <div className="detail-con-icon reject">
                  <Image
                    src="/assets/images/order.png"
                    alt="Workwise"
                    width={24}
                    height={30}
                    priority={true}
                  />
                </div>
              </div>
            </div>
            <div className="col-lg-3 col-md-6 buyer-col hasFullLoader">
              {loading && <FullLoader />}
              <div className="detail-con">
                <div className="detail-con-text">
                  <h2>{dashboardData?.totalPendingProducts}</h2>
                  <span>Pending Review Products</span>
                </div>
                <div className="detail-con-icon reject">
                  <Image
                    src="/assets/images/new-product.png"
                    alt="Workwise"
                    width={24}
                    height={30}
                    priority={true}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="row mb-4">
            <div className="col-md-4 hasFullLoader">
              {loading && <FullLoader />}
              <div className="recent-activity">
                <div className="recent-activity-top">
                  <h4>Latest Reviews</h4>
                </div>
                <div className="recent-activity-bottom">
                  {dashboardData?.vendor_reviews?.length > 0 ? (
                    <ul>
                      {dashboardData?.vendor_reviews.map((item) => {
                        return (
                          <li>
                            <h5>
                              <p>
                                {moment(item.review_date).format(
                                  "D MMMM, YYYY"
                                )}
                              </p>
                              <span className="">
                                {" "}
                                {item.rating}/5
                                <StarRating
                                  totalStars={5}
                                  value={item.rating}
                                  onRatingChange={null}
                                />
                              </span>
                            </h5>
                            <p>{item.description}</p>
                            <p>
                              <span className="user-icon">
                                <FontAwesomeIcon icon={faUser} />
                              </span>
                              <span>{item.name}</span>
                            </p>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p>No Reviews Yet!</p>
                  )}
                </div>
              </div>
            </div>
            <div className="col-md-4 hasFullLoader">
              {loading && <FullLoader />}
              <div className="recent-activity">
                <div className="recent-activity-top">
                  <h4>Latest Activity</h4>
                </div>
                <div className="recent-activity-bottom">
                  {dashboardData?.latest_notifications?.length > 0 ? (
                    <ul>
                      {dashboardData?.latest_notifications.map((item) => {
                        return (
                          <li>
                            <h5>
                              <p>{get_notification_title(item, "title")}</p>
                              <span>
                                <div className="badge badge-primary">
                                  {moment(item.readable_date_time).format(
                                    "D MMMM, YYYY on HH:mm:ss A"
                                  )}
                                </div>
                              </span>
                            </h5>
                            <p>{get_notification_title(item, "description")}</p>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p>No Reviews Yet!</p>
                  )}
                </div>
              </div>
            </div>
            {/* <div className="col-md-7">
              <div className="buy-stats">
                <div className="buy-stats-header">
                  <h3 className="title">Revenue Report</h3>
                </div>
                <div className="buy-stats-container position-relative h-450-px">
                  <canvas id="line-chart" ref={canvasRef}></canvas>
                </div>
              </div>
            </div> */}
            {/* <div className="col-md-5">
              <div className="recent-activity">
                <div className="recent-activity-top">
                  <h4>Recent Activity</h4>
                </div>
                <div className="recent-activity-bottom">
                  <ul>
                    <li>
                      <h5>
                        <p>Your account is logged in</p>
                        <span>45 min ago</span>
                      </h5>
                      <p>
                        Nunc sed sem nec nunc volutpat fringilla. Proin in
                        condimentum ligula.
                      </p>
                      <p>
                        <span className="user-icon">
                          <FontAwesomeIcon icon={faUser} />
                        </span>
                        <span>Wade Warren</span>
                      </p>
                    </li>

                    <li>
                      <h5>
                        <p>Your account is logged in Just</p>
                        <span>45 min ago</span>
                      </h5>
                      <p>
                        Nunc sed sem nec nunc volutpat fringilla. Proin in
                        condimentum ligula.
                      </p>
                      <p>
                        <span className="user-icon">
                          <FontAwesomeIcon icon={faUser} />
                        </span>
                        <span>Ronald Richards</span>
                      </p>
                    </li>

                    <li>
                      <h5>
                        <p>Your account is logged in</p>
                        <span>45 min ago</span>
                      </h5>
                      <p>
                        Nunc sed sem nec nunc volutpat fringilla. Proin in
                        condimentum ligula.
                      </p>
                      <p>
                        <span className="user-icon">
                          <FontAwesomeIcon icon={faUser} />
                        </span>
                        <span>Kristin Watson</span>
                      </p>
                    </li>
                  </ul>
                </div>
              </div>
            </div> */}
          </div>
          <InquiriesReceived pageType={1} />

          {/* <div className="best-selling">
            <div className="table-header">
              <h3 className="title">Best Selling Product</h3>
            </div>
            <div className="details-table">
              <div className="table-responsive">
                <table className="table table-striped">
                  <thead>
                    <tr>
                      <th>RFQ Code</th>
                      <th>Name of product</th>
                      <th>Category</th>
                      <th>Status</th>
                      <th>Price</th>
                      <th>Stock</th>
                      <th>Rating</th>
                      <th>Order</th>
                      <th>Sales</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>123</td>
                      <td>Carbon steel pipes</td>
                      <td>Piping</td>
                      <td>Open</td>
                      <td>5400</td>
                      <td>20</td>
                      <td>4.8</td>
                      <td>540</td>
                      <td>5400</td>
                      <td>
                        <span>
                          <Link
                            href="rfq-management-vendor"
                            className="page-link"
                          >
                            View
                          </Link>
                        </span>
                      </td>
                    </tr>

                    <tr>
                      <td>123</td>
                      <td>Carbon steel pipes</td>
                      <td>Piping</td>
                      <td>Open</td>
                      <td>5400</td>
                      <td>20</td>
                      <td>4.8</td>
                      <td>540</td>
                      <td>5400</td>
                      <td>
                        <span>
                          <Link
                            href="rfq-management-vendor"
                            className="page-link"
                          >
                            View
                          </Link>
                        </span>
                      </td>
                    </tr>

                    <tr>
                      <td>123</td>
                      <td>Carbon steel pipes</td>
                      <td>Piping</td>
                      <td>Open</td>
                      <td>5400</td>
                      <td>20</td>
                      <td>4.8</td>
                      <td>540</td>
                      <td>5400</td>
                      <td>
                        <span>
                          <Link
                            href="rfq-management-vendor"
                            className="page-link"
                          >
                            View
                          </Link>
                        </span>
                      </td>
                    </tr>

                    <tr>
                      <td>123</td>
                      <td>Carbon steel pipes</td>
                      <td>Piping</td>
                      <td>Open</td>
                      <td>5400</td>
                      <td>20</td>
                      <td>4.8</td>
                      <td>540</td>
                      <td>5400</td>
                      <td>
                        <span>
                          <Link
                            href="rfq-management-vendor"
                            className="page-link"
                          >
                            View
                          </Link>
                        </span>
                      </td>
                    </tr>

                    <tr>
                      <td>123</td>
                      <td>Carbon steel pipes</td>
                      <td>Piping</td>
                      <td>Open</td>
                      <td>5400</td>
                      <td>20</td>
                      <td>4.8</td>
                      <td>540</td>
                      <td>5400</td>
                      <td>
                        <span>
                          <Link
                            href="rfq-management-vendor"
                            className="page-link"
                          >
                            View
                          </Link>
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="table-footer">
                <span>Showing 4 of 20 results</span>
                <div className="pagination">
                  <Link href="#" className="page-link">
                    Previous
                  </Link>
                  <input type="text" value="01" />
                  <Link href="#" className="page-link">
                    Next
                  </Link>
                </div>
              </div>
            </div>
          </div> */}
        </div>
      </section>
    </>
  );
};

export default Vendor;
