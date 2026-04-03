import Image from "next/image";
import React, { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser } from "@fortawesome/free-solid-svg-icons";
import { Chart } from "chart.js";
import Head from "next/head";
import { getVendorDashboardData } from "@/services/cms";
import {
  getDashboardData
} from "@/services/Auth";
import FullLoader from "@/components/shared/FullLoader";
import InquiriesReceived from "./inquiries-received";
import StarRating from "@/components/StarRating";
import SubscriptionStatus from "./SubscriptionStatus";
import moment from "moment";

const Vendor = () => {
  const canvasRef = useRef();
  const reduxUserProfile = useSelector((state) => state.userProfile);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setloading] = useState(false);

  const isHospitalityVendor =
    reduxUserProfile &&
    (reduxUserProfile.is_hospitality === 1 || reduxUserProfile.is_hospitality === '1');

  useEffect(() => {
    if (!reduxUserProfile) return;

    // Always load dashboard data (even for expired hospitality vendors — read-only)
    setloading(true);
    getDashboardData({
      project_id: -1,
      rfq_type: "",
      reverse_auction: "-1",
      sort: "DESC",
      page: 1
    })
      .then((res) => {
        setloading(false);
        setDashboardData(res.data);
      })
      .catch((err) => {
        setloading(false);
        console.error(err);
      });
  }, [reduxUserProfile]);


  const get_notification_title = (item, type) => {
    if (type == "title") {
      if (item.notification_type == "new_rfq_received") {
        return "New Tender / RFQ Received";
      } else if (item.notification_type == "quote_submitted") {
        return "You've submitted a quotation!";
      } else if (item.notification_type == "add_product") {
        return "You've added a product";
      }
    } else {
      if (item.notification_type == "new_rfq_received") {
        return `#${item.rfq_no} Received a new Tender / RFQ request from ${item.company_name}`;
      } else if (item.notification_type == "quote_submitted") {
        return `You've submitted a quotation for Tender / RFQ #${item.rfq_no}`;
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
          {/* Subscription status banner for hospitality vendors */}
          {isHospitalityVendor && (
            <SubscriptionStatus onPaymentSuccess={() => window.location.reload()} />
          )}

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
                  <span>Closed Tender / RFQs</span>
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
                                  "DD-MM-YYYY"
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
                                    "DD-MM-YYYY hh:mm:ss A"
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
          <InquiriesReceived pageType={1} />

        </div>
      </section>
    </>
  );
};

export default Vendor;
