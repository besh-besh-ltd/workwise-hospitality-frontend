import React, { useEffect, useState } from "react";
import Header from "./Header";
// import Footer from "./Footer";
import { getCmsData } from "@/services/cms";
import { useDispatch } from "react-redux";
import { setSwSubscription } from "@/redux/slice";
import { SWSubscribe } from "@/services/Auth";
import { useRouter } from "next/router";
import Head from "next/head";
import Footer from "./Footer/newFooter";

const Layout = (props) => {
  const [cmsdata, setCmsdata] = useState([]);
  const [showModal, setshowModal] = useState(false);
  const [fromType, setFromType] = useState();
  const dispatch = useDispatch();
  const router = useRouter();

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

  /* REMOVED UN-USED CALL TO CMS DATA API */
  // useEffect(() => {
  //   getCmsSections();
  // }, []);

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


  const isHotelVendorPage = router.pathname === '/hotel-vendor';

  return (
    <>

    {/*  set canonical tag accros all the pages */}
      <Head>
        <link rel="canonical" href={`https://letsworkwise.com${router.asPath}`} />
      </Head>

      <div className="min-vh-100 d-flex flex-column" onClick={handleContainerClick}>
        {!isHotelVendorPage && <Header />}
        {/* Home-only announcement bar just below navbar */}
        <main className="flex-grow-1 ">{props.children}</main>
        {!isHotelVendorPage && <Footer />}
      </div>
    </>
  );
};

export default Layout;
