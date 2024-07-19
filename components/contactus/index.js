import React, { useEffect, useState } from "react";

import Image from "next/image";
import { getCmsData, getPageBanner } from "@/services/cms";
import DynamicSection from "../dynamicSection/dynamicSection";
import { Form, Formik } from "formik";
import { contactFormSchema } from "@/utils/schema";
import FormikField from "../shared/FormikField";
import { contactUsFormService } from "@/services/contact";
import { toast, ToastContainer } from "react-toastify";
import FullLoader from "../shared/FullLoader";
import Head from "next/head";

const ContactUsPage = () => {
  const breadcrumbPaths = [
    { title: "Home", url: "/" },
    { title: "Contact", url: "/contact" },
  ];
  const [cmsdata, setCmsdata] = useState([]);
  const [havedata, sethavedata] = useState(false);
  const [bannerdata, setBanner] = useState(null);
  const [formSubmitted, setformSubmitted] = useState(false);
  const [loading, setloading] = useState(false);

  useEffect(() => {
    getCmsSections();
    getBanner();
  }, []);

  const getCmsSections = () => {
    getCmsData(4)
      .then((response) => {
        if (response.data.length > 0) {
          let filteredData = response.data.filter(
            (cmsData) => cmsData.section_name == "have questions"
          );
          sethavedata(filteredData);
          let exceptQuestionData = response.data.filter(
            (cmsData) => cmsData.section_name != "have questions"
          );

          setCmsdata(exceptQuestionData);
        }
      })
      .catch((error) => {
        console.log(error);
      });
  };
  const getBanner = () => {
    getPageBanner(4)
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

  const handleSubmit = (values, resetForm) => {
    const payload = {
      ...values,
      submitted_from: "1",
    };
    setloading(true);
    setformSubmitted(false);
    contactUsFormService(payload)
      .then((response) => {
        resetForm();
        setloading(false);
        setformSubmitted(true);
      })
      .catch((error) => {
        setloading(false);
        setformSubmitted(false);
      });
  };

  return (
    <>
      <Head>
        <title>Workwise | Contact us</title>
      </Head>
      {bannerdata && (
        <section
          className="contact-sec-1 sc-pt-80"
          style={{
            backgroundImage: "url(" + bannerdata?.image_url + ")",
          }}
        >
          <div className="container">
            <div className="row">
              <div className="col-md-12">
                <div className="contact-sec-1-con">
                  {bannerdata && <h1>{bannerdata.content}</h1>}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="breadcrumbs">
        <div className="container">
          <div className="row">
            <div className="col-md-12">
              <div className="breadcrumbs-con">
                <a href="#" className="p-bread" title="">
                  Home
                </a>{" "}
                /{" "}
                <a href="#" className="c-bread" title="">
                  Contact Us
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

      <section className="contact-sec-3 sc-pt-80 sc-pb-80">
        <div className="container">
          <div className="row">
            <div className="col-md-4">
              <div className="contact-sec-3-con">
                {/* <div className="common-header">
                  <h6>Have questions ?</h6>
                  <h2>Feel free to write us</h2>
                </div> */}
                {havedata &&
                  havedata.map((item) => {
                    return (
                      <DynamicSection content={item.content} key={item.id} />
                    );
                  })}
              </div>
            </div>
            <div className="col-md-8">
              <div className="contact-sec-3-form hasFullLoader">
                {loading && <FullLoader />}
                {formSubmitted && (
                  <h3 className="text-center mt-4 pt-4">
                    Your request has been submitted successfully!
                  </h3>
                )}
                {!formSubmitted && (
                  <div className="contact-form">
                    <Formik
                      enableReinitialize={true}
                      initialValues={{
                        name: "",
                        email: "",
                        phone: "",
                        subject: "",
                        comment: "",
                      }}
                      validationSchema={contactFormSchema}
                      onSubmit={(values, { resetForm }) =>
                        handleSubmit(values, resetForm)
                      }
                    >
                      {({ errors, touched }) => (
                        <Form>
                          <div className="row">
                            <div className="col-md-6">
                              <span className="contacts-title">Name</span>
                              <div className="form-group">
                                <FormikField
                                  label="Your Name"
                                  placeholder="Ex. Manoj Kumar"
                                  isRequired={true}
                                  name="name"
                                  touched={touched}
                                  errors={errors}
                                  nolabel={true}
                                />
                              </div>
                            </div>

                            <div className="col-md-6">
                              <span className="contacts-title">Email</span>
                              <div className="form-group">
                                <FormikField
                                  label="Email"
                                  placeholder="@example.com"
                                  isRequired={true}
                                  name="email"
                                  touched={touched}
                                  errors={errors}
                                  nolabel={true}
                                />
                              </div>
                            </div>

                            <div className="col-md-6">
                              <span className="contacts-title">
                                Phone Number
                              </span>
                              <div className="form-group">
                                <FormikField
                                  label="Phone Number"
                                  placeholder="Ex. 9123456789"
                                  isRequired={true}
                                  name="phone"
                                  touched={touched}
                                  errors={errors}
                                  nolabel={true}
                                />
                              </div>
                            </div>

                            <div className="col-md-6">
                              <span className="contacts-title">Subject</span>
                              <div className="form-group">
                                <FormikField
                                  label="Subject"
                                  placeholder="Ex. Request for Tender Fill-Up Support"
                                  isRequired={true}
                                  name="subject"
                                  touched={touched}
                                  errors={errors}
                                  nolabel={true}
                                />
                              </div>
                            </div>

                            <div className="col-md-12">
                              <span className="contacts-title">Message</span>
                              <div className="form-group">
                                <FormikField
                                  label="Comment"
                                  placeholder="Ex. I am going to fill tender for fire safety in one of the Reliance plants, and I am searching for products required for my project fulfillment."
                                  isRequired={true}
                                  name="comment"
                                  type="textarea"
                                  touched={touched}
                                  errors={errors}
                                  nolabel={true}
                                />
                              </div>

                              <button
                                type="submit"
                                className="btn btn-secondary"
                              >
                                Submit
                              </button>
                            </div>
                          </div>
                        </Form>
                      )}
                    </Formik>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
      <ToastContainer />
    </>
  );
};

export default ContactUsPage;
