import Image from "next/image";
import React, { useEffect, useState } from "react";
import Head from "next/head";
import { getDashboardData } from "@/services/Auth";
import FullLoader from "@/components/shared/FullLoader";
import { toast } from "react-toastify";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileDownload, faUsers, faCartShopping, faChartBar, faFileInvoiceDollar, faFolderOpen, faGears } from "@fortawesome/free-solid-svg-icons";
import DownloadReportsForBuyer from "@/components/modal/DownloadReportsForBuyer";
import Link from "next/link";

// Import the components used in the buyer dashboard
import RfqOverview from "../buyer/dashboard-components/RfqOverview";
import VendorOverview from "../buyer/dashboard-components/VendorOverview";

const TopManagementPage = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(5);
  const [openDownloadReports, setOpenDownloadReports] = useState(false);

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
        <title>Dashboard | Top Management</title>
      </Head>
      <section className="buyer-common-header sc-pt-80">
        <div className="container-fluid">
          <h1 className="heading">Top Management Dashboard</h1>
        </div>
      </section>

      <section className="buyer-sec-1">
        <div className="container-fluid rounded-2 shadow p-4 mb-4 h-100 hasFullLoader">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h2 className="fs-4 fw-medium mb-0">Summary</h2>
            <button
              type="button"
              className="btn btn-primary border-0 py-2"
              style={{ width: "200px" }}
              onClick={() => setOpenDownloadReports(true)}
            >
              <FontAwesomeIcon icon={faFileDownload} className="me-2" />
              Download Report
            </button>
          </div>

          {/* RFQ summary */}
          <div className="row">
            <div className="col-md-3 buyer-col hasFullLoader">
              {loading && <FullLoader />}
              <div className="detail-con ">
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
              <div className="detail-con ">
                <div className="detail-con-text">
                  <h2>
                    {dashboardData?.active_rfqs
                      ? dashboardData?.active_rfqs
                      : 0}
                  </h2>
                  <span>Total Active RFQs</span>
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
              <div className="detail-con ">
                <div className="detail-con-text">
                  <h2>
                    {dashboardData?.quotes_received
                      ? dashboardData?.quotes_received
                      : 0}
                  </h2>
                  <span>Quotes for Active RFQs</span>
                </div>
                <div className="detail-con-icon buy">
                  <Image
                    src="/assets/images/order.png"
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
              <div className="detail-con ">
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
          </div>

          {/* Project Summary */}
          <div className="row">
            <div className="col-md-3 buyer-col hasFullLoader">
              {loading && <FullLoader />}
              <div className="detail-con ">
                <div className="detail-con-text">
                  <h2>
                    {dashboardData?.total_projects
                      ? dashboardData?.total_projects
                      : 0}
                  </h2>
                  <span>Total Projects</span>
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
              <div className="detail-con ">
                <div className="detail-con-text">
                  <h2>
                    {dashboardData?.active_projects
                      ? dashboardData?.active_projects
                      : 0}
                  </h2>
                  <span>Total Active Projects</span>
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
              <div className="detail-con ">
                <div className="detail-con-text">
                  <h2>
                    {dashboardData?.closed_projects
                      ? dashboardData?.closed_projects
                      : 0}
                  </h2>
                  <span>Closed Projects</span>
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
            <div className="col-lg-4 col-md-6 buyer-col">
              <Link href="/dashboard/buyer/rfq-management" className="text-decoration-none">
                <div className="detail-con">
                  <div className="detail-con-text">
                    <h2>RFQ Management</h2>
                    <span>Create and manage RFQs</span>
                  </div>
                  <div className="detail-con-icon p-order">
                    <FontAwesomeIcon icon={faCartShopping} size="2x" />
                  </div>
                </div>
              </Link>
            </div>
            <div className="col-lg-4 col-md-6 buyer-col">
              <Link href="/dashboard/buyer/vendor-management" className="text-decoration-none">
                <div className="detail-con">
                  <div className="detail-con-text">
                    <h2>Vendor Management</h2>
                    <span>Manage your vendor relationships</span>
                  </div>
                  <div className="detail-con-icon buy">
                    <FontAwesomeIcon icon={faUsers} size="2x" />
                  </div>
                </div>
              </Link>
            </div>
            <div className="col-lg-4 col-md-6 buyer-col">
              <Link href="/dashboard/buyer/technical-evaluation" className="text-decoration-none">
                <div className="detail-con">
                  <div className="detail-con-text">
                    <h2>Technical Evaluation</h2>
                    <span>Evaluate technical aspects of RFQs</span>
                  </div>
                  <div className="detail-con-icon buy">
                    <FontAwesomeIcon icon={faGears} size="2x" />
                  </div>
                </div>
              </Link>
            </div>
            <div className="col-lg-4 col-md-6 buyer-col">
              <Link href="/dashboard/buyer/quote-compare" className="text-decoration-none">
                <div className="detail-con">
                  <div className="detail-con-text">
                    <h2>Quote Comparison</h2>
                    <span>Compare received vendor quotes</span>
                  </div>
                  <div className="detail-con-icon buy">
                    <FontAwesomeIcon icon={faChartBar} size="2x" />
                  </div>
                </div>
              </Link>
            </div>
            <div className="col-lg-4 col-md-6 buyer-col">
              <Link href="/dashboard/buyer/project-management" className="text-decoration-none">
                <div className="detail-con">
                  <div className="detail-con-text">
                    <h2>Project Management</h2>
                    <span>Manage active projects</span>
                  </div>
                  <div className="detail-con-icon buy">
                    <FontAwesomeIcon icon={faFolderOpen} size="2x" />
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>

        <RfqOverview
          tableRfqData={dashboardData?.rfq_data}
          notificationData={dashboardData?.notificaiton_data}
          tableLoading={loading}
        />
        <VendorOverview />

        {openDownloadReports && (
          <DownloadReportsForBuyer
            isOpen={openDownloadReports}
            closeModal={() => setOpenDownloadReports(false)}
          />
        )}
      </section>
    </>
  );
};

export default TopManagementPage; 