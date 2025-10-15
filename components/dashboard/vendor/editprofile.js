import FormikField from "@/components/shared/FormikField";
import Loader from "@/components/shared/Loader";
import {
  deleteSpoc,
  getProfile,
  getProfileDocuments,
  getProfileReviews,
  getVendorApproveList,
  handleChangeProfilePicture,
  handleUploadFiles,
  publishVendorReviews,
  updateProfile,
  updatecompany,
  uploadVendorDocument,
  vendorProfileDocuments,
} from "@/services/Auth";
import { Field, Form, Formik } from "formik";
import Image from "next/image";
import React, { use, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { EditCompanyDetails } from "@/utils/schema";
import { components } from "react-select";
import UploadFiles from "@/components/shared/ImagesUpload";
import FullLoader from "@/components/shared/FullLoader";
import { getCities, getCountries, getCountryCodes, getStates } from "@/services/cms";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEdit, faFolderPlus, faPlus, faTrash, faTrashCanArrowUp } from "@fortawesome/free-solid-svg-icons";
import DynamicFormSpoc from "@/components/modal/DynamicFormSpoc";
import { addSpoc, editSpoc } from "@/services/Auth";
import { faTrashAlt, faTrashCan } from "@fortawesome/free-regular-svg-icons";
import Select from "react-select";
import SmartButton from "@/components/shared/SmartButton";


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
  // const [userDocuments, setUserDocuments] = useState(null);
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
  const [userType, setUserType] = useState(null);


  const [selectedCertificationFiles, setSelectedCertificationFiles] = useState([]);
const [selectedCertificationFilesReset, setSelectedCertificationFilesReset] = useState(false);
const [certificationText, setCertificationText] = useState("");

const [selectedProductImageFiles, setSelectedProductImageFiles] = useState([]);
const [selectedProductImageFilesReset, setSelectedProductImageFilesReset] = useState(false);

const [selectedProductVideoFiles, setSelectedProductVideoFiles] = useState([]);
const [selectedProductVideoFilesReset, setSelectedProductVideoFilesReset] = useState(false);
const [selectedProjectDocument , setselectedProjectDocument] = useState([]);
const [selectedProjectDocumentreset , setselectedProjectDocumentreset] = useState(false);

// Payment Terms states
const [paymentTerms, setPaymentTerms] = useState(""); // text input value
const [selectedPaymentTermsFiles, setSelectedPaymentTermsFiles] = useState([]); // uploaded files
const [selectedPaymentTermsFilesReset, setSelectedPaymentTermsFilesReset] = useState(false); // reset trigger
const [paymentTermsRows, setPaymentTermsRows] = useState([
  // {id:null, value: "", type: "advance", days: "", comment: ""},
]);

//Revies cards to be displayed
 const [reviews, setReviews] = useState([]);
  const [selectedReviews, setSelectedReviews] = useState([]);

  const [vendorProfileData, setVendorProfileData] = useState({
  certifications: [],
  product_images: [],
  product_videos: [],
  payment_terms: [],
  project_document : []
});



const [userDocuments, setUserDocuments] = useState({
  certifications: null,
  product_images: null,
  product_videos: null,
  payment_terms : null ,
  project_document : null
});

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

  useEffect(() => {
    if (paymentTermsRows.length > 0){
      console.log("Payment terms rows updated:", paymentTermsRows);
    }},[paymentTermsRows])
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
    loadProfileReviews();
    fetchProfileDocuments();
   
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

      // Set user type for display
      setUserType(res.data?.user_type);

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

  const loadProfileReviews = async () => {
    try {
      const res = await getProfileReviews();
      if (res && res.length > 0) {
        setReviews(res);
      } else {
        setReviewsToShow([]);
      }
    } catch (error) {
      console.error("Error fetching profile reviews:", error);
      setReviewsToShow([]);
    }
  };

    // Toggle review selection
  const toggleReview = (review_id) => {
    setSelectedReviews((prev) =>
      prev.includes(review_id)
        ? prev.filter((id) => id !== review_id)
        : [...prev, review_id]
    );
  };

  // Publish selected reviews
  const handlePublish = async () => {
    if (selectedReviews.length === 0) return alert("Select reviews to publish");
    try {
      await publishVendorReviews(selectedReviews);

      // Reload after publishing
      await loadProfileReviews();
      setSelectedReviews([]);
    } catch (err) {
      console.error("Error publishing reviews:", err);
    }
  };

const resetMap = {
  certification: setSelectedCertificationFilesReset,
  product_image: setSelectedProductImageFilesReset,
  product_video: setSelectedProductVideoFilesReset,
  payment_terms: setSelectedPaymentTermsFilesReset,
  project_document :  setSelectedPaymentTermsFilesReset  // ✅ add this
};


const handleVendorUploadFile = (files, type, extraText = "", payment_terms = "") => {
  setMainLoading(true);

  // For payment_terms → do not send doc_type or files
  if (type === "payment_terms") {
    uploadVendorDocument(files, type, "", payment_terms)
      .then((res) => {
        setMainLoading(false);
        getProfileDocument();
        toast("Payment terms saved successfully");
      })
      .catch((err) => {
        console.error("Upload error:", err);
        setMainLoading(false);
        toast.error("Failed to save payment terms");
      });
    return;
  }

  // Normal upload flow
  uploadVendorDocument(files, type, extraText, payment_terms)
    .then((res) => {
      setMainLoading(false);
      getProfileDocument();

      if (resetMap[type]) {
        resetMap[type](true);
        setTimeout(() => resetMap[type](false), 1000);
      }

      toast("File has been successfully uploaded");
    })
    .catch((err) => {
      console.error("Upload error:", err);
      setMainLoading(false);
      toast.error("File upload failed");
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



const fetchProfileDocuments = async () => {
  try {
    const res = await vendorProfileDocuments();
    
    // Check if response has data and it's an array
    if (res && res.data && Array.isArray(res.data) && res.data.length > 0) {
      console.log('Raw data from API:', res.data); // Debug log
      
      // Group by file_type with better error handling
      const grouped = res.data.reduce(
        (acc, doc) => {
          // Ensure doc exists and has file_type property
          if (!doc || !doc.file_type) {
            console.warn('Document missing file_type:', doc);
            return acc;
          }
          
          const fileType = doc.file_type.toLowerCase().trim(); // Normalize the file_type
          
          switch (fileType) {
            case "certification":
              acc.certifications.push(doc);
              break;
            case "product_image":
              acc.product_images.push(doc);
              break;
            case "product_video":
              acc.product_videos.push(doc);
              break;
            case "payment_terms":
              acc.payment_terms.push(doc);
              break;
            case "project_document":
              acc.project_document.push(doc);
            default:
              console.warn('Unknown file_type:', fileType, doc);
          }
          return acc;
        },
        { 
          certifications: [], 
          product_images: [], 
          product_videos: [], 
          payment_terms: [] ,
          project_document : []
        }
      );
      setVendorProfileData(grouped);
    } else {
      setVendorProfileData({
        certifications: [],
        product_images: [],
        product_videos: [],
        payment_terms: [],
        project_document : []
      });
    }
  } catch (error) {
    console.error('Error fetching profile documents:', error);
    // Set empty data on error
    setVendorProfileData({
      certifications: [],
      product_images: [],
      product_videos: [],
      payment_terms: [],
      project_document : []
    });
  }
};

  const selectedCountryCode = countryCode.find(
    (item) => item.phone_code === extractedCountryCode
  );

  return (
    <>
      {createLoading && <Loader />}
      <section className="vendor-common-header sc-pt-80">
        <div className="container-fluid">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <h1 className="heading">Edit profile</h1>
            {userType && (
              <div
                style={{
                  display: "inline-block",
                  backgroundColor: "#f3f4f6",
                  color: "#374151",
                  padding: "10px 20px",
                  borderRadius: "25px",
                  fontSize: "18px",
                  fontWeight: "600",
                  border: "2px solid #d1d5db",
                }}
              >
                {getUserTypeLabel(userType)}
              </div>
            )}
          </div>
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
                    {/* Company Information */}
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
                                value={businessOptions.filter((option) =>
                                  values?.nature_of_business
                                    ?.split(",")
                                    .includes(option.value)
                                )}
                                onChange={(selectedOptions) => {
                                  const selectedValues = selectedOptions
                                    ? selectedOptions
                                        .map((option) => option.value)
                                        .join(",")
                                    : "";
                                  setFieldValue(
                                    "nature_of_business",
                                    selectedValues
                                  );
                                }}
                                components={{ DropdownIndicator }}
                                placeholder="Select Nature of Business"
                                styles={{
                                  control: (provided) => ({
                                    ...provided,
                                    minHeight: "54px",
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
                    {/* About Us Business Section */}
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

                    <button
                      id="save_changes-edit_profile-vendor_edit_profile_page"
                      type="submit"
                      className="btn btn-secondary edit-profile mb-4"
                    >
                      Save
                    </button>

                    {/* Certifications Section */}
                    <div className="vendor-edit-sec-form">
                      <span className="title">
                        Certifications (
                        {vendorProfileData.certifications.length}/5)
                      </span>

                      <div className="contact-form">
                        <div className="row">
                          <UploadFiles
                            accept=".png, .jpg, .jpeg, .gif, .pdf"
                            upload={setSelectedCertificationFiles}
                            reset={selectedCertificationFilesReset}
                            preview={vendorProfileData.certifications} // Pre-filled from API
                            maxFiles={5} // optional limit
                          />
                        </div>
                        <input
                          type="text"
                          className="form-control mt-2"
                          placeholder="Enter certification details"
                          value={certificationText}
                          onChange={(e) => setCertificationText(e.target.value)}
                        />
                        {selectedCertificationFiles.length > 0 && (
                          <button
                            className="btn btn-secondary edit-profile mt-2"
                            onClick={(e) => {
                              e.preventDefault();
                              handleVendorUploadFile(
                                selectedCertificationFiles,
                                "certification",
                                certificationText
                              );
                            }}
                          >
                            Save Certification
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Product Images Section */}
                    <div className="vendor-edit-sec-form">
                      <span className="title">
                        Product Images (
                        {vendorProfileData.product_images.length}/10)
                      </span>
                      <div className="contact-form">
                        <div className="row">
                          <UploadFiles
                            accept=".png, .jpg, .jpeg, .gif"
                            upload={setSelectedProductImageFiles}
                            reset={selectedProductImageFilesReset}
                            preview={vendorProfileData.product_images} // Pre-filled from API
                            maxFiles={10}
                          />
                        </div>
                        {selectedProductImageFiles.length > 0 && (
                          <button
                            className="btn btn-secondary edit-profile mt-2"
                            onClick={(e) => {
                              e.preventDefault();
                              handleVendorUploadFile(
                                selectedProductImageFiles,
                                "product_image"
                              );
                            }}
                          >
                            Upload
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Product Videos Section */}
                    <div className="vendor-edit-sec-form">
                      <span className="title">
                        Product Videos (
                        {vendorProfileData.product_videos.length}/3)
                      </span>
                      <div className="contact-form">
                        <div className="row">
                          <UploadFiles
                            accept="video/mp4, video/mkv, video/avi, video/mov"
                            upload={setSelectedProductVideoFiles}
                            reset={selectedProductVideoFilesReset}
                            preview={vendorProfileData.product_videos} // Pre-filled from API
                            maxFiles={3}
                          />
                        </div>
                        {selectedProductVideoFiles.length > 0 && (
                          <button
                            className="btn btn-secondary edit-profile mt-2"
                            onClick={(e) => {
                              e.preventDefault();
                              handleVendorUploadFile(
                                selectedProductVideoFiles,
                                "product_video"
                              );
                            }}
                          >
                            Upload
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Payment Terms Section */}
                    {/* <div className="vendor-edit-sec-form">
                      <span className="title">Payment Terms</span>
                      <div className="contact-form">
                        <div className="row">
                          <UploadFiles
                            accept=".png, .jpg, .jpeg, .gif, .pdf"
                            upload={setSelectedPaymentTermsFiles}
                            reset={selectedPaymentTermsFilesReset}
                            preview={vendorProfileData.payment_terms} // Pre-filled from API
                          />
                        </div>
                        <input
                          type="text"
                          className="form-control mt-2"
                          placeholder="Enter payment terms"
                          value={paymentTerms}
                          onChange={(e) => setPaymentTerms(e.target.value)}
                        />
                        {(selectedPaymentTermsFiles.length > 0 ||
                          paymentTerms) && (
                          <button
                            className="btn btn-secondary edit-profile mt-2"
                            onClick={(e) => {
                              e.preventDefault();
                              handleVendorUploadFile(
                                selectedPaymentTermsFiles,
                                "payment_terms",
                                "",
                                paymentTerms
                              );
                            }}
                          >
                            Save Payment Terms
                          </button>
                        )}
                      </div>
                    </div> */}

                     <div className="col-lg-5 col-12">
                        <div className="border rounded-3 p-3">
                          <div className="d-flex align-items-center justify-content-between mb-2">
                            <div>
                              <h3 className="fs-6 fw-semibold mb-0">
                                Payment Terms{" "}
                                <span className="text-danger">*</span>
                              </h3>
                              <small className="text-muted">
                                amount defined so far:{" "}
                                {paymentTermsRows.reduce(
                                  (a, b) => a + (Number(b.value) || 0),
                                  0
                                )}
                                %
                              </small>
                              {paymentTermsRows.filter(
                                (row) =>
                                  row &&
                                  row.action !== "delete" &&
                                  row.type &&
                                  row.value != null &&
                                  row.value > 0
                              ).length === 0 && (
                                <>
                                  <br />
                                  <small className="text-danger">
                                    At least one valid payment term is required
                                  </small>
                                </>
                              )}
                            </div>

                            <SmartButton
                              onClick={() =>
                                setPaymentTermsRows((prev) => [
                                  ...(prev || []),
                                  {
                                    id: null,
                                    value: "",
                                    type: "advance",
                                    days: "",
                                    comment: "",
                                  },
                                ])
                              }
                              theme={"primary"}
                              style={{
                                paddingLeft: "0.6rem",
                                paddingRight: "0.6rem",
                              }}
                              label="Add Term"
                              icon={
                                <FontAwesomeIcon
                                  icon={faPlus}
                                  className="me-1"
                                />
                              }
                            />
                          </div>

                          <PaymentTermsEditor
                            value={paymentTermsRows}
                            onChange={setPaymentTermsRows}
                          />
                        </div>
                      </div>

                    {/* Product Videos Section */}
                    <div className="vendor-edit-sec-form">
                      <span className="title">
                        Project Document (
                        {vendorProfileData.project_document.length}/3)
                      </span>
                      <div className="contact-form">
                        <div className="row">
                          <UploadFiles
                            accept=".png, .jpg, .jpeg, .gif, .pdf"
                            upload={setselectedProjectDocument}
                            reset={selectedProjectDocumentreset}
                            preview={vendorProfileData.project_document} // Pre-filled from API
                            maxFiles={3}
                          />
                        </div>
                        {selectedProjectDocument.length > 0 && (
                          <button
                            className="btn btn-secondary edit-profile mt-2"
                            onClick={(e) => {
                              e.preventDefault();
                              handleVendorUploadFile(
                                selectedProjectDocument,
                                "project_document"
                              );
                            }}
                          >
                            Upload
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Vendor Reviews Section */}
                    <div className="vendor-edit-sec-form mt-4">
                      <span className="title">
                        Vendor Reviews ({reviews.length})
                      </span>

                      <div className="contact-form">
                        <div className="row">
                          {reviews.map((review) => (
                            <div
                              key={review.review_id}
                              className="col-md-4 mb-3"
                            >
                              <div
                                className={`card shadow-sm h-100 ${
                                  selectedReviews.includes(review.review_id)
                                    ? "border border-primary"
                                    : "border-0"
                                }`}
                                style={{
                                  cursor: "pointer",
                                  transition: "0.3s",
                                }}
                                onClick={() => toggleReview(review.review_id)}
                              >
                                <div className="card-body">
                                  <h5 className="card-title mb-1">
                                    {review.user_name}
                                  </h5>
                                  <h6 className="card-subtitle mb-2 text-muted">
                                    {review.email}
                                  </h6>

                                  <p className="card-text mb-1">
                                    ⭐ {review.rating}
                                  </p>
                                  <p className="card-text small text-muted">
                                    {review.description ||
                                      "No description provided"}
                                  </p>
                                  <p className="card-text">
                                    <small className="text-muted">
                                      {review.review_date}
                                    </small>
                                  </p>

                                  {selectedReviews.includes(
                                    review.review_id
                                  ) && (
                                    <span className="badge bg-primary">
                                      Selected
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {selectedReviews.length > 0 && (
                          <button
                            className="btn btn-secondary edit-profile mt-2"
                            style  = {{"minWidth" : "240px"}}
                            onClick={(e) => {
                              e.preventDefault();
                              handlePublish();
                            }}
                          >
                            Publish Selected Reviews
                          </button>
                        )}
                      </div>
                    </div>
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
                        id="create_new_spoc-spoc_section-vendor_edit_profile_page"
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
                              <th scope="col">Status</th>
                              <th scope="col">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {vendorSpoc &&
                              vendorSpoc.length > 0 &&
                              vendorSpoc.map((spoc, index) => {
                                const getStatusBadgeClass = (status) => {
                                  switch (status) {
                                    case 0:
                                      return "badge bg-danger";
                                    case 1:
                                      return "badge bg-success";
                                    case 2:
                                      return "badge bg-warning";
                                    default:
                                      return "badge bg-secondary";
                                  }
                                };

                                const getStatusText = (status) => {
                                  switch (status) {
                                    case 0:
                                      return "Disapproved";
                                    case 1:
                                      return "Approved";
                                    case 2:
                                      return "Pending";
                                    default:
                                      return "Unknown";
                                  }
                                };

                                return (
                                  <>
                                    <tr key={spoc.id}>
                                      <td>{index + 1}</td>
                                      <td>{spoc.name}</td>
                                      <td>{spoc.role}</td>
                                      <td>{spoc.email}</td>
                                      <td>{spoc.mobile}</td>
                                      <td>
                                        <span
                                          className={getStatusBadgeClass(
                                            spoc.status
                                          )}
                                        >
                                          {getStatusText(spoc.status)}
                                        </span>
                                      </td>
                                      <td>
                                        {/* Edit Button */}
                                        <span
                                          id="edit_spoc_list-spoc_table-vendor_edit_profile_page"
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
                                          id="delete_spoc_list-spoc_table-vendor_edit_profile_page"
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





//  PaymentTermsUIOnly component
const PaymentTermsEditor = ({ value, onChange }) => {
  const rows = Array.isArray(value) ? value : [];

    const setRows = (next) => onChange && onChange(next);

    const markDeleted = (index) => {
     const updated = [...rows];
     const row = updated[index] || {};
    updated[index] = { ...row, action: "delete" };
    setRows(updated);
  };

  const restoreRow = (index) => {
    const updated = [...rows];
    const row = updated[index];
    if (!row) return;
    const { action, ...rest } = row;
    updated[index] = rest;
    setRows(updated);
  };

  const updateRow = (index, patch) =>
    setRows(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));

  return (
    <div>
      {rows.map((row, index) => {
        const isCredit = row.type === "credit";
        const isDeleted = row.action === "delete";
        return (
          <div key={index} className="row g-2 align-items-end mb-2">
            <div className="col-3">
              <label className="form-label mb-1">% of Amount</label>
              <input
                type="number"
                className="form-control"
                placeholder="e.g., 30"
                value={row.value}
                onChange={(e) =>
                  updateRow(index, {
                    value: e.target.value === "" ? "" : Number(e.target.value),
                  })
                }
                min={0}
                max={100}
                disabled={isDeleted}
              />
            </div>

            <div className="col-3">
              <label className="form-label mb-1">Type</label>
              <select
                className="form-select"
                value={row.type}
                onChange={(e) => {
                  const nextType = e.target.value;
                  updateRow(index, {
                    type: nextType,
                    days: nextType === "credit" ? row.days : "",
                    comment: nextType === "credit" ? "" : (row.comment ?? ""),
                  });
                }}
                disabled={isDeleted}
              >
                <option value="advance">Advance</option>
                <option value="credit">Credit</option>
                <option value="other">Other</option>
              </select>
            </div>

            {isCredit ? (
              <div className="col-4">
                <label className="form-label mb-1">Credit Days</label>
                <input
                  type="number"
                  className="form-control"
                  placeholder="e.g., 30"
                  value={row.days}
                  onChange={(e) =>
                    updateRow(index, {
                      days: e.target.value === "" ? "" : Number(e.target.value),
                    })
                  }
                  min={1}
                disabled={ isDeleted}
                />
              </div>
            ) : (
              <div className="col-4">
                <label className="form-label mb-1">
                  Comment
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder={row.type === "other" ? "Describe payment term" : "Note (optional)"}
                  value={row.comment || ""}
                  onChange={(e) => updateRow(index, { comment: e.target.value })}
               disabled={ isDeleted}
                />
              </div>
            )}

            <div className="col-2 d-flex mb-1">
              {!isDeleted ? (
                <SmartButton
                  onClick={() => markDeleted(index)}
                  theme={"red"}
                  style={{ paddingLeft: "0.6rem", paddingRight: "0.6rem" }}
                  label="Remove"
                />
              ) : (
                <SmartButton
                  onClick={() => restoreRow(index)}
                  theme={"secondary"}
                  style={{ paddingLeft: "0.6rem", paddingRight: "0.6rem" }}
                  label="Restore"
                />
              )}
            </div>

            {/* Small status line below inputs when deleted */}
            {isDeleted && (
              <div className="col-12 mt-0">
                <small className="text-danger">
                  you removed this term. Click "Restore" to add it back.
                </small>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
