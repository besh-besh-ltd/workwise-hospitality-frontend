import { toast } from "react-toastify";
import React, { useEffect, useRef, useState } from 'react';
import { Modal, Form } from 'react-bootstrap';
import { addToTA } from "@/services/rfq";
const NotTA = ({ show, onClose, data, vendor_id }) => {

    const [message, setMessage] = useState("");
    const sendFeedback = async () => {
        const payload = {
            vendor_id: vendor_id,
            rfq_product_tech_evaluation_id: data.tbl_rfq_product_tech_evaluation_id,
            status: 0,
            reject_message: message
        }
        try {
            const res = await addToTA(payload);
            toast.success("Message Sent successfully.")
            onClose();
        } catch (error) {
            console.error("Error in the process:", error);
        }
    }
    const handleSend = () => {
        if (!message.trim()) {
            toast.error("Message is compolsory")
            return;
        }
        sendFeedback();
    }

    useEffect(() => {
        console.log(data)
    }, [])

    return (
        <Modal
            show={show}
            onHide={onClose}
            centered
        >
            <Modal.Header closeButton>
                <Modal.Title className="text-right w-100 p-3">
                    Type a Reason
                </Modal.Title>
            </Modal.Header>
            <Modal.Body style={{ minHeight: "200px" }}>
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
                <div className="d-flex justify-content-between align-items-start mt-2">

                    <button
                        type="button"
                        className="btn btn-secondary border-0 p-2"
                        style={{ width: "120px" }}
                        onClick={() => handleSend()}

                    >
                        Send
                    </button>
                </div>
            </Modal.Body>
        </Modal>
    );
}

export default NotTA;