import React, { useState, useEffect } from "react";
import { Formik, Form, Field } from "formik";
import { toast } from "react-toastify";
import { useRouter } from "next/router";
import FullLoader from "@/components/shared/FullLoader";
import { createBuyerCompanyUser, getProfile } from "@/services/Auth";
import { getCountryCodes } from "@/services/cms";
import { createAccountSchema } from "@/utils/schema";
import CommonFormInput from "@/components/shared/CommonFormInput";
import { getDepartments } from "@/services/rbac";
import { getHospitalityCompanies } from "@/services/hospitality";

const initialValues = {
  name: "",
  email: "",
  mobile: "",
  countryCode: "+91",
  password: "",
  confirmPassword: "",
  employee_type: null,
  employee_code: "",
  payroll_company_id: "",
  department_id: []
};

const CreateAccountPage = () => {
  const router = useRouter();

  const [appState, setAppState] = useState({
    loading: false,
    countryCodes: [],
    selectedCountryCode: "+91",
    isHospitalityCompany: false,
    hospitalityCompanies: [],
    departments: []
  });


  const handleSubmit = async (values, { resetForm, setSubmitting }) => {

    setAppState((prev) => ({ ...prev, loading: true }));
    try {
      const formattedMobile = `${values.countryCode}-${values.mobile}`;
      const normalizeEmployeeType = (raw) => {
        if (!raw) return null;
        const value = String(raw).trim().toLowerCase();
        if (value === "full time" || value === "full-time") return "full-time";
        if (value === "part time" || value === "part-time") return "part-time";
        if (value === "freelance") return "freelance";
        if (value === "contract" || value === "contracted") return "contracted";
        if (value === "other") return "other";
        return "other";
      };
      const apiData = {
        name: values.name,
        email: values.email,
        mobile: formattedMobile,
        user_type: "2", // Hardcoded as Procurement (2)
        password: values.password,
      };
      
      // Handle department_ids from multi-select (for all companies)
      if (values.department_id && Array.isArray(values.department_id) && values.department_id.length > 0) {
        apiData.department_ids = values.department_id.map(dept => 
          typeof dept === 'object' ? parseInt(dept.value, 10) : parseInt(dept, 10)
        );
      } else if (values.department_id && !Array.isArray(values.department_id)) {
        // Fallback for single value
        apiData.department_ids = [parseInt(values.department_id, 10)];
      } else {
        apiData.department_ids = [];
      }
      
      if (appState.isHospitalityCompany) {
        // Extract value from select option object
        const employeeTypeValue = values.employee_type?.value || values.employee_type;
        apiData.employee_type = normalizeEmployeeType(employeeTypeValue);
        apiData.employee_code = values.employee_code || null;

        // Handle payroll_company_id from select (can be object or value)
        const rawPayrollId = values.payroll_company_id;
        if (rawPayrollId) {
          // Extract value if it's an object (from react-select)
          const payrollIdValue = typeof rawPayrollId === 'object' && rawPayrollId !== null 
            ? rawPayrollId.value 
            : rawPayrollId;
          
          if (payrollIdValue && String(payrollIdValue).trim() !== "") {
            const parsedPayrollId = parseInt(String(payrollIdValue).trim(), 10);
            if (Number.isNaN(parsedPayrollId)) {
              throw {
                response: {
                  data: {
                    message: "Payroll Company must be selected.",
                  },
                },
              };
            }
            apiData.payroll_company_id = parsedPayrollId;
          } else {
            apiData.payroll_company_id = null;
          }
        } else {
          apiData.payroll_company_id = null;
        }
      }
      const response = await createBuyerCompanyUser(apiData);
      if (response?.status) {
        toast.success("Account created successfully!");
        resetForm();
        router.push(
          "/dashboard/admin/account-management/manage-accounts?refresh=true"
        );
      } else {
        throw new Error(response?.message || "Failed to create account");
      }
    } catch (error) {
      console.error("Create account error:", error);
      const apiError = error?.message?.response || error?.response;
      let message = "Failed to create account. Please try again.";
      
      if (apiError?.data?.message) {
        message = apiError.data.message;
      } else if (apiError?.data?.errors) {
        // Handle validation errors object
        const errorMessages = Object.values(apiError.data.errors).flat();
        message = errorMessages.length > 0 ? errorMessages[0] : message;
      } else if (apiError?.errors) {
        const errorMessages = Object.values(apiError.errors).flat();
        message = errorMessages.length > 0 ? errorMessages[0] : message;
      } else if (error?.message) {
        message = error.message;
      }
      
      toast.error(message);

    } finally {
      setAppState((prev) => ({ ...prev, loading: false }));
      setSubmitting(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [countryCodesRes, profileRes, departmentsRes] = await Promise.all([
          getCountryCodes(),
          getProfile(),
          getDepartments()
        ]);
        
        if (countryCodesRes?.data) {
          setAppState((prev) => ({ ...prev, countryCodes: countryCodesRes.data }));
        }
        
        const profile = profileRes?.data;
        const hospitalityEnabled =
          profile?.is_hospitality === 1 || profile?.is_hospitality === "1";
        if (hospitalityEnabled) {
          setAppState((prev) => ({
            ...prev,
            isHospitalityCompany: true
          }));
          
          // Fetch hospitality companies for payroll company dropdown
          try {
            const hospitalityCompaniesRes = await getHospitalityCompanies();
            const companies = (hospitalityCompaniesRes?.data ?? hospitalityCompaniesRes ?? []).map((c) => ({
              value: c.id,
              label: c.name || c.company_name
            }));
            setAppState((prev) => ({ ...prev, hospitalityCompanies: companies }));
          } catch (error) {
            console.error("Error fetching hospitality companies:", error);
          }
        }
        
        if (departmentsRes?.data?.data || departmentsRes?.data) {
          const departments = (departmentsRes?.data?.data || departmentsRes?.data || []).map((d) => ({
            value: d.id,
            label: d.title
          }));
          setAppState((prev) => ({ ...prev, departments }));
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load data");
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
                                name="department_id"
                                label="Department"
                                type="select"
                                isMulti={true}
                                required= {true}
                                options={appState.departments}
                                touched={touched}
                                errors={errors}
                                values={values.department_id}
                              />
                            </div>
                          </div>

                          {appState.isHospitalityCompany && (
                            <div className="row mb-3">
                              <div className="col-md-4">
                                <CommonFormInput
                                  name="employee_type"
                                  label="Employee Type"
                                  type="select"
                                  options={[
                                    { value: "full-time", label: "Full Time" },
                                    { value: "part-time", label: "Part Time" },
                                    { value: "freelance", label: "Freelance" },
                                    { value: "contracted", label: "Contracted" },
                                    { value: "other", label: "Other" }
                                  ]}
                                  touched={touched}
                                  errors={errors}
                                  values={values.employee_type}
                                  required={true}
                                />
                              </div>
                              <div className="col-md-4">
                                <CommonFormInput
                                  name="employee_code"
                                  label="Employee Code"
                                  touched={touched}
                                  errors={errors}
                                  required={true}
                                />
                              </div>
                              <div className="col-md-4">
                                <CommonFormInput
                                  name="payroll_company_id"
                                  label="Payroll Company"
                                  type="select"
                                  options={appState.hospitalityCompanies}
                                  touched={touched}
                                  errors={errors}
                                  values={values.payroll_company_id}
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
