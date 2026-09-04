import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { Formik, Form } from "formik";
import { toast } from "react-toastify";
import { useRouter } from "next/router";
import Link from "next/link";
import { HiArrowLeft } from "react-icons/hi";
import { createBuyerCompanyUser } from "@/services/Auth";
import { createAccountSchema } from "@/utils/schema";
import CommonFormInput from "@/components/shared/CommonFormInput";
import { getDepartments } from "@/services/rbac";
import { getHospitalityCompanies, getHospitalityHotels } from "@/services/hospitality";
import RoleScopeSelector from "@/components/hospitality/RoleScopeSelector";
import InlineAccessManager from "./manage-accounts/InlineAccessManager";
import styles from "./manage-accounts/ManageAccounts.module.scss";

const employeeTypeOptions = [
  { value: "full-time", label: "Full Time" },
  { value: "part-time", label: "Part Time" },
  { value: "freelance", label: "Freelance" },
  { value: "contracted", label: "Contracted" },
  { value: "other", label: "Other" },
];

const normalizeEmployeeType = (raw) => {
  if (!raw) return null;
  const value = String(raw).trim().toLowerCase();
  if (value === "full time" || value === "full-time") return "full-time";
  if (value === "part time" || value === "part-time") return "part-time";
  if (value === "freelance") return "freelance";
  if (value === "contract" || value === "contracted") return "contracted";
  return "other";
};

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
  department_id: [],
};

const CreateAccountPage = () => {
  const router = useRouter();
  const userProfile = useSelector((state) => state.userProfile);
  const [loading, setLoading] = useState(false);
  const [isHospitality, setIsHospitality] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [hospitalityCompanies, setHospitalityCompanies] = useState([]);
  const [hospitalityCompaniesRaw, setHospitalityCompaniesRaw] = useState([]);
  const [hotelsByCompany, setHotelsByCompany] = useState({});

  // Pending mappings & role scopes (applied after user creation)
  const [pendingMappings, setPendingMappings] = useState([]);
  const [pendingRoleScopes, setPendingRoleScopes] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const hospitalityEnabled =
          userProfile?.is_hospitality === 1 || userProfile?.is_hospitality === "1";
        setIsHospitality(!!hospitalityEnabled);

        if (hospitalityEnabled) {
          try {
            const companiesRes = await getHospitalityCompanies({ include: "hotels" });
            const companies = companiesRes?.data ?? companiesRes ?? [];
            setHospitalityCompaniesRaw(companies);
            setHospitalityCompanies(companies.map((c) => ({
              value: c.id,
              label: c.name || c.company_name,
            })));
            const hotelsMap = {};
            companies.forEach((c) => {
              hotelsMap[c.id] = c.hotels || [];
            });
            setHotelsByCompany(hotelsMap);
          } catch (error) {
            console.error("Error fetching hospitality companies:", error);
          }
        }

        const departmentsRes = await getDepartments();
        const depts = (departmentsRes?.data?.data || departmentsRes?.data || []).map((d) => ({
          value: d.id,
          label: d.title,
        }));
        setDepartments(depts);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load data");
      }
    };
    fetchData();
  }, [userProfile]);

  const loadCompanyHotels = async (companyId) => {
    if (!companyId || hotelsByCompany[companyId]) return;
    try {
      const response = await getHospitalityHotels(companyId);
      const hotels = response?.data ?? response ?? [];
      setHotelsByCompany((prev) => ({ ...prev, [companyId]: hotels }));
    } catch {
      setHotelsByCompany((prev) => ({ ...prev, [companyId]: [] }));
    }
  };

  const handleSubmit = async (values, { resetForm, setSubmitting }) => {
    setLoading(true);
    try {
      const formattedMobile = `${values.countryCode}-${values.mobile}`;
      const apiData = {
        name: values.name,
        email: values.email,
        mobile: formattedMobile,
        user_type: "2",
        password: values.password,
      };

      if (values.department_id && Array.isArray(values.department_id) && values.department_id.length > 0) {
        apiData.department_ids = values.department_id.map((dept) =>
          typeof dept === "object" ? parseInt(dept.value, 10) : parseInt(dept, 10)
        );
      } else if (values.department_id && !Array.isArray(values.department_id)) {
        apiData.department_ids = [parseInt(values.department_id, 10)];
      } else {
        apiData.department_ids = [];
      }

      if (!apiData.department_ids || apiData.department_ids.length === 0) {
        throw new Error("Please select at least one department.");
      }

      if (isHospitality) {
        const employeeTypeValue = values.employee_type?.value || values.employee_type;
        apiData.employee_type = normalizeEmployeeType(employeeTypeValue);
        apiData.employee_code = values.employee_code || null;

        const rawPayrollId = values.payroll_company_id;
        if (rawPayrollId) {
          const payrollIdValue =
            typeof rawPayrollId === "object" && rawPayrollId !== null
              ? rawPayrollId.value
              : rawPayrollId;

          if (payrollIdValue && String(payrollIdValue).trim() !== "") {
            const parsedPayrollId = parseInt(String(payrollIdValue).trim(), 10);
            if (Number.isNaN(parsedPayrollId)) {
              throw {
                response: { data: { message: "Payroll Company must be selected." } },
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

      // Include roles and mappings directly in the create payload
      if (isHospitality && pendingRoleScopes.length > 0) {
        apiData.roles = pendingRoleScopes.map((role) => ({
          role_id: role.role_id,
          company_id: role.company_id || null,
          hotel_id: role.hotel_id || null,
          department_id: role.department_id || null,
          process_id: role.process_id || null,
        }));
      }

      if (isHospitality && pendingMappings.length > 0) {
        apiData.mappings = pendingMappings.map((mapping) => ({
          company_id: mapping.companyId,
          mapping_level: mapping.mappingLevel,
          hotel_id: mapping.mappingLevel !== "company" ? mapping.hotelId : null,
          auto_map_projects: mapping.autoMapProjects ?? true,
        }));
      }

      const response = await createBuyerCompanyUser(apiData);
      if (!response?.status) {
        throw new Error(response?.message || "Failed to create account");
      }

      toast.success("Account created successfully!");
      resetForm();
      setPendingMappings([]);
      setPendingRoleScopes([]);
      router.push("/dashboard/admin/account-management/manage-accounts?refresh=true");
    } catch (error) {
      console.error("Create account error:", error);
      const apiError = error?.message?.response || error?.response;
      let message = "Failed to create account. Please try again.";

      if (apiError?.data?.message) {
        message = apiError.data.message;
      } else if (apiError?.data?.errors) {
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
      setLoading(false);
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.pageWrap}>
      <div className={styles.pageHeader}>
        <Link
          href="/dashboard/admin/account-management/manage-accounts"
          style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "#64748b", textDecoration: "none", marginBottom: "12px" }}
        >
          <HiArrowLeft size={14} />
          Back to Manage Accounts
        </Link>
        <h1 className={styles.pageTitle}>Create New Account</h1>
        <p className={styles.pageSubtitle}>
          Add a new user to your organization
        </p>
      </div>

      <Formik
        initialValues={initialValues}
        validationSchema={createAccountSchema}
        onSubmit={handleSubmit}
      >
        {({ errors, touched, values, setFieldValue, isSubmitting }) => (
          <Form>
            <div className={styles.createCard}>
              <div className={styles.createCardBody}>
                {/* Account Information */}
                <div className={styles.createSection}>
                  <div className={styles.createSectionTitle}>Account Information</div>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <CommonFormInput
                        name="name"
                        label="Full Name"
                        type="text"
                        placeholder="John Doe"
                        touched={touched}
                        errors={errors}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <CommonFormInput
                        name="email"
                        label="Email Address"
                        type="email"
                        placeholder="john@example.com"
                        touched={touched}
                        errors={errors}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <CommonFormInput
                        name="mobile"
                        label="Mobile Number"
                        type="mobile"
                        touched={touched}
                        errors={errors}
                        values={values}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <CommonFormInput
                        name="department_id"
                        label="Department"
                        type="select"
                        isMulti
                        options={departments}
                        touched={touched}
                        errors={errors}
                        values={values.department_id}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Employment Details (Hospitality only) */}
                {isHospitality && (
                  <div className={styles.createSection}>
                    <div className={styles.createSectionTitle}>Employment Details</div>
                    <div className="row g-3">
                      <div className="col-md-4">
                        <CommonFormInput
                          name="employee_type"
                          label="Employee Type"
                          type="select"
                          options={employeeTypeOptions}
                          touched={touched}
                          errors={errors}
                          values={values.employee_type}
                          required
                        />
                      </div>
                      <div className="col-md-4">
                        <CommonFormInput
                          name="employee_code"
                          label="Employee Code"
                          touched={touched}
                          errors={errors}
                          required
                        />
                      </div>
                      <div className="col-md-4">
                        <CommonFormInput
                          name="payroll_company_id"
                          label="Payroll Company"
                          type="select"
                          options={hospitalityCompanies}
                          touched={touched}
                          errors={errors}
                          values={values.payroll_company_id}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Security */}
                <div className={styles.createSection}>
                  <div className={styles.createSectionTitle}>Security</div>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <CommonFormInput
                        name="password"
                        label="Password"
                        type="password"
                        touched={touched}
                        errors={errors}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <CommonFormInput
                        name="confirmPassword"
                        label="Confirm Password"
                        type="password"
                        touched={touched}
                        errors={errors}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Company & Business Unit Access (Hospitality only) */}
                {isHospitality && (
                  <div className={styles.createSection}>
                    <div className={styles.createSectionTitle}>Company & Business Unit Access</div>
                    <InlineAccessManager
                      hospitalityCompanies={hospitalityCompaniesRaw}
                      hotelsByCompany={hotelsByCompany}
                      pendingMappings={pendingMappings}
                      onAddMapping={(mapping) => setPendingMappings((prev) => [...prev, mapping])}
                      onRemoveMapping={(index) => setPendingMappings((prev) => prev.filter((_, i) => i !== index))}
                      onLoadHotels={loadCompanyHotels}
                    />
                  </div>
                )}

                {/* Workflow Roles & Permissions (Hospitality only) */}
                {isHospitality && (
                  <div className={styles.createSection}>
                    <div className={styles.createSectionTitle}>Workflow Roles & Permissions</div>
                    <RoleScopeSelector
                      onAddRole={(scope) => setPendingRoleScopes((prev) => [...prev, scope])}
                      existingRoles={pendingRoleScopes}
                      onRemoveRole={(index) =>
                        setPendingRoleScopes((prev) => prev.filter((_, i) => i !== index))
                      }
                      isEditMode={false}
                      externalMappings={pendingMappings}
                      userDepartments={values.department_id}
                    />
                  </div>
                )}
              </div>

              <div className={styles.createFooter}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={() =>
                    router.push("/dashboard/admin/account-management/manage-accounts")
                  }
                  disabled={isSubmitting || loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.submitBtn}
                  disabled={isSubmitting || loading}
                >
                  {loading ? "Creating..." : "Create Account"}
                </button>
              </div>
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );
};

export default CreateAccountPage;
