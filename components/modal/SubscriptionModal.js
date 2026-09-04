import React, { useEffect } from "react";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import { capitalize } from "../shared/TitleCase";

const EmptyState = ({ label }) => (
  <div className="text-muted" style={{ fontSize: "0.85rem" }}>
    No {label} selected
  </div>
);

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

    const {
      categoryNames = [],
      hotelNames = [],
      numCategories = 0,
      numHotels = 0,
      perCategoryFee = 0,
      total = 0,
    } = selectedSubscription?.costBreakdown || {};

    const calculationText = numHotels > 0
      ? `${numCategories} categories × ₹${perCategoryFee} × ${numHotels} business units`
      : `${numCategories} categories × ₹${perCategoryFee}`;
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
                            ? `₹ ${total}`
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
                      <div className="mt-4">
                        <h6 className="fw-semibold mb-3" style={{ fontSize: "1rem" }}>Cost Breakdown</h6>
                        
                        {/* Tabular format: Categories on left, Business Units on right */}
                        <div className="border rounded p-3" style={{ backgroundColor: "#f8f9fa" }}>
                          <div className="row mb-2" style={{ fontSize: "0.85rem", fontWeight: "600", color: "#6c757d", borderBottom: "1px solid #dee2e6", paddingBottom: "8px" }}>
                            <div className="col-6">
                              <span>Categories</span>
                            </div>
                            <div className="col-6">
                              <span>Business Units Selected</span>
                            </div>
                          </div>
                          
                          {/* Categories and Business Units mapping */}
                          <div className="row align-items-start">
                            <div className="col-6">
                              <div style={{ fontSize: "0.9rem" }}>
                                {categoryNames.map((name) => (
                                  <div key={name} className="mb-2" style={{ lineHeight: "1.5" }}>
                                    <div className="fw-medium" style={{ color: "#333" }}>
                                      {name}
                                    </div>
                                    <div className="text-muted" style={{ fontSize: "0.8rem" }}>
                                      ₹ {perCategoryFee} per category
                                    </div>
                                  </div>
                                ))}
                                {categoryNames.length === 0 && <EmptyState label="categories" />}
                              </div>
                            </div>
                            
                            <div className="col-6">
                              <div style={{ fontSize: "0.9rem" }}>
                                {hotelNames.map((name) => (
                                  <div key={name} className="mb-2" style={{ lineHeight: "1.5" }}>
                                    <div className="fw-medium" style={{ color: "#333" }}>
                                      {name}
                                    </div>
                                  </div>
                                ))}
                                {hotelNames.length === 0 && <EmptyState label="business units" />}
                              </div>
                            </div>
                          </div>
                          
                          {/* Calculation breakdown */}
                          <div className="mt-3 pt-3 border-top" style={{ fontSize: "0.9rem" }}>
                            <div className="d-flex justify-content-between align-items-center mb-2">
                              <span className="text-muted">Number of Categories:</span>
                              <span className="fw-medium">{numCategories}</span>
                            </div>
                            <div className="d-flex justify-content-between align-items-center mb-2">
                              <span className="text-muted">Price per Category:</span>
                              <span className="fw-medium">₹ {perCategoryFee}</span>
                            </div>
                            <div className="d-flex justify-content-between align-items-center mb-2">
                              <span className="text-muted">Number of Business Units:</span>
                              <span className="fw-medium">{numHotels}</span>
                            </div>
                            <div className="d-flex justify-content-between align-items-center mb-2" style={{ fontSize: "0.85rem", color: "#6c757d" }}>
                              <span>Calculation:</span>
                              <span>{calculationText}</span>
                            </div>
                            <div className="d-flex justify-content-between align-items-center mt-3 pt-2 border-top" style={{ fontSize: "1rem", fontWeight: "600" }}>
                              <span>Total Amount:</span>
                              <span style={{ color: "#158993", fontSize: "1.1rem" }}>₹ {total}</span>
                            </div>
                          </div>
                        </div>
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