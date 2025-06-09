import Image from "next/image";
import React, { useEffect, useState } from "react";
import Head from "next/head";
import { getDashboardData } from "@/services/Auth";
import FullLoader from "@/components/shared/FullLoader";
import { toast } from "react-toastify";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChartBar, faFileInvoiceDollar } from "@fortawesome/free-solid-svg-icons";

const FinancePage = () => {
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
      });
      setDashboardData(res.data);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getData();
  }, []);

  return (
    <>
      <Head>
        <title>Dashboard | Finance</title>
      </Head>
      <section className="buyer-common-header sc-pt-80">
        <div className="container-fluid">
          <h1 className="heading">Finance Dashboard</h1>
        </div>
      </section>

      <section className="buyer-sec-1">
        <div className="container-fluid rounded-2 shadow p-4 mb-4">
          <h2 className="fs-4 fw-medium mb-4">Financial Overview</h2>

          {/* Finance Stats */}
          <div className="row">
            <div className="col-md-4 buyer-col hasFullLoader">
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
            <div className="col-md-4 buyer-col hasFullLoader">
              {loading && <FullLoader />}
              <div className="detail-con">
                <div className="detail-con-text">
                  <h2>
                    {dashboardData?.quotes_received
                      ? dashboardData?.quotes_received
                      : 0}
                  </h2>
                  <span>Quotes to Compare</span>
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
            <div className="col-md-4 buyer-col hasFullLoader">
              {loading && <FullLoader />}
              <div className="detail-con">
                <div className="detail-con-text">
                  <h2>
                    {dashboardData?.pending_responses
                      ? dashboardData?.pending_responses
                      : 0}
                  </h2>
                  <span>Pending Financial Reviews</span>
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
          </div>
        </div>

        <div className="container-fluid">
          <div className="row">
            <div className="col-md-6">
              <div className="d-flex align-items-center mb-2">
                <FontAwesomeIcon icon={faChartBar} className="text-primary me-2" />
                <p className="mb-0">Review and compare financial aspects of vendor quotes</p>
              </div>
            </div>
            <div className="col-md-6">
              <div className="d-flex align-items-center mb-2">
                <FontAwesomeIcon icon={faFileInvoiceDollar} className="text-primary me-2" />
                <p className="mb-0">Access financial reports and analytics</p>
              </div>
            </div>
          </div>
        </div>

        <div className="container-fluid mt-4">
          <h3 className="fs-5 fw-medium mb-3">RFQs Ready for Quote Comparison</h3>
          {loading ? (
            <div className="text-center p-3">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : (
            <div className="alert alert-info">No RFQs with quotes available for comparison at this time.</div>
          )}
        </div>
      </section>
    </>
  );
};

export default FinancePage; 