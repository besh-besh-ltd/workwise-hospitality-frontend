import FormikField from "@/components/shared/FormikField";
import Loader from "@/components/shared/Loader";
import {
  deleteSpoc,
  getProfile,
  getProfileDocuments,
  getVendorApproveList,
  handleChangeProfilePicture,
  handleUploadFiles,
  updateProfile,
  updatecompany,
} from "@/services/Auth";
import { Field, Form, Formik } from "formik";
import Image from "next/image";
import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { EditCompanyDetails } from "@/utils/schema";
import { components } from "react-select";
import UploadFiles from "@/components/shared/ImagesUpload";
import FullLoader from "@/components/shared/FullLoader";
import { getCities, getCountries, getCountryCodes, getStates } from "@/services/cms";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEdit, faFolderPlus, faTrash, faTrashCanArrowUp } from "@fortawesome/free-solid-svg-icons";
import DynamicFormSpoc from "@/components/modal/DynamicFormSpoc";
import { addSpoc, editSpoc } from "@/services/Auth";
import { faTrashAlt, faTrashCan } from "@fortawesome/free-regular-svg-icons";
import Select from "react-select";


const EditProfile = () => {
  // handling state for spoc
  const [vendorSpoc, setVendorSpoc] = useState([]);
  const [selectedSpocOption, setSelectedSpocOption] = useState({
    spoc_name: "",
    spoc_email: "",
    spoc_mobile: "",
    spoc_role: "",
  });
  const [spocId, setSpocId] = useState(null);
  const [openAddSpoc, setOpenAddSpoc] = useState({
    status: false,
    type: "create-spoc",
  });
  const [createLoading, setCreateLoading] = useState(false);

  const [countryList, setcountryList] = useState([]);
  const [selectedCountry, setselectedCountry] = useState(0);
  const [statesLoading, setstatesLoading] = useState(false);
  const [states, setstates] = useState([]);
  const [selectedState, setselectedState] = useState("");

  const [citiesLoading, setcitiesLoading] = useState(false);
  const [cities, setcities] = useState([]);
  const [selectedCity, setselectedCity] = useState("");

  const [userDetails, setUserDetails] = useState(null);
  const [userDocuments, setUserDocuments] = useState(null);
  const [vendorApproveList, setVendorApproveList] = useState([]);
  const [selectedVendorApproveList, setSelectedVendorApproveList] = useState(
    []
  );
  const [selectedVendorApprove, setSelectedVendorApprove] = useState(null);
  const [mainLoading, setMainLoading] = useState(false);
  const [profileImageLoading, setProfileImageLoading] = useState(false);
  const [image, setImage] = useState(null);
  const [createObjectURL, setCreateObjectURL] = useState(null);
  const [selectedBrochureFiles, setSelectedBrochureFiles] = useState([]);
  const [selectedDocumentsFiles, setSelectedDocumentsFiles] = useState([]);
  const [selectedPTRFiles, setSelectedPTRFiles] = useState([]);
  const [selectedBrochureFilesReset, setSelectedBrochureFilesReset] =
    useState(false);
  const [selectedDocumentsFilesReset, setSelectedDocumentsFilesReset] =
    useState(false);
  const [selectedPTRFilesReset, setSelectedPTRFilesReset] = useState(false);
  const [countryCode , setCountryCode] = useState([]);
  const [onecountrycode , setonecountrycode] = useState("");
  const [extractedCountryCode , setextractedCountryCode] = useState("");

  // Nature of business options - hardcoded from admin panel
  const businessOptions = [
    {value : "Authorised Distributor", label : "Authorised Distributor"},
    {value : "Authorised Dealer", label : "Authorised Dealer"},
    {value : "Branch", label : "Branch"},
    {value : "Channel Partner", label : "Channel Partner"},
    {value : "Distributor", label : "Distributor"},
    {value : "Constructor", label : "Constructor"},
    {value : "Contractor", label : "Contractor"},
    {value : "Dealer", label: "Dealer" },
    {value : "Designer", label : "Designer"},
    {value : "Exporter", label : "Exporter"},
    {value : "Importer", label : "Importer"},
    {value : 'Manufacturer', label: 'Manufacturer' },
    {value : "OEM (Original EquipmentManufacturer)", label : "OEM (Original EquipmentManufacturer)"},
    {value : "Official Distributor", label : "Official Distributor"},
    {value : "Partner", label : "Partner"},
    {value : "Retailer", label : "Retailer"},
    {value : "Service Provider", label : "Service Provider"},
    {value : "Supplier", label : "Supplier"},
    {value : "Subsidiary" , label : 'Subsidiary'},
    {value : "Stockist", label : "Stockist"},
    {value : "Trader", label : "Trader"},
    {value: 'Wholesaler', label: 'Wholesaler' } 
  ];

  const customSelectStyles = {
    control: (base) => ({
      ...base,
      position: "relative",
      height: "50px",
    }),
    dropdownIndicator: (base) => ({
      ...base,
      background: "#ffa500",
      width: "50px",
      padding: "14px",
    }),
    indicatorSeparator: (base) => ({
      ...base,
      display: "none",
    }),
  };
  const DropdownIndicator = (props) => {
    return (
      <components.DropdownIndicator {...props}>
        <Image
          src="/assets/images/search-icon-white.svg"
          width={20}
          height={20}
          alt="Search"
        />
      </components.DropdownIndicator>
    );
  };

  useEffect(() => {
    getVendorApproveLists();
    getProfileDetails();
    getProfileDocument();
    fetchCountryCodes();
   
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
       
        setCountryCode([]);
      });
  };
  useEffect(() => {
    getCountries()
      .then((res) => {
        setcountryList(res.data); // Set country list state
      })
      .catch((err) => console.error("Error fetching countries:", err));
  }, []);

  useEffect(()=>{
    if(selectedCountry){
      getAllStates();
    }
  },[selectedCountry])

  useEffect(()=>{
    if(selectedState){
      getAllCities();
    }
  },[selectedState])

  const handleCountryChange = (e) => {
    setselectedCountry(e.target.value);
  };

  const handleStateChange = (e) => {
    setcities([]);
    setselectedState(e.target.value);
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

  const getProfileDetails = async () => {
    try {
      setMainLoading(true);
      const res = await getProfile();
      setMainLoading(false);
      
      console.log("Profile API Response:", res.data); // Debug log
      
      setextractedCountryCode(res.data.mobile ? res.data.mobile.match(/^\+\d{1,4}/)?.[0] || "+91" : "+91");
      setonecountrycode(res.data.mobile ? res.data.mobile.match(/^\+\d{1,4}/)?.[0] || "+91" : "+91");

      setUserDetails({
        name: res.data.name || "",
        address: res.data.address || "",
        mobile: res.data.mobile ? res.data.mobile.replace(/^\+\d{1,4}-/, '') : "",
        email: res.data.email || "",
        organization_name: res.data.company_name || res.data.organization_name || "",
        nature_of_business: res.data.nature_of_business || "",
        turnover: res.data.turnover || "",
        no_of_employess: res.data.no_of_employess || "",
        gstin: res.data.gstin || "",
        cin: res.data.cin || "",
        profile: res.data.profile || "",
        import_export_code: res.data.import_export_code || "",
        profile_image: res.data.profile_image || "",
        established_year: res.data.established_year || "",
        website: res.data.website || "",
        postal_code: res.data.postal_code || "",
        company_mobile: res.data.company_mobile || "",
      });
      
      console.log("Mapped User Details:", {
        nature_of_business: res.data.nature_of_business,
        cin: res.data.cin,
        turnover: res.data.turnover,
        import_export_code: res.data.import_export_code,
        no_of_employess: res.data.no_of_employess
      }); // Debug specific fields
      
      setVendorSpoc(res.data.spoc || []);
      setselectedCountry(res.data?.country || "");
      setselectedState(res.data?.state || "");
      setselectedCity(res.data?.city || "");
    } catch (error) {
      setMainLoading(false);
      console.error("Error fetching profile:", error);
    }
  };

  const getVendorApproveLists = () => {
    getVendorApproveList().then((res) => {
      let result = res.data.map((item) => ({
        value: item.id,
        label: item.vendor_approve,
      }));
      setVendorApproveList(result);
    });
  };

  const getProfileDocument = () => {
    getProfileDocuments().then((res) => {
      if (res.data.length > 0) {
        const docGroup = Object.groupBy(res.data, (e) => e.doc_type);
        setUserDocuments(docGroup);
      } else {
        setUserDocuments(null);
      }
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
    setProfileImageLoading(true);
    handleChangeProfilePicture(supplied_img)
      .then((res) => {
        getProfileDetails();
        setProfileImageLoading(false);
      })
      .catch((err) => setProfileImageLoading(false));
  };

  const submitHandler = (values, resetForm) => {
    setMainLoading(true);
    delete values.profile_image;
    
    // Transform mobile with country code
    const fullmobile = `${onecountrycode}-${values.mobile
      .trim()
      .replace(/^0+/, "")}`;

    // Split data into user profile and company profile
    const userProfileData = {
      name: values.name,
      email: values.email,
      mobile: fullmobile, // Use company mobile if provided, otherwise personal mobile
    };
    
    const companyProfileData = {
      company_name: values.organization_name,
      about_company: values.profile,
      street_address: values.address,
      postal_code: values.postal_code ? String(values.postal_code) : null,
      established_year: values.established_year ? Number(values.established_year) : null,
      gstin: values.gstin || null,
      website: values.website || null,
      nature_of_business: values.nature_of_business || null,
      turnover: values.turnover ? values.turnover : null,
      no_of_employess: values.no_of_employess ? String(values.no_of_employess) : null,
      import_export_code: values.import_export_code || null,
      cin: values.cin || null,
      country: selectedCountry ? Number(selectedCountry) : null,
      state: selectedState ? Number(selectedState) : null,
      city: selectedCity ? Number(selectedCity) : null,
    };
  
    // Execute both API calls sequentially to better handle errors
    updateProfile(userProfileData)
      .then((userResponse) => {
       
        return updatecompany(companyProfileData);
      })
      .then((companyResponse) => {
        
        setMainLoading(false);
        // Add a small delay before refreshing profile to ensure backend has processed
        setTimeout(() => {
        getProfileDetails();
        }, 500);
        toast("Profile updated successfully");
      })
      .catch((error) => {
        setMainLoading(false);
        
        // Show more specific error message
        if (error?.response?.data?.message) {
          toast(error.response.data.message);
        } else {
          toast("Error updating profile");
        }
      });
  };
  
  const handleUploadFile = (file, type) => {
    setMainLoading(true);
    handleUploadFiles(file, type)
      .then((res) => {
        setMainLoading(false);
        getProfileDocument();
        if (type === "brochure") {
          setSelectedBrochureFilesReset(true);
          setTimeout(() => {
            setSelectedBrochureFilesReset(false);
          }, 1000);
        }
        if (type === "documents") {
          setSelectedDocumentsFilesReset(true);
          setTimeout(() => {
            setSelectedDocumentsFilesReset(false);
          }, 1000);
        }
        if (type === "ptr") {
          setSelectedPTRFilesReset(true);
          setTimeout(() => {
            setSelectedPTRFilesReset(false);
          }, 1000);
        }
        toast("file has been successfully uploaded");
      })
      .catch((err) => {
        setMainLoading(false);
      });
  };

  const handleSpoc = (values, resetForm) => {
    setCreateLoading(true);
    setOpenAddSpoc(false);
    addSpoc(values)
      .then((res) => {
        toast.success(res.message, { position: "top-right" });
      })
      .catch((error) => {
        toast.error(error.message?.response?.data?.message, {
          position: "top-right",
        });
        
      })
      .finally(() => {
        resetForm();
        setCreateLoading(false);
        getProfileDetails();
      });
  };
  
  const handleDeleteSpoc = (id) => {
    setCreateLoading(true);
    setOpenAddSpoc(false);
    deleteSpoc(id)
      .then((res) => {
        toast.success(res.message, { position: "top-right" });
      })
      .catch((error) => {
        toast.error(error.message?.response?.data?.message, {
          position: "top-right",
        });
       
      })
      .finally(() => {
        setCreateLoading(false);
        getProfileDetails();
      });
  }

  const handleEditSpoc = (values, resetForm) => {
    setCreateLoading(true);

    setOpenAddSpoc(false);
    editSpoc(values, spocId)
      .then((res) => {
        toast.success(res.message, { position: "top-right" });
      })
      .catch((error) => {
        toast.error(error.message?.response?.data?.message, {
          position: "top-right",
        });
   
      })
      .finally(() => {
        resetForm();
        setCreateLoading(false);
        getProfileDetails();
      });
  };

  const selectedCountryCode = countryCode.find(
    (item) => item.phone_code === extractedCountryCode
  );

  return (
    <>
      {createLoading && <Loader />}
      <section className="vendor-common-header sc-pt-80">
        <div className="container-fluid">
          <h1 className="heading">Edit profile</h1>
        </div>
      </section>
      <section className="vendor-edit-sec-1">
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
                  {userDetails && userDetails.profile_image != "" ? (
                    <img
                      src={userDetails.profile_image}
                      alt="Workwise"
                      width={140}
                      height={140}
                      priority="true"
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
              <Formik
                enableReinitialize={true}
                initialValues={userDetails}
                validationSchema={EditCompanyDetails}
                onSubmit={(values, { resetForm }) => {
                  values.country = selectedCountry?.toString() || "";
                  values.state = selectedState?.toString() || "";
                  values.city = selectedCity?.toString() || "";
                  submitHandler(values, resetForm);
                }}
              >
                {({ errors, touched, values, handleChange, setFieldValue }) => (
                  <Form>
                    <div className="vendor-edit-sec-form">
                      <span className="title">Basic information</span>
                      <div className="contact-form">
                        <div className="row">
                          <div className="col-md-6">
                            <div className="form-group">
                              <FormikField
                                label="Vendor Name"
                                placeholder="Ex. Manoj Kumar"
                                isRequired={true}
                                name="name"
                                touched={touched}
                                errors={errors}
                              />
                            </div>
                          </div>

                          <div className="col-md-6">
                            <div className="form-group">
                              <FormikField
                                label="Email"
                                placeholder="@example.com"
                                isRequired={true}
                                name="email"
                                type="email"
                                touched={touched}
                                errors={errors}
                              />
                            </div>
                          </div>

                            <div className="col-md-6">
                              <div className="form-group">
                                <label>Mobile</label>
                                <div className="d-flex align-items-center">
                                  {/* Country Code Dropdown */}
                                  <Field
                                    as="select"
                                    name="countryCode"
                                    className="form-control me-2 p-2"
                                    style={{
                                      width: "30%",
                                      minHeight: "54px",
                                      borderTopRightRadius: "0",
                                      borderBottomRightRadius: "0",
                                    }}
                                    value={onecountrycode}
                                    onChange={(e) =>
                                      setonecountrycode(e.target.value)
                                    }
                                  >
                                    <option
                                      value={selectedCountryCode?.phone_code}
                                    >
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
                                  </Field>

                                  {/* Mobile Number Input */}
                                  <div style={{ flexGrow: 1 }}>
                                    <Field
                                      type="text"
                                      name="mobile"
                                      className={`form-control ${
                                        touched.mobile && errors.mobile
                                          ? "is-invalid"
                                          : ""
                                      }`}
                                      placeholder="Ex. 9123456789"
                                      style={{
                                        width: "100%",
                                        minHeight: "54px",
                                        borderTopLeftRadius: "0",
                                        borderBottomLeftRadius: "0",
                                      }}
                                    />
                                    {touched.mobile && errors.mobile && (
                                      <div className="invalid-feedback">
                                        {errors.mobile}
                                      </div>
                                    )}
                                </div>
                              </div>
                            </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                    <div className="vendor-edit-sec-form">
                      <span className="title">Company information</span>
                      <div className="contact-form">
                        <div className="row">
                            <div className="col-md-6">
                            <div className="form-group">
                                <FormikField
                                label="Organization Name"
                                placeholder="Ex. ABC Company Ltd"
                                  isRequired={true}
                                name="organization_name"
                                  touched={touched}
                                  errors={errors}
                                />
                              </div>
                          </div>

                          <div className="col-md-6">
                            <div className="form-group">
                              <FormikField
                                label="Established Year"
                                placeholder="Ex. 1990"
                                name="established_year"
                                type="number"
                                touched={touched}
                                errors={errors}
                              />
                            </div>
                          </div>

                          <div className="col-md-12">
                            <div className="form-group">
                              <FormikField
                                label="Registered Address"
                                placeholder="Ex. SaltLake, Sector 5, Kolkata, West Bengal, India"
                                name="address"
                                touched={touched}
                                errors={errors}
                              />
                            </div>
                          </div>

                          <div className="col-md-6">
                            <div className="form-group">
                              <FormikField
                                label="Postal Code"
                                placeholder="Ex. 700001"
                                name="postal_code"
                                touched={touched}
                                errors={errors}
                              />
                            </div>
                          </div>

                          <div className="col-md-6">
                            <div className="form-group">
                              <label htmlFor="country">Country</label>
                              <Field
                                as="select"
                                className="form-control mt-2"
                                name="country"
                                onChange={handleCountryChange}
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

                          <div className="col-md-6">
                            <div className="form-group">
                              <label>State</label>
                              <select
                                onChange={(e) => handleStateChange(e)}
                                value={selectedState}
                                className="form-control mt-2"
                              >
                                <option value={0}>Select State</option>
                                {states &&
                                  states.map((item) => (
                                      <option key={item.id} value={item.id}>
                                        {item.state_name}
                                      </option>
                                  ))}
                              </select>
                            </div>
                          </div>

                          <div className="col-md-6">
                            <div className="form-group">
                              <label>City</label>
                              <div className="hasFullLoader">
                                {citiesLoading && <FullLoader />}
                                <select
                                  onChange={(e) => handleCityChange(e)}
                                  value={selectedCity}
                                  className="form-control mt-2"
                                >
                                  <option value={0}>Select City</option>
                                  {cities &&
                                    cities.map((item) => (
                                        <option key={item.id} value={item.id}>
                                          {item.city_name}
                                        </option>
                                    ))}
                                </select>
                        </div>
                      </div>
                    </div>

                          <div className="col-md-6">
                            <div className="form-group">

                              <FormikField
                                label="Website"
                                placeholder="Ex. https://www.example.com"
                                name="website"
                                type="url"
                                touched={touched}
                                errors={errors}
                              />
                            </div>
                          </div>

                          <div className="col-md-6">
                            <div className="form-group">
                              <label>Nature of Business</label>
                              <Select
                                className="mt-2"
                                isMulti
                                name="nature_of_business"
                                options={businessOptions}
                                value={businessOptions.filter(option => 
                                  values?.nature_of_business?.split(',').includes(option.value)
                                )}
                                onChange={(selectedOptions) => {
                                  const selectedValues = selectedOptions 
                                    ? selectedOptions.map(option => option.value).join(',')
                                    : '';
                                  setFieldValue('nature_of_business', selectedValues);
                                }}
                                components={{ DropdownIndicator }}
                                placeholder="Select Nature of Business"
                                styles={{
                                  control: (provided) => ({
                                    ...provided,
                                    minHeight: '54px',
                                  }),

                                }}
                              />
                            </div>
                          </div>

                          <div className="col-md-6">
                            <div className="form-group">
                              <FormikField
                                label="GSTIN"
                                placeholder="Ex. 22AAAAA0000A1Z5"
                                name="gstin"
                                touched={touched}
                                errors={errors}
                              />
                            </div>
                          </div>

                          <div className="col-md-6">
                            <div className="form-group">
                              <FormikField
                                label="CIN"
                                placeholder="Ex. L99999MH1982PLC028758"
                                name="cin"
                                touched={touched}
                                errors={errors}
                              />
                            </div>
                          </div>

                          <div className="col-md-6">
                            <div className="form-group">
                              <FormikField
                                label="Import Export Code"
                                placeholder="Ex. 1234567890"
                                name="import_export_code"
                                touched={touched}
                                errors={errors}
                              />
                            </div>
                          </div>

                          <div className="col-md-6">
                            <div className="form-group">
                              <FormikField
                                label="Turn Over"
                                placeholder="Ex. 50 cr"
                                name="turnover"
                                touched={touched}
                                errors={errors}
                              />
                            </div>
                          </div>

                          <div className="col-md-6">
                            <div className="form-group">
                              <FormikField
                                label="Total Employees"
                                placeholder="Ex. 50"
                                name="no_of_employess"
                                type="number"
                                touched={touched}
                                errors={errors}
                              />
                            </div>
                          </div>

                          {/* <div className="col-md-6">
                            <div className="form-group">
                              <FormikField
                                label="Company Mobile"
                                placeholder="Ex. +91-9123456789"
                                name="company_mobile"
                                touched={touched}
                                errors={errors}
                              />
                            </div>
                          </div> */}
                        </div>
                      </div>
                    </div>

                    <div className="vendor-edit-sec-form">
                      <span className="title">About Your Business</span>
                      <div className="contact-form">
                        <div className="row">
                          <div className="col-md-12">
                            <div className="form-group">
                              <FormikField
                                nolabel="true"
                                placeholder="Write something about the company "
                                type="textarea"
                                name="profile"
                                touched={touched}
                                errors={errors}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="vendor-edit-sec-form">
                      <span className="title">Brochure</span>

                      <div className="contact-form">
                        <div className="row">
                          <UploadFiles
                            noLabel="true"
                            accept=".png, .jpg, .jpeg, .gif"
                            upload={setSelectedBrochureFiles}
                            reset={selectedBrochureFilesReset}
                            preview={
                              userDocuments?.brochure
                                ? userDocuments.brochure
                                : null
                            }
                          />
                        </div>
                        {selectedBrochureFiles.length > 0 && (
                          <button
                            className="btn btn-secondary edit-profile"
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              handleUploadFile(
                                selectedBrochureFiles,
                                "brochure"
                              );
                            }}
                          >
                            Upload
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="vendor-edit-sec-form">
                      <span className="title">Documents</span>

                      <div className="contact-form">
                        <div className="row">
                          <UploadFiles
                            accept=".png, .jpg, .jpeg, .gif, .pdf"
                            upload={setSelectedDocumentsFiles}
                            reset={selectedDocumentsFilesReset}
                            preview={
                              userDocuments?.documents
                                ? userDocuments.documents
                                : null
                            }
                          />
                        </div>
                        {selectedDocumentsFiles.length > 0 && (
                          <button
                            className="btn btn-secondary edit-profile"
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              handleUploadFile(
                                selectedDocumentsFiles,
                                "documents"
                              );
                            }}
                          >
                            Upload
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="vendor-edit-sec-form">
                      <span className="title">Past Track Record (PTR)</span>

                      <div className="contact-form">
                        <div className="row">
                          <UploadFiles
                            accept=".png, .jpg, .jpeg, .gif, .pdf"
                            upload={setSelectedPTRFiles}
                            reset={selectedPTRFilesReset}
                            preview={
                              userDocuments?.ptr ? userDocuments.ptr : null
                            }
                          />
                        </div>
                        {selectedPTRFiles.length > 0 && (
                          <button
                            className="btn btn-secondary edit-profile"
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              handleUploadFile(selectedPTRFiles, "ptr");
                            }}
                          >
                            Upload
                          </button>
                        )}
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="btn btn-secondary edit-profile mb-4"
                    >
                      Save
                    </button>
                  </Form>
                )}
              </Formik>

              <div className=" ">
                <div className="details-table p-4 vendor-edit-sec-form">
                  <div className="table-header row mb-4">
                    <div className="filter-options col-7 align-items-center"></div>

                    <div className="ms-auto d-flex justify-content-between align-items-center mb-2  ">
                      <span className="title"> Manage SPOC </span>

                      <button
                        className="btn btn-primary"
                        onClick={() =>
                          setOpenAddSpoc({ status: true, type: "create-spoc" })
                        }
                      >
                        Create New Spoc
                      </button>
                    </div>
                    {vendorSpoc && vendorSpoc.length > 0 ? (
                      <div className="table-responsive">
                        <table className="table table-striped">
                          <thead>
                            <tr>
                              <th scope="col">S.R.</th>
                              <th scope="col">Name</th>
                              <th scope="col">Role</th>
                              <th scope="col">Email</th>
                              <th scope="col">Mobile</th>
                              <th scope="col">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {vendorSpoc &&
                              vendorSpoc.length > 0 &&
                              vendorSpoc.map((spoc, index) => {
                                return (
                                  <>
                                    <tr key={spoc.id}>
                                      <td>{index + 1}</td>
                                      <td>{spoc.name}</td>
                                      <td>{spoc.role}</td>
                                      <td>{spoc.email}</td>
                                      <td>{spoc.mobile}</td>
                                      <td>
                                        {/* Edit Button */}
                                        <span
                                          role="button"
                                          className="cursor-pointer me-3" // Adds some gap between icons
                                          onClick={() => {
                                            setOpenAddSpoc({
                                              status: true,
                                              type: "edit-spoc",
                                            });
                                            setSelectedSpocOption({
                                              spoc_name: spoc.name,
                                              spoc_email: spoc.email,
                                              spoc_mobile: spoc.mobile,
                                              spoc_role: spoc.role,
                                            });
                                            setSpocId(spoc.id);
                                          }}
                                        >
                                          <FontAwesomeIcon icon={faEdit} />
                                        </span>

                                        {/* Delete Button */}
                                        <span
                                          role="button"
                                          className="cursor-pointer text-danger"
                                          onClick={() =>
                                            handleDeleteSpoc(spoc.id)
                                          }
                                        >
                                          <FontAwesomeIcon icon={faTrashAlt} />
                                        </span>
                                      </td>
                                    </tr>
                                  </>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      "No Spoc Found"
                    )}
                  </div>
                </div>
              </div>
            </div>
            {/*   */}
          </div>
        </div>
      </section>
      {openAddSpoc.status && (
        <DynamicFormSpoc
          type={openAddSpoc.type}
          spocData={selectedSpocOption}
          openModal={openAddSpoc.status}
          closeModal={() => setOpenAddSpoc({ status: false })}
          handleSpoc={handleSpoc}
          handleEditSpoc={handleEditSpoc}
          countryCode={countryCode}
        />
      )}
    </>
  );
};

export default EditProfile;
