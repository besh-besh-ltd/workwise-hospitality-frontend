import React, { useState, useEffect } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUserTie,
  faClipboardList,
  faCogs,
  faFileInvoiceDollar,
  faUsers,
  faFolderPlus,
  faUserPlus,
  faUserCheck,
} from "@fortawesome/free-solid-svg-icons";
import { getBuyerAccountLimits } from "@/services/Auth";
import FullLoader from "@/components/shared/FullLoader";

const accountCards = [
  {
    label: "Top Management",
    icon: faUserTie,
    keyUsed: "used_top_management",
    keyMax: "max_top_management",
    color: "secondary",
  },
  {
    label: "Procurement",
    icon: faClipboardList,
    keyUsed: "used_procurement",
    keyMax: "max_procurement",
    color: "secondary",
  },
  {
    label: "Engineering",
    icon: faCogs,
    keyUsed: "used_engineering",
    keyMax: "max_engineering",
    color: "secondary",
  },
  {
    label: "Finance",
    icon: faFileInvoiceDollar,
    keyUsed: "used_finance",
    keyMax: "max_finance",
    color: "secondary",
  },
];

const AdminDashboard = () => {
  const [accountLimits, setAccountLimits] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAccountLimits = async () => {
      try {
        setLoading(true);
        const response = await getBuyerAccountLimits();
        if (response && response.status) {
          setAccountLimits(response.data);
        }
      } catch (err) {
        console.error("Error fetching account limits:", err);
        setError("Failed to load account limits");
      } finally {
        setLoading(false);
      }
    };

    fetchAccountLimits();
  }, []);

  return (
    <>
      <section className="buyer-common-header sc-pt-80">
        <div className="container-fluid">
          <h1 className="heading">Dashboard</h1>
        </div>
      </section>

      {loading && (
        <section className="buyer-sec-1 mb-3">
          <div className="card-body p-4 hasFullLoader">
            <FullLoader />
          </div>
        </section>
      )}

      {/* START: account summer section */}
      {!loading && accountLimits && (
        <section className="buyer-sec-1">
          <div className="container-fluid">
            <div className="row">
              <div className="col-12 mb-4">
                <h3 className="mb-2">Account Summary</h3>
                <p className="text-muted">
                  Manage purchased and active user accounts for your company
                  roles.
                </p>
              </div>
            </div>
            <div className="row">
              {accountCards.map((card) => (
                <RoleCard
                  key={card.label}
                  icon={card.icon}
                  label={card.label}
                  used={accountLimits[card.keyUsed] || 0}
                  max={accountLimits[card.keyMax] || 0}
                  color={card.color}
                />
              ))}
            </div>
          </div>
        </section>
      )}
      {/* END: account summer section */}

      <section className="buyer-sec-1">
        <div className="container-fluid">
          <div className="row">
            <div className="col-lg-4 col-md-6 buyer-col">
              <Link
                href="/dashboard/admin/account-management/manage-accounts"
                className="text-decoration-none"
              >
                <div className="detail-con">
                  <div className="detail-con-text">
                    <h2>Manage Accounts</h2>
                    <span>View and manage user accounts</span>
                  </div>
                  <div className="detail-con-icon p-order">
                    <FontAwesomeIcon icon={faUsers} size="2x" />
                  </div>
                </div>
              </Link>
            </div>
            <div className="col-lg-4 col-md-6 buyer-col">
              <Link
                href="/dashboard/admin/account-management/create-account"
                className="text-decoration-none"
              >
                <div className="detail-con">
                  <div className="detail-con-text">
                    <h2>Create Account</h2>
                    <span>Add new user accounts</span>
                  </div>
                  <div className="detail-con-icon buy">
                    <FontAwesomeIcon icon={faUserPlus} size="2x" />
                  </div>
                </div>
              </Link>
            </div>
            <div className="col-lg-4 col-md-6 buyer-col">
              <Link
                href="/dashboard/admin/project-management/project-management"
                className="text-decoration-none"
              >
                <div className="detail-con">
                  <div className="detail-con-text">
                    <h2>Project Management</h2>
                    <span>Create and manage projects</span>
                  </div>
                  <div className="detail-con-icon buy">
                    <FontAwesomeIcon icon={faFolderPlus} size="2x" />
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default AdminDashboard;
//  AdminDashboard over here



// role card component
const RoleCard = ({ icon, label, used, max }) => {
  return (
    <div className="col-lg-3 col-md-6 ">
      <div className="card h-100">
        <div className="card-body">
          <h5 className="card-title">
            <FontAwesomeIcon icon={icon} className={`me-2 `} />
            <strong>{label}</strong>
          </h5>
          <div className="">
            {/* <FontAwesomeIcon icon={faUserCheck} className="me-2 text-success" /> */}
            Active Accounts: {used}
          </div>
          <div className="mt-1">
            {/* <FontAwesomeIcon icon={faUsers} className="me-2 text-primary" /> */}
            Purchased Accounts: {max}
          </div>
        </div>
      </div>
    </div>
  );
};
