import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { getAboutProfiles, getCmsData, getPageBanner } from "@/services/cms";
import DynamicSection from "../dynamicSection/dynamicSection";
import { toast } from "react-toastify";
import Head from "next/head";

const TermsOfUse = (props) => {
  const breadcrumbPaths = [
    { title: "Home", url: "/" },
    { title: "Terms of Use", url: "/terms-of-use" },
  ];
  const [cmsdata, setCmsdata] = useState([]);
  const [bannerdata, setBanner] = useState(null);

  const [bod, setbod] = useState([]);
  const [kp, setkp] = useState([]);

  useEffect(() => {
    getCmsSections();
    getBanner();
    getBod();
    getKp();
  }, []);

  const getCmsSections = () => {
    getCmsData(7)
      .then((response) => {
        if (response.data.length > 0) {
          setCmsdata(response.data);
        }
      })
      .catch((error) => {
        console.log(error);
      });
  };

  const getBanner = () => {
    getPageBanner(7)
      .then((response) => {
        if (response.data.length > 0) {
          const regex = /(<([^>]+)>)/gi;
          const content = response.data[0].content.replace(regex, " ");

          setBanner({
            content: content,
            image: response.data[0].image,
            image_url: response.data[0].image_url,
          });
        }
      })
      .catch((error) => {
        if (error.message.response?.status === 400) {
          toast.error(error.message.response.data.message, {
            position: "top-center",
          });
        } else {
          toast.error(error.message.message, {
            position: "top-center",
          });
        }
      });
  };

  const getBod = () => {
    getAboutProfiles(1).then((response) => {
      setbod(response.data);
    });
  };
  const getKp = () => {
    getAboutProfiles(2).then((response) => {
      setkp(response.data);
    });
  };

  return (
    <>
      <Head>
        <title>Workwise | Terms of Use</title>
      </Head>
      <section
        className="about-sec-1 sc-pt-80"
        style={{
          backgroundImage: "url(" + bannerdata?.image_url + ")",
        }}
      >
        <div className="container">
          <div className="row">
            <div className="col-md-12">
              <div className="about-sec-1-con">
                {bannerdata && <h1>{bannerdata?.content}</h1>}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="breadcrumbs">
        <div className="container">
          <div className="row">
            <div className="col-md-12">
              <div className="breadcrumbs-con">
                <a href="#" className="p-bread" title="">
                  Home
                </a>{" "}
                /{" "}
                <a href="/terms-of-use" className="c-bread" title="">
                  Terms of Use
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {cmsdata &&
        cmsdata.map((item) => {
          return <DynamicSection content={item.content} key={item.id} />;
        })}
    </>
  );
};

export default TermsOfUse;
