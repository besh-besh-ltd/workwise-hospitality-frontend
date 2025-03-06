import FormikField from "@/components/shared/FormikField";
import Loader from "@/components/shared/Loader";
import {
  getProfile,
  getProfileDocuments,
  getVendorApproveList,
  handleChangeProfilePicture,
  handleUploadFiles,
  updateProfile,
} from "@/services/Auth";
import { Field, Form, Formik } from "formik";
import Image from "next/image";
import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import * as yup from "yup";
import { components } from "react-select";
import UploadFiles from "@/components/shared/ImagesUpload";
import FullLoader from "@/components/shared/FullLoader";
import { getCities, getCountries, getCountryCodes, getStates } from "@/services/cms";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEdit, faFolderPlus } from "@fortawesome/free-solid-svg-icons";
import DynamicFormSpoc from "@/components/modal/DynamicFormSpoc";
import { addSpoc, editSpoc } from "@/services/Auth";

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

  const validationSchema = yup.object().shape({
    name: yup.string().required("Vendor name is required"),
    address: yup.string(),
    mobile: yup.string().required("Mobile is required"),
    email: yup
      .string()
      .email()
      .matches(
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
        "please enter valid email address"
      )
      .required("Email is required"),
    nature_of_business: yup.string(),
    type_of_business: yup.string(),
    turnover: yup.number(),
    no_of_employess: yup.string(),
    gstin: yup.string(),
    import_export_code: yup.string(),
    certifications: yup.string(),
    cin: yup.string().optional(""),
    profile: yup.string(),
    vendor_approve: yup.array().optional(""),
  });

  const employeeNumberOption = [
    { label: "Select Number of Employees", value: "", disabled: true },
    { label: "101-500", value: "500" },
    { label: "501-1000", value: "1000" },
    { label: "10001-2000", value: "2000" },
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
        console.log("Error fetching countries:", error);
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


 
  useEffect(() => {
    if (userDetails && vendorApproveList) {
      let intersection = vendorApproveList.filter(function (e) {
        return userDetails.vendor_approve.indexOf(e.value) > -1;
      });
      setSelectedVendorApproveList(intersection);
    }
  }, [vendorApproveList, userDetails]);

  const getProfileDetails = async () => {
    try {
      setMainLoading(true);
      const res = await getProfile();
      setMainLoading(false);
      
      setextractedCountryCode(res.data.mobile ? res.data.mobile.match(/^\+\d{1,4}/)?.[0] || "" : "");
      let locationData = { country: "", state: "", city: "" };
      if (res.data?.location) {
        try {
          locationData = JSON.parse(res.data.location);
          setselectedCity(locationData.city);
          setselectedCountry(locationData.country);
          setselectedState(locationData.state);
        } catch (error) {
          console.error("Error parsing location data:", error);
        }
      }

      setUserDetails({
        name: res.data.name || "",
        address: res.data.address || "",
        mobile: res.data.mobile ? res.data.mobile.replace(/^\+\d{1,4}-/, '') : "",
        email: res.data.email || "",
        nature_of_business: res.data.nature_of_business || "",
        type_of_business: res.data.type_of_business || "",
        turnover: res.data.turnover || "",
        no_of_employess: res.data.no_of_employess || "",
        gstin: res.data.gstin || "",
        certifications: res.data.certifications || "",
        cin: res.data.cin || "",
        profile: res.data.profile || "",
        import_export_code: res.data.import_export_code || "",
        profile_image: res.data.profile_image || "",
        vendor_approve: res.data.vendor_approve || "",
        location: locationData || "",
      });
      setVendorSpoc(res.data.spoc);
      setselectedCountry(res.data?.country || "");
      setselectedState(res.data?.state || "");
      setselectedCity(res.data?.city || "");
    } catch (error) {
      setMainLoading(false);
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

  const removeSelectedVendor = (ele, setFieldValue) => {
    const filteredData = selectedVendorApproveList.filter(
      (item) => item.value != ele.value
    );
    setSelectedVendorApproveList(filteredData);
    const vendorApprove = filteredData.map((item) => item.value);
    setFieldValue("vendor_approve", vendorApprove);
  };

  const addSelectedVendor = (ele, setFieldValue) => {
    if (ele && ele.value) {
      const index = selectedVendorApproveList.findIndex(
        (item) => item.value == ele.value
      );
      const selectedVendorApproveMap = selectedVendorApproveList.map(
        (item) => item.value
      );

      if (index == -1) {
        setSelectedVendorApproveList((prev) => [...prev, ele]);
        setFieldValue("vendor_approve", [
          ...selectedVendorApproveMap,
          ele.value,
        ]);
      }
    } else {
      // console.log(e);
    }
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

  const submitHandler = (values) => {
    setMainLoading(true);
    delete values.profile_image;
    

    // Transform the values to include the location object
    const fullmobile = `${onecountrycode}-${values.mobile
      .trim()
      .replace(/^0+/, "")}`;
    const updatedValues = {
      ...values,
      location: {
        country: String(selectedCountry || ""), 
        state: String(selectedState || ""), 
        city: String(selectedCity || "")
      }
      , mobile:fullmobile
      
    };
   
   

    updateProfile(updatedValues, userDetails.id)
      .then((res) => {
        setMainLoading(false);
        getProfileDetails();
        toast(res.message);
      })
      .catch((error) => {
        setMainLoading(false);
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
        console.log(error);
      })
      .finally(() => {
        resetForm();
        setCreateLoading(false);
        getProfileDetails();
      });
  };

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
        console.log(error);
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
                validationSchema={validationSchema}
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
                          <div className="col-md-12">
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

                          <div className="col-md-12">
                            <div className="form-group">
                              <FormikField
                                label="Registered Address"
                                placeholder="Ex. SaltLake, Sector 5, Kolkata, West Bangal, India"
                                name="address"
                                touched={touched}
                                errors={errors}
                              />
                            </div>
                          </div>

                          <div className="row">
                            {/* Mobile Number Field (Country Code + Input) */}
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
                                    <option value={selectedCountryCode?.phone_code}>{selectedCountryCode?.country_code} ({selectedCountryCode?.phone_code})</option>
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

                            {/* Email Field */}
                            <div className="col-md-6">
                              <div className="form-group ">
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
                          </div>

                          <div className="col-md-4">
                            <div className="form-group">
                              <label htmlFor="city">Country</label>
                              <Field
                                as="select"
                                className="form-control mt-2" // Matching class for consistency
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
                          <div className="col-md-4">
                            <div className="form-group">
                              <label>State</label>

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
                        </div>
                      </div>
                    </div>

                    <div className="vendor-edit-sec-form">
                      <span className="title">Company information</span>
                      <div className="contact-form">
                        <div className="row">
                          <div className="col-md-12">
                            <div className="form-group">
                              <FormikField
                                label="Nature of Business"
                                placeholder="Ex. Manufacturer, Dealer, Trader"
                                name="nature_of_business"
                                touched={touched}
                                errors={errors}
                              />
                            </div>
                          </div>

                          <div className="col-md-6">
                            <div className="form-group">
                              <FormikField
                                label="Type of Business"
                                name="type_of_business"
                                touched={touched}
                                errors={errors}
                              />
                            </div>
                          </div>

                          <div className="col-md-6">
                            <div className="form-group">
                              <FormikField
                                label="Turnover"
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
                                label="Number of Employees"
                                type="select"
                                name="no_of_employess"
                                selectOptions={employeeNumberOption}
                                touched={touched}
                                errors={errors}
                              />
                            </div>
                          </div>

                          <div className="col-md-6">
                            <div className="form-group">
                              <FormikField
                                label="GSTin"
                                placeholder="GST Number"
                                name="gstin"
                                touched={touched}
                                errors={errors}
                              />
                            </div>
                          </div>

                          <div className="col-md-6">
                            <div className="form-group">
                              <FormikField
                                label="Import Export Code"
                                name="import_export_code"
                                touched={touched}
                                errors={errors}
                              />
                            </div>
                          </div>

                          <div className="col-md-6">
                            <div className="form-group">
                              <FormikField
                                label="Certifications"
                                name="certifications"
                                touched={touched}
                                errors={errors}
                              />
                            </div>
                          </div>
                          <div className="col-md-6">
                            <div className="form-group">
                              <FormikField
                                label="CIN"
                                placeholder="Enter CIN Number"
                                name="cin"
                                touched={touched}
                                errors={errors}
                              />
                            </div>
                          </div>
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
                                placeholder="Write somthing about the company "
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

                    {/*  <div className="vendor-edit-sec-form">
                      <span className="title">Vendor Approved By</span>

                      <div className="vendor-approved-by mb-3">
                        {selectedVendorApproveList.map((item) => {
                          return (
                            <span
                              key={item.value}
                              onClick={() =>
                                removeSelectedVendor(item, setFieldValue)
                              }
                            >
                              {item.label}
                            </span>
                          );
                        })}
                      </div>
                      <Select
                        id={id}
                        options={vendorApproveList}
                        placeholder="Search here"
                        isClearable={true}
                        // id="long-value-select"
                        instanceId="long-value-select"
                        styles={customSelectStyles}
                        components={{ DropdownIndicator }}
                        value={selectedVendorApprove}
                        onChange={(e) => addSelectedVendor(e, setFieldValue)}
                      />
                    </div> */}

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
                                      <td
                                        role="button"
                                        className="cursor-pointer"
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
                                        <span className="me-2">
                                          <FontAwesomeIcon icon={faEdit} />
                                        </span>
                                        <span>Edit</span>
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
