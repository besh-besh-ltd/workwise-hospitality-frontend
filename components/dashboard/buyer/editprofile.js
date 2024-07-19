import FormikField from "@/components/shared/FormikField";
import FullLoader from "@/components/shared/FullLoader";
import Loader from "@/components/shared/Loader";
import {
  getProfile,
  handleChangeProfilePicture,
  updateProfile,
} from "@/services/Auth";
import { getCities, getStates } from "@/services/cms";
import {
  EditCompanyDetails,
  EditOnlyProfileSchema,
  EditSocialDetails,
} from "@/utils/schema";
import { Form, Formik } from "formik";
import Head from "next/head";
import Image from "next/image";
import React, { useEffect, useState } from "react";
import { ToastContainer, toast } from "react-toastify";

const EditProfile = () => {
  const [image, setImage] = useState(null);
  const [createObjectURL, setCreateObjectURL] = useState(null);
  const [userProfile, setuserProfile] = useState(null);
  const [countryList, setcountryList] = useState([
    { label: "Select Country", value: "" },
    { label: "India", value: "1" },
  ]);
  const [selectedCountry, setselectedCountry] = useState(0);
  const [mainLoading, setmainLoading] = useState(false);
  const [socialLoading, setsocialLoading] = useState(false);

  const [profileImageLoading, setprofileImageLoading] = useState(false);

  const [statesLoading, setstatesLoading] = useState(false);
  const [states, setstates] = useState([]);
  const [selectedState, setselectedState] = useState(0);

  const [citiesLoading, setcitiesLoading] = useState(false);
  const [cities, setcities] = useState([]);
  const [selectedCity, setselectedCity] = useState(0);

  useEffect(() => {
    getProfileDetails();
    getAllStates();
  }, []);

  const handleStateChange = (e) => {
    setcities([]);
    setselectedState(e.target.value);
  };

  const handleChange = (e) => {
    // console.log("edit profile===>>>>>", e.target.value);
    setselectedCountry(e.target.value);
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
    getStates().then((res) => {
      setstatesLoading(false);
      setstates(res.data);
    });
  };

  const getProfileDetails = () => {
    setmainLoading(true);
    getProfile().then((res) => {
      setmainLoading(false);
      setuserProfile(res.data);
      setselectedCountry(res.data?.country || "");
      setselectedState(res.data?.state || "");
      setselectedCity(res.data?.city || "");
    });
  };

  const handleUpdate = (values) => {
    setsocialLoading(true);
    updateProfile(values, userProfile.id)
      .then((res) => {
        setsocialLoading(false);
        getProfileDetails();
      })
      .catch((error) => {
        setsocialLoading(false);
      });
  };

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
      <ToastContainer />

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
              {!profileImageLoading && (
                <div className="user-profile">
                  {userProfile && userProfile.profile_image != "" ? (
                    <img
                      src={`${userProfile.profile_image.replace(
                        "http://localhost:3000",
                        "http://143.110.242.57:8112"
                      )}`}
                      alt="Workwise"
                      width={140}
                      height={140}
                      priority={true}
                    />
                  ) : (
                    <Image
                      src="/assets/images/user-img.png"
                      alt="Workwise"
                      width={140}
                      height={140}
                      priority={true}
                    />
                  )}
                  <label className="cameraicon">
                    <Image
                      src="/assets/images/camera-icon.png"
                      alt="Workwise"
                      width={30}
                      height={30}
                      priority={true}
                    />
                    <input type="file" name="file" onChange={uploadToClient} />
                  </label>
                  <span></span>
                </div>
              )}
            </div>
            <div className="col-md-8">
              <div className="buyer-edit-sec-form">
                <span className="title">Company information</span>
                <div className="contact-form">
                  <Formik
                    enableReinitialize={true}
                    initialValues={{
                      company_name: userProfile?.organization_name
                        ? userProfile?.organization_name
                        : "",
                      name: userProfile?.name ? userProfile?.name : "",
                      location: countryList[1].label,
                      email: userProfile?.email ? userProfile?.email : "",
                      gstin: userProfile?.gstin ? userProfile?.gstin : "",
                      cin: userProfile?.cin ? userProfile?.cin : "",
                      mobile: userProfile?.mobile ? userProfile?.mobile : "",
                    }}
                    validationSchema={EditCompanyDetails}
                    onSubmit={(values) => {
                      values.country = selectedCountry?.toString() || "";
                      values.state = selectedState?.toString() || "";
                      values.city = selectedCity?.toString() || "";
                      // console.log(values);
                      handleUpdate(values);
                    }}
                  >
                    {({ errors, touched }) => (
                      <Form>
                        <div className="row">
                          <div className="col-md-12">
                            <FormikField
                              label="Company Name"
                              isRequired={true}
                              name="company_name"
                              touched={touched}
                              errors={errors}
                            />
                          </div>
                          <div className="col-md-12">
                            <FormikField
                              label="Contact Person Name"
                              isRequired={true}
                              name="name"
                              touched={touched}
                              errors={errors}
                            />
                          </div>

                          <div className="col-md-4">
                            <FormikField
                              label="Country"
                              isRequired={true}
                              type="select"
                              name="country"
                              selectOptions={countryList}
                              value={selectedCountry}
                              touched={touched}
                              errors={errors}
                              enableHandleChange={true}
                              handleChange={handleChange}
                            />
                          </div>
                          <div className="col-md-4">
                            <div className="form-group">
                              <label>State</label>
                              {states && states.length > 0 && (
                                <select
                                  onChange={(e) => handleStateChange(e)}
                                  value={selectedState}
                                >
                                  <option value={0}>Select State</option>
                                  {states &&
                                    states.map((item) => {
                                      return (
                                        <option key={item.id} value={item.id}>
                                          {item.state_name}
                                        </option>
                                      );
                                    })}
                                </select>
                              )}
                            </div>
                          </div>
                          <div className="col-md-4">
                            <div className="form-group">
                              <label>City</label>
                              <div className="hasFullLoader">
                                {citiesLoading && <FullLoader />}
                                <select
                                  onChange={(e) => handleCityChange(e)}
                                  value={selectedCity}
                                  className="mt-2"
                                >
                                  <option value={0}>Select City</option>
                                  {cities &&
                                    cities.map((item) => {
                                      return (
                                        <option key={item.id} value={item.id}>
                                          {item.city_name}
                                        </option>
                                      );
                                    })}
                                </select>
                              </div>
                            </div>
                          </div>
                          <div className="col-md-6">
                            <FormikField
                              label="Email"
                              isRequired={true}
                              type="email"
                              name="email"
                              touched={touched}
                              errors={errors}
                            />
                          </div>
                          <div className="col-md-6">
                            <FormikField
                              label="Mobile"
                              isRequired={true}
                              name="mobile"
                              touched={touched}
                              errors={errors}
                            />
                          </div>

                          <div className="col-md-6">
                            <FormikField
                              label="GSTin"
                              isRequired={false}
                              type="text"
                              name="gstin"
                              touched={touched}
                              errors={errors}
                            />
                          </div>
                          <div className="col-md-6">
                            <FormikField
                              label="CIN"
                              isRequired={false}
                              type="text"
                              name="cin"
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

              <div className="buyer-edit-sec-form">
                <span className="title">Profile</span>
                <div className="contact-form">
                  <Formik
                    enableReinitialize={true}
                    initialValues={{
                      profile: userProfile?.profile ? userProfile?.profile : "",
                    }}
                    validationSchema={EditOnlyProfileSchema}
                    onSubmit={(values) => handleUpdate(values)}
                  >
                    {({ errors, touched }) => (
                      <Form>
                        <div className="row">
                          <div className="col-md-12">
                            <FormikField
                              label="Add a sort descrption"
                              isRequired={true}
                              type="textarea"
                              name="profile"
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
