import Head from "next/head";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  getSubscriptionList,
  proceedToSubscription,
  applyCoupon,
  loadScript,
  testRazorPayEndpoint,
} from "@/services/subscription";
import { useRouter } from "next/router";
import { toast, ToastContainer } from "react-toastify";
import SubscriptionModal from "@/components/modal/SubscriptionModal";
import { capitalize } from "@/components/shared/TitleCase";
import moment from "moment";

const Subscription = () => {
  const navigate = useRouter();
  const [subscriptionListData, setSubscriptionListData] = useState([]);
  const [selectedSubscription, setSelectedSubscription] = useState({
    plan: null,
    billingCycle: null
  });
  const [selectedBillingCycles, setSelectedBillingCycles] = useState({});
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
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY,
      order_id: orderId, // This is Api key. you will get it from razorpay dashboard > account and settings > API keys
      // amount: parseInt(amount * 100),
      currency: "INR", // your 3 letter currency code
      name: "Workwise", // project or transaction name
      description: "Workwise Subscription",
      image: "/assets/images/logo.png",
      handler: function (response) {
        const payload = {
          order_id: orderId
        };
        testRazorPayEndpoint(payload).then(res => {
          if(res.data) {
            console.log("RES DATA => ", res.data);
            navigate.push(`/dashboard/subscription/confirmation`); // after payment completes on stripe this function will be called and you can do your stuff
          }
        })
      },
      prefill: {
        name: "Workwise",
        email: "",
        contact: "",
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
    setAppliedCouponData([]);
    setCouponCode("");
    setShowModal(false);
  };
  const handleShowModal = (item, cycle) => {
    setSelectedSubscription({
      plan: item,
      billingCycle: cycle
    });
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
      sub_id: selectedSubscription.billingCycle?.id,
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
      sub_id: (selectedSubscription.billingCycle?.id).toString(),
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

  const groupSubscriptionData = (plans) => {
    const groupedPlans = Object.values(
      plans.reduce((acc, plan) => {
        const { plan_name, duration } = plan;

        if (!acc[plan_name]) {
          // First time, clone base plan
          acc[plan_name] = {
            ...plan,
            billing_cycle: [],
          };
        }

        // Push to billing_cycle
        acc[plan_name].billing_cycle.push({
          id: plan.id,
          duration: plan.duration,
          label: getSubscriptionDuration[plan.duration] || `${plan.duration} months`,
          price: plan.price,
          currency: plan.currency,
          discount_price: plan.discount_price,
          feature: plan.feature,
          Offers: plan.Offers,
          active: plan.active,
          start_date: plan.start_date,
          end_date: plan.end_date,
        });

        // If current duration is monthly (1), overwrite base fields
        if (duration === 1) {
          Object.assign(acc[plan_name], {
            ...plan,
          });
        }

        return acc;
      }, {})
    );

    return groupedPlans;
  }

  const handleBillingCycleChange = (item, cycle) => {
    setSelectedBillingCycles((prev) => ({
      ...prev,
      [item.plan_name]: cycle.label,
    }));
  };

  const subscriptionList = () => {
    getSubscriptionList()
      .then((res) => {
        const grouppedSubscriptionData = groupSubscriptionData(res.data);
        grouppedSubscriptionData.map(subscription => {
          setSelectedBillingCycles(prev => ({
            ...prev,
            [subscription.plan_name]: subscription.duration == -1 ? 'Lifetime' : 'Monthly'
          }))
        })
        setSubscriptionListData(grouppedSubscriptionData);
      })
      .catch((err) => {
        console.log("ERROR => ", err)
        toast.error("Internal server error");
      });
  };
  let getSubscriptionDuration = {
    "-1": "Lifetime",
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
              const activeItem = item.billing_cycle.find(cycle => selectedBillingCycles[item.plan_name] == cycle.label);
              if(!activeItem) return null;

              return (
                <div
                  className={`col-lg-3 col-md-6 col-sm-12 card-price-management`}
                  key={index}
                >
                  <div class="subscription-sec-main">
                    <div className="card-header-top-ini">
                      <h5>{capitalize(item.plan_name)}</h5>
                      {activeItem?.active && (
                        <>
                          <span className="badge bg-success">Active</span>
                          <div className="text-light p-1 d-flex justify-content-center align-items-center">
                            <span>Ends On</span>
                            <span className="badge bg-success ms-2">
                              {moment(activeItem?.end_date).format("LL")}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                    <div class="card-header-top">
                      <h2>
                        {item.plan_type == "f"
                          ? "FREE"
                          : `${activeItem.currency} ${activeItem.price}  
                          `}
                        {activeItem.plan_type == "f" ? (
                          ""
                        ) : (
                          <span>
                            / {getSubscriptionDuration[activeItem.duration]}
                          </span>
                        )}
                      </h2>
                      {item.billing_cycle && item.billing_cycle?.length > 1 && (
                        <div className="d-flex gap-2 mt-4 px-3">
                        {item.billing_cycle.map(cycle => (
                          <button onClick={() => handleBillingCycleChange(item, cycle)} className={`btn btn-outline-secondary btn-sm ${selectedBillingCycles[item.plan_name] == cycle.label ? 'active' : null}`} style={{
                            padding: 8
                          }}>{cycle.label}</button>
                        ))}
                        </div>
                      )}
                      <h4 className="offers">
                        {capitalize(activeItem?.Offers && activeItem?.Offers[0]?.text)}
                        {activeItem?.Offers && activeItem?.Offers?.length > 0 && (
                          <span className="badge">
                            {" "}
                            {`₹ ${parseInt(activeItem?.discount_price).toFixed(2)}`}
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
                      {activeItem?.active === true ||
                      activeItem?.plan_type === "f" ? null : (
                        <div className="btn-holder">
                          <button
                            disabled={subscriptionListData.some(subscription => subscription.active)}
                            className="btn btn-primary"
                            onClick={() => handleShowModal(item, activeItem)}
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
