import React, { useEffect } from "react";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import { capitalize } from "../shared/TitleCase";

const SubscriptionModal = (props) => {
    const { 
      selectedSubscription, 
      proceedToBuy, 
      onHide, 
      show, 
      applyCouponToPlan, 
      appliedCouponData, 
      handleCpuponCode, 
      couponCode,
      isHospitality = false 
    } = props;
    let getSubscriptionDuration = {
        "-1": "Lifetime",
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
                <Modal.Title className="p-3">
                  {isHospitality ? 'Hospitality Subscription' : 'Subscription'}
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <div className="">
                    <div className="d-flex flex-row justify-content-between align-items-center g-6">
                        <h5>
                          {isHospitality
                            ? 'Selected items'
                            : <>
                                {capitalize(selectedSubscription.plan?.plan_name)}
                                <span className="fs-6 text-muted mx-1">(plan)</span>
                              </>
                          }
                        </h5>
                        <h3>
                          {isHospitality && selectedSubscription?.costBreakdown
                            ? `₹ ${selectedSubscription.costBreakdown.total}`
                            : selectedSubscription.billingCycle?.plan_type == "f"
                            ? "FREE"
                            : `₹ ${selectedSubscription.billingCycle?.price} / ${
                                getSubscriptionDuration[
                                  selectedSubscription.billingCycle?.duration
                                ]
                              }`}
                        </h3>
                    </div>

                    {!isHospitality && selectedSubscription.billingCycle?.Offers?.length > 0 &&
                        <div className="d-flex flex-row justify-content-between align-items-center g-6">
                            <h5>{capitalize(selectedSubscription.billingCycle?.Offers[0]?.text)}<span className="fs-6 text-muted mx-1">(offer)</span></h5>
                            <h3>
                                {`₹ ${(parseInt(selectedSubscription.billingCycle?.discount_price)).toFixed(2)}`}
                            </h3>
                        </div>
                    }

                    {!isHospitality && appliedCouponData && appliedCouponData?.length > 0 &&
                        <div className="d-flex flex-row justify-content-between align-items-center g-6">
                            <h5>Coupon</h5>
                            <h3>
                                {`₹ ${(parseInt(appliedCouponData[0]?.coupon_discount_price)).toFixed(2)}`}
                            </h3>
                        </div>
                    }
                    {isHospitality && selectedSubscription?.costBreakdown && (
                      <div className="mt-3">
                        <h6 className="fw-semibold mb-2">Cost breakdown</h6>
                        <ul className="list-unstyled mb-0" style={{ fontSize: "0.9rem" }}>
                          {selectedSubscription.costBreakdown.categoryNames?.map(
                            (name, idx) => (
                              <li key={`cat-${idx}`}>
                                <span className="text-muted me-1">Category:</span>
                                {name} – ₹{" "}
                                {selectedSubscription.costBreakdown.perCategoryFee}
                              </li>
                            )
                          )}
                          {selectedSubscription.costBreakdown.hotelNames?.map(
                            (name, idx) => (
                              <li key={`hotel-${idx}`}>
                                <span className="text-muted me-1">Hotel:</span>
                                {name} – ₹{" "}
                                {selectedSubscription.costBreakdown.perHotelFee}
                              </li>
                            )
                          )}
                          <li className="mt-2 fw-semibold">
                            Total: ₹ {selectedSubscription.costBreakdown.total}
                          </li>
                        </ul>
                      </div>
                    )}

                    {!isHospitality && (
                      <div className="d-flex flex-row justify-content-between align-items-center g-6">
                          <input
                            type="text"
                            value={couponCode}
                            disabled={
                              appliedCouponData && appliedCouponData?.length > 0
                                ? true
                                : false
                            }
                            className="form-control me-3 w-75"
                            placeholder="coupon code"
                            onChange={handleCpuponCode}
                          />
                          <button
                            onClick={applyCouponToPlan}
                            disabled={
                              appliedCouponData && appliedCouponData?.length > 0
                                ? true
                                : false
                            }
                            type="button"
                            className="btn btn-outline-success btn-sm"
                            id="apply_coupon-coupon_section-subscription_modal"
                          >
                            {appliedCouponData && appliedCouponData?.length > 0
                              ? `Coupon Applied`
                              : `Apply Coupon`}
                          </button>
                      </div>
                    )}

                    {isHospitality && (
                      <p
                        className="mt-3 text-muted"
                        style={{ fontSize: "0.85rem" }}
                      >
                        All vendor subscriptions are valid until 31st March of the
                        ongoing financial year, regardless of subscription date.
                      </p>
                    )}
                </div>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="primary" onClick={proceedToBuy} id="proceed_subscription-subscription_actions-subscription_modal">
                    Proceed
                </Button>
            </Modal.Footer>
        </Modal>
    )
}

export default SubscriptionModal