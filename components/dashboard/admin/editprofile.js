import FormikField from "@/components/shared/FormikField";
import FullLoader from "@/components/shared/FullLoader";
import Loader from "@/components/shared/Loader";
import ProfileImageUploader from "@/components/shared/ProfileImageUploader";
import {
  getProfile,
  handleChangeProfilePicture,
  updateProfile,
} from "@/services/Auth";
import {
  getCities,
  getCountries,
  getCountryCodes,
  getStates,
} from "@/services/cms";
import {
  EditCompanyDetails,
  EditOnlyProfileSchema,
  EditSocialDetails,
} from "@/utils/schema";
import { Field, Form, Formik } from "formik";
import Head from "next/head";
import Image from "next/image";
import React, { useEffect, useState } from "react";
import { ToastContainer, toast } from "react-toastify";

const EditProfile = () => {
  const [image, setImage] = useState(null);
  const [createObjectURL, setCreateObjectURL] = useState(null);
  const [userProfile, setuserProfile] = useState(null);
  const [countryList, setcountryList] = useState([]);
  const [selectedCountry, setselectedCountry] = useState("");
  const [mainLoading, setmainLoading] = useState(false);
  const [socialLoading, setsocialLoading] = useState(false);

  const [profileImageLoading, setprofileImageLoading] = useState(false);

  const [statesLoading, setstatesLoading] = useState(false);
  const [states, setstates] = useState([]);
  const [selectedState, setselectedState] = useState(0);

  const [citiesLoading, setcitiesLoading] = useState(false);
  const [cities, setcities] = useState([]);
  const [selectedCity, setselectedCity] = useState(0);
  const [countryCode, setCountryCode] = useState([]);
  const [onecountrycode, setoneountrycode] = useState("");

  useEffect(() => {
    fetchCountryCodes();
    getProfileDetails();
    getCountries()
      .then((res) => {
        setcountryList(res.data); // Set country list state
      })
      .catch((err) => console.error("Error fetching countries:", err));
  }, []);

  const fetchCountryCodes = () => {
    getCountryCodes()
      .then((response) => {
        if (response?.data) {
          setCountryCode(response.data);
        } else {
          setCountryCode([]);
        }
      })
      .catch((error) => {
        console.log("Error fetching countries:", error);
        setCountryCode([]);
      });
  };

  useEffect(() => {
    if (selectedCountry) {
      getAllStates();
    }
  }, [selectedCountry]);

  const handleStateChange = (e) => {
    setcities([]);
    setselectedState(e.target.value);
  };

  const handleChange = (e) => {
    // console.log("edit profile===>>>>>", e.target.value);
    setselectedCountry(e.target.value);
    setselectedState(""); // Reset the state when the country changes
    setstates([]); // Clear the states to avoid old data being shown
    setcities([]);
  };

  useEffect(() => {
    if (selectedState) {
      getAllCities();
    }
  }, [selectedState]);

  const getAllCities = () => {
    setcitiesLoading(true);
    getCities(selectedState).then((res) => {
      setcitiesLoading(false);
      setcities(res.data);
    });
  };
  const handleCityChange = (e) => {
    setselectedCity(e.target.value);
  };

  const getAllStates = () => {
    setstatesLoading(true);
    getStates(selectedCountry).then((res) => {
      setstatesLoading(false);
      setstates(res.data);
    });
  };

  const getProfileDetails = () => {
    setmainLoading(true);
    getProfile().then((res) => {
      setmainLoading(false);
      setuserProfile(res.data);

      // Parse the location JSON string safely
      let locationData = { country: "", state: "", city: "" };
      if (res.data?.location) {
        try {
          locationData = res.data.location
        } catch (error) {
          console.error("Error parsing location data:", error);
        }
      }
      setselectedCountry(locationData.country || "");
      setselectedState(locationData.state || "");
      setselectedCity(locationData.city || "");
    });
  };

  const handleUpdate = (values) => {
    setsocialLoading(true);

    // Transform the values to include the location object

    console.log("values", values);
    let fullMobile;
    if (values.countryCode == "") {
      fullMobile = `${selectedCountryCode.phone_code}-${values.mobile
        .trim()
        .replace(/^0+/, "")}`;
        console.log("fullMobile with dropdown", fullMobile);
    } else {
      fullMobile = `${values.countryCode}-${values.mobile
        .trim()
        .replace(/^0+/, "")}`;
        console.log("fullMobile without dropdown", fullMobile);
    }
    const { countryCode, ...restValues } = values;
    const updatedValues = {
      ...restValues,
     
      mobile: fullMobile,
    };

    updateProfile(updatedValues, userProfile.id)
      .then((res) => {
        setsocialLoading(false);
        getProfileDetails();
        toast(res.message);
      })
      .catch((error) => {
        setsocialLoading(false);
      });
  };
  const handleCompanyUpdate = (values) =>{
    console.log("Company Update Values", values);
    setsocialLoading(true);
    const updatedValues = {
      ...values,
      location:
     {  country: parseInt(location?.country),
    state: parseInt(location?.state),
    city: parseInt(location?.city)
    }
    };

    updateProfile(updatedValues, userProfile.id)
      .then((res) => {
        setsocialLoading(false);
        getProfileDetails();
        toast(res.message);
      })
      .catch((error) => {
        setsocialLoading(false);
      });
  }
  const uploadToClient = (event) => {
    if (event.target.files && event.target.files[0]) {
      const i = event.target.files[0];

      setImage(i);
      setCreateObjectURL(URL.createObjectURL(i));
      uploadToServer(i);
    }
  };

  const uploadToServer = async (supplied_img) => {
    setprofileImageLoading(true);
    handleChangeProfilePicture(supplied_img)
      .then((res) => {
        getProfileDetails();
        setprofileImageLoading(false);
      })
      .catch((err) => setprofileImageLoading(false));
  };

  const extractedCountryCode =
    userProfile?.mobile.match(/^\+?\d+/)?.[0] || "+91";

  const selectedCountryCode = countryCode.find(
    (item) => item.phone_code === extractedCountryCode
  );
  
  return (
    <>
      <Head>
        <title>Workwise | Edit Profile</title>
      </Head>
      <section className="buyer-common-header sc-pt-80">
        <div className="container-fluid">
          <h1 className="heading">Edit profile</h1>
        </div>
      </section>

      <section className="buyer-edit-sec-1">
        {mainLoading && <Loader />}
        <div className="container-fluid">
          <div className="row">
            <div className="col-md-2">
              {profileImageLoading && (
                <div className="user-profile hasFullLoader">
                  <FullLoader />
                </div>
              )}
              {!profileImageLoading && userProfile && (
                <ProfileImageUploader
                  imageUrl={userProfile?.logo}
                  placeholderUrl="/assets/images/user-img.png"
                  onChange={uploadToClient}
                  loading={profileImageLoading}
                />
              )}
            </div>
            <div className="col-md-8">
              <div className="buyer-edit-sec-form">
                <span className="title">Contact Details</span>
                <div className="contact-form">
                  <Formik
                    enableReinitialize={true}
                    initialValues={{
                      name: userProfile?.name || "NA",
                      email: userProfile?.email || "",
                      mobile: userProfile?.mobile
                        ? userProfile.mobile.trim().replace(/^[^-]*-/, "")
                        : "",
                      countryCode: "",
                    }}
                    // validationSchema={EditCompanyDetails}
                    onSubmit={(values) => {
                      console.log("Submitting values", values);
                      handleUpdate(values);
                    }}
                  >
                    {({ errors, touched }) => (
                      <Form>
                        <div className="row g-4">
                          {/* Name Field */}
                          <div className="col-12">
                            <label htmlFor="name" className="form-label">
                              Name <span className="text-danger">*</span>
                            </label>
                            <Field
                              id="name"
                              name="name"
                              className={`form-control ${
                                touched.name && errors.name ? "is-invalid" : ""
                              }`}
                              placeholder="Enter name"
                            />
                            {touched.name && errors.name && (
                              <div className="invalid-feedback">
                                {errors.name}
                              </div>
                            )}
                          </div>

                          {/* Email Field */}
                          <div className="col-md-6">
                            <label htmlFor="email" className="form-label">
                              Email <span className="text-danger">*</span>
                            </label>
                            <Field
                              id="email"
                              name="email"
                              type="email"
                              className={`form-control ${
                                touched.email && errors.email
                                  ? "is-invalid"
                                  : ""
                              }`}
                              placeholder="Enter email"
                            />
                            {touched.email && errors.email && (
                              <div className="invalid-feedback">
                                {errors.email}
                              </div>
                            )}
                          </div>

                          {/* Mobile Field with Country Code */}
                          <div className="col-md-6">
                            <label className="form-label">
                              Mobile <span className="text-danger">*</span>
                            </label>
                            <div className="input-group">
                              {/* Country Code Dropdown */}
                              <Field name="countryCode">
                                {({ field, form }) => (
                                  <select
                                    {...field}
                                    className="form-select"
                                    style={{ maxWidth: "120px" }}
                                    onChange={(e) => {
                                      form.setFieldValue(
                                        "countryCode",
                                        e.target.value
                                      );
                                      setoneountrycode(e.target.value);
                                    }}
                                  >
                                    <option value="">
                                      {selectedCountryCode?.country_code} (
                                      {selectedCountryCode?.phone_code})
                                    </option>
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
                                )}
                              </Field>

                              {/* Mobile Number Input */}
                              <Field
                                type="text"
                                name="mobile"
                                className={`form-control ${
                                  touched.mobile && errors.mobile
                                    ? "is-invalid"
                                    : ""
                                }`}
                                placeholder="Enter mobile number"
                              />
                              {touched.mobile && errors.mobile && (
                                <div className="invalid-feedback">
                                  {errors.mobile}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Submit Button */}
                          <div className="col-12 text-end">
                            <button
                              type="submit"
                              className="btn btn-secondary px-4"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      </Form>
                    )}
                  </Formik>
                </div>
              </div>

              <div className="buyer-edit-sec-form">
                <span className="title">Company Details</span>
                <div className="contact-form">
                  <Formik
                    enableReinitialize={true}
                    initialValues={{
                      company_name: userProfile?.company_name || "",
                      country: userProfile?.country || "",
                      state: userProfile?.state_name || "",
                      city: userProfile?.city_name || "",
                      address: userProfile?.address || "",
                      about: userProfile?.about || "",
                      established_year: userProfile?.established_year || "",
                      gstin: userProfile?.gstin || "",
                      website: userProfile?.website || "",
                    }}
                    validationSchema={EditOnlyProfileSchema}
                    onSubmit={(values) => handleCompanyUpdate(values)}
                  >
                    {({ errors, touched }) => (
                      <Form>
                        <div className="contact-form">
                          <div className="row">
                            <div className="col-md-6">
                              <FormikField
                                label="Company Name"
                                type="text"
                                isRequired={true}
                                name="company_name"
                                touched={touched}
                                errors={errors}
                              />
                            </div>
                            <div className="col-md-6">
                              <FormikField
                                label="About the Company"
                                type="text"
                                name="about"
                                isRequired={true}
                                touched={touched}
                                errors={errors}
                              />
                            </div>

                            <div className="col-md-4">
                              <div className="form-group">
                                <label htmlFor="city">Country</label>
                                <Field
                                  as="select"
                                  className="form-control mt-2" // Matching class for consistency
                                  name="country"
                                  onChange={handleChange}
                                  value={selectedCountry}
                                >
                                  <option value="">Select</option>
                                  {countryList?.map((country) => (
                                    <option key={country.id} value={country.id}>
                                      {country.country_name}
                                    </option>
                                  ))}
                                </Field>
                              </div>
                            </div>

                            <div className="col-md-4">
                              <div className="form-group">
                                <label>State</label>

                                <select
                                  className="form-control mt-2"
                                  onChange={(e) => handleStateChange(e)}
                                  value={selectedState}
                                >
                                  <option value={0}>Select State</option>
                                  {states.map((item) => (
                                    <option key={item.id} value={item.id}>
                                      {item.state_name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            <div className="col-md-4">
                              <div className="form-group">
                                <label>City</label>
                                <div className="hasFullLoader">
                                  {citiesLoading && <FullLoader />}
                                  <select
                                    className="form-control mt-2"
                                    onChange={(e) => handleCityChange(e)}
                                    value={selectedCity}
                                  >
                                    <option value={0}>Select City</option>
                                    {cities.map((item) => (
                                      <option key={item.id} value={item.id}>
                                        {item.city_name}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            </div>

                            <div className="col-md-6">
                              <FormikField
                                label="Street Address"
                                type="text"
                                name="location"
                                isRequired={true}
                                touched={touched}
                                errors={errors}
                              />
                            </div>

                            <div className="col-md-6">
                              <FormikField
                                label="Estd. Year"
                                type="text"
                                name="established_year"
                                touched={touched}
                                errors={errors}
                              />
                            </div>

                            <div className="col-md-6">
                              <FormikField
                                label="GSTIN"
                                type="text"
                                name="gstin"
                                touched={touched}
                                errors={errors}
                              />
                            </div>

                            <div className="col-md-6">
                              <FormikField
                                label="Website"
                                type="text"
                                name="website"
                                touched={touched}
                                errors={errors}
                              />
                            </div>

                            <div className="col-md-12 text-right mt-4">
                              <button
                                type="submit"
                                className="btn btn-secondary"
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        </div>
                      </Form>
                    )}
                  </Formik>
                </div>
              </div>

              <div className="buyer-edit-sec-form hasFullLoader">
                {socialLoading && <FullLoader />}
                <span className="title">Social info(Optional)</span>
                <div className="contact-form">
                  <Formik
                    enableReinitialize={true}
                    initialValues={{
                      linkedin: userProfile?.linkedin
                        ? userProfile?.linkedin
                        : "",
                      facebook: userProfile?.facebook
                        ? userProfile?.facebook
                        : "",
                      whatsapp: userProfile?.whatsapp
                        ? userProfile?.whatsapp
                        : "",
                      skype: userProfile?.skype ? userProfile?.skype : "",
                    }}
                    validationSchema={EditSocialDetails}
                    onSubmit={(values) => handleUpdate(values)}
                  >
                    {({ errors, touched }) => (
                      <Form>
                        <div className="row">
                          <div className="col-md-12">
                            <FormikField
                              label="Linkedin page"
                              isRequired={false}
                              name="linkedin"
                              touched={touched}
                              errors={errors}
                            />
                          </div>
                          <div className="col-md-12">
                            <FormikField
                              label="Facebook page"
                              isRequired={false}
                              name="facebook"
                              touched={touched}
                              errors={errors}
                            />
                          </div>
                          <div className="col-md-6">
                            <FormikField
                              label="Whatsapp Number"
                              isRequired={false}
                              name="whatsapp"
                              touched={touched}
                              errors={errors}
                            />
                          </div>
                          <div className="col-md-6">
                            <FormikField
                              label="Skype"
                              isRequired={false}
                              name="skype"
                              touched={touched}
                              errors={errors}
                            />
                          </div>

                          <button type="submit" className="btn btn-secondary">
                            Save
                          </button>
                        </div>
                      </Form>
                    )}
                  </Formik>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default EditProfile;
 