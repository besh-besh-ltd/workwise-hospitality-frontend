import React from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUsers, faFolderPlus, faUserPlus } from "@fortawesome/free-solid-svg-icons";

const AdminDashboard = () => {
    return (
        <>
            <section className="buyer-common-header sc-pt-80">
                <div className="container-fluid">
                    <h1 className="heading">Dashboard </h1>
                </div>
            </section>

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
