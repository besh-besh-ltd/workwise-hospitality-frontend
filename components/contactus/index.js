import React, { useEffect, useState } from "react";
import { getCmsData, getCountryCodes, getPageBanner } from "@/services/cms";
import DynamicSection from "../dynamicSection/dynamicSection";
import { Form, Formik } from "formik";
import { contactFormSchema } from "@/utils/schema";
import FormikField from "../shared/FormikField";
import { contactUsFormService } from "@/services/contact";
import { toast } from "react-toastify";
import FullLoader from "../shared/FullLoader";
import {
  CONTACT_US_RECAPTCHA_ACTION,
  executeRecaptcha,
  isRecaptchaConfigured,
  loadRecaptchaScript,
  unloadRecaptchaScript,
} from "@/utils/recaptcha";


const ContactUsPage = () => {
  const [cmsdata, setCmsdata] = useState([]);
  const [havedata, sethavedata] = useState(false);
  const [bannerdata, setBanner] = useState(null);
  const [formSubmitted, setformSubmitted] = useState(false);
  const [loading, setloading] = useState(false);
  const [countryCode, setCountryCode] = useState([]);
  const [defaultCountryCode, setDefaultCountryCode] = useState("");

  useEffect(() => {
    getCmsSections();
    getBanner();
    fetchCountryCodes();

    let shouldUnload = false;
    if (isRecaptchaConfigured) {
      shouldUnload = true;
      loadRecaptchaScript().catch(() => {});
    }

    return () => {
      if (isRecaptchaConfigured && shouldUnload) {
        unloadRecaptchaScript();
      }
    };
  }, []);

  const fetchCountryCodes = () => {
    getCountryCodes()
      .then((response) => {
        if (response?.data && response.data.length > 0) {
          setCountryCode(response.data);
          // Set a default country code (first one in the list)
          setDefaultCountryCode(response.data[0]?.phone_code || "");
        } else {
          setCountryCode([]);
        }
      })
      .catch((error) => {
        console.log("Error fetching countries:", error);
        setCountryCode([]);
      });
  };

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

  const handleSubmit = async (values, resetForm) => {
    if (!isRecaptchaConfigured) {
      toast.error("reCAPTCHA is not configured. Please try again later.", {
        position: "top-center",
      });
      return;
    }

    const fullMobile = `${values.countryCode}-${values.phone
      .trim()
      .replace(/^0+/, "")}`;
    const { countryCode, ...updatedValues } = {
      ...values,
      phone: fullMobile,
      submitted_from: "1",
    };

    try {
      setloading(true);
      setformSubmitted(false);
      const recaptchaToken = await executeRecaptcha(
        CONTACT_US_RECAPTCHA_ACTION
      );
      await contactUsFormService({
        ...updatedValues,
        recaptchaToken,
      });
      resetForm();
      setformSubmitted(true);
    } catch (error) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to submit form. Please try again.";
      toast.error(
        typeof errorMessage === "string"
          ? errorMessage
          : "Failed to submit form. Please try again.",
        {
          position: "top-center",
        }
      );
      setformSubmitted(false);
    } finally {
      setloading(false);
    }
  };

  return (
    <>
      {bannerdata && (
        <section
          aria-label="contact-us-banner-image"
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

      <section className="breadcrumbs" aria-label="page-path">
        <div className="container">
          <div className="row">
            <div className="col-md-12">
              <div className="breadcrumbs-con">
                <a href="/" className="p-bread" rel="noreferer">
                  Home
                </a>
                {" / "}
                <a href="/contactus" className="c-bread">
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
                  <h3 className="text-center mt-4 pt-4 w-100 d-flex justify-content-center align-items-center">
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
                        countryCode: "+91",
                      }}
                      validationSchema={contactFormSchema}
                      onSubmit={(values, { resetForm }) =>
                        handleSubmit(values, resetForm)
                      }
                    >
                      {({ errors, touched, values, setFieldValue }) => (
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
                              <div className="form-group d-flex align-items-center">
                                {countryCode.length > 0 ? (
                                  <select
                                    name="countryCode"
                                    className="form-control me-2"
                                    style={{ width: "50%", height: "54px", marginBottom:"12px" }} // Ensuring equal height
                                    value={values.countryCode}
                                    onChange={(e) =>
                                      setFieldValue(
                                        "countryCode",
                                        e.target.value
                                      )
                                    }
                                  >
                                    {countryCode.map((country) => (
                                      <option
                                        key={country.id}
                                        value={country.phone_code}
                                      >
                                        {country.country_code} (
                                        {country.phone_code})
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <input
                                    type="text"
                                    className="form-control me-2"
                                    style={{ width: "45%", height: "38px" }}
                                    placeholder="+91"
                                    value={values.countryCode}
                                    onChange={(e) =>
                                      setFieldValue(
                                        "countryCode",
                                        e.target.value
                                      )
                                    }
                                  />
                                )}

                                <FormikField
                                  label="Phone Number"
                                  placeholder="Ex. 9123456789"
                                  isRequired={true}
                                  name="phone"
                                  touched={touched}
                                  errors={errors}
                                  nolabel={true}
                                  className="form-control"
                                  style={{ width: "55%", height: "38px" }} // Ensuring same height
                                />
                              </div>

                              {touched.countryCode && errors.countryCode && (
                                <div className="text-danger mt-1">
                                  {errors.countryCode}
                                </div>
                              )}
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
                                id="submit_contact_form-contact_form-contact_us_page"
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
    </>
  );
};

export default ContactUsPage;