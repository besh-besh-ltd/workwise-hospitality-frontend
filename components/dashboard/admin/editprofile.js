import React, { useEffect, useRef, useState } from "react";
import Head from "next/head";
import { Formik, Form } from "formik";
import { toast } from "react-toastify";

import CommonFormInput from "@/components/shared/CommonFormInput";
import FullLoader from "@/components/shared/FullLoader";
import Loader from "@/components/shared/Loader";
import ProfileImageUploader from "@/components/shared/ProfileImageUploader";

import {
  getProfile,
  handleChangeProfilePicture,
  updatecompany,
  updateProfile,
} from "@/services/Auth";
import { getCities, getCountries, getStates } from "@/services/cms";
import { EditOnlyProfileSchema } from "@/utils/schema";

const initialUserDetails = {
  name: "",
  email: "",
  mobile: "",
  countryCode: "+91",
};

const initializeCompanyDetails = {
  company_name: "",
  about_company: "",
  street_address: "",
  postal_code: "",
  established_year: "",
  gstin: "",
  website: "",
  country: null,
  state: null,
  city: null,
};

const initializeLocation = {
  countries: [],
  states: [],
  cities: [],
};

/**
 * mukul 09-06-2025
 * creating this companent for user edit profile page, this is going to be use for admin, procurment, finalce, eng team, vendor user type accounts
 * for now creathing this here only but once we start working on vendor profile page we move this to component=>dashboard folder as this component is common for all users we have
 */

const EditProfile = () => {
  const [userDetails, setUserDetails] = useState(initialUserDetails);
  const [companyDetails, setCompanyDetails] = useState(
    initializeCompanyDetails
  );
  const [locationOptions, setLocationOptions] = useState(initializeLocation);

  const [mainLoading, setMainLoading] = useState(false);
  const [profileImageLoading, setProfileImageLoading] = useState(false);
  const [userProfileLogo, setUserProfileLogo] = useState(null);

  const isCompanyEditableForUserRef = useRef(null);

  // fetch initial data
  const fetchInitialData = async () => {
    setMainLoading(true);
    try {
      const [profileRes, countriesRes] = await Promise.all([
        getProfile(),
        getCountries(),
      ]);

      const data = profileRes.data;

      // splica mobile no and code
      const [countryCode = "+91", mobileNumber = ""] = (
        data?.mobile || "+91-"
      ).split("-");

      //  company is editable only if user type is 3 or 7 ( company admin )
      isCompanyEditableForUserRef.current =
        data?.user_type === 3 || data?.user_type === 7;
      console.log(
        isCompanyEditableForUserRef.current,
        "isCompanyEditableForUserRef.current"
      );

      // user profile logo
      setUserProfileLogo(data?.logo);

      // set user details
      setUserDetails({
        name: data?.name || "",
        email: data?.email || "",
        mobile: mobileNumber,
        countryCode,
      });

      // update company details state
      setCompanyDetails({
        company_name: data?.company_name || "",
        about_company: data?.about || "",
        street_address: data?.address || "",
        postal_code: data?.postal_code || "",
        established_year: data?.established_year || "",
        gstin: data?.gstin || "",
        website: data?.website || "",
        country: data?.location?.country || null,
        state: data?.location?.state || null,
        city: data?.location?.city || null,
      });

      const [statesRes, citiesRes] = await Promise.all([
        getStates(data?.location?.country),
        getCities(data?.location?.state),
      ]);

      setLocationOptions({
        countries: countriesRes.data,
        states: statesRes.data,
        cities: citiesRes.data,
      });
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setMainLoading(false);
    }
  };

  // update user details, name, email, mobile only
  const handleUpdate = (values) => {
    setMainLoading(true);
    const payload = {
      name: values.name,
      email: values.email,
      mobile: `${values.countryCode}-${values.mobile
        .trim()
        .replace(/^0+/, "")}`,
    };
    updateProfile(payload)
      .then((res) => {
        toast(res.message);
        fetchInitialData();
      })
      .finally(() => setMainLoading(false));
  };

  //  this function make api call to update company informatation for for user company admin and vendor can use this function
  const handleCompanyUpdate = (values) => {
    setMainLoading(true);

    const payload = {
      ...values,
      country: values?.country?.value || null,
      state: values?.state?.value || null,
      city: values?.city?.value || null,
    };

    updatecompany(payload)
      .then((res) => {
        toast(res.message);
        fetchInitialData();
      })
      .finally(() => setMainLoading(false));
  };

  const uploadToClient = (e) => {
    if (e.target.files && e.target.files[0]) {
      uploadToServer(e.target.files[0]);
    }
  };

  // update company logo
  const uploadToServer = async (file) => {
    setProfileImageLoading(true);
    await handleChangeProfilePicture(file);
    fetchInitialData();
    setProfileImageLoading(false);
  };

  // fetch initial data
  useEffect(() => {
    fetchInitialData();
  }, []);

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
                // user profile dispaly and update ( only company admin can update )
                <ProfileImageUploader
                  imageUrl={userProfileLogo}
                  placeholderUrl="/assets/images/user-img.png"
                  onChange={uploadToClient}
                  loading={profileImageLoading}
                />
              )}
            </div>

            {/* START: details form cotainer */}
            <div className="col-md-8">
              {/* START: user details form */}
              <Formik
                enableReinitialize
                initialValues={userDetails}
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
                      required
                    />
                    <CommonFormInput
                      name="email"
                      label="Email"
                      type="email"
                      touched={touched}
                      errors={errors}
                      required
                    />
                    <CommonFormInput
                      name="mobile"
                      type="mobile"
                      label="Mobile"
                      values={userDetails?.mobile}
                      errors={errors}
                      setFieldValue={setFieldValue}
                      required
                    />
                    <div className="text-end">
                      <button type="submit" className="btn btn-secondary">
                        Save
                      </button>
                    </div>
                  </Form>
                )}
              </Formik>
              {/* END: user details form */}

              {/* START: company details form: only editable for company admin */}
              <Formik
                enableReinitialize
                initialValues={companyDetails}
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
                          required
                          placeholder="e.g. Workwise Solutions Pvt. Ltd."
                          disabled={!isCompanyEditableForUserRef.current}
                        />
                      </div>
                      <div className="col-md-6">
                        <CommonFormInput
                          name="established_year"
                          type="number"
                          label="Estd. Year"
                          touched={touched}
                          errors={errors}
                          placeholder="e.g. 2018"
                          disabled={!isCompanyEditableForUserRef.current}
                        />
                      </div>
                      <div className="col-md-12">
                        <CommonFormInput
                          name="about_company"
                          type="textarea"
                          label="About"
                          touched={touched}
                          errors={errors}
                          setFieldValue={setFieldValue}
                          placeholder="Brief description about your company"
                          disabled={!isCompanyEditableForUserRef.current}
                        />
                      </div>
                      <div className="col-md-6">
                        <CommonFormInput
                          name="gstin"
                          label="GSTIN"
                          touched={touched}
                          errors={errors}
                          placeholder="Enter 15-digit GSTIN (e.g. 27AAECS1234F1Z2)"
                          disabled={!isCompanyEditableForUserRef.current}
                        />
                      </div>
                      <div className="col-md-6">
                        <CommonFormInput
                          name="website"
                          label="Website"
                          touched={touched}
                          errors={errors}
                          type="url"
                          placeholder="e.g. https://www.yourcompany.com"
                          disabled={!isCompanyEditableForUserRef.current}
                        />
                      </div>
                      <div className="col-md-6">
                        <CommonFormInput
                          name="street_address"
                          label="Street Address"
                          touched={touched}
                          errors={errors}
                          placeholder="e.g. 271 Business Park, Western Express Highway"
                          disabled={!isCompanyEditableForUserRef.current}
                        />
                      </div>
                      <div className="col-md-6">
                        <CommonFormInput
                          name="postal_code"
                          label="Pin Code"
                          touched={touched}
                          errors={errors}
                          placeholder="e.g. 110001"
                          disabled={!isCompanyEditableForUserRef.current}
                        />
                      </div>

                      {/* Location Inputs */}
                      <div className="col-md-4">
                        <CommonFormInput
                          name="country"
                          label="Country"
                          type="select"
                          isMulti={false}
                          options={locationOptions.countries.map((c) => ({
                            label: c.country_name,
                            value: c.id,
                          }))}
                          values={locationOptions.countries.find(
                            (c) => c.id === values.country
                          )}
                          setFieldValue={setFieldValue}
                          onChange={(option) => {
                            setFieldValue("country", option.value);
                            getStates(option.value).then((res) =>
                              setLocationOptions((prev) => ({
                                ...prev,
                                states: res.data,
                                cities: [],
                              }))
                            );
                          }}
                          disabled={!isCompanyEditableForUserRef.current}
                        />
                      </div>
                      <div className="col-md-4">
                        <CommonFormInput
                          name="state"
                          label="State"
                          type="select"
                          isMulti={false}
                          options={locationOptions.states.map((s) => ({
                            label: s.state_name,
                            value: s.id,
                          }))}
                          values={locationOptions.states.find(
                            (s) => s.id === values.state
                          )}
                          setFieldValue={setFieldValue}
                          onChange={(option) => {
                            setFieldValue("state", option.value);
                            getCities(option.value).then((res) =>
                              setLocationOptions((prev) => ({
                                ...prev,
                                cities: res.data,
                              }))
                            );
                            setFieldValue("city", null); // reset city on state change
                          }}
                          disabled={!isCompanyEditableForUserRef.current}
                        />
                      </div>
                      <div className="col-md-4">
                        <CommonFormInput
                          name="city"
                          label="City"
                          type="select"
                          isMulti={false}
                          options={locationOptions.cities.map((c) => ({
                            label: c.city_name,
                            value: c.id,
                          }))}
                          values={locationOptions.cities.find(
                            (c) => c.id === values.city
                          )}
                          setFieldValue={setFieldValue}
                          onChange={(option) => {
                            setFieldValue("city", option.value);
                          }}
                          disabled={!isCompanyEditableForUserRef.current}
                        />
                      </div>
                      {isCompanyEditableForUserRef.current && (
                        <div className="col-12 text-end">
                          <button type="submit" className="btn btn-secondary">
                            Save
                          </button>
                        </div>
                      )}
                    </div>
                  </Form>
                )}
              </Formik>
              {/* END: company details form: only editable for company admin */}
            </div>
            {/* END: details form cotainer */}
          </div>
        </div>
      </section>
    </>
  );
};

export default EditProfile;
