import React, { useState, useEffect } from "react";
import { Formik, Form, Field } from "formik";
import { toast } from "react-toastify";
import { useRouter } from "next/router";
import FullLoader from "@/components/shared/FullLoader";
import { createBuyerCompanyUser } from "@/services/Auth";
import { getCountryCodes } from "@/services/cms";
import { createAccountSchema } from "@/utils/schema";
import CommonFormInput from "@/components/shared/CommonFormInput";
import { getProfile } from "@/services/Auth";
import RoleScopeSelector from "@/components/hospitality/RoleScopeSelector";

const roleOptions = [
  { value: 8, label: "Management", color: "#2E5BA8" },
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
  employee_type: "",
  employee_code: "",
  payroll_company_id: ""
};

const CreateAccountPage = () => {
  const router = useRouter();

  const [appState, setAppState] = useState({
    loading: false,
    countryCodes: [],
    selectedCountryCode: "+91",
    isHospitalityCompany: false
  });

  const [roleScopes, setRoleScopes] = useState([]);

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
      if (appState.isHospitalityCompany) {
        const deptIds = Array.from(
          new Set(
            (roleScopes || [])
              .map((r) => r.department_id)
              .filter((id) => id !== null && id !== undefined)
          )
        );
        apiData.employee_type = values.employee_type || null;
        apiData.employee_code = values.employee_code || null;
        apiData.payroll_company_id = values.payroll_company_id || null;
        apiData.roles = roleScopes;
        apiData.department_ids = deptIds;
      }
      const response = await createBuyerCompanyUser(apiData);
      if (response.status) {
        toast.success("Account created successfully!");
        resetForm();
        router.push(
          "/dashboard/admin/account-management/manage-accounts?refresh=true"
        );
      }
    } catch (error) {

      const apiError = error?.message?.response;
     const message = apiError?.errors || apiError?.data?.message || "Failed to create account. Please try again.";
     toast.error(message);

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
        const profileRes = await getProfile();
        const profile = profileRes?.data;
        const hospitalityEnabled =
          profile?.is_hospitality === 1 || profile?.is_hospitality === "1";
        if (hospitalityEnabled) {
          setAppState((prev) => ({
            ...prev,
            isHospitalityCompany: true
          }));
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
                                 required= {true}
                              />
                            </div>
                            <div className="col-md-6">
                              <CommonFormInput
                                name="email"
                                label="Email"
                                type="email"
                                touched={touched}
                                errors={errors}
                                 required= {true}
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
                                 required= {true}
                              />
                            </div>
                            <div className="col-md-6">
                              <CommonFormInput
                                name="role"
                                label="Role"
                                type="select"
                                required= {true}
                                options={roleOptions}
                              />

                            </div>
                          </div>

                          {appState.isHospitalityCompany && (
                            <div className="row mb-3">
                              <div className="col-md-4">
                                <CommonFormInput
                                  name="employee_type"
                                  label="Employee Type"
                                  touched={touched}
                                  errors={errors}
                                />
                              </div>
                              <div className="col-md-4">
                                <CommonFormInput
                                  name="employee_code"
                                  label="Employee Code"
                                  touched={touched}
                                  errors={errors}
                                />
                              </div>
                              <div className="col-md-4">
                                <CommonFormInput
                                  name="payroll_company_id"
                                  label="Payroll Company Id"
                                  touched={touched}
                                  errors={errors}
                                />
                              </div>
                            </div>
                          )}

                          <div className="row mb-4">
                            <div className="col-md-6">
                              <CommonFormInput
                                name="password"
                                label="Password"
                                type="password"
                                touched={touched}
                                errors={errors}
                                 required= {true}
                              />
                            </div>
                            <div className="col-md-6">
                              <CommonFormInput
                                name="confirmPassword"
                                label="Confirm Password"
                                type="password"
                                touched={touched}
                                errors={errors}
                                 required= {true}
                              />
                            </div>
                          </div>

                          {appState.isHospitalityCompany && (
                            <div className="row mb-4">
                              <div className="col-md-12">
                                <div className="card border-0 shadow-sm">
                                  <div className="card-body">
                                    <h5 className="mb-3">Role & Scope</h5>
                                    <RoleScopeSelector
                                      onAddRole={(scope) =>
                                        setRoleScopes((prev) => [...prev, scope])
                                      }
                                      existingRoles={roleScopes}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

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
                                id="cancel_create_account-account_actions-create_account_page"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={isSubmitting}
                                id="create_account-account_actions-create_account_page"
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
