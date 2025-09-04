import { toast } from "react-toastify";
import React, { useState } from 'react';
import { Modal, Form } from 'react-bootstrap';
import { addToTA } from "@/services/rfq";
import FullLoader from "@/components/shared/FullLoader";


const TE_Modal = ({ rfq_id ,openModal, closeModal, data, vendor_id, getTechEvalResult }) => {


    console.log("chekig the logs here in modal", data);

    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    const sendFeedback = async () => {
        const payload = {
            rfq_id : rfq_id,
            product : data.product_details[0],
            vendor_id: vendor_id,
            rfq_product_tech_evaluation_id: data.tbl_rfq_product_tech_evaluation_id,
            status: 0,
            reject_message: message
        }
        try {
            setLoading(true)
            const res = await addToTA(payload);
            toast.success("Your response has been sent.")
            getTechEvalResult();
            closeModal();
        } catch (error) {
            console.error("Error in the process:", error);
        } finally {
            setLoading(false);
        }
    }
    const handleSend = () => {
        if (!message.trim()) {
            toast.error("Message is compolsory")
            return;
        }
        sendFeedback();
    }


    return (
        <Modal
            show={openModal}
            onHide={closeModal}
            centered
        >
            <Modal.Header closeButton>
                <Modal.Title className="text-right w-100 p-3">
                    Type a Reason
                </Modal.Title>
            </Modal.Header>
            <Modal.Body style={{ minHeight: "200px" }}>
                {loading && <FullLoader />}
                <div className="d-flex flex-column mb-3">
                    <Form.Control
                        as="textarea"
                        placeholder="Message"
                        rows={4}
                        className="me-2"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                    />

                </div>
                <div className="d-flex justify-content-end mt-2">

                    <button
                        type="button"
                        className="btn btn-secondary border-0 p-2"
                        style={{ width: "120px" }}
                        onClick={() => handleSend()}
                    >
                        Confirm
                    </button>
                </div>
            </Modal.Body>
        </Modal>
    );
}

export default TE_Modal;