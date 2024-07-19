import Head from "next/head";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  getSubscriptionList,
  proceedToSubscription,
  applyCoupon,
  loadScript,
} from "@/services/subscription";
import { useRouter } from "next/router";
import { toast, ToastContainer } from "react-toastify";
import SubscriptionModal from "@/components/modal/SubscriptionModal";
import { capitalize } from "@/components/shared/TitleCase";
import moment from "moment";

const Subscription = () => {
  const navigate = useRouter();
  const [subscriptionListData, setSubscriptionListData] = useState([]);
  const [selectedSubscription, setSelectedSubscription] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [appliedCouponData, setAppliedCouponData] = useState([]);
  const [couponCode, setCouponCode] = useState("");

  const payWithRazorPay = async (orderId) => {
    const res = await loadScript(
      "https://checkout.razorpay.com/v1/checkout.js"
    );

    if (!res) {
      alert("Razorpay SDK failed to load. Are you online?");
      return;
    }

    const options = {
      key: "rzp_test_dqkSkuFKnzKXKO",
      order_id: orderId, // This is Api key. you will get it from razorpay dashboard > account and settings > API keys
      // amount: parseInt(amount * 100),
      currency: "INR", // your 3 letter currency code
      name: "Workwise", // project or transaction name
      description: "Test Transaction",
      image: "https://avatars.githubusercontent.com/u/76506184?v=4", // your project logo
      handler: function (response) {
        // console.log("response", response);
        navigate.push(`/dashboard/buyer/subscription/confirmation`); // after payment completes on stripe this function will be called and you can do your stuff
      },
      prefill: {
        name: "Workwise ",
        email: "test@gmail.com",
        contact: "998",
      },
      notes: {
        address: "India",
      },
      theme: {
        color: "#158993",
      },
    };

    const paymentObject = new window.Razorpay(options);
    paymentObject.open();
  };

  const handleClose = () => {
    setSelectedSubscription([]);
    setAppliedCouponData([]);
    setCouponCode("");
    setShowModal(false);
  };
  const handleShowModal = (data) => {
    setSelectedSubscription(data);
    setShowModal(true);
  };

  const handleCpuponCode = (e) => {
    setCouponCode(e.target.value);
  };

  const applyCouponToPlan = () => {
    if (couponCode === "") {
      toast.error("Enter coupon code");
      return;
    }
    const payload = {
      sub_id: selectedSubscription?.id,
      coupon_code: couponCode,
    };
    applyCoupon(payload)
      .then((res) => {
        if (res?.status === 1) {
          toast.success("Coupon Applied");
          setAppliedCouponData(res.data);
        } else if (res.status === 2) {
          toast.error(res?.errors?.coupon_code);
          return;
        } else {
          toast.error("Internal server error");
          return;
        }
      })
      .catch((error) => {
        if (error?.message) {
          toast.error(error.message.response.data.message, {
            position: "top-right",
          });
        }

        if (error.response?.status === 400) {
          if (error.response.data.status === 2) {
            let txt = "";
            for (let x in error.response.data.errors) {
              txt = error.response.data.errors[x];
            }
            toast.error(txt, {
              position: "top-right",
            });
          } else if (error.response.data.status === 3) {
            let txt = "";
            for (let x in error.response.data.errors) {
              txt = error.response.data.errors[x];
            }
            toast.error(txt, {
              position: "top-right",
            });
          } else {
            toast.error(error.response.data.message, {
              position: "top-right",
            });
          }
        } else {
          toast.error(error.message, {
            position: "top-right",
          });
        }
      });
  };

  const proceedToBuy = () => {
    const payload = {
      sub_id: (selectedSubscription?.id).toString(),
      coupon_code: couponCode,
    };
    proceedToSubscription(payload)
      .then(async (res) => {
        if (res?.status) {
          await payWithRazorPay(res?.data);
          setShowModal(false);
          setCouponCode("");
        }
      })
      .catch((error) => {
        if (error?.message) {
          toast.error(error.message.response.data.message, {
            position: "top-right",
          });
        }

        if (error.response?.status === 400) {
          if (error.response.data.status === 2) {
            let txt = "";
            for (let x in error.response.data.errors) {
              txt = error.response.data.errors[x];
            }
            toast.error(txt, {
              position: "top-right",
            });
          } else if (error.response.data.status === 3) {
            let txt = "";
            for (let x in error.response.data.errors) {
              txt = error.response.data.errors[x];
            }
            toast.error(txt, {
              position: "top-right",
            });
          } else {
            toast.error(error.response.data.message, {
              position: "top-right",
            });
          }
        } else {
          toast.error(error.message, {
            position: "top-right",
          });
        }
      });
  };

  const subscriptionList = () => {
    getSubscriptionList()
      .then((res) => {
        setSubscriptionListData(res.data);
      })
      .catch((err) => {
        toast.error("Internal server error");
      });
  };
  let getSubscriptionDuration = {
    1: "Monthly",
    3: "Quarterly",
    12: "Yearly",
  };

  useEffect(() => {
    subscriptionList();
  }, []);
  return (
    <>
      <Head>
        <title>Dashboard | Subscription</title>
      </Head>
      <section className="buyer-common-header sc-pt-80">
        <div className="container-fluid">
          <h1 className="heading">Subscription</h1>
        </div>
      </section>

      <section className="buyer-sec-1 subscription-main">
        <div className="container-fluid">
          <div className="subscription-sec-row row">
            {subscriptionListData?.map((item, index) => {
              return (
                <div
                  className={`col-lg-3 col-md-6 col-sm-12 card-price-management`}
                  key={index}
                >
                  <div class="subscription-sec-main">
                    <div className="card-header-top-ini">
                      <h5>{capitalize(item.plan_name)}</h5>
                      {item?.active && (
                        <>
                          <span className="badge bg-success">Active</span>
                          <div className="text-light p-1 d-flex justify-content-center align-items-center">
                            <span>Ends On</span>
                            <span className="badge bg-success ms-2">
                              {moment(item?.end_date).format("LL")}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                    <div class="card-header-top">
                      <h2>
                        {item.plan_type == "f"
                          ? "FREE"
                          : `₹ ${item.price}  
                          `}
                        {item.plan_type == "f" ? (
                          ""
                        ) : (
                          <span>
                            / {getSubscriptionDuration[item.duration]}
                          </span>
                        )}
                      </h2>
                      <h4 className="offers">
                        {capitalize(item?.Offers && item?.Offers[0]?.text)}
                        {item?.Offers && item?.Offers?.length > 0 && (
                          <span className="badge">
                            {" "}
                            {`₹ ${parseInt(item?.discount_price).toFixed(2)}`}
                          </span>
                        )}
                      </h4>
                    </div>
                    <div class="card-header-bottom">
                      <div class="card-holder">
                        <h5>Features Included</h5>
                        <ul>
                          {item?.feature?.map((itemF, indexF) => {
                            return <li key={indexF}>{itemF.feature_name}</li>;
                          })}
                        </ul>
                      </div>
                      {item?.active === true ||
                      item?.plan_type === "f" ? null : (
                        <div className="btn-holder">
                          <button
                            className="btn btn-primary"
                            onClick={() => handleShowModal(item)}
                          >
                            Buy
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
      <SubscriptionModal
        show={showModal}
        onHide={handleClose}
        proceedToBuy={proceedToBuy}
        selectedSubscription={selectedSubscription}
        applyCouponToPlan={applyCouponToPlan}
        appliedCouponData={appliedCouponData}
        handleCpuponCode={handleCpuponCode}
        couponCode={couponCode}
      />
      <ToastContainer />
    </>
  );
};

export default Subscription;
