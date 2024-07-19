import React, { useEffect, useState } from "react";
import Header from "./Header";
import Footer from "./Footer";
import { getCmsData } from "@/services/cms";
import { useDispatch } from "react-redux";
import { setSwSubscription } from "@/redux/slice";
import { SWSubscribe } from "@/services/Auth";

const Layout = (props) => {
  const [cmsdata, setCmsdata] = useState([]);
  const [showModal, setshowModal] = useState(false);
  const [fromType, setFromType] = useState();
  const dispatch = useDispatch();
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      async function fetchData() {
        // window.addEventListener("load", async () => {

        const register = await navigator.serviceWorker.register(
          "/service-worker.js",
          { scope: "/" }
        );
        console.log("SERVICE WORKER REGISTERED");

        const serviceWorker = await navigator.serviceWorker.ready;

        const subscription = await register.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey:
            process.env.NEXT_PUBLIC_SERVICEWORKER_PUBLIC_KEY,
        });
        dispatch(setSwSubscription(subscription));
        console.log("SUBSCRIPTION REGISTERD");

        // await fetch(
        //   `${process.env.NEXT_PUBLIC_API_URL}/users/notifications/subscribe`,
        //   {
        //     method: "POST",
        //     body: JSON.stringify(subscription),
        //     headers: {
        //       "Content-Type": "application/json",
        //     },
        //   }
        // );

        // });
      }
      fetchData();
    } else {
      console.log("NO SERVICE WORKER PRESENT");
    }
  }, []);

  useEffect(() => {
    getCmsSections();
  }, []);

  const getCmsSections = () => {
    getCmsData(0)
      .then((response) => {
        if (response.data.length > 0) {
          setCmsdata(response.data);
        }
      })
      .catch((error) => {
        console.log(error);
      });
  };

  const handleContainerClick = (event) => {
    const target = event.target;
    //console.log(target.tagName);
    // Check if the clicked element is a button
    if (
      (target.tagName === "BUTTON" || target.tagName === "A") &&
      target.classList.contains("btn-popup-form")
      // GET Data Value
    ) {
      // console.error("target==>>", event.target.getAttribute("data-value"));
      setFromType(event.target.getAttribute("data-value"));
      event.preventDefault();
      setshowModal(true);
    }
  };

  return (
    <>
      <div onClick={handleContainerClick}>
        <Header />
        {props.children}
        <Footer
          cmsdata={cmsdata}
          showModal={showModal}
          setshowModal={setshowModal}
          fromType={fromType}
        />
      </div>
    </>
  );
};

export default Layout;
