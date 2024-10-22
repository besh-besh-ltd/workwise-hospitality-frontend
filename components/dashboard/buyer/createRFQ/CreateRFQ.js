import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import Item from "./Item";
import { createRfq, getTerms, vendorApproveList } from "@/services/rfq";
import { Form, Formik } from "formik";
import { CreateRFQSchema } from "@/utils/schema";
import FormikField from "@/components/shared/FormikField";
import { getProfile } from "@/services/Auth";
import Loader from "@/components/shared/Loader";
import { useDispatch, useSelector } from "react-redux";
import {
  addProductSpec,
  clearState,
  setAllTerms,
  setCustomTerms,
  setCustomTermsText,
  setRfqFormData,
  setOtherFormFields,
  addCustomTermsFiles,
  removeCustomTermsFiles
} from "@/redux/slice";
import Link from "next/link";
import { toast } from "react-toastify";
import { getProjectList } from "@/services/project";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClose } from "@fortawesome/free-solid-svg-icons";
import { extractfileName, handleFileUpload } from "@/utils/sharedFunctions";


const CreateRFQ = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [mainLoading, setMainLoading] = useState(false);
  const [rfqProducts, setRfqProducts] = useState([]);

  const [userProfile, setuserProfile] = useState(null);
  const [vendorApprovedList, setVendorApprovedList] = useState([]);

  const rfqProductsFromStore = useSelector((data) => data.rfqProducts);
  const rfqFormData = useSelector((data) => data.rfqFormData);
  const stateTerms = useSelector((data) => data.allTerms);
  const allSelectedTermsFromState = useSelector((data) => data.rfqObjData.terms);
  const [termFiles, setTermFiles] = useState(rfqFormData.term_and_condition_files);

  const [terms, setTerms] = useState(stateTerms);
  const [selectedTerms, setSelectedTerms] = useState(allSelectedTermsFromState);
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    if (selectedTerms.length > 0) {
      dispatch(setCustomTerms(selectedTerms));
    }
  }, [selectedTerms]);

  useEffect(() => {
    setRFQProductsFromStore();
  }, [rfqProductsFromStore]);

  useEffect(() => {
    getProfileDetails();
    setRFQProductsFromStore();
    getVendorApproveList();
    getAllProjects();
    if (stateTerms.length == 0)
      getTermsData();
  }, []);


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

  const setRFQProductsFromStore = () => {
    let fp = rfqProductsFromStore.filter((item) => item.vendors.length > 0);
    setRfqProducts(fp);
  };

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
    // setTerms(stateTerms);
    getTerms()
      .then((res) => {
        setTerms(res.data);
        const terms = res.data?.map((item) => {
          return { id: item.id };
        })
        setSelectedTerms(terms);
        dispatch(setAllTerms(res.data));
      })
      .catch((err) => {
        console.error(err);
      });
  };

  const gotoAddMoreProducts = () => {
    router.push("/vendor/all");
  };
  const handleGotoPreferredVendors = () => {
    router.push("/vendors");
  };
  const handleCreateRFQ = (values, resetForm) => {
    setMainLoading(true);
    
    //router.push('/dashboard/buyer/rfq-management-preview')
    let payload = {
      ...values,
      // term_and_condition_files: term_files,
      products: rfqProductsFromStore,
      terms: selectedTerms,
      reverse_auction: parseInt(values.reverse_auction)
    };

    createRfq(payload)
      .then((res) => {
        setMainLoading(false);
        dispatch(setRfqFormData(values));
        toast.success(
          <h6>
            <b>RFQ #{res.data.rfq_no}:</b> Successfully created!
          </h6>,
          {
            position: "top-right",
          }
        );
        resetForm();
        dispatch(clearState());
        router.push("/dashboard/buyer/rfq-management?tab=manage-rfq");
      })
      .catch((err) => {
        setMainLoading(false);
      });
  };

  const handleProductSpec = (specItems, product_id) => {
    dispatch(addProductSpec({ specItems, product_id }));
  };

  const handleClickTerms = (e, item) => {
    if (e.target.checked) {
      setSelectedTerms((oldArray) => [...oldArray, { id: item.id }]);
    } else {
      let p = selectedTerms.filter((term) => term.id != item.id);
      setSelectedTerms(p);
    }
  };

  const handleChange = (e) => {
    dispatch(setCustomTermsText(e.target.value));
  };
  const isAlreadySelected = (id) => {
    if (allSelectedTermsFromState.length > 0) {
      let isItThere = allSelectedTermsFromState.filter((item) => item.id == id);
      return isItThere.length > 0;
    }
  };

  const handleFormFieldChange = (e) => {
    const { name, value } = e.target;
    dispatch(setOtherFormFields({ field_name: name, value }));
  }


  const uploadToServer = async (e) => {
    try {
      const filePath = await handleFileUpload(e);
      setTermFiles((prevFiles) => ([
        ...prevFiles,
        filePath
      ]));

      dispatch(
        addCustomTermsFiles({
          value: filePath
        })
      );

    } catch (error) {
      let message = err.message.response.data.errors.file.message;
        toast.error(message);
    } 
  };

  const handleRemoveFile = (fileItem) => {
    dispatch(
      removeCustomTermsFiles({
        value: fileItem,
      })
    );
    let updatedTermsFiles = termFiles.filter((term_file)=> term_file !== fileItem);
    setTermFiles(updatedTermsFiles)
  }

  return (
    <>
      {mainLoading && <Loader />}
      <div className="create-rfq-con">
        {/* Content for Create RFQs tab */}
        {userProfile && !userProfile?.subscription_plan_id && (
          <div class="subscription_required">
            <span>
              You need to purchase subscription to perform this action
            </span>
          </div>
        )}

        <div className="details-table">
          {rfqProducts.length == 0 &&
            !loading &&
            userProfile?.subscription_plan_id && (
              <div className="text-center">
                <Link href="/vendor/all" className="btn btn-primary">
                  Add Products
                </Link>
              </div>
            )}
          {rfqProducts.length > 0 && userProfile?.subscription_plan_id && (
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
                  </tr>
                </thead>
                <tbody>
                  {rfqProducts &&
                    rfqProducts.map((product) => {
                      return (
                        <Item
                          key={`rfqpp_${product?.product_id}_${product?.variant}`}
                          vendorApprovedList={vendorApprovedList}
                          handleProductSpec={handleProductSpec}
                          data={product}
                        />
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
          {rfqProducts.length > 0 && userProfile?.subscription_plan_id && (
            <>
              <div className="float-end addmore">
                <button className="mr-4" onClick={gotoAddMoreProducts}>
                  Add More Products
                </button>
              </div>
            </>
          )}
        </div>
        {loading && <Loader />}
        {rfqProducts.length > 0 &&
          !loading &&
          userProfile?.subscription_plan_id && (
            <div className="create-rfq-con-2 sc-pt-50">
              <div className="row">
                {!loading && terms.length > 0 && (
                  <div className="col-md-8 createR-ffq-1">
                    <h4>Suggested Terms</h4>

                    <ol className="custom-ol">
                      {terms.map((item) => {
                        return (
                          <li key={`term-item-${item.id}`}>
                            <input
                              onClick={(e) => handleClickTerms(e, item)}
                              type="checkbox"
                              id={`term-item-${item.id}`}
                              checked={isAlreadySelected(item.id)}
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

                <div className="col-md-8 createR-ffq-2">
                  <Formik
                    enableReinitialize={true}
                    validateOnMount={true}
                    initialValues={{
                      is_published: rfqFormData.is_published,
                      comment: rfqFormData.comment,
                      response_email: rfqFormData.response_email
                        ? rfqFormData.response_email
                        : userProfile?.email,
                      contact_name: rfqFormData.contact_name
                        ? rfqFormData.contact_name
                        : userProfile?.name,
                      contact_number: rfqFormData.contact_number
                        ? rfqFormData.contact_number
                        : userProfile?.mobile,
                      company_name: userProfile?.organization_name
                        || userProfile?.name
                        || rfqFormData?.company_name,
                      bid_end_date: rfqFormData.bid_end_date,
                      rfq_type: rfqFormData.rfq_type,
                      reverse_auction: rfqFormData.reverse_auction,
                      project_id: rfqFormData.project_id,
                      location: rfqFormData.location
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
                          isRequired={true}
                          name="comment"
                          touched={touched}
                          errors={errors}
                          enableHandleChange={true}
                          handleChange={handleChange}
                        />

                        <div className="row mt-2">
                          <div className="custom-file">
                            <label htmlFor="customFile" className="custom-file-label">
                              Upload Your Terms (Optional)
                            </label>
                            <input
                              type="file"
                              className="custom-file-input"
                              id="customFile"
                              multiple
                              onChange={uploadToServer}
                            />
                            {termFiles.length > 0 && (
                              <div className="d-flex flex-wrap column-gap-3 mt-2">
                                {termFiles.map((term_file) => (
                                  <a href={term_file} target="_blank" key={term_file} className="file-badge mb-2" type="button" >
                                    <span className="text-truncate me-3" style={{ maxWidth: "90%" }}>{extractfileName(term_file)}</span>
                                    <FontAwesomeIcon 
                                    icon={faClose} 
                                    fontSize={15} 
                                    onClick={(e) => {
                                      e.preventDefault();
                                      handleRemoveFile(term_file)
                                    }} />
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>

                        </div>

                        <div className="row mt-2">
                          <div className="col-md-6">
                            <FormikField
                              label="Email"
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
                              label="Bid end date"
                              value={rfqFormData.bid_end_date}
                              enableHandleChange={true}
                              handleChange={handleFormFieldChange}
                              type="date"
                              isRequired={true}
                              name="bid_end_date"
                              touched={touched}
                              errors={errors}
                            />
                          </div>
                          <div className="col-md-4">
                            <FormikField
                              label="RFQ Type"
                              value={rfqFormData.rfq_type}
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
                              value={rfqFormData.reverse_auction}
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
                              label="Project Name"
                              value={rfqFormData.project_id}
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
                          </div>
                          <div className="col-md-8">
                            <FormikField
                              label="Delivery location"
                              value={rfqFormData.location}
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
                          className="btn btn-secondary mt-2"
                          //onClick={handlePreviewButtonClick}
                          disabled={!isValid}
                        >
                          Create RFQ
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
          )}
      </div>
    </>
  );
};

export default CreateRFQ;
