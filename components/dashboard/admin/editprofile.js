import React, { useEffect, useMemo, useRef, useState } from "react";
import Head from "next/head";
import { Formik, Form } from "formik";
import { toast } from "react-toastify";

import CommonFormInput from "@/components/shared/CommonFormInput";
import FullLoader from "@/components/shared/FullLoader";
import Loader from "@/components/shared/Loader";
import ProfileImageUploader from "@/components/shared/ProfileImageUploader";
import LocationModal from "@/components/modal/LocationModal";

import {
  createVendorLocation,
  deleteVendorLocation,
  getProfile,
  getVendorlocations,
  handleChangeProfilePicture,
  updatecompany,
  updateProfile,
  updateVendorlocations,
} from "@/services/Auth";
import { getCities, getCountries, getStates } from "@/services/cms";
import { getMyHospitalityContexts } from "@/services/hospitality";
import { EditOnlyProfileSchema } from "@/utils/schema";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { FaEdit, FaTrashAlt } from "react-icons/fa";
import { faEdit } from "@fortawesome/free-regular-svg-icons";
import { faAtlas, faTrash } from "@fortawesome/free-solid-svg-icons";

// User type mapping utility
const getUserTypeLabel = (userType) => {
  const userTypeMap = {
    2: "Procurement",
    3: "Seller",
    4: "Other",
    7: "Admin",
    8: "Management",
    9: "Engineering",
    10: "Finance"
  };
  return userTypeMap[userType] || "User";
};

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

const EditProfile = () => {
  const [userDetails, setUserDetails] = useState(initialUserDetails);
  const [companyDetails, setCompanyDetails] = useState(initializeCompanyDetails);
  const [locationOptions, setLocationOptions] = useState(initializeLocation);
  const [userType, setUserType] = useState(null);
  const [isHospitalityUser, setIsHospitalityUser] = useState(false);
  const [hospitalityScopes, setHospitalityScopes] = useState([]);
  const [hospitalityLoading, setHospitalityLoading] = useState(false);

  const [mainLoading, setMainLoading] = useState(false);
  const [profileImageLoading, setProfileImageLoading] = useState(false);
  const [userProfileLogo, setUserProfileLogo] = useState(null);
  const [locations, setLocations] = useState([]);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  const isCompanyEditableForUserRef = useRef(null);

  const loadHospitalityScopes = async () => {
    setHospitalityLoading(true);
    try {
      const response = await getMyHospitalityContexts();
      const list = response?.data?.data || response?.data || [];
      setHospitalityScopes(list);
    } catch (error) {
      setHospitalityScopes([]);
    } finally {
      setHospitalityLoading(false);
    }
  };

  // fetch initial data
  const fetchInitialData = async () => {
    setMainLoading(true);
    try {
      const [profileRes, countriesRes] = await Promise.all([
        getProfile(),
        getCountries(),
      ]);

      const data = profileRes.data;

      const [statesRes, citiesRes] = await Promise.all([
        getStates(data?.country),
        getCities(data?.state),
      ]);

      setLocationOptions({
        countries: countriesRes.data,
        states: statesRes.data,
        cities: citiesRes.data,
      });

      // splica mobile no and code
      const [countryCode = "+91", mobileNumber = ""] = (
        data?.mobile || "+91-"
      ).split("-");

      const hospitalityEnabled =
        data?.is_hospitality === 1 || data?.is_hospitality === "1";
      setIsHospitalityUser(!!hospitalityEnabled);
      if (hospitalityEnabled) {
        loadHospitalityScopes();
      } else {
        setHospitalityScopes([]);
      }

      //  company is editable only if user type is 3 or 7 ( company admin )
      isCompanyEditableForUserRef.current =
        data?.user_type === 3 || data?.user_type === 7;

      // Set user type for display
      setUserType(data?.user_type);

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
        company_id: data.company_id,
        company_name: data?.company_name || "",
        about_company: data?.profile || "",
        street_address: data?.address || "",
        postal_code: data?.postal_code || "",
        established_year: data?.established_year || "",
        gstin: data?.gstin || "",
        website: data?.website || "",
        country: { value: data?.country || null, label: data?.country_name || "India" },
        state: { value: data?.state || null, label: data?.state_name || "" },
        city: { value: data?.city || null, label: data?.city_name || "" }
      });

    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setMainLoading(false);
    }
  };

  useEffect(() => {
    if (companyDetails?.company_id)
      fetchVendorLocations()
  }, [companyDetails?.company_id])

  const fetchVendorLocations = async () => {
    getVendorlocations(companyDetails?.company_id).then((res) => {
      setLocations(res.data)
    })
      .catch((err) => {
        console.log(err)
      });
  }

  // update user details, name, email, mobile only
  const handleUpdate = (values) => {
    setMainLoading(true);
    const payload = {
      name: values.name,
      email: values.email,
      mobile: `${values.countryCode}-${String(values.mobile || "")
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

  const groupedHospitalityScopes = useMemo(() => {
    if (!hospitalityScopes.length) return [];
    const grouped = hospitalityScopes.reduce((acc, ctx) => {
      const companyId = ctx.hospitality_company_id || ctx.id;
      if (!companyId) {
        return acc;
      }
      if (!acc[companyId]) {
        acc[companyId] = {
          companyId,
          companyName: ctx.company_name || ctx.name || "Company",
          hasCompanyAccess: false,
          hotels: [],
        };
      }
      if (ctx.mapping_type === 0) {
        acc[companyId].hasCompanyAccess = true;
      } else if (ctx.mapping_type === 1 && ctx.hospitality_hotel_id) {
        acc[companyId].hotels.push({
          id: ctx.hospitality_hotel_id,
          name: ctx.hotel_name,
        });
      }
      return acc;
    }, {});
    return Object.values(grouped);
  }, [hospitalityScopes]);

  const handleLocationChange = async (field, option, setFieldValue) => {
    const value = option?.value || null;
    setFieldValue(field, option);

    if (field === "country") {
      // Fetch states on country change
      const res = await getStates(value);
      setLocationOptions((prev) => ({
        ...prev,
        states: res.data || [],
        cities: [],
      }));
      setFieldValue("state", null);
      setFieldValue("city", null);
    }

    if (field === "state") {
      // Fetch cities on state change
      const res = await getCities(value);
      setLocationOptions((prev) => ({
        ...prev,
        cities: res.data || [],
      }));
      setFieldValue("city", null);
    }
  };

  // Location management functions
  const handleDeleteLocation = (locationId) => {
    deleteVendorLocation(locationId)
    .then((res) => {
      toast(res.message);
      fetchVendorLocations()
    })  . catch((err) => {
      toast.error(err);
    })
    ; // your delete API call here)
    // Add your delete API call here
  };

  const handleEditLocation = (location) => {
    setEditingLocation({
      ...location,
      street_address: location.address,
      country: location.country_id ? { 
        value: location.country_id, 
        label: location.country_name 
      } : null,
      state: location.state_id ? { 
        value: location.state_id, 
        label: location.state_name 
      } : null,
      city: location.city_id ? { 
        value: location.city_id, 
        label: location.city_name 
      } : null,
    });
    setIsEditing(true);
    setShowModal(true);
  };

  const handleAddLocation = () => {
    setEditingLocation(null);
    setIsEditing(false);
    setShowModal(true);
  };

const handleSaveLocation = async (locationData) => {
  if (isEditing) {
    await handleUpdateLocation(locationData);
  } else {
    await handleCreateLocation(locationData);
  }
};
const handleUpdateLocation = async (locationData) => {
  setMainLoading(true);

  try {
    const payload = {
      id: editingLocation.id,
      company_id: companyDetails.company_id,
      address: locationData.street_address || "",
      postal_code: Number(locationData.postal_code) || null,
      city: locationData.city?.value || null,
      state: locationData.state?.value || null,
      country: locationData.country?.value || null,
    };

    const res = await updateVendorlocations(payload);

    toast.success(res.message || "Location updated successfully!");

    await fetchInitialData();
    await fetchVendorLocations();
    setShowModal(false);

  } catch (error) {
    console.error("Update Location Error:", error);
    toast.error(error?.response?.data?.message || "Failed to update location");

  } finally {
    setMainLoading(false);
  }
};
const handleCreateLocation = async (locationData) => {
  setMainLoading(true);

  try {
    const payload = {
      company_id: companyDetails.company_id,
      address: locationData.street_address || "",
      postal_code: Number(locationData.postal_code) || null,
      city: locationData.city?.value || null,
      state: locationData.state?.value || null,
      country: locationData.country?.value || null,
    };

    const res = await createVendorLocation(payload); // your create API

    toast.success(res.message || "Location added successfully!");

    await fetchInitialData();
    await fetchVendorLocations();
    setShowModal(false);

  } catch (error) {
    console.error("Create Location Error:", error);
    toast.error(error?.response?.data?.message || "Failed to add location");

  } finally {
    setMainLoading(false);
  }
};



  const handleCloseModal = () => {
    setShowModal(false);
    setEditingLocation(null);
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h1 className="heading">Edit profile</h1>
            {userType && (
              <div style={{
                display: 'inline-block',
                backgroundColor: '#f3f4f6',
                color: '#374151',
                padding: '10px 20px',
                borderRadius: '25px',
                fontSize: '18px',
                fontWeight: '600',
                border: '2px solid #d1d5db'
              }}>
                {getUserTypeLabel(userType)}
              </div>
            )}
          </div>
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
                  imageUrl={userProfileLogo}
                  placeholderUrl="/assets/images/user-img.png"
                  onChange={isCompanyEditableForUserRef.current ? uploadToClient : null}
                  loading={profileImageLoading}
                  disabled={!isCompanyEditableForUserRef.current}
                />
              )}
            </div>

            {/* START: details form container */}
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
                      onChange={setFieldValue}
                      required
                    />
                    <div className="text-end">
                      <button type="submit" className="btn btn-secondary" id="save_contact_details-contact_details-edit_profile_page">
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
                          label="About Company"
                          touched={touched}
                          errors={errors}
                          values={companyDetails?.about_company}
                          onChange={(e) => { setCompanyDetails({ ...companyDetails, about_company: e.target.value }); }}
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
                      {/* <div className="col-md-6">
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
                      </div> */}

                      {/* Location Inputs */}
                      {/* <div className="col-md-4">
                        <CommonFormInput
                          name="country"
                          label="Country"
                          type="select"
                          isClearable={false}
                          isMulti={false}
                          options={locationOptions.countries.map((c) => ({
                            label: c.country_name,
                            value: c.id,
                          }))}
                          values={values.country}
                          onChange={(option) => handleLocationChange("country", option, setFieldValue)}
                          disabled={!isCompanyEditableForUserRef.current}
                        />
                      </div> */}
                      {/* <div className="col-md-4">
                        <CommonFormInput
                          name="state"
                          label="State"
                          type="select"
                          isClearable={false}
                          isMulti={false}
                          options={locationOptions.states.map((s) => ({
                            label: s.state_name,
                            value: s.id,
                          }))}
                          values={values.state}
                          onChange={(option) => handleLocationChange("state", option, setFieldValue)}
                          disabled={!isCompanyEditableForUserRef.current}
                        />
                      </div> */}
                      {/* <div className="col-md-4">
                        <CommonFormInput
                          name="city"
                          label="City"
                          type="select"
                          isClearable={false}
                          isMulti={false}
                          options={locationOptions.cities.map((c) => ({
                            label: c.city_name,
                            value: c.id,
                          }))}
                          values={values.city}
                          onChange={(option) => handleLocationChange("city", option, setFieldValue)}
                          disabled={!isCompanyEditableForUserRef.current}
                        />
                      </div> */}
                      {isCompanyEditableForUserRef.current && (
                        <div className="col-12 text-end">
                          <button type="submit" className="btn btn-secondary" id="save_company_details-company_details-edit_profile_page">
                            Save
                          </button>
                        </div>
                      )}
                    </div>
                  </Form>
                )}
              </Formik>
              {/* END: company details form: only editable for company admin */}

              {isHospitalityUser && (
                <div className="buyer-edit-sec-form">
                  <div className="d-flex flex-wrap align-items-center justify-content-between mb-3">
                    <span className="title mb-0">Hospitality Scope</span>
                    <span
                      className="badge"
                      style={{
                        backgroundColor: "#f8fafc",
                        color: "#0f172a",
                        fontWeight: 600,
                        padding: "8px 16px",
                        borderRadius: "999px",
                      }}
                    >
                      {hospitalityLoading
                        ? "Loading…"
                        : groupedHospitalityScopes.length
                        ? `${groupedHospitalityScopes.length} company${
                            groupedHospitalityScopes.length > 1 ? " mappings" : " mapping"
                          }`
                        : "No mappings yet"}
                    </span>
                  </div>
                  {hospitalityLoading ? (
                    <p className="text-muted mb-0">
                      Fetching your hospitality access…
                    </p>
                  ) : groupedHospitalityScopes.length === 0 ? (
                    <p className="text-muted mb-0">
                      You are not mapped to any hospitality company or hotel yet.
                      Contact your administrator to gain access.
                    </p>
                  ) : (
                    groupedHospitalityScopes.map((scope) => (
                      <div
                        key={`hospitality-scope-${scope.companyId}`}
                        className="border rounded p-3 mb-3"
                      >
                        <div className="d-flex flex-wrap justify-content-between align-items-start gap-2">
                          <div>
                            <h5 className="mb-1">{scope.companyName}</h5>
                            {scope.hasCompanyAccess && (
                              <span className="badge bg-primary">
                                Company-level access
                              </span>
                            )}
                          </div>
                          <span className="text-muted small">
                            {scope.hotels.length
                              ? `${scope.hotels.length} hotel${
                                  scope.hotels.length > 1 ? "s" : ""
                                }`
                              : "No hotel-level mapping"}
                          </span>
                        </div>
                        {scope.hotels.length > 0 && (
                          <div className="d-flex flex-wrap gap-2 mt-3">
                            {scope.hotels.map((hotel) => (
                              <span
                                key={`hotel-${scope.companyId}-${hotel.id}`}
                                className="badge bg-light text-dark border"
                              >
                                {hotel.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Locations Table Section - Simple and clean */}
              <div className="buyer-edit-sec-form">

                {/* Heading */}
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <h5 className="title">Company Locations ({locations?.length || 0})</h5>

                  {isCompanyEditableForUserRef.current && (
                    <button
                      className="btn btn-secondary"
                      onClick={handleAddLocation}
                    >
                      Add Location
                    </button>
                  )}
                </div>

                {/* Table Container */}
                <div className="contact-form">
                  {locations && locations.length > 0 ? (
                    <div className="table-responsive">
                      <table className="table table-striped">
                        <thead>
                          <tr>
                            <th scope="col">S.R.</th>
                            <th scope="col">Address</th>
                            <th scope="col">City</th>
                            <th scope="col">State</th>
                            <th scope="col">Country</th>
                            <th scope="col">Postal Code</th>
                            {isCompanyEditableForUserRef.current && <th scope="col">Actions</th>}
                          </tr>
                        </thead>

                        <tbody>
                          {locations.map((location, idx) => (
                            <tr key={location.id || idx}>
                              <td>{idx + 1}</td>
                              <td style={{ maxWidth: 300 }}>
                                {location.address || location.street_address || "-"}
                              </td>
                              <td>{location.city_name || "-"}</td>
                              <td>{location.state_name || "-"}</td>
                              <td>{location.country_name || "-"}</td>
                              <td>{location.postal_code || "-"}</td>

                              {isCompanyEditableForUserRef.current && (
                                <td>
                                  <span
                                    role="button"
                                    className="cursor-pointer me-3"
                                    onClick={() => handleEditLocation(location)}
                                  >
                                    <FontAwesomeIcon icon={faEdit} />
                                  </span>
                                  <span
                                    role="button"
                                    className="cursor-pointer text-danger"
                                    onClick={() => handleDeleteLocation(location.id)}
                                  >
                                    <FontAwesomeIcon icon={faTrash} />
                                  </span>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-muted">No locations found.</p>
                  )}
                </div>

              </div>

            </div>
            {/* END: details form container */}
          </div>
        </div>
      </section>

      {/* Location Modal */}
      <LocationModal
        show={showModal}
        onClose={handleCloseModal}
        onSave={handleSaveLocation}
        initialData={editingLocation}
        countries={locationOptions.countries}
        isEditing={isEditing}
      />
    </>
  );
};

export default EditProfile;