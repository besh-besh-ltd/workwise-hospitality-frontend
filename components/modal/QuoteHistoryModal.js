import React, { useState } from 'react'
import Modal from "react-modal";

const QuoteHistoryModal = (props) => {
    console.log(props.quotehistorydata)

    const [productDetails, setProductDetails] = useState(props.quotehistorydata.product_details[0]);


    const formatTimestampToIST = (timestamp) => {
        // Parse the timestamp as UTC
        const date = new Date(timestamp);
      
        // Convert to IST by adding 5 hours 30 minutes (19800000 ms)
        const istOffset = 5.5 * 60 * 60 * 1000; // 5 hours 30 minutes in milliseconds
        const istDate = new Date(date.getTime() + istOffset);
      
        // Format the IST date
        const day = istDate.getDate().toString().padStart(2, "0"); // Two-digit day
        const month = istDate.toLocaleString("en-US", { month: "short" }); // Abbreviated month name
        const year = istDate.getFullYear();
        const hours = istDate.getHours();
        const minutes = istDate.getMinutes().toString().padStart(2, "0"); // Two-digit minutes
        const ampm = hours >= 12 ? "PM" : "AM";
      
        // Format hours for 12-hour clock
        const formattedHours = (hours % 12 || 12).toString().padStart(2, "0");
      
        // Construct the formatted string
        return `${day}-${month}-${year} ${formattedHours}:${minutes}${ampm}`;
      };
      
      // Example usage
      const timestamp = "2024-12-05T02:40:23.408316";
      console.log(formatTimestampToIST(timestamp)); // Output: "05-Dec-2024 08:10AM"
      
      
            
 
    

    return (
        <div>
            <Modal
                isOpen={props.showModal}
                onRequestClose={props.closeModal}
                ariaHideApp={false}
                contentLabel="Regret Quote Reason"
                className="contact-modal contact-modal-new"
                style={{
                    overlay: {
                        backgroundColor: "rgba(0, 0, 0, 0.75)",
                    },
                    content: {
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        maxWidth: "90vw", // Adjust this value as needed
                        width: "80%", // Set to 'auto' or a specific value based on your design
                        border: "none",
                        background: "transparent",
                        overflow: "hidden",
                        padding: "50px",
                        maxHeight: "100vh", // Adjust this value as needed\
                        height: "90vh", // Adjust this value as needed
                    },
                }}
            >
                <div className="modal-header">
                    <button
                        onClick={props.closeModal}
                        className="btn-close"
                        aria-label="Close"
                    ></button>
                </div>
                <div className="modal-body contact-sec-modal p-4"    
                 style={{
                 overflowY: "auto", // Enables vertical scrolling
                 maxHeight: "calc(90vh - 100px)", // Adjust for header/footer or padding
                 }}>
                    <h3 className="tab-titlex py-2">Quote History</h3>
                    <div>

                   <hr class="hr" />

                        <div className='d-flex justify-content-between'>
                            <div>
                                <p className="sub-heading mb-0">
                                    <b>Product Name</b> :{" "}
                                    {productDetails.product_name}
                                </p>
                                {productDetails.rfq_details?.[1] && (
                                    <p className="sub-heading mb-0">
                                        <b>{productDetails.rfq_details[1]?.title}</b> :{" "}
                                        {productDetails.rfq_details[1]?.value}
                                    </p>
                                )}
                            </div>

                            <div className='mx-5'>
                                {productDetails.rfq_details?.[0] && (
                                    <p className="sub-heading mb-0">
                                        <b>{productDetails.rfq_details[0]?.title}</b> :{" "}
                                        {productDetails.rfq_details[0]?.value}
                                    </p>
                                )}
                                {productDetails.rfq_details?.[2] && (
                                    <p className="sub-heading mb-0">
                                        <b>{productDetails.rfq_details[2]?.title}</b> :{" "}
                                        {productDetails.rfq_details[2]?.value}
                                    </p>
                                )}
                                {productDetails.rfq_details?.[3] && (
                                    <p className="sub-heading mb-0">
                                        <b>{productDetails.rfq_details[3]?.title}</b> :{" "}
                                        {productDetails.rfq_details[3]?.value}
                                    </p>
                                )}
                            </div>

                        </div>
                    </div>

                    <div className="details-table hasFullLoader mt-4">
                        <div className="table-responsive">
                            <table className="table table-striped ">
                                <thead>
                                    <tr className='align-middle'>
                                        <th>SR</th>
                                        <th>Base Price</th>
                                        <th>Packaging (%)</th>
                                        <th>Freight (%)</th>
                                        <th>GST (%)</th>
                                        <th>Total Rate</th>
                                        {/* <th>Sub Total</th> */}
                                        <th>Delivery Period</th>
                                        <th>Comments</th>
                                        <th>Date & Time</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {props.quotehistorydata?.previous_quotes?.map((item, index) => (
                                        <tr key={item.id}>
                                            <td>{index+1}</td>
                                            <td>{item?.unit_price || "-"}</td>
                                            <td>{item?.package_price || "-"}</td>
                                            <td>{item?.freight_price || "-"}</td>
                                            <td>{item?.tax || "-"}</td>
                                            <td>{item?.total_price || "-"}</td>
                                            {/* <td>{item.delivery_period}</td> */}
                                            <td>{item.delivery_period ? item.delivery_period + " weeks" : '-'}</td>
                                            <td>{item.comment ? item.comment : '-'}</td>
                                            <td>{formatTimestampToIST(item.timestamp)}</td>
                                            </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    )
}

export default QuoteHistoryModal
