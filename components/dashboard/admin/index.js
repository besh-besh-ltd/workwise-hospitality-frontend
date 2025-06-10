import React, { useState, useEffect } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUsers, faFolderPlus, faUserPlus, faUserCheck } from "@fortawesome/free-solid-svg-icons";
import { getBuyerAccountLimits } from "@/services/Auth";

const AdminDashboard = () => {
    const [accountLimits, setAccountLimits] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

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

            {!loading && accountLimits && (
                <section className="buyer-sec-1">
                    <div className="container-fluid">
                        <div className="row">
                            <div className="col-12">
                                <h2 className="mb-3">Account Limits</h2>
                                <p>Available user accounts for your company</p>
                                <div className="d-flex align-items-center mb-4">
                                    <div className="me-2">
                                        <FontAwesomeIcon icon={faUserCheck} size="lg" />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="row">
                            <div className="col-lg-3 col-md-6 mb-4">
                                <div className="card h-100">
                                    <div className="card-body">
                                        <h5 className="card-title">Top Management</h5>
                                        <h3 className="mb-3">{accountLimits.used_top_management || 0}/{accountLimits.max_top_management || 0}</h3>
                                        <div className="progress" style={{ height: "6px" }}>
                                            <div 
                                                className="progress-bar" 
                                                role="progressbar" 
                                                style={{ 
                                                    width: `${accountLimits.max_top_management > 0 ? 
                                                        (accountLimits.used_top_management / accountLimits.max_top_management) * 100 : 0}%` 
                                                }}
                                                aria-valuenow={accountLimits.used_top_management || 0}
                                                aria-valuemin="0" 
                                                aria-valuemax={accountLimits.max_top_management || 0}
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="col-lg-3 col-md-6 mb-4">
                                <div className="card h-100">
                                    <div className="card-body">
                                        <h5 className="card-title">Procurement</h5>
                                        <h3 className="mb-3">{accountLimits.used_procurement || 0}/{accountLimits.max_procurement || 0}</h3>
                                        <div className="progress" style={{ height: "6px" }}>
                                            <div 
                                                className="progress-bar" 
                                                role="progressbar" 
                                                style={{ 
                                                    width: `${accountLimits.max_procurement > 0 ? 
                                                        (accountLimits.used_procurement / accountLimits.max_procurement) * 100 : 0}%` 
                                                }}
                                                aria-valuenow={accountLimits.used_procurement || 0}
                                                aria-valuemin="0" 
                                                aria-valuemax={accountLimits.max_procurement || 0}
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="col-lg-3 col-md-6 mb-4">
                                <div className="card h-100">
                                    <div className="card-body">
                                        <h5 className="card-title">Engineering</h5>
                                        <h3 className="mb-3">{accountLimits.used_engineering || 0}/{accountLimits.max_engineering || 0}</h3>
                                        <div className="progress" style={{ height: "6px" }}>
                                            <div 
                                                className="progress-bar" 
                                                role="progressbar" 
                                                style={{ 
                                                    width: `${accountLimits.max_engineering > 0 ? 
                                                        (accountLimits.used_engineering / accountLimits.max_engineering) * 100 : 0}%` 
                                                }}
                                                aria-valuenow={accountLimits.used_engineering || 0}
                                                aria-valuemin="0" 
                                                aria-valuemax={accountLimits.max_engineering || 0}
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="col-lg-3 col-md-6 mb-4">
                                <div className="card h-100">
                                    <div className="card-body">
                                        <h5 className="card-title">Finance</h5>
                                        <h3 className="mb-3">{accountLimits.used_finance || 0}/{accountLimits.max_finance || 0}</h3>
                                        <div className="progress" style={{ height: "6px" }}>
                                            <div 
                                                className="progress-bar" 
                                                role="progressbar" 
                                                style={{ 
                                                    width: `${accountLimits.max_finance > 0 ? 
                                                        (accountLimits.used_finance / accountLimits.max_finance) * 100 : 0}%` 
                                                }}
                                                aria-valuenow={accountLimits.used_finance || 0}
                                                aria-valuemin="0" 
                                                aria-valuemax={accountLimits.max_finance || 0}
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {loading && (
                <section className="buyer-sec-1">
                    <div className="container-fluid">
                        <div className="row">
                            <div className="col-12 text-center py-4">
                                <div className="spinner-border text-primary" role="status">
                                    <span className="visually-hidden">Loading...</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {error && (
                <section className="buyer-sec-1">
                    <div className="container-fluid">
                        <div className="row">
                            <div className="col-12">
                                <div className="alert alert-danger" role="alert">
                                    {error}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            )}

            <section className="buyer-sec-1">
                <div className="container-fluid">
                    <div className="row">
                        <div className="col-lg-4 col-md-6 buyer-col">
                            <Link href="/dashboard/admin/account-management/manage-accounts" className="text-decoration-none">
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
                            <Link href="/dashboard/admin/account-management/create-account" className="text-decoration-none">
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
                            <Link href="/dashboard/admin/project-management/project-management" className="text-decoration-none">
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
