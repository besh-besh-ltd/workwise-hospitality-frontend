import { useRouter } from "next/router";
import React, { useEffect, useRef, useState } from "react";
import Item from "./Item";
import Select from 'react-select';
import { createRfq, saveDraft, getTerms, vendorApproveList, getDraftData } from "@/services/rfq";
import { Form, Formik } from "formik";
import { CreateRFQSchema } from "@/utils/schema";
import FormikField from "@/components/shared/FormikField";
import { getProfile } from "@/services/Auth";
import Loader from "@/components/shared/Loader";
import { useDispatch, useSelector } from "react-redux";
import {
  intializeRfq,
  clearState,
  setOtherFormFields,
  setTermsData,
  setTermFiles,
  setAllTerms,
  setStoreLoading,
} from "@/redux/slice";
import Link from "next/link";
import { toast } from "react-toastify";
import { getProjectList, getProjectTableDataById } from "@/services/project";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClose } from "@fortawesome/free-solid-svg-icons";
import { extractfileName, handleFileUpload } from "@/utils/sharedFunctions";


const CreateRFQ = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [mainLoading, setMainLoading] = useState(false);

  const [userProfile, setuserProfile] = useState(null);
  const [vendorApprovedList, setVendorApprovedList] = useState([]);
  const [projects, setProjects] = useState([]);
  const [rfqProducts, setRfqProducts] = useState([]);

  const storeLoading = useSelector((data) => data.storeLoading);
  const rfqDetails = useSelector((data) => data.rfq_id);
  const rfqProductsFromStore = useSelector((data) => data.rfqProducts);
  const rfqFormDataFromStore = useSelector((data) => data.rfqFormData);
  const allTerms = useSelector((data) => data.allTerms);
  const selectedTerms = useSelector((data) => data.rfqFormData.terms);
  const termFiles = useSelector((data) => data.rfqFormData.term_and_condition_files);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const rfqProductsRef = useRef({});
  const rfqFormDataRef = useRef({});


  const getAllProjects = () => {
    getProjectList()
      .then((res) => {
        let d = [];
        res.data.map((item) => {
          d.push({ label: item.name, value: item.id });
        });
        setProjects(d);
      })
      .catch((error) => {
        console.log(error)
      })
  }

  const getVendorApproveList = () => {
    setLoading(true);
    vendorApproveList().then((res) => {
      setLoading(false);
      setVendorApprovedList(res.data);
    });
  };

  const getProfileDetails = () => {
    setLoading(true);
    getProfile().then((res) => {
      setLoading(false);
      setuserProfile(res.data);
    });
  };

  const getTermsData = () => {
    getTerms()
      .then((res) => {
        dispatch(setAllTerms(res.data));
      })
      .catch((err) => {
        console.error(err);
      });
  };

  const handleTermChange = (e, item) => {
    let updatedTerms = [];
    if (e.target.checked) {
      updatedTerms = [...selectedTerms, { id: item.id }];
    } else {
      updatedTerms = selectedTerms.filter((termItem) => termItem.id != item.id)
    }
    dispatch(setTermsData(updatedTerms));
    setHasUnsavedChanges(true);
  };

  const getProjectData = async (projectId) => {
    try {
      const res = await getProjectTableDataById(projectId);
      const projectData = res.data[0];
      return projectData;
    } catch (error) {
      console.error("Error fetching project data:", error.message);
      throw error;
    }
  };

  const handleFormFieldChange = async (e, selectedOption, actionMeta) => {
    let name = e?.target?.name || actionMeta.name;
    let value = e?.target?.value || selectedOption.value || -1;

    if (name === "reverse_auction") {
      value = parseInt(value);
    }

    if (name === "project_id" && value !== -1) {
      try {
        const projectData = await getProjectData(value);

        if (projectData) {
          dispatch(setOtherFormFields({ field_name: "rfq_type", value: projectData[0].rfq_type || "" }));
          // dispatch(setOtherFormFields({ field_name: "reverse_auction", value: projectData.reverse_auction || 1 }));
          dispatch(
            setOtherFormFields({
              field_name: "reverse_auction",
              value: projectData.reverse_auction !== undefined ? projectData[0].reverse_auction : 1,
            })
          );
          dispatch(
            setOtherFormFields({
              field_name: "bid_end_date",
              value: projectData.ended_at ? new Date(projectData[0].ended_at).toISOString().split("T")[0] : "",
            })
          );
          dispatch(setOtherFormFields({ field_name: "location", value: projectData[0].location || "" }));
        } else {
          console.error("Project data is empty or undefined.");
        }
      } catch (error) {
        console.error("Failed to handle project_id change:", error.message);
      }
    }

    dispatch(setOtherFormFields({ field_name: name, value }));
    setHasUnsavedChanges(true);
  };

  const handleTermFiles = async (type, dynamicParam) => {
    if (type === "add") {
      try {
        const filePath = await handleFileUpload(dynamicParam);
        dispatch(setTermFiles({ type, value: filePath }))

      } catch (error) {
        let message = error.message;
        toast.error(message);
      }
    } else {
      dispatch(setTermFiles({ type, value: dynamicParam }))
    }
    setHasUnsavedChanges(true);
  };

  const handleCreateRFQ = (resetForm) => {
    setMainLoading(true);
    // const updatedProducts = rfqProductsRef.current.map((prod)=> {
    //   const { id, ...withOutRfqProdId } = prod;
    //   return withOutRfqProdId;
    // })

    let payload = {
      rfq_id: rfqDetails,
      products: rfqProductsRef.current,
      ...rfqFormDataRef.current,
      project_id: rfqFormDataRef.current.project_id || -1
    };

    createRfq(payload)
      .then((res) => {
        setMainLoading(false);
        toast.success(
          <h6>
            <b>RFQ #{res.data.rfq_no}:</b> Successfully created!
          </h6>,
          { position: "top-right" }
        );
        rfqProductsRef.current = [];
        rfqFormDataRef.current = {};
        setHasUnsavedChanges(false);
        router.push("/dashboard/buyer/rfq-management");
        dispatch(clearState());
        resetForm();
      })
      .catch((err) => {
        setMainLoading(false);
      });
  };

  const handleSaveDraft = () => {
    setMainLoading(true);

    const payload = {
      ...rfqFormDataRef.current,
      products: rfqProductsRef.current,
      is_published: 0,
    };

    saveDraft(payload)
      .then((res) => {
        setMainLoading(false);
        toast.success(
          <h6>
            <b>RFQ Draft #{res.message?.rfq_id}:</b> Changes saved successfully!
          </h6>,
          { position: "top-right" }
        );
        setHasUnsavedChanges(false);
      })
      .catch((err) => {
        console.log(err)
        setMainLoading(false);
        toast.error("Failed to save draft. Please try again.");
      });
  };

  const getDraftInitialData = async () => {
    dispatch(clearState());
    dispatch(setStoreLoading(true));
    try {
      const draftRes = await getDraftData();
      dispatch(intializeRfq(draftRes.data));
      getTermsData();

    } catch (error) {
      console.log(error)
    } finally {
      dispatch(setStoreLoading(false));
    }
  }

  useEffect(() => {
    getProfileDetails();
    getVendorApproveList();
    getAllProjects();
    getDraftInitialData();

  }, []);

  useEffect(() => {
    const validProducts = rfqProductsFromStore.filter(
      (prodItem) => prodItem.vendors?.length > 0);
    setRfqProducts(validProducts);
    rfqProductsRef.current = validProducts;
  }, [rfqProductsFromStore])

  useEffect(() => {
    rfqFormDataRef.current = rfqFormDataFromStore;
  }, [rfqFormDataFromStore]);


  useEffect(() => {
    const handleRouteChange = async (url) => {
      if (hasUnsavedChanges) {
        const confirmLeave = window.confirm(
          "You have unsaved changes. Do you want to save them before leaving?"
        );
        if (confirmLeave) {
          handleSaveDraft();
        } else {
          // Prevent navigation
          router.events.emit("routeChangeError");
          throw "Route change aborted by user."; // Suppress Next.js warning
        }
      }
    };

    // Listen to route change events
    router.events.on("routeChangeStart", handleRouteChange);

    return () => {
      router.events.off("routeChangeStart", handleRouteChange);
    };
  }, [hasUnsavedChanges, router]);


  return (
    <>
      {(mainLoading || storeLoading) && <Loader />}
      <div className="create-rfq-con">

        {/* If no active subscription is found */}
        {(userProfile && !userProfile?.subscription_plan_id) ? (
          <div class="subscription_required">
            <span>
              You need to purchase subscription to perform this action
            </span>
          </div>
        )
          : (
            <>
              {/* Add Products Button */}
              <div className="details-table mt-0">
                {!loading && rfqProducts.length == 0 ? (
                  <div className="text-center">
                    <Link href="/vendor/all" className="btn btn-primary">
                      Add Products
                    </Link>
                  </div>
                )
                  : (
                    <>
                      {/* <div className="col-md-4">
                        <FormikField
                          label="Project Name"
                          value={rfqFormDataFromStore.project_id}
                          enableHandleChange={true}
                          handleChange={handleFormFieldChange}
                          type="select"
                          selectOptions={[
                            { label: "Select Project", value: -1 },
                            ...projects
                          ]}
                          isRequired={false}
                          name="project_id"
                          touched={touched}
                          errors={errors}
                        />
                      </div> */}

                      <div className="col-md-3 mb-2 ">
                        <label>Select Project</label>
                        <Select
                          options={projects}
                          value={projects.find((project) => project.value === rfqFormDataFromStore.project_id)}
                          defaultValue={-1}
                          onChange={(selectedOption, actionMeta)=> handleFormFieldChange(null, selectedOption, actionMeta)}
                          name="project_id"
                          placeholder="Select"
                          isClearable
                        />
                      </div>

                      {/* RFQ Products Table */}
                      <div className="table-responsive">
                        <table className="table table-striped ">
                          <thead>
                            <tr>
                              <th>Name of product</th>
                              <th>Size & specifications</th>
                              <th>Quantity</th>
                              <th className="w200">Technical Datasheet (TDS)</th>
                              <th className="w200">Quality Assurance Plan(QAP)</th>
                              <th>Product Comments</th>
                              <th>Selected vendors</th>
                              <th>Action</th>
                              <th>Technical Evaluation</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rfqProducts && rfqProducts.length > 0 &&
                              rfqProducts.map((product) => {
                                return (
                                  <Item
                                    vendorApprovedList={vendorApprovedList}
                                    data={product}
                                    rfq_id={rfqDetails}
                                    setHasUnsavedChanges={setHasUnsavedChanges}
                                  />
                                );
                              })}
                          </tbody>
                        </table>
                      </div>

                      <div className="float-end addmore">
                        <Link href="/vendor/all" className="me-2" >
                          Add More Products
                        </Link>
                      </div>

                      {loading && <Loader />}

                      {/* Terms Checkbox Section */}
                      <div className="create-rfq-con-2 sc-pt-50">
                        <div className="row">
                          {!loading && allTerms.length > 0 && (
                            <div className="col-md-8 createR-ffq-1">
                              <h4>Suggested Terms</h4>

                              <ol className="custom-ol">
                                {allTerms.map((item) => {
                                  return (
                                    <li key={`term-item-${item.id}`}>
                                      <input
                                        type="checkbox"
                                        id={`term-item-${item.id}`}
                                        checked={item.selected}
                                        onChange={(e) => handleTermChange(e, item)}
                                      />
                                      <label htmlFor={`term-item-${item.id}`}>
                                        {item?.term_content}
                                      </label>
                                    </li>
                                  );
                                })}
                              </ol>
                            </div>
                          )}

                          {/* Other Form Field Section */}
                          <div className="col-md-8 createR-ffq-2">
                            <Formik
                              enableReinitialize={true}
                              validateOnMount={true}
                              initialValues={{
                                is_published: rfqFormDataFromStore.is_published,
                                comment: rfqFormDataFromStore.comment,
                                response_email: rfqFormDataFromStore.response_email,
                                contact_name: rfqFormDataFromStore.contact_name,
                                contact_number: rfqFormDataFromStore.contact_number,
                                company_name: rfqFormDataFromStore.company_name,
                                bid_end_date: rfqFormDataFromStore.bid_end_date,
                                rfq_type: rfqFormDataFromStore.rfq_type,
                                reverse_auction: rfqFormDataFromStore.reverse_auction,
                                location: rfqFormDataFromStore.location
                              }}
                              validationSchema={CreateRFQSchema}
                              onSubmit={(values, { resetForm }) =>
                                handleCreateRFQ(values, resetForm)
                              }
                            >
                              {({ errors, touched, isValid }) => (
                                <Form className="add-your-term-form">
                                  <FormikField
                                    label="Add your own terms"
                                    placeholder="You can mention your terms regarding Freight Charges, Payment Terms, Performance Bank Guarantee, Packing & Forwarding Charges, Delivery Period, Liquidated Damages, Transit Insurance and more"
                                    type="textarea"
                                    rows="5"
                                    name="comment"
                                    touched={touched}
                                    errors={errors}
                                    enableHandleChange={true}
                                    handleChange={handleFormFieldChange}
                                  />

                                  <div className="row mt-2">
                                    <div className="custom-file">
                                      <label htmlFor="customFile" className="custom-file-label">
                                        Upload Your Terms (Optional)
                                      </label>
                                      <input
                                        type="file"
                                        accept=".pdf, .docx, .doc, .xlsx, .xls, .csv, .png, .jpg, .jpeg"
                                        className="custom-file-input"
                                        id="customFile"
                                        multiple
                                        onChange={(e) => handleTermFiles("add", e)}
                                      />
                                      {termFiles.length > 0 && (
                                        <div className="row mt-2">
                                          {termFiles.map((term_file) => (
                                            <div key={term_file} className="col-md-6 col-lg-4">
                                              <a href={term_file} target="_blank" className="file-badge mb-2" type="button" >
                                                <span className="text-truncate me-3" style={{ maxWidth: "90%" }}>{extractfileName(term_file)}</span>
                                                <FontAwesomeIcon
                                                  icon={faClose}
                                                  fontSize={15}
                                                  onClick={(e) => {
                                                    e.preventDefault();
                                                    handleTermFiles("remove", term_file)
                                                  }} />
                                              </a>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>

                                  </div>

                                  <div className="row mt-2">
                                    <div className="col-md-6">
                                      <FormikField
                                        label="Email"
                                        value={rfqFormDataFromStore.response_email}
                                        enableHandleChange={true}
                                        handleChange={handleFormFieldChange}
                                        type="email"
                                        isRequired={true}
                                        name="response_email"
                                        touched={touched}
                                        errors={errors}
                                      />
                                    </div>
                                    <div className="col-md-6">
                                      <FormikField
                                        label="Contact person"
                                        value={rfqFormDataFromStore.contact_name}
                                        enableHandleChange={true}
                                        handleChange={handleFormFieldChange}
                                        type="text"
                                        isRequired={true}
                                        name="contact_name"
                                        touched={touched}
                                        errors={errors}
                                      />
                                    </div>
                                    <div className="col-md-6">
                                      <FormikField
                                        label="Contact Number"
                                        value={rfqFormDataFromStore.contact_number}
                                        enableHandleChange={true}
                                        handleChange={handleFormFieldChange}
                                        type="text"
                                        isRequired={true}
                                        name="contact_number"
                                        touched={touched}
                                        errors={errors}
                                      />
                                    </div>
                                    <div className="col-md-6">
                                      <FormikField
                                        label="Company Name"
                                        value={rfqFormDataFromStore.company_name}
                                        enableHandleChange={true}
                                        handleChange={handleFormFieldChange}
                                        type="text"
                                        isRequired={true}
                                        name="company_name"
                                        touched={touched}
                                        errors={errors}
                                      />
                                    </div>
                                  </div>

                                  <div className="row mb-2">
                                    <div className="col-md-4">
                                      <FormikField
                                        label="Project Stage"
                                        value={rfqFormDataFromStore.rfq_type}
                                        enableHandleChange={true}
                                        handleChange={handleFormFieldChange}
                                        type="select"
                                        selectOptions={[
                                          { label: "Select RFQ Type", value: '' },
                                          { label: "Budgetary", value: 'budgetary' },
                                          { label: "Firm", value: 'firm' }
                                        ]}
                                        isRequired={false}
                                        name="rfq_type"
                                        touched={touched}
                                        errors={errors}
                                      />
                                    </div>
                                    <div className="col-md-4">
                                      <FormikField
                                        label="Reverse Auction"
                                        value={rfqFormDataFromStore.reverse_auction}
                                        defaultValue={0}
                                        enableHandleChange={true}
                                        handleChange={handleFormFieldChange}
                                        type="select"
                                        selectOptions={[
                                          { label: "Enable", value: 1 },
                                          { label: "Disable", value: 0 }
                                        ]}
                                        isRequired={true}
                                        name="reverse_auction"
                                        touched={touched}
                                        errors={errors}
                                      />
                                    </div>
                                    <div className="col-md-4">
                                      <FormikField
                                        label="Project procurement end date"
                                        value={rfqFormDataFromStore.bid_end_date}
                                        enableHandleChange={true}
                                        handleChange={handleFormFieldChange}
                                        type="date"
                                        isRequired={true}
                                        name="bid_end_date"
                                        touched={touched}
                                        errors={errors}
                                      />
                                    </div>
                                    <div className="col-md-12">
                                      <FormikField
                                        label="Delivery location"
                                        value={rfqFormDataFromStore.location}
                                        enableHandleChange={true}
                                        handleChange={handleFormFieldChange}
                                        type="text"
                                        isRequired={false}
                                        name="location"
                                        touched={touched}
                                        errors={errors}
                                      />
                                    </div>
                                  </div>

                                  <button
                                    type="submit"
                                    className="btn btn-secondary mt-2 me-3"
                                    disabled={!isValid}
                                  >
                                    Create RFQ
                                  </button>

                                  <button
                                    type="button"
                                    className="btn btn-secondary mt-2"
                                    onClick={handleSaveDraft}
                                  // fix here
                                  // disabled={!isValid}
                                  >
                                    Save Changes
                                  </button>

                                </Form>
                              )}
                            </Formik>
                            <p className="mt-2">
                              This action will send RFQs to all selected vendors for the
                              relevant product.
                            </p>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
              </div>
            </>
          )}
      </div>
    </>
  );
};


export default CreateRFQ;