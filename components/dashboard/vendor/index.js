import Image from "next/image";
import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser } from "@fortawesome/free-solid-svg-icons";
import { Chart } from "chart.js";
import Head from "next/head";
import { getVendorDashboardData } from "@/services/cms";
import {
  getDashboardData,
  getProfile
} from "@/services/Auth";
import {
  hospitalitySubscriptionPayment,
  loadScript,
  testRazorPayEndpoint
} from "@/services/subscription";
import FullLoader from "@/components/shared/FullLoader";
import InquiriesReceived from "./inquiries-received";
import StarRating from "@/components/StarRating";
import moment from "moment";
import { toast } from "react-toastify";

const Vendor = () => {
  const canvasRef = useRef();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setloading] = useState(false);
  const [hospitalityPaymentTriggered, setHospitalityPaymentTriggered] =
    useState(false);
  const [hasValidSubscription, setHasValidSubscription] = useState(true);


  useEffect(() => {
    // Check if hospitality vendor has paid
    const checkHospitalityPayment = async () => {
      try {
        const profileResponse = await getProfile();
        const userProfile = profileResponse.data;
        
        // Check if user is hospitality vendor
        if (userProfile.is_hospitality === 1 || userProfile.is_hospitality === '1') {
          // Check if user has valid paid subscription
          const hasValidSubscription = userProfile.has_valid_hospitality_subscription === true;
          setHasValidSubscription(hasValidSubscription);
          
          // If no valid subscription, block access and trigger payment
          if (!hasValidSubscription) {
            if (!hospitalityPaymentTriggered) {
              await triggerHospitalityPayment(userProfile);
            }
            return;
          }
        }
        
        // Only load dashboard data if vendor has valid subscription or is not hospitality vendor
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
      } catch (error) {
        console.error('Error checking hospitality payment status:', error);
        setloading(false);
      }
    };

    checkHospitalityPayment();
  }, [hospitalityPaymentTriggered]);

  const triggerHospitalityPayment = async (profile) => {
    try {
      setHospitalityPaymentTriggered(true);
      setHasValidSubscription(false);
      toast.warning(
        'Payment required for hospitality vendors. Opening payment gateway...'
      );

      // Get user_key from profile (added by backend)
      const user_key = profile.user_key;
      if (!user_key) {
        throw new Error('User key not found');
      }

      // Use pending categories/subcategories/hotels from profile, or empty arrays
      const categories = profile.pending_hospitality_categories || [];
      const subcategories = profile.pending_hospitality_subcategories || [];
      const hotels = profile.pending_hospitality_hotels || [];

      const payload = {
        user_key: user_key,
        categories: categories,
        subcategories: subcategories,
        hotels: hotels
      };

      const response = await hospitalitySubscriptionPayment(payload);
      if (response?.status === 1 && response?.data) {
        await payWithRazorPay(response.data);
      } else {
        setHospitalityPaymentTriggered(false);
        setHasValidSubscription(true);
        toast.error(response?.message || 'Unable to initiate payment. Please try again.');
      }
    } catch (error) {
      setHospitalityPaymentTriggered(false);
      setHasValidSubscription(true);
      console.error('Hospitality payment error:', error);
      toast.error(error?.response?.data?.message || 'Failed to start payment. Please try again.');
    }
  };

  const payWithRazorPay = async (orderId) => {
    const res = await loadScript(
      'https://checkout.razorpay.com/v1/checkout.js'
    );

    if (!res) {
      toast.error('Razorpay SDK failed to load. Are you online?');
      setHospitalityPaymentTriggered(false);
      return;
    }

    const options = {
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY,
      order_id: orderId,
      currency: 'INR',
      name: 'Workwise',
      description: 'Hospitality Vendor Subscription',
      image: '/assets/images/logo.png',
      handler: function (response) {
        const payload = {
          order_id: orderId,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_order_id: response.razorpay_order_id,
          razorpay_signature: response.razorpay_signature
        };
        testRazorPayEndpoint(payload)
          .then(() => {
            setHospitalityPaymentTriggered(false);
            setHasValidSubscription(true);
            toast.success(
              'Payment successful! Refreshing your dashboard...'
            );
            setTimeout(() => {
              window.location.reload();
            }, 2000);
          })
          .catch(() => {
            setHospitalityPaymentTriggered(false);
            toast.success(
              'Payment captured. Please refresh the page after a minute.'
            );
            setTimeout(() => {
              window.location.reload();
            }, 60000);
          });
      },
      prefill: {
        name: '',
        email: '',
        contact: ''
      },
      notes: {
        address: 'India'
      },
      theme: {
        color: '#158993'
      }
    };

    const paymentObject = new window.Razorpay(options);
    paymentObject.open();
  };


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

  if (!hasValidSubscription && hospitalityPaymentTriggered) {
    return (
      <>
        <Head>
          <title>Payment Required | Vendor</title>
        </Head>
        <section className="vendor-common-header sc-pt-80">
          <div className="container-fluid">
            <h1 className="heading">Payment Required</h1>
          </div>
        </section>
        <section className="vendor-sec-1">
          <div className="container-fluid">
            <div className="row">
              <div className="col-12">
                <div className="alert alert-warning text-center" role="alert">
                  <h4>Payment Required</h4>
                  <p>You need to complete your hospitality subscription payment to access the vendor dashboard.</p>
                  <p>Please complete the payment in the Razorpay popup window.</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </>
    );
  }

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

          </div>
          <InquiriesReceived pageType={1} />

        </div>
      </section>
    </>
  );
};

export default Vendor;
