import CommonFormInput from "@/components/shared/CommonFormInput";
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
import { EditOnlyProfileSchema } from "@/utils/schema";
import { Form, Formik } from "formik";
import Head from "next/head";
import React, { useEffect, useState } from "react";
import { ToastContainer, toast } from "react-toastify";

const EditProfile = () => {
  const [userProfile, setUserProfile] = useState(null);
  const [countryList, setCountryList] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState("");
  const [mainLoading, setMainLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);
  const [profileImageLoading, setProfileImageLoading] = useState(false);
  const [states, setStates] = useState([]);
  const [selectedState, setSelectedState] = useState(0);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [cities, setCities] = useState([]);
  const [selectedCity, setSelectedCity] = useState(0);
  const [countryCodes, setCountryCodes] = useState([]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [codesRes, profileRes, countriesRes] = await Promise.all([
        getCountryCodes(),
        getProfile(),
        getCountries(),
      ]);
      setCountryCodes(codesRes.data);
      setUserProfile(profileRes.data);
      setCountryList(countriesRes.data);

      if (profileRes.data?.location) {
        const loc = profileRes.data.location;
        setSelectedCountry(loc.country);
        setSelectedState(loc.state);
        setSelectedCity(loc.city);
        getStates(loc.country).then((res) => setStates(res.data));
        getCities(loc.state).then((res) => setCities(res.data));
      }
    } catch (err) {
      console.error("Error during initial load:", err);
    } finally {
      setMainLoading(false);
    }
  };

  const handleUpdate = (values) => {
    setSocialLoading(true);
    const mobile = `${values.countryCode || "+91"}-${values.mobile
      .trim()
      .replace(/^0+/, "")}`;

    updateProfile(
      { name: values.name, email: values.email, mobile },
      userProfile.id
    )
      .then((res) => {
        toast(res.message);
        fetchInitialData();
      })
      .finally(() => setSocialLoading(false));
  };

  const handleCompanyUpdate = (values) => {
    setSocialLoading(true);
    const updatedValues = {
      ...values,
      location: {
        country: parseInt(selectedCountry),
        state: parseInt(selectedState),
        city: parseInt(selectedCity),
      },
    };
    updateProfile(updatedValues, userProfile.id)
      .then((res) => {
        toast(res.message);
        fetchInitialData();
      })
      .finally(() => setSocialLoading(false));
  };

  const uploadToClient = (e) => {
    if (e.target.files && e.target.files[0]) {
      uploadToServer(e.target.files[0]);
    }
  };

  const uploadToServer = async (file) => {
    setProfileImageLoading(true);
    await handleChangeProfilePicture(file);
    fetchInitialData();
    setProfileImageLoading(false);
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
      <section className="buyer-edit-sec-1">
        {mainLoading && <Loader />}
        <div className="container-fluid">
          <div className="row">
            <div className="col-md-2">
              {profileImageLoading ? (
                <FullLoader />
              ) : (
                <ProfileImageUploader
                  imageUrl={userProfile?.logo}
                  placeholderUrl="/assets/images/user-img.png"
                  onChange={uploadToClient}
                  loading={profileImageLoading}
                />
              )}
            </div>
            <div className="col-md-8">
              {/* Contact Details */}
              <Formik
                enableReinitialize
                initialValues={{
                  name: userProfile?.name || "",
                  email: userProfile?.email || "",
                  mobile: userProfile?.mobile
                    ? userProfile.mobile.trim().replace(/^[^-]*-/, "")
                    : "",
                  countryCode: userProfile?.mobile.split("-")[0],
                }}
                onSubmit={handleUpdate}
              >
                {({ errors, touched, setFieldValue }) => (
                  <Form className="buyer-edit-sec-form">
                    <span className="title">Contact Details</span>
                    <CommonFormInput
                      name="name"
                      label="Name"
                      touched={touched}
                      errors={errors}
                      values={userProfile?.name}
                    />
                    <CommonFormInput
                      name="email"
                      label="Email"
                      type="email"
                      touched={touched}
                      errors={errors}
                      values={userProfile?.email}
                    />
                    <CommonFormInput
                      name="mobile"
                      type="mobile"
                      label="Mobile"
                      values={userProfile?.mobile} // ✅ just pass the value string, e.g., "+91-9876543210"
                      errors={errors}
                      setFieldValue={setFieldValue}
                    />
                    <div className="text-end">
                      <button type="submit" className="btn btn-secondary">
                        Save
                      </button>
                    </div>
                  </Form>
                )}
              </Formik>

              {/* Company Details */}
              <Formik
                enableReinitialize
                initialValues={{
                  company_name: userProfile?.company_name || "",
                  about: userProfile?.about || "",
                  address: userProfile?.address || "",
                  street_address: userProfile?.building_name || "",
                  postal_code: userProfile?.postal_code || "",
                  established_year: userProfile?.established_year || "",
                  gstin: userProfile?.gstin || "",
                  website: userProfile?.website || "",
                  city: userProfile?.city || "",
                  state: userProfile?.state || "",
                  country: userProfile?.country || "",
                }}
                validationSchema={EditOnlyProfileSchema}
                onSubmit={handleCompanyUpdate}
              >
                {({ values, errors, touched, setFieldValue }) => (
                  <Form className="buyer-edit-sec-form">
                    <span className="title">Company Details</span>
                    <div className="row">
                      <div className="col-md-6">
                        <CommonFormInput
                          name="company_name"
                          label="Company Name"
                          touched={touched}
                          errors={errors}
                        />
                      </div>
                      <div className="col-md-6">
                        <CommonFormInput
                          type="number"
                          name="established_year"
                          label="Estd. Year"
                          touched={touched}
                          errors={errors}
                        />
                      </div>
                      <div className="col-md-12">
                        <CommonFormInput
                          type="textarea"
                          name="about"
                          label="About"
                          touched={touched}
                          errors={errors}
                        />
                      </div>
                      <div className="col-md-6">
                        <CommonFormInput
                          name="gstin"
                          label="GSTIN"
                          touched={touched}
                          errors={errors}
                        />
                      </div>
                      <div className="col-md-6">
                        <CommonFormInput
                          name="website"
                          label="Website"
                          touched={touched}
                          errors={errors}
                        />
                      </div>
                      <div className="col-md-6">
                        <CommonFormInput
                          name="address"
                          label="Street Address"
                          touched={touched}
                          errors={errors}
                        />
                      </div>
                      <div className="col-md-6">
                        <CommonFormInput
                          name="postal_code"
                          label="Pin Code"
                          touched={touched}
                          errors={errors}
                        />
                      </div>
                      <div className="col-md-4">
                        <CommonFormInput
                          name="country"
                          label="Country"
                          type="select"
                          isMulti={false}
                          options={countryList.map((c) => ({
                            label: c.country_name,
                            value: c.id,
                          }))}
                          values={countryList.find(
                            (c) => c.id == selectedCountry
                          )}
                          setFieldValue={(option) => {
                            setSelectedCountry(option.value);
                            getStates(option.value).then((res) =>
                              setStates(res.data)
                            );
                          }}
                        />
                      </div>
                      <div className="col-md-4">
                        <CommonFormInput
                          name="state"
                          label="State"
                          type="select"
                          options={states.map((s) => ({
                            label: s.state_name,
                            value: s.id,
                          }))}
                          values={states.find((s) => s.id == selectedState)}
                          setFieldValue={(option) => {
                            setSelectedState(option.value);
                            getCities(option.value).then((res) =>
                              setCities(res.data)
                            );
                          }}
                        />
                      </div>
                      <div className="col-md-4">
                        <CommonFormInput
                          name="city"
                          label="City"
                          isMulti={false}
                          type="select"
                          options={cities.map((c) => ({
                            label: c.city_name,
                            value: c.id,
                          }))}
                          values={cities.find((c) => c.id == selectedCity)}
                          setFieldValue={(option) =>
                            setSelectedCity(option.value)
                          }
                        />
                      </div>

                      <div className="col-12 text-end">
                        <button type="submit" className="btn btn-secondary">
                          Save
                        </button>
                      </div>
                    </div>
                  </Form>
                )}
              </Formik>
            </div>
          </div>
        </div>
      </section>
    </>
  );
  a;
};

export default EditProfile;
