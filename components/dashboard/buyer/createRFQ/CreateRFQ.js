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
  setBidEndDate,
  setCustomTerms,
  setCustomTermsText,
  setLocation,
  setRfqFormData,
} from "@/redux/slice";
import Link from "next/link";
import { ToastContainer, toast } from "react-toastify";
import { getStates } from "@/services/cms";

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
  const allSelectedTermsFromState = useSelector(
    (data) => data.rfqObjData.terms
  );
  const [terms, setTerms] = useState(stateTerms);
  const [selectedTerms, setSelectedTerms] = useState(allSelectedTermsFromState);
  const [states, setstates] = useState([]);

  useEffect(() => {
    if (selectedTerms.length > 0) {
      dispatch(setCustomTerms(selectedTerms));
    }
  }, [selectedTerms]);

  useEffect(() => {
    setRFQProductsFromStore();
  }, [rfqProductsFromStore]);

  useEffect(() => {
    getTermsData();
    getProfileDetails();
    setRFQProductsFromStore();
    getVendorApproveList();
    getAllStates();
  }, []);
  const getAllStates = () => {
    getStates().then((res) => {
      let d = [];
      res.data.map((item) => {
        d.push({ label: item.state_name, value: item.id });
      });
      setstates(d);
    });
  };

  const setRFQProductsFromStore = () => {
    console.log(rfqProductsFromStore);
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
    setTerms(stateTerms);
    getTerms()
      .then((res) => {
        setTerms(res.data);
        dispatch(setAllTerms(res.data));
      })
      .catch((err) => {
        console.error(err);
      });
  };

  const gotoAddMoreProducts = () => {
    router.push("/products");
  };
  const handleGotoPreferredVendors = () => {
    router.push("/vendors");
  };
  const handleCreateRFQ = (values, resetForm) => {
    setMainLoading(true);

    //router.push('/dashboard/buyer/rfq-management-preview')
    let payload = values;
    payload.products = rfqProductsFromStore;
    payload.terms = selectedTerms;
    createRfq(payload)
      .then((res) => {
        setMainLoading(false);
        dispatch(setRfqFormData(values));
        toast.success(
          <h6>
            <b>RFQ #{res.data.rfq_no}:</b> Successfully created!
          </h6>,
          {
            position: "bottom-right",
          }
        );
        resetForm();
        dispatch(clearState());
        router.push("/dashboard/buyer/rfq-management?tab=manage-rfq");
      })
      .catch((err) => {
        setMainLoading(false);
        console.log(err);
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
  const handleLocationChange = (e) => {
    dispatch(setLocation(e.target.value));
  };
  const handleDateChange = (e) => {
    dispatch(setBidEndDate(e.target.value));
  };
  const isAlreadySelected = (id) => {
    if (allSelectedTermsFromState.length > 0) {
      let isItThere = allSelectedTermsFromState.filter((item) => item.id == id);
      return isItThere.length > 0;
    }
  };

  return (
    <>
      {/* <ToastContainer/> */}
      {mainLoading && <Loader />}
      <div className="create-rfq-con">
        {/* Content for Create RFQs tab */}
        {/* <span className="title">Create RFQs</span> */}
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
                <Link href="/products" className="btn btn-primary">
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
                    <th>Size specifications & Quantity</th>
                    {/* <th>Select Datasheet</th> */}
                    <th className="w200">TDS</th>
                    <th className="w200">QAP</th>
                    <th>Comments</th>
                    <th>Selected vendors</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rfqProducts &&
                    rfqProducts.map((product, index) => {
                      return (
                        <Item
                          key={`rfqpp_${index}`}
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
                      location: rfqFormData.location,
                      bid_end_date: rfqFormData.bid_end_date,
                      company_name: userProfile?.company_name
                        ? userProfile?.company_name
                        : "",
                    }}
                    validationSchema={CreateRFQSchema}
                    onSubmit={(values, { resetForm }) =>
                      handleCreateRFQ(values, resetForm)
                    }
                  >
                    {({ errors, touched, isValid }) => (
                      <Form className="add-your-term-form">
                        <FormikField
                          label="Add your own Terms"
                          type="textarea"
                          rows="5"
                          isRequired={true}
                          name="comment"
                          touched={touched}
                          errors={errors}
                          enableHandleChange={true}
                          handleChange={handleChange}
                        />

                        {/* <div className="form-group">
                        <h4>Add your own Terms</h4>
                        <textarea
                        id="addterm"
                        name="addterm"
                        placeholder="Enter here"
                        rows="5"
                        />
                    </div> */}

                        <div className="row my-2">
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
                        <div className="row my-2">
                          <div className="col-md-3">
                            <FormikField
                              label="Delivery location"
                              value={rfqFormData.location}
                              enableHandleChange={true}
                              handleChange={handleLocationChange}
                              type="select"
                              selectOptions={[
                                { label: "Select Location", value: 0 },
                                ...states,
                              ]}
                              isRequired={false}
                              name="location"
                              touched={touched}
                              errors={errors}
                            />
                          </div>
                          <div className="col-md-3">
                            <FormikField
                              label="Bid end date"
                              type="date"
                              isRequired={false}
                              name="bid_end_date"
                              touched={touched}
                              errors={errors}
                              enableHandleChange={true}
                              handleChange={handleDateChange}
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          className="btn btn-secondary"
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
      <ToastContainer />
    </>
  );
};

export default CreateRFQ;
