import React, { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { setUserProfile } from "@/redux/slice";
import Head from "next/head";
import { Formik, Form } from "formik";
import { toast } from "react-toastify";

import CommonFormInput from "@/components/shared/CommonFormInput";
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
import { Pencil, Trash2, Camera } from "lucide-react";
import styles from "./EditProfile.module.scss";

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
  // postal_code: "",
  established_year: "",
  gstin: "",
  website: "",
  // country: null,
  // state: null,
  // city: null,
};

const initializeLocation = {
  countries: [],
  states: [],
  cities: [],
};

const EditProfile = () => {
  const dispatch = useDispatch();
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
      dispatch(setUserProfile(data));

      const [statesRes, citiesRes] = await Promise.all([
        getStates(data?.country),
        getCities(data?.state),
      ]);

      setLocationOptions({
        countries: countriesRes.data,
        states: statesRes?.data || [],
        cities: citiesRes?.data || [],
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
        // street_address: data?.address || "",
        // postal_code: data?.postal_code || "",
        established_year: data?.established_year || "",
        gstin: data?.gstin || "",
        website: data?.website || "",
        // country: { value: data?.country || null, label: data?.country_name || "India" },
        // state: { value: data?.state || null, label: data?.state_name || "" },
        // city: { value: data?.city || null, label: data?.city_name || "" }
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
      ...values
      // country: values?.country?.value || null,
      // state: values?.state?.value || null,
      // city: values?.city?.value || null,
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

  const userInitial = userDetails?.name?.charAt(0)?.toUpperCase() || "U";

  return (
    <>
      <Head>
        <title>Workwise | Edit Profile</title>
      </Head>

      <div className={styles.page}>

        {/* ── Profile header: avatar + name + badge ── */}
        <div className={styles.profileHeader}>
          <div className={styles.avatarWrap}>
            <div className={styles.avatarInner}>
              {userProfileLogo ? (
                <img src={userProfileLogo} alt={userDetails?.name || "Profile"} />
              ) : (
                <div className={styles.avatarPlaceholder}>{userInitial}</div>
              )}
            </div>
            {isCompanyEditableForUserRef.current && (
              <label className={styles.avatarUpload}>
                <Camera size={12} strokeWidth={2} />
                <input type="file" accept="image/*" onChange={uploadToClient} />
              </label>
            )}
          </div>
          <div className={styles.profileInfo}>
            <h2 className={styles.profileName}>{userDetails?.name || "—"}</h2>
            <p className={styles.profileEmail}>{userDetails?.email || ""}</p>
            <span className={styles.profileBadge}>
              {getUserTypeLabel(userType)}
            </span>
          </div>
        </div>

        {/* ── Contact Details ── */}
        <Formik enableReinitialize initialValues={userDetails} onSubmit={handleUpdate}>
          {({ errors, touched, setFieldValue }) => (
            <Form className={styles.section}>
              <h3 className={styles.sectionTitle}>Contact Details</h3>
              <div className={styles.formGrid}>
                <CommonFormInput name="name" label="Name" touched={touched} errors={errors} required />
                <CommonFormInput name="email" label="Email" type="email" touched={touched} errors={errors} required />
                <CommonFormInput name="mobile" type="mobile" label="Mobile" values={userDetails?.mobile} errors={errors} onChange={setFieldValue} required />
                <div className={styles.formActions}>
                  <button type="submit" className={styles.saveBtn} id="save_contact_details-contact_details-edit_profile_page">Save</button>
                </div>
              </div>
            </Form>
          )}
        </Formik>

        {/* ── Company Details ── */}
        <Formik enableReinitialize initialValues={companyDetails} validationSchema={EditOnlyProfileSchema} onSubmit={handleCompanyUpdate}>
          {({ values, errors, touched, setFieldValue }) => (
            <Form className={styles.section}>
              <h3 className={styles.sectionTitle}>Company Details</h3>
              <div className={styles.formGrid}>
                <CommonFormInput name="company_name" label="Company Name" touched={touched} errors={errors} required placeholder="e.g. Workwise Solutions Pvt. Ltd." disabled={!isCompanyEditableForUserRef.current} />
                <CommonFormInput name="established_year" type="number" label="Estd. Year" touched={touched} errors={errors} placeholder="e.g. 2018" disabled={!isCompanyEditableForUserRef.current} />
                <div className={styles.fullWidth}>
                  <CommonFormInput name="about_company" type="textarea" label="About Company" touched={touched} errors={errors} values={companyDetails?.about_company} onChange={(e) => { setCompanyDetails({ ...companyDetails, about_company: e.target.value }); }} placeholder="Brief description about your company" disabled={!isCompanyEditableForUserRef.current} />
                </div>
                <CommonFormInput name="gstin" label="GSTIN" touched={touched} errors={errors} placeholder="Enter 15-digit GSTIN" disabled={!isCompanyEditableForUserRef.current} />
                <CommonFormInput name="website" label="Website" touched={touched} errors={errors} type="url" placeholder="e.g. https://www.yourcompany.com" disabled={!isCompanyEditableForUserRef.current} />
                {isCompanyEditableForUserRef.current && (
                  <div className={styles.formActions}>
                    <button type="submit" className={styles.saveBtn} id="save_company_details-company_details-edit_profile_page">Save</button>
                  </div>
                )}
              </div>
            </Form>
          )}
        </Formik>

        {/* ── Hospitality Scope ── */}
        {isHospitalityUser && (
          <div className={styles.section}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 className={styles.sectionTitle} style={{ marginBottom: 0, paddingBottom: 0, borderBottom: 'none' }}>Hospitality Scope</h3>
              <span className={styles.scopeCount}>
                {hospitalityLoading ? "Loading…" : groupedHospitalityScopes.length ? `${groupedHospitalityScopes.length} mapping${groupedHospitalityScopes.length > 1 ? "s" : ""}` : "No mappings"}
              </span>
            </div>
            <div style={{ marginTop: 16 }}>
              {hospitalityLoading ? (
                <p className={styles.emptyText}>Fetching your hospitality access…</p>
              ) : groupedHospitalityScopes.length === 0 ? (
                <p className={styles.emptyText}>You are not mapped to any hospitality company or business unit yet. Contact your administrator.</p>
              ) : (
                groupedHospitalityScopes.map((scope) => (
                  <div key={`hospitality-scope-${scope.companyId}`} className={styles.scopeCard}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                      <div>
                        <h5 className={styles.scopeCompanyName}>{scope.companyName}</h5>
                        {scope.hasCompanyAccess && <span className={styles.scopeBadgePrimary}>Company-level access</span>}
                      </div>
                      <span style={{ fontSize: 12, color: '#94a3b8' }}>
                        {scope.hotels.length ? `${scope.hotels.length} business unit${scope.hotels.length > 1 ? "s" : ""}` : "No BU mapping"}
                      </span>
                    </div>
                    {scope.hotels.length > 0 && (
                      <div className={styles.scopeHotels}>
                        {scope.hotels.map((hotel) => (
                          <span key={`hotel-${scope.companyId}-${hotel.id}`} className={styles.scopeHotelPill}>{hotel.name}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ── Company Locations ── */}
        <div className={styles.section}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 className={styles.sectionTitle} style={{ marginBottom: 0, paddingBottom: 0, borderBottom: 'none' }}>
              Company Locations ({locations?.length || 0})
            </h3>
            {isCompanyEditableForUserRef.current && (
              <button type="button" className={styles.addLocationBtn} onClick={handleAddLocation}>+ Add Location</button>
            )}
          </div>

          {locations && locations.length > 0 ? (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Address</th>
                    <th>City</th>
                    <th>State</th>
                    <th>Country</th>
                    <th>Postal Code</th>
                    {isCompanyEditableForUserRef.current && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {locations.map((location, idx) => (
                    <tr key={location.id || idx}>
                      <td>{idx + 1}</td>
                      <td>{location.address || location.street_address || "-"}</td>
                      <td>{location.city_name || "-"}</td>
                      <td>{location.state_name || "-"}</td>
                      <td>{location.country_name || "-"}</td>
                      <td>{location.postal_code || "-"}</td>
                      {isCompanyEditableForUserRef.current && (
                        <td>
                          <button type="button" className={styles.actionIcon} onClick={() => handleEditLocation(location)}>
                            <Pencil size={14} />
                          </button>
                          <button type="button" className={styles.actionIconDanger} onClick={() => handleDeleteLocation(location.id)}>
                            <Trash2 size={14} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className={styles.emptyText}>No locations found.</p>
          )}
        </div>
      </div>

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