import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import Head from "next/head";
import { Package, FileText, Send, Clock, CheckCircle, AlertCircle, Star } from "lucide-react";
import { getDashboardData } from "@/services/Auth";
import InquiriesReceived from "./inquiries-received";
import SubscriptionStatus from "./SubscriptionStatus";
import moment from "moment";
import styles from "./VendorDashboard.module.scss";

const STAT_CARDS = [
  { key: "total_rfq_received", label: "Enquiries Received", icon: FileText, color: "#2E5BA8" },
  { key: "quotes_sent", label: "Quotes Sent", icon: Send, color: "#428B41" },
  { key: "pending_quotes", label: "Pending Quotes", icon: Clock, color: "#f59e0b", computed: true },
  { key: "closed_rfqs", label: "Closed RFQs", icon: CheckCircle, color: "#6b7280" },
  { key: "totalProducts", label: "Total Products", icon: Package, color: "#8b5cf6" },
  { key: "totalReviewedProducts", label: "Reviewed", icon: CheckCircle, color: "#22c55e" },
  { key: "totalPendingProducts", label: "Pending Review", icon: AlertCircle, color: "#ef4444" },
];

const Vendor = () => {
  const reduxUserProfile = useSelector((state) => state.userProfile);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(false);

  const isHospitalityVendor =
    reduxUserProfile &&
    (reduxUserProfile.is_hospitality === 1 || reduxUserProfile.is_hospitality === '1');

  const firstName = reduxUserProfile?.name?.split(" ")?.[0] || "there";

  useEffect(() => {
    if (!reduxUserProfile) return;
    setLoading(true);
    getDashboardData({
      project_id: -1,
      rfq_type: "",
      reverse_auction: "-1",
      sort: "DESC",
      page: 1,
    })
      .then((res) => {
        setLoading(false);
        setDashboardData(res.data);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [reduxUserProfile]);

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good Morning";
    if (h < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const getStatValue = (card) => {
    if (card.computed && card.key === "pending_quotes") {
      return (dashboardData?.total_rfq_received || 0) - (dashboardData?.quotes_sent || 0);
    }
    return dashboardData?.[card.key] ?? 0;
  };

  return (
    <>
      <Head>
        <title>Dashboard | Vendor</title>
      </Head>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.greeting}>{getGreeting()}, {firstName}! 👋</h1>
          <p className={styles.subtitle}>Here's your vendor activity overview.</p>
        </div>

        {/* Subscription Banner */}
        {isHospitalityVendor && <SubscriptionStatus />}

        {/* Stats Grid */}
        <div className={styles.statsGrid}>
          {STAT_CARDS.map((card) => {
            const Icon = card.icon;
            const value = getStatValue(card);
            return (
              <div key={card.key} className={styles.statCard}>
                <div className={styles.statIcon} style={{ background: `${card.color}10`, color: card.color }}>
                  <Icon size={20} />
                </div>
                <div className={styles.statInfo}>
                  <span className={styles.statValue}>{loading ? "–" : value}</span>
                  <span className={styles.statLabel}>{card.label}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Activity Section */}
        <div className={styles.activityGrid}>
          {/* Latest Reviews */}
          <div className={styles.activityCard}>
            <h3 className={styles.cardTitle}>Latest Reviews</h3>
            <div className={styles.cardBody}>
              {dashboardData?.vendor_reviews?.length > 0 ? (
                dashboardData.vendor_reviews.map((item, i) => (
                  <div key={i} className={styles.activityItem}>
                    <div className={styles.activityTop}>
                      <span className={styles.activityDate}>{moment(item.review_date).format("DD MMM YYYY")}</span>
                      <span className={styles.ratingBadge}>
                        <Star size={11} fill="#f59e0b" stroke="#f59e0b" />
                        {item.rating}/5
                      </span>
                    </div>
                    <p className={styles.activityText}>{item.description}</p>
                    <span className={styles.activityUser}>{item.name}</span>
                  </div>
                ))
              ) : (
                <p className={styles.emptyText}>No reviews yet</p>
              )}
            </div>
          </div>

          {/* Latest Activity */}
          <div className={styles.activityCard}>
            <h3 className={styles.cardTitle}>Latest Activity</h3>
            <div className={styles.cardBody}>
              {dashboardData?.latest_notifications?.length > 0 ? (
                dashboardData.latest_notifications.map((item, i) => (
                  <div key={i} className={styles.activityItem}>
                    <div className={styles.activityTop}>
                      <span className={styles.activityTitle}>
                        {item.notification_type === "new_rfq_received" ? "New Enquiry Received" :
                         item.notification_type === "quote_submitted" ? "Quote Submitted" :
                         item.notification_type === "add_product" ? "Product Added" : "Notification"}
                      </span>
                      <span className={styles.activityDate}>{moment(item.readable_date_time).format("DD MMM, hh:mm A")}</span>
                    </div>
                    <p className={styles.activityText}>
                      {item.notification_type === "new_rfq_received" ? `#${item.rfq_no} from ${item.company_name}` :
                       item.notification_type === "quote_submitted" ? `Quotation for #${item.rfq_no}` :
                       item.notification_type === "add_product" ? item.product_name : ""}
                    </p>
                  </div>
                ))
              ) : (
                <p className={styles.emptyText}>No activity yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Inquiries Table */}
        <div className={styles.tableSection}>
          <h3 className={styles.cardTitle}>Recent Enquiries</h3>
          <InquiriesReceived pageType={1} />
        </div>
      </div>
    </>
  );
};

export default Vendor;
