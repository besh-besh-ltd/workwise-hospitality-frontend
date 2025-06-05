import React, { useState, useEffect } from "react";
import { Formik, Form, Field } from "formik";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";
import { toast } from "react-toastify";
import { useRouter } from "next/router";
import FullLoader from "@/components/shared/FullLoader";
import { createBuyerCompanyUser } from "@/services/Auth";
import { getCountryCodes } from "@/services/cms";
import { createAccountSchema } from "@/utils/schema";
import CommonFormInput from "@/components/shared/CommonFormInput";

const roleOptions = [
  { value: 7, label: "Admin", color: "#007bff" },
  { value: 8, label: "Top Management", color: "#2E5BA8" },
  { value: 2, label: "Procurement", color: "#428B41" },
  { value: 9, label: "Engineering", color: "#FFE600" },
  { value: 10, label: "Finance", color: "#5b5b5b" },
];

const initialValues = {
  name: "",
  email: "",
  mobile: "",
  countryCode: "+91",
  password: "",
  confirmPassword: "",
  role: null,
};

const CreateAccountPage = () => {
  const router = useRouter();

  const [appState, setAppState] = useState({
    loading: false,
    countryCodes: [],
    selectedCountryCode: "+91",
  });

  const handleSubmit = async (values, { resetForm, setSubmitting }) => {
    setAppState((prev) => ({ ...prev, loading: true }));
    try {
      const formattedMobile = `${values.countryCode}-${values.mobile}`;
      const apiData = {
        name: values.name,
        email: values.email,
        mobile: formattedMobile,
        user_type: values.role.value.toString(),
        password: values.password,
      };
      const response = await createBuyerCompanyUser(apiData);
      if (response.status) {
        toast.success("Account created successfully!");
        resetForm();
        router.push(
          "/dashboard/admin/account-management/manage-accounts?refresh=true"
        );
      } else {
        toast.error(response.message || "Failed to create account");
      }
    } catch (error) {
      console.error("Error creating account:", error);
      toast.error("Failed to create account. Please try again.");
    } finally {
      setAppState((prev) => ({ ...prev, loading: false }));
      setSubmitting(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await getCountryCodes();
        if (response?.data) {
          setAppState((prev) => ({ ...prev, countryCodes: response.data }));
        }
      } catch (error) {
        console.error("Error fetching country codes:", error);
        toast.error("Failed to load country codes");
      }
    };
    fetchData();
  }, []);

  return (
    <>
      <section className="buyer-common-header sc-pt-80">
        <div className="container-fluid">
          <h1 className="heading">Create New Account</h1>
        </div>
      </section>

      <section className="buyer-sec-1">
        <div className="container-fluid">
          <div className="row">
            <div className="col-md-12">
              <div className="vendor-mngt-con">

                <div className="card shadow-sm">
                  <div className="card-body p-4 hasFullLoader">
                    {appState.loading && <FullLoader />}

                    <Formik
                      initialValues={initialValues}
                      validationSchema={createAccountSchema}
                      onSubmit={handleSubmit}
                    >
                      {({
                        errors,
                        touched,
                        values,
                        setFieldValue,
                        isSubmitting,
                      }) => (
                        <Form>
                          <div className="row mb-4">
                            <div className="col-md-12">
                              <h4 className="mb-3">Account Information</h4>
                              <p className="text-muted">
                                Create a new user account for your organization
                              </p>
                            </div>
                          </div>

                          <div className="row mb-3">
                            <div className="col-md-6">
                              <CommonFormInput
                                name="name"
                                label="Name"
                                touched={touched}
                                errors={errors}
                              />
                            </div>
                            <div className="col-md-6">
                              <CommonFormInput
                                name="email"
                                label="Email"
                                type="email"
                                touched={touched}
                                errors={errors}
                              />
                            </div>
                          </div>

                          <div className="row mb-3">
                            <div className="col-md-6">
                              <CommonFormInput
                                name="mobile"
                                label="Mobile"
                                type="mobile"
                                touched={touched}
                                errors={errors}
                                values={values}
                                countryCodes={appState.countryCodes}
                              />
                            </div>
                            <div className="col-md-6">
                              <CommonFormInput
                                name="role"
                                label="Role"
                                type="select"
                                options={roleOptions}
                                values={values}
                                setFieldValue={setFieldValue}
                                touched={touched}
                                errors={errors}
                              />
                            </div>
                          </div>

                          <div className="row mb-4">
                            <div className="col-md-6">
                              <CommonFormInput
                                name="password"
                                label="Password"
                                type="password"
                                touched={touched}
                                errors={errors}
                              />
                            </div>
                            <div className="col-md-6">
                              <CommonFormInput
                                name="confirmPassword"
                                label="Confirm Password"
                                type="password"
                                touched={touched}
                                errors={errors}
                              />
                            </div>
                          </div>

                          <div className="row">
                            <div className="col-md-12 d-flex justify-content-end">
                              <button
                                type="button"
                                className="btn btn-outline-secondary me-2"
                                onClick={() =>
                                  router.push(
                                    "/dashboard/admin/account-management/manage-accounts"
                                  )
                                }
                                disabled={isSubmitting}
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={isSubmitting}
                              >
                                Create Account
                              </button>
                            </div>
                          </div>
                        </Form>
                      )}
                    </Formik>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default CreateAccountPage;
