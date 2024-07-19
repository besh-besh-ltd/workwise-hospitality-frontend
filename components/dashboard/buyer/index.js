import Image from "next/image";
import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Chart } from "chart.js";
import Head from "next/head";
import { getDashboardData } from "@/services/Auth";
import FullLoader from "@/components/shared/FullLoader";
import ManageRFQ from "./manageRFQ/ManageRFQ";
import moment from "moment";

const BuyerPage = () => {
  const canvasRef = useRef();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setloading] = useState(false);

  useEffect(() => {
    // var config = {
    //   type: "line",
    //   data: {
    //     labels: [
    //       "Jan",
    //       "Feb",
    //       "Mar",
    //       "Apr",
    //       "May",
    //       "Jun",
    //       "Jul",
    //       "Aug",
    //       "Sep",
    //       "Oct",
    //       "Nov",
    //       "Dec",
    //     ],
    //     datasets: [
    //       {
    //         label: new Date().getFullYear(),
    //         fill: false,
    //         backgroundColor: "#FFA500",
    //         borderColor: "#FFA500",
    //         data: [25, 38, 12, 66, 44, 5, 56, 67, 75, 10, 20, 54],
    //       },
    //       {
    //         label: new Date().getFullYear() - 1,
    //         fill: false,
    //         backgroundColor: "#000080",
    //         borderColor: "#000080",
    //         data: [15, 28, 22, 56, 34, 52, 36, 47, 65, 25, 40, 34],
    //       },
    //     ],
    //   },
    //   options: {
    //     maintainAspectRatio: false,
    //     responsive: true,
    //     title: {
    //       display: false,
    //       text: "Sales Charts",
    //       fontColor: "#525252",
    //     },
    //     legend: {
    //       labels: {
    //         fontColor: "#525252",
    //       },
    //       align: "end",
    //       position: "bottom",
    //     },
    //     tooltips: {
    //       mode: "index",
    //       intersect: false,
    //     },
    //     hover: {
    //       mode: "nearest",
    //       intersect: false,
    //     },
    //     scales: {
    //       xAxes: [
    //         {
    //           ticks: {
    //             fontColor: "#525252",
    //           },
    //           display: true,
    //           scaleLabel: {
    //             display: false,
    //             labelString: "Month",
    //             fontColor: "#525252",
    //           },
    //           gridLines: {
    //             display: false,
    //             borderDash: [2],
    //             borderDashOffset: [2],
    //             color: "#D3D3D3",
    //             zeroLineColor: "#D3D3D3",
    //             zeroLineBorderDash: [2],
    //             zeroLineBorderDashOffset: [2],
    //           },
    //         },
    //       ],
    //       yAxes: [
    //         {
    //           ticks: {
    //             fontColor: "#525252",
    //           },
    //           display: true,
    //           scaleLabel: {
    //             display: false,
    //             labelString: "Value",
    //             fontColor: "#525252",
    //           },
    //           gridLines: {
    //             borderDash: [3],
    //             borderDashOffset: [3],
    //             drawBorder: true,
    //             color: "#D3D3D3",
    //             zeroLineColor: "#D3D3D3",
    //             zeroLineBorderDash: [4],
    //             zeroLineBorderDashOffset: [4],
    //           },
    //         },
    //       ],
    //     },
    //   },
    // };
    // var ctx = document.getElementById("line-chart")?.getContext("2d");
    // window.myLine = new Chart(ctx, config);
  }, []);

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

  const convertMinutesToHoursAndMinutes = (totalMinutes) => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return {
      hours: hours,
      minutes: minutes,
    };
  };
  const getTimeSavings = () => {
    let m =
      (dashboardData.active_rfqs + dashboardData.completed_rfqs) * 5 +
      dashboardData.quote_received * 10;
    const time = convertMinutesToHoursAndMinutes(m);
    return `${time.hours} hrs ${time.minutes} mins`;
  };

  const get_notification_title = (item, type) => {
    if (type == "title") {
      if (item.notification_type == "new_quote_received") {
        return "New Quotation Received";
      } else if (item.notification_type == "rfq_created") {
        return "New RFQ Created";
      }
    } else {
      if (item.notification_type == "new_quote_received") {
        return `You've received a new quotation on RFQ #${item.rfq_no}`;
      } else if (item.notification_type == "rfq_created") {
        return `You've created a new RFQ #${item.rfq_no} and shared with the buyers!`;
      } 
    }
  };

  return (
    <>
      <Head>
        <title>Dashboard | Buyer</title>
      </Head>
      <section className="buyer-common-header sc-pt-80">
        <div className="container-fluid">
          <h1 className="heading">Dashboard</h1>
        </div>
      </section>

      <section className="buyer-sec-1">
        <div className="container-fluid">
          <div className="row">
            <div className="col-lg-3 col-md-6 buyer-col hasFullLoader">
              {loading && <FullLoader />}
              <div className="detail-con">
                <div className="detail-con-text">
                  <h2>
                    {dashboardData?.active_rfqs
                      ? dashboardData?.active_rfqs
                      : 0}
                  </h2>
                  <span>Active RFQs</span>
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
            {/* <div className="col-lg-3 col-md-6 buyer-col">
                            <div className="detail-con">
                                <div className="detail-con-text">
                                    <h2>1.8K</h2>
                                    <span>Unread Messages</span>
                                </div>
                                <div className="detail-con-icon message">
                                    <Image src="/assets/images/message-icon.png" alt="Workwise" width={31.67} height={24} priority={true} />
                                </div>
                            </div>
                        </div> */}
            <div className="col-lg-3 col-md-6 buyer-col hasFullLoader">
              {loading && <FullLoader />}
              <div className="detail-con">
                <div className="detail-con-text">
                  <h2>
                    {dashboardData?.completed_rfqs
                      ? dashboardData?.completed_rfqs
                      : 0}
                  </h2>
                  <span>Completed RFQs</span>
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
                  <h2>
                    {dashboardData?.pending_responses
                      ? dashboardData?.pending_responses
                      : 0}
                  </h2>
                  <span>Pending Responses</span>
                </div>
                <div className="detail-con-icon reject">
                  <Image
                    src="/assets/images/reject-icon.png"
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
                  {dashboardData && <h2>{getTimeSavings()}</h2>}
                  <span>Time Savings</span>
                </div>
                <div className="detail-con-icon reject">
                  <Image
                    src="/assets/images/reject-icon.png"
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
                  <h2>
                    &#8377;
                    {dashboardData?.savings
                      ? dashboardData?.savings.toLocaleString()
                      : 0}
                  </h2>
                  <span>Your Savings</span>
                </div>
                <div className="detail-con-icon reject">
                  <Image
                    src="/assets/images/buy-icon.png"
                    alt="Workwise"
                    width={24}
                    height={30}
                    priority={true}
                  />
                </div>
              </div>
            </div>
          </div>
          <section className="vendor-sec-1"> 
            <div className="container-fluid" style={{marginTop:0, paddingTop:0,paddingLeft:0}}>        
              <div className="row">
                <div className="col-md-4 hasFullLoader">
                    {loading && <FullLoader />}
                    <div className="recent-activity">
                      <div className="recent-activity-top">
                        <h4>Latest Activity</h4>
                      </div>
                      <div className="recent-activity-bottom">
                        {dashboardData?.notificaiton_data?.length > 0 ? (
                          <ul>
                            {dashboardData?.notificaiton_data.map((item) => {
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
              </div>
            </div>  
          </section>

          {/* <div className="buy-stats">
            <div className="buy-stats-header">
              <h3 className="title">Buying Statistics</h3>
            </div>
            <div className="buy-stats-container position-relative h-450-px">
              <canvas id="line-chart" ref={canvasRef}></canvas>
            </div>
          </div> */}

          <div className="recent-orders">
            <ManageRFQ />
            {/* <div className="table-header">
              <h3 className="title">Recent RFQs</h3>
            </div>
            <div className="details-table">
              <div className="table-responsive">
                <table className="table table-striped ">
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
                      <th>Comments</th>
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
                      <td>Quisque semper at</td>
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
                      <td>Quisque semper at</td>
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
                      <td>Quisque semper at</td>
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
                      <td>Quisque semper at</td>
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
                      <td>Quisque semper at</td>
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
            </div> */}
          </div>
        </div>
      </section>
    </>
  );
};

export default BuyerPage;
