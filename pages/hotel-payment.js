import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { toast } from "react-toastify";
import axiosInstance from "@/lib/axios";

const HotelPaymentPage = () => {
  const router = useRouter();
  const { hotel_id, company_id, hotel_ids } = router.query;

  const [paymentInfo, setPaymentInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [isConsolidated, setIsConsolidated] = useState(false);

  const fetchPaymentInfo = useCallback(async () => {
    // Wait for router to be ready
    if (!router.isReady) return;

    // Check if this is a consolidated company payment
    if (company_id && hotel_ids) {
      setIsConsolidated(true);
      try {
        setLoading(true);
        const hotelIdsParam = Array.isArray(hotel_ids) ? hotel_ids.join(',') : hotel_ids;
        const response = await axiosInstance.get(`/hospitality/hotel-payment/company/info`, {
          params: {
            company_id: parseInt(company_id, 10),
            hotel_ids: hotelIdsParam
          },
          timeout: 30000,
        });
        const data = response?.data?.data || response?.data;
        setPaymentInfo(data);
        if (data?.already_paid) {
          setPaymentSuccess(true);
        } else {
          setPaymentSuccess(false);
        }
      } catch (error) {
        console.error("Error fetching company payment info:", error);
        if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
          toast.error("Request timed out. Please check your connection and try again.");
        } else if (error.response?.status === 404) {
          toast.error("Payment link not found. Please check the link.");
        } else {
          toast.error("Could not load payment details. Please check the link.");
        }
        setPaymentInfo(null);
      } finally {
        setLoading(false);
      }
    } 
    // Single hotel payment
    else if (hotel_id) {
      setIsConsolidated(false);
      try {
        setLoading(true);
        const response = await axiosInstance.get(`/hospitality/hotel-payment/${hotel_id}`, {
          timeout: 30000,
        });
        const data = response?.data?.data || response?.data;
        setPaymentInfo(data);
        if (data?.already_paid) {
          setPaymentSuccess(true);
        } else {
          setPaymentSuccess(false);
        }
      } catch (error) {
        console.error("Error fetching hotel payment info:", error);
        if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
          toast.error("Request timed out. Please check your connection and try again.");
        } else if (error.response?.status === 404) {
          toast.error("Payment link not found. Please check the link.");
        } else {
          toast.error("Could not load payment details. Please check the link.");
        }
        setPaymentInfo(null);
      } finally {
        setLoading(false);
      }
    } else {
      // No valid parameters
      setLoading(false);
    }
  }, [router.isReady, hotel_id, company_id, hotel_ids]);

  useEffect(() => {
    fetchPaymentInfo();
  }, [fetchPaymentInfo]);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (typeof window !== "undefined" && window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async () => {
    if (!paymentInfo) return;

    setPaying(true);
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        toast.error("Failed to load payment gateway. Please try again.");
        setPaying(false);
        return;
      }

      // Create payment order
      let orderRes;
      if (isConsolidated) {
        orderRes = await axiosInstance.post("/hospitality/hotel-payment/create-order", {
          company_id: parseInt(company_id, 10),
          hotel_ids: paymentInfo.hotel_ids,
        });
      } else {
        orderRes = await axiosInstance.post("/hospitality/hotel-payment/create-order", {
          hotel_id: parseInt(hotel_id, 10),
        });
      }

      const orderData = orderRes?.data?.data || orderRes?.data;

      if (orderData?.already_paid) {
        setPaymentSuccess(true);
        toast.success(isConsolidated ? "All business units have already been paid for." : "This business unit has already been paid for.");
        setPaying(false);
        return;
      }

      const { order, payment_id, razorpay_key } = orderData;

      const description = isConsolidated
        ? `Business Units Onboarding - ${paymentInfo.company_name}`
        : `Business Unit Onboarding - ${paymentInfo.name}`;

      const options = {
        key: razorpay_key,
        amount: order.amount,
        currency: order.currency,
        name: "WorkWise",
        description,
        order_id: order.id,
        handler: async (response) => {
          try {
            const verifyPayload = {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              payment_id,
            };

            if (isConsolidated) {
              verifyPayload.company_id = parseInt(company_id, 10);
              verifyPayload.hotel_ids = paymentInfo.hotel_ids;
            } else {
              verifyPayload.hotel_id = parseInt(hotel_id, 10);
            }

            const verifyRes = await axiosInstance.post("/hospitality/hotel-payment/verify", verifyPayload);

            if (verifyRes?.status === 1) {
              setPaymentSuccess(true);
              toast.success(
                isConsolidated
                  ? "Payment successful! All business units are now active."
                  : "Payment successful! Your business unit is now active."
              );
              // Refetch payment info to ensure state is updated
              setTimeout(() => {
                fetchPaymentInfo();
              }, 1000);
            } else {
              toast.error("Payment verification failed. Please contact support.");
            }
          } catch (err) {
            console.error("Payment verification error:", err);
            toast.error("Payment verification failed. Please contact support.");
          }
          setPaying(false);
        },
        modal: {
          ondismiss: () => {
            setPaying(false);
            toast.info("Payment cancelled.");
          },
        },
        prefill: {
          email: isConsolidated ? paymentInfo.company_email || "" : paymentInfo.email || "",
        },
        theme: {
          color: "#158993",
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error("Payment error:", error);
      toast.error("Failed to initiate payment. Please try again.");
      setPaying(false);
    }
  };

  const pageGradient = {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    background: "linear-gradient(145deg, #f0f7ff 0%, #e8f4fc 45%, #f5f0fd 100%)",
    padding: "24px",
  };

  const brandBar = (
    <div
      style={{
        width: "100%",
        maxWidth: 500,
        padding: "16px 0 24px",
      }}
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "baseline",
          gap: 2,
          letterSpacing: "-0.02em",
        }}
      >
        <span style={{ color: "#0d6068", fontWeight: 700, fontSize: 20 }}>Phileein</span>
        <span
          style={{
            color: "#158993",
            fontWeight: 600,
            fontSize: 20,
            fontStyle: "italic",
            borderBottom: "2px solid #158993",
          }}
        >
          Hospitality
        </span>
      </div>
    </div>
  );

  if (loading) {
    return (
      <>
        <Head>
          <title>Business Unit Payment | WorkWise</title>
        </Head>
        <div style={{ ...pageGradient, justifyContent: "center" }}>
          {brandBar}
          <div className="spinner-border" style={{ color: "#158993" }} role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </>
    );
  }

  if (!paymentInfo) {
    return (
      <>
        <Head>
          <title>Payment Not Found | WorkWise</title>
        </Head>
        <div style={{ ...pageGradient, justifyContent: "center" }}>
          {brandBar}
          <div
            className="card shadow-sm"
            style={{
              maxWidth: 500,
              width: "100%",
              borderRadius: 14,
              overflow: "hidden",
              boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
            }}
          >
            <div className="card-body text-center" style={{ padding: "36px 28px" }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>❌</div>
              <h4 className="mb-2" style={{ color: "#111827", fontSize: 18, fontWeight: 600 }}>
                Payment Link Not Found
              </h4>
              <p className="mb-0" style={{ color: "#6b7280", fontSize: 14 }}>
                This payment link may have expired or is invalid. Please contact your administrator.
              </p>
            </div>
          </div>
        </div>
      </>
    );
  }

  const displayTitle = isConsolidated
    ? "Business Units Onboarding Payment"
    : "Business Unit Onboarding Payment";

  const successMessage = isConsolidated
    ? `All business units for ${paymentInfo.company_name} are now active and ready to use.`
    : `${paymentInfo.name} is now active and ready to use.`;

  return (
    <>
      <Head>
        <title>
          Complete Payment - {isConsolidated ? paymentInfo.company_name : paymentInfo.name} | WorkWise
        </title>
      </Head>
      <div style={{ ...pageGradient, justifyContent: "center" }}>
        {brandBar}
        <div
          className="card shadow"
          style={{
            maxWidth: 500,
            width: "100%",
            borderRadius: 14,
            overflow: "hidden",
            boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
          }}
        >
          {/* Header */}
          <div
            style={{
              background: "linear-gradient(135deg, #158993 0%, #0d6068 100%)",
              padding: "22px 28px",
              textAlign: "center",
            }}
          >
            <h2 style={{ color: "white", margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}>
              {displayTitle}
            </h2>
          </div>

          {/* Content */}
          <div className="card-body" style={{ padding: "28px" }}>
            {paymentSuccess ? (
              <div style={{ padding: "8px 0" }}>
                <div
                  style={{
                    borderBottom: "1px solid #e5e7eb",
                    paddingBottom: 20,
                    marginBottom: 20,
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#158993",
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                    }}
                  >
                    Payment completed
                  </p>
                  <h3
                    className="mb-2"
                    style={{
                      color: "#111827",
                      fontSize: 20,
                      fontWeight: 600,
                      marginTop: 6,
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {successMessage}
                  </h3>
                </div>
                <p className="mb-0" style={{ color: "#6b7280", fontSize: 14, lineHeight: 1.5 }}>
                  Your payment has been recorded. You may close this page or contact your administrator for next steps.
                </p>
              </div>
            ) : (
              <>
                <div
                  style={{
                    background: "#f9fafb",
                    padding: "20px",
                    borderRadius: 10,
                    marginBottom: 24,
                    border: "1px solid #e5e7eb",
                  }}
                >
                  {isConsolidated ? (
                    <>
                      <div style={{ marginBottom: 14 }}>
                        <p style={{ color: "#6b7280", margin: 0, fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                          Company
                        </p>
                        <p style={{ color: "#111827", margin: "4px 0 0", fontSize: 16, fontWeight: 600 }}>
                          {paymentInfo.company_name}
                        </p>
                      </div>
                      <div style={{ marginBottom: 14 }}>
                        <p style={{ color: "#6b7280", margin: 0, fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                          Business Units ({paymentInfo.hotels?.length || 0})
                        </p>
                        <ul style={{ margin: "8px 0 0", paddingLeft: "20px", color: "#4b5563", fontSize: 14 }}>
                          {paymentInfo.hotels?.map((hotel) => (
                            <li key={hotel.id} style={{ marginBottom: "4px" }}>
                              <strong>{hotel.name}</strong> - ₹{hotel.fee_amount?.toLocaleString("en-IN")}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p style={{ color: "#6b7280", margin: 0, fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                          Total Amount to Pay
                        </p>
                        <h2
                          style={{
                            color: "#111827",
                            margin: "4px 0 0",
                            fontWeight: 500,
                            fontSize: 20,
                            letterSpacing: "-0.02em",
                          }}
                        >
                          ₹ {paymentInfo.total_amount?.toLocaleString("en-IN")}
                        </h2>
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ marginBottom: 14 }}>
                        <p style={{ color: "#6b7280", margin: 0, fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                          Business Unit
                        </p>
                        <p style={{ color: "#111827", margin: "4px 0 0", fontSize: 16, fontWeight: 600 }}>
                          {paymentInfo.name}
                        </p>
                      </div>
                      <div style={{ marginBottom: 14 }}>
                        <p style={{ color: "#6b7280", margin: 0, fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                          Company
                        </p>
                        <p style={{ color: "#4b5563", margin: "4px 0 0", fontSize: 14, fontWeight: 500 }}>
                          {paymentInfo.company_name}
                        </p>
                      </div>
                      <div>
                        <p style={{ color: "#6b7280", margin: 0, fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                          Amount to Pay
                        </p>
                        <h2
                          style={{
                            color: "#111827",
                            margin: "4px 0 0",
                            fontWeight: 500,
                            fontSize: 20,
                            letterSpacing: "-0.02em",
                          }}
                        >
                          ₹ {paymentInfo.fee_amount?.toLocaleString("en-IN")}
                        </h2>
                      </div>
                    </>
                  )}
                </div>

                <div style={{ marginBottom: 16 }}>
                  <button
                    className="btn w-100"
                    style={{
                      background: "linear-gradient(135deg, #158993 0%, #0d6068 100%)",
                      color: "white",
                      fontWeight: 600,
                      fontSize: 16,
                      padding: "16px 24px",
                      borderRadius: 10,
                      border: "none",
                      boxShadow: "0 4px 12px rgba(21, 137, 147, 0.4)",
                    }}
                    onClick={handlePayment}
                    disabled={paying}
                  >
                    {paying ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" />
                        Processing...
                      </>
                    ) : (
                      "Pay Now"
                    )}
                  </button>
                </div>

                <p className="text-center mb-0" style={{ color: "#6b7280", fontSize: 11 }}>
                  Secure payment powered by Razorpay
                </p>
              </>
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              padding: "12px 28px",
              textAlign: "center",
              background: "#f9fafb",
              borderTop: "1px solid #e5e7eb",
            }}
          >
            <p className="mb-0" style={{ color: "#6b7280", fontSize: 11 }}>
              &copy; {new Date().getFullYear()} WorkWise. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default HotelPaymentPage;
