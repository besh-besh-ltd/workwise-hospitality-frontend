import Image from "next/image";
import React from "react";
import Link from "next/link";

const Other = () => {
    return (
        <>
            <section className="buyer-common-header sc-pt-80">
                <div className="container-fluid">
                    <h1 className="heading">Dashboard</h1>
                </div>
            </section>

            <section className="buyer-sec-1">
                <div className="container-fluid">
                    <div className="row">
                        <div className="col-lg-3 col-md-6 buyer-col">
                            <div className="detail-con">
                                <div className="detail-con-text">
                                    <h2>85K</h2>
                                    <span>Total RFQ</span>
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
                        <div className="col-lg-3 col-md-6 buyer-col">
                            <div className="detail-con">
                                <div className="detail-con-text">
                                    <h2>21.6K</h2>
                                    <span>Pending RFQ</span>
                                </div>
                                <div className="detail-con-icon p-order">
                                    <Image src="/assets/images/p-order-icon.png" alt="Workwise" width={26} height={30} priority={true} />
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
                        <div className="col-lg-3 col-md-6 buyer-col">
                            <div className="detail-con">
                                <div className="detail-con-text">
                                    <h2>985</h2>
                                    <span>Buying Requests</span>
                                </div>

                                <div className="detail-con-icon buy">
                                    <Image src="/assets/images/buy-icon.png" alt="Workwise" width={30} height={30} priority={true} />
                                </div>
                            </div>
                        </div>
                        <div className="col-lg-3 col-md-6 buyer-col">
                            <div className="detail-con">
                                <div className="detail-con-text">
                                    <h2>22K</h2>
                                    <span>Buying Rejects</span>
                                </div>
                                <div className="detail-con-icon reject">
                                    <Image src="/assets/images/reject-icon.png" alt="Workwise" width={24} height={30} priority={true} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* <div className="col-md-12 buy-stats">
                        <Image src="/assets/images/stats.png" alt="Workwise" width={1178} height={554} priority={true} />
                    </div> */}


                    <div className="col-md-12 recent-orders ">
                        <div className="table-header">
                            <span className="title">Recent RFQ</span>
                            <span className="more">...</span>
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
                                    <Link href="#" className="page-link">Previous</Link>
                                    <input type="text" value="01" />
                                    <Link href="#" className="page-link">Next</Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </>
    )
}

export default Other;