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
import { Form, Formik } from "formik";
import Image from "next/image";
import React, { useEffect, useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import * as yup from "yup";
import Select, { components } from "react-select";
import UploadFiles from "@/components/shared/ImagesUpload";
import FullLoader from "@/components/shared/FullLoader";
import { getCities, getStates } from "@/services/cms";

const EditProfile = () => {
  const id = Date.now().toString();
  const [countryList, setcountryList] = useState([
    { label: "Select Country", value: "" },
    { label: "India", value: "1" },
  ]);
  const [selectedCountry, setselectedCountry] = useState(0);
  const [statesLoading, setstatesLoading] = useState(false);
  const [states, setstates] = useState([]);
  const [selectedState, setselectedState] = useState(0);

  const [citiesLoading, setcitiesLoading] = useState(false);
  const [cities, setcities] = useState([]);
  const [selectedCity, setselectedCity] = useState(0);

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

  const validationSchema = yup.object().shape({
    name: yup.string().required("Vendor name is required"),
    address: yup.string().required("Registered address is required"),
    mobile: yup.string().required("Mobile is required"),
    email: yup
      .string()
      .email()
      .matches(
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
        "please enter valid email address"
      )
      .required("Email is required"),
    nature_of_business: yup.string().required("Nature of business is required"),
    type_of_business: yup.string().required("Type of business is required"),
    turnover: yup.number().required("Turnover is required"),
    no_of_employess: yup.string().required("No of employees is required"),
    gstin: yup.string().required("GSTin is required"),
    import_export_code: yup.string().required("Import export code is required"),
    certifications: yup.string().required("Certifications is required"),
    cin: yup.string().optional(""),
    profile: yup.string().required("Profile is required"),
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
    getAllStates();
  }, []);

  const handleCountryChange = (e) => {
    // console.log("edit profile===>>>>>", e.target.value);
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
    getStates().then((res) => {
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

  const getProfileDetails = () => {
    setMainLoading(true);
    getProfile().then((res) => {
      setMainLoading(false);
      setUserDetails({
        name: res.data.name,
        address: res.data.address,
        mobile: res.data.mobile,
        email: res.data.email,
        nature_of_business: res.data.nature_of_business,
        type_of_business: res.data.type_of_business,
        turnover: res.data.turnover,
        no_of_employess: res.data.no_of_employess,
        gstin: res.data.gstin,
        certifications: res.data.certifications,
        cin: res.data.cin,
        profile: res.data.profile,
        import_export_code: res.data.import_export_code,
        profile_image: res.data.profile_image,
        vendor_approve: res.data.vendor_approve,
      });
      setselectedCountry(res.data?.country || "");
      setselectedState(res.data?.state || "");
      setselectedCity(res.data?.city || "");
    });
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
    updateProfile(values, userDetails.id)
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

  return (
    <>
      <section className="vendor-common-header sc-pt-80">
        <div className="container-fluid">
          <h1 className="heading">Edit profile</h1>
        </div>
      </section>
      <ToastContainer />
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
                                placeholder="Ex. SaltLake, Sector 5, Kolkata, West Bangal, Inida"
                                isRequired={true}
                                name="address"
                                touched={touched}
                                errors={errors}
                              />
                            </div>
                          </div>

                          <div className="col-md-6">
                            <div className="form-group">
                              <FormikField
                                label="Mobile"
                                placeholder="Ex. 9123456789"
                                isRequired={true}
                                name="mobile"
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

                          <div className="col-md-4">
                            <FormikField
                              label="Country"
                              isRequired={true}
                              type="select"
                              name="country"
                              value={selectedCountry}
                              selectOptions={countryList}
                              touched={touched}
                              errors={errors}
                              enableHandleChange={true}
                              handleChange={handleCountryChange}
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
                                isRequired={true}
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
                                isRequired={true}
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
                                isRequired={true}
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
                                isRequired={true}
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
                                isRequired={true}
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
                                isRequired={true}
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
                                isRequired={true}
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
                                isRequired={false}
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
                                isRequired={true}
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
                      className="btn btn-secondary edit-profile"
                    >
                      Save
                    </button>
                  </Form>
                )}
              </Formik>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default EditProfile;
