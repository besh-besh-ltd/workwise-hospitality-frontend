import React, { useEffect } from "react";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import { capitalize } from "../shared/TitleCase";

const SubscriptionModal = (props) => {
    const { selectedSubscription, proceedToBuy, onHide, show, applyCouponToPlan, appliedCouponData, handleCpuponCode, couponCode } = props;
    let getSubscriptionDuration = {
        1: "Monthly",
        3: "Quarterly",
        12: "Yearly",
    };
    return (
        <Modal
            show={show}
            onHide={onHide}
            size="md"
            aria-labelledby="contained-modal-title-vcenter"
            centered
        >
            <Modal.Header closeButton>
                <Modal.Title className="p-3">Subscription</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <div className="">
                    <div className="d-flex flex-row justify-content-between align-items-center g-6">
                        <h5>{capitalize(selectedSubscription?.plan_name)}<span className="fs-6 text-muted mx-1">(plan)</span></h5>
                        <h3>
                            {selectedSubscription?.plan_type == "f"
                                ? "FREE"
                                : `₹ ${selectedSubscription?.price} / ${getSubscriptionDuration[selectedSubscription?.duration]
                                }`}
                        </h3>
                    </div>

                    {selectedSubscription?.Offers?.length > 0 &&
                        <div className="d-flex flex-row justify-content-between align-items-center g-6">
                            <h5>{capitalize(selectedSubscription?.Offers[0]?.text)}<span className="fs-6 text-muted mx-1">(offer)</span></h5>
                            <h3>
                                {`₹ ${(parseInt(selectedSubscription?.discount_price)).toFixed(2)}`}
                            </h3>
                        </div>
                    }

                    {appliedCouponData && appliedCouponData?.length > 0 &&
                        <div className="d-flex flex-row justify-content-between align-items-center g-6">
                            <h5>Coupon</h5>
                            <h3>
                                {`₹ ${(parseInt(appliedCouponData[0]?.coupon_discount_price)).toFixed(2)}`}
                            </h3>
                        </div>
                    }
                    <div className="d-flex flex-row justify-content-between align-items-center g-6">
                        <input type="text" value={couponCode} disabled={appliedCouponData && appliedCouponData?.length > 0 ? true : false} className="form-control me-3 w-75" placeholder="coupon code" onChange={handleCpuponCode}/>
                        <button onClick={applyCouponToPlan} disabled={appliedCouponData && appliedCouponData?.length > 0 ? true : false} type="button" class="btn btn-outline-success btn-sm">{appliedCouponData && appliedCouponData?.length > 0 ? `Coupon Applied` : `Apply Coupon`}</button>
                    </div>
                </div>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="primary" onClick={proceedToBuy}>
                    Proceed
                </Button>
            </Modal.Footer>
        </Modal>
    )
}

export default SubscriptionModal