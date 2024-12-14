import Image from "next/image";
import React, { useEffect, useState } from "react";
import Head from "next/head";
import { getDashboardData } from "@/services/Auth";
import FullLoader from "@/components/shared/FullLoader";
import RfqOverview from "./dashboard-components/RfqOverview";
import VendorOverview from "./dashboard-components/VendorOverview";
import AnalyticsReport from "./dashboard-components/AnalyticsReport";
import { toast } from "react-toastify";


const BuyerPage = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(5);


  const getData = async () => {
    setLoading(true);
    try {
      const res = await getDashboardData({
        project_id: -1,
        rfq_type: "",
        reverse_auction: "-1",
        sort: "DESC",
        page,
        limit
      })
      setDashboardData(res.data);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

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
        return `You've created a new RFQ #${item.rfq_no} and shared it with the vendors!`;
      }
    }
  };


  useEffect(() => {
    getData();
  }, []);


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
            <div className="col-md-3 buyer-col hasFullLoader">
              {loading && <FullLoader />}
              <div className="detail-con">
                <div className="detail-con-text">
                  <h2>
                    {dashboardData?.total_rfqs
                      ? dashboardData?.total_rfqs
                      : 0}
                  </h2>
                  <span>Total RFQs</span>
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
            <div className="col-md-3 buyer-col hasFullLoader">
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
            <div className="col-md-3 buyer-col hasFullLoader">
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
            <div className="col-md-3 buyer-col hasFullLoader">
              {loading && <FullLoader />}
              <div className="detail-con">
                <div className="detail-con-text">
                  <h2>
                    {dashboardData?.closed_rfqs
                      ? dashboardData?.closed_rfqs
                      : 0}
                  </h2>
                  <span>Closed RFQs</span>
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
            <div className="col-md-3 buyer-col hasFullLoader">
              {loading && <FullLoader />}
              <div className="detail-con">
                <div className="detail-con-text">
                  <h2>
                    {dashboardData?.quotes_received
                      ? dashboardData?.quotes_received
                      : 0}
                  </h2>
                  <span>Quotes for Active RFQs</span>
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
            <div className="col-md-3 buyer-col hasFullLoader">
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

            <div className="col-md-3 buyer-col hasFullLoader">
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

          <RfqOverview
            tableRfqData={dashboardData?.rfq_data}
            notificationData={dashboardData?.notificaiton_data}
            tableLoading={loading}
          />
          <VendorOverview />
          <AnalyticsReport />

        </div>
      </section>
    </>
  );
};

export default BuyerPage;
