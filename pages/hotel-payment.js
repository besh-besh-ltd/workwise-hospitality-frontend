import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { toast } from "react-toastify";
import axiosInstance from "@/lib/axios";

const HotelPaymentPage = () => {
  const router = useRouter();
  const { hotel_id } = router.query;

  const [hotelInfo, setHotelInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const fetchHotelInfo = useCallback(async () => {
    if (!hotel_id) return;
    try {
      setLoading(true);
      const response = await axiosInstance.get(`/hospitality/hotel-payment/${hotel_id}`);
      const data = response?.data?.data || response?.data;
      setHotelInfo(data);
      if (data?.already_paid) {
        setPaymentSuccess(true);
      }
    } catch (error) {
      console.error("Error fetching hotel payment info:", error);
      toast.error("Could not load payment details. Please check the link.");
    } finally {
      setLoading(false);
    }
  }, [hotel_id]);

  useEffect(() => {
    fetchHotelInfo();
  }, [fetchHotelInfo]);

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
    if (!hotelInfo || !hotel_id) return;

    setPaying(true);
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        toast.error("Failed to load payment gateway. Please try again.");
        setPaying(false);
        return;
      }

      // Create payment order
      const orderRes = await axiosInstance.post("/hospitality/hotel-payment/create-order", {
        hotel_id: parseInt(hotel_id, 10),
      });

      const orderData = orderRes?.data?.data || orderRes?.data;

      if (orderData?.already_paid) {
        setPaymentSuccess(true);
        toast.success("This business unit has already been paid for.");
        setPaying(false);
        return;
      }

      const { order, payment_id, razorpay_key } = orderData;

      const options = {
        key: razorpay_key,
        amount: order.amount,
        currency: order.currency,
        name: "WorkWise",
        description: `Business Unit Onboarding - ${hotelInfo.name}`,
        order_id: order.id,
        handler: async (response) => {
          try {
            const verifyRes = await axiosInstance.post("/hospitality/hotel-payment/verify", {
              hotel_id: parseInt(hotel_id, 10),
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              payment_id,
            });

            if (verifyRes?.data?.status === 1) {
              setPaymentSuccess(true);
              toast.success("Payment successful! Your business unit is now active.");
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
          email: hotelInfo.email || "",
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

  if (!hotelInfo) {
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

  return (
    <>
      <Head>
        <title>Complete Payment - {hotelInfo.name} | WorkWise</title>
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
            Business Unit Onboarding Payment
            </h2>
          </div>

          {/* Content */}
          <div className="card-body" style={{ padding: "28px" }}>
            {paymentSuccess ? (
              <div className="text-center" style={{ padding: "12px 0" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
                <h4 className="mb-2" style={{ color: "#166534", fontSize: 18, fontWeight: 600 }}>
                  Payment Successful!
                </h4>
                <p className="mb-3" style={{ color: "#4b5563", fontSize: 14 }}>
                  <strong style={{ color: "#111827" }}>{hotelInfo.name}</strong> is now active and ready to use.
                </p>
                <div
                  style={{
                    background: "#f0fdf4",
                    padding: 16,
                    borderRadius: 10,
                    border: "1px solid #bbf7d0",
                  }}
                >
                  <p className="mb-0" style={{ color: "#166534", fontSize: 13 }}>
                    You can now close this page or contact your administrator for next steps.
                  </p>
                </div>
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
                  <div style={{ marginBottom: 14 }}>
                    <p style={{ color: "#6b7280", margin: 0, fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      Business Unit
                    </p>
                    <p style={{ color: "#111827", margin: "4px 0 0", fontSize: 16, fontWeight: 600 }}>
                      {hotelInfo.name}
                    </p>
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <p style={{ color: "#6b7280", margin: 0, fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      Company
                    </p>
                    <p style={{ color: "#4b5563", margin: "4px 0 0", fontSize: 14, fontWeight: 500 }}>
                      {hotelInfo.company_name}
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
                      ₹ {hotelInfo.fee_amount?.toLocaleString("en-IN")}
                    </h2>
                  </div>
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
