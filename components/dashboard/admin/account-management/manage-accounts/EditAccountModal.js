import React, { useState, useEffect } from "react";
import Modal from "react-modal";
import { Formik, Form } from "formik";
import { HiX } from "react-icons/hi";
import { dynamicAccountEditSchema } from "@/utils/schema";
import { getDepartments } from "@/services/rbac";
import CommonFormInput from "@/components/shared/CommonFormInput";
import RoleScopeSelector from "@/components/hospitality/RoleScopeSelector";
import styles from "./ManageAccounts.module.css";

const modalOverlayStyles = {
  overlay: {
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    zIndex: 1200,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    position: "relative",
    inset: "auto",
    maxWidth: "1000px",
    width: "95%",
    maxHeight: "92vh",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    borderRadius: "16px",
    padding: "0",
    border: "none",
    boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
  },
};

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

const getEmployeeTypeOption = (raw) => {
  const normalized = normalizeEmployeeType(raw);
  if (!normalized) return null;
  return employeeTypeOptions.find((opt) => opt.value === normalized) || null;
};

const parseMobile = (mobile) => {
  if (!mobile) return { countryCode: "+91", mobileNumber: "" };
  const parts = mobile.split("-");
  if (parts.length === 2) return { countryCode: parts[0], mobileNumber: parts[1] };
  return { countryCode: "+91", mobileNumber: mobile };
};

const dedupeHospitalityMappings = (list = []) => {
  const seen = new Set();
  return list.filter((item) => {
    const key =
      item.mapping_type === 0
        ? `company-${item.hospitality_company_id}-${item.user_id}`
        : `hotel-${item.hospitality_company_id}-${item.hospitality_hotel_id}-${item.user_id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const EditAccountModal = ({
  isOpen,
  onClose,
  account,
  isHospitality,
  roleOptions,
  hospitalityCompanies,
  hotelsByCompany,
  userMappings,
  initialRoleScopes,
  userDepartments,
  onSave,
  onMapUser,
  onRemoveMapping,
  onLoadHotels,
}) => {
  const [roleScopes, setRoleScopes] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [mappingForm, setMappingForm] = useState({
    selectedCompanyId: "",
    mappingLevel: "company",
    hotelId: "",
    autoMapProjects: true,
    submitting: false,
  });

  useEffect(() => {
    if (isOpen) {
      setRoleScopes(initialRoleScopes || []);
      const fallbackCompanyId = hospitalityCompanies?.[0]?.id || "";
      setMappingForm({
        selectedCompanyId: fallbackCompanyId,
        mappingLevel: "company",
        hotelId: "",
        autoMapProjects: true,
        submitting: false,
      });
      if (fallbackCompanyId && onLoadHotels) onLoadHotels(fallbackCompanyId);

      getDepartments()
        .then((res) => {
          const depts = (res?.data?.data || res?.data || []).map((d) => ({
            value: d.id,
            label: d.title,
          }));
          setDepartments(depts);
        })
        .catch(() => setDepartments([]));
    }
  }, [isOpen, initialRoleScopes]);

  if (!account) return null;

  const { countryCode, mobileNumber } = parseMobile(account.mobile);
  const initialDepartmentValues =
    Array.isArray(userDepartments) && userDepartments.length > 0
      ? userDepartments.map((dept) => ({ value: dept.id, label: dept.title }))
      : [];

  const statusIsActive = account.status === "active";
  const statusValue = statusIsActive
    ? { value: "active", label: "Active" }
    : { value: "inactive", label: "Inactive" };

  const initialValues = {
    id: account.id || "",
    name: account.name || "",
    email: account.email || "",
    mobile: mobileNumber || "",
    countryCode: countryCode || "+91",
    role: account.role ? roleOptions?.find((r) => r.value === account.role) : null,
    status: statusValue,
    employee_type: getEmployeeTypeOption(account.employee_type),
    employee_code: account.employee_code || "",
    payroll_company_id: account.payroll_company_id || null,
    department_id: initialDepartmentValues,
  };

  const handleSubmit = (values) => {
    const formattedMobile = `${values.countryCode}-${values.mobile}`;
    let statusVal;
    if (typeof values.status === "object" && values.status !== null) {
      statusVal = values.status.value === "active" ? 1 : 0;
    } else if (typeof values.status === "string") {
      statusVal = values.status === "active" ? 1 : 0;
    } else {
      statusVal = 1;
    }

    let departmentIds = [];
    if (values.department_id && Array.isArray(values.department_id)) {
      departmentIds = values.department_id.map((dept) =>
        typeof dept === "object" ? dept.value : dept
      );
    }

    const roleScopeDeptIds = Array.from(
      new Set(
        (roleScopes || [])
          .map((r) => r.department_id)
          .filter((id) => id !== null && id !== undefined)
      )
    );
    departmentIds = Array.from(new Set([...departmentIds, ...roleScopeDeptIds]));

    const filteredRoles = (roleScopes || []).map((role) => ({
      role_id: role.role_id,
      role_title: role.role_title || null,
      company_id: role.company_id || null,
      hotel_id: role.hotel_id || null,
      department_id: role.department_id || null,
      permissions: role.permissions || {},
    }));

    onSave({
      id: values.id,
      name: values.name,
      email: values.email,
      mobile: formattedMobile,
      status: statusVal,
      roles: filteredRoles,
      department_ids: departmentIds,
      employee_type: values.employee_type?.value || null,
      employee_code: values.employee_code || null,
      payroll_company_id: values.payroll_company_id,
    });
  };

  const handleMapSubmit = async () => {
    if (!mappingForm.selectedCompanyId) return;
    if (mappingForm.mappingLevel === "hotel" && !mappingForm.hotelId) return;
    setMappingForm((prev) => ({ ...prev, submitting: true }));
    try {
      await onMapUser({
        companyId: mappingForm.selectedCompanyId,
        mappingLevel: mappingForm.mappingLevel,
        hotelId: mappingForm.hotelId,
        autoMapProjects: mappingForm.autoMapProjects,
      });
    } finally {
      setMappingForm((prev) => ({ ...prev, submitting: false }));
    }
  };

  const dedupedMappings = dedupeHospitalityMappings(userMappings || []);
  const selectedCompanyHotels = mappingForm.selectedCompanyId
    ? hotelsByCompany?.[mappingForm.selectedCompanyId] || []
    : [];
  const isAdmin = account.role === 7;

  return (
    <Modal isOpen={isOpen} onRequestClose={onClose} ariaHideApp={false} style={modalOverlayStyles}>
      <div className={styles.modalHeader}>
        <div>
          <h5 className={styles.modalTitle}>Edit Account</h5>
          <div className={styles.modalSubtitle}>
            Update details for <strong>{account.name}</strong>
          </div>
        </div>
        <button type="button" className={styles.modalClose} onClick={onClose}>
          <HiX size={16} />
        </button>
      </div>

      <Formik
        initialValues={initialValues}
        validationSchema={dynamicAccountEditSchema}
        enableReinitialize
        onSubmit={handleSubmit}
      >
        {({ errors, touched, values, setFieldValue, isValid }) => (
          <Form className={styles.modalForm}>
            <div className={styles.modalBody}>
              {/* Basic Info */}
              <div className={styles.modalSection}>
                <div className={styles.modalSectionTitle}>Basic Information</div>
                <div className="row g-3">
                  <div className="col-md-6">
                    <CommonFormInput
                      name="name"
                      label="Name"
                      type="text"
                      placeholder="John Doe"
                      touched={touched}
                      errors={errors}
                      values={values.name}
                      onChange={setFieldValue}
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <CommonFormInput
                      name="email"
                      label="Email"
                      type="email"
                      placeholder="john@example.com"
                      touched={touched}
                      errors={errors}
                      values={values.email}
                      onChange={setFieldValue}
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <CommonFormInput
                      name="mobile"
                      label="Mobile"
                      type="mobile"
                      touched={touched}
                      errors={errors}
                      values={values.mobile}
                      onChange={setFieldValue}
                      required
                    />
                  </div>
                  {!isAdmin && (
                    <div className="col-md-6">
                      <CommonFormInput
                        name="status"
                        label="Status"
                        type="select"
                        options={[
                          { value: "active", label: "Active" },
                          { value: "inactive", label: "Inactive" },
                        ]}
                        touched={touched}
                        errors={errors}
                        values={values.status}
                        onChange={setFieldValue}
                        required
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Employment Details (Hospitality only) */}
              {isHospitality && (
                <div className={styles.modalSection}>
                  <div className={styles.modalSectionTitle}>Employment Details</div>
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
                      />
                    </div>
                    <div className="col-md-4">
                      <CommonFormInput
                        name="employee_code"
                        label="Employee Code"
                        touched={touched}
                        errors={errors}
                        values={values.employee_code}
                        onChange={setFieldValue}
                      />
                    </div>
                    <div className="col-md-4">
                      <CommonFormInput
                        name="department_id"
                        label="Department"
                        type="select"
                        isMulti
                        options={departments}
                        touched={touched}
                        errors={errors}
                        values={values.department_id}
                        onChange={setFieldValue}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Department (Non-hospitality) */}
              {!isHospitality && (
                <div className={styles.modalSection}>
                  <div className={styles.modalSectionTitle}>Department</div>
                  <div className="row g-3">
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
                        onChange={setFieldValue}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Hospitality Access */}
              {isHospitality && (
                <div className={styles.modalSection}>
                  <div className={styles.modalSectionTitle}>Company & Business Unit Access</div>

                  {dedupedMappings.length === 0 ? (
                    <p className={styles.formSmallHint}>
                      This user is not mapped to any hospitality scope yet.
                    </p>
                  ) : (
                    <table className={styles.mappingTable}>
                      <thead>
                        <tr>
                          <th>Company</th>
                          <th>Scope</th>
                          <th>Business Unit</th>
                          <th>Auto Map</th>
                          <th style={{ textAlign: "right" }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dedupedMappings.map((mapping) => (
                          <tr key={`${mapping.mapping_type}-${mapping.hospitality_hotel_id || "co"}-${mapping.hospitality_company_id}`}>
                            <td><strong>{mapping.company_name || "N/A"}</strong></td>
                            <td>
                              <span
                                className={`${styles.mappingBadge} ${
                                  mapping.mapping_type === 0 ? styles.mappingCompany : styles.mappingHotel
                                }`}
                              >
                                {mapping.mapping_type === 0 ? "Company" : "Business Unit"}
                              </span>
                            </td>
                            <td>
                              {mapping.mapping_type === 0
                                ? "All Business Units"
                                : mapping.hotel_name || "N/A"}
                            </td>
                            <td>{mapping.auto_map_projects ? "Yes" : "No"}</td>
                            <td style={{ textAlign: "right" }}>
                              <button
                                type="button"
                                className={styles.removeBtn}
                                onClick={() => onRemoveMapping(mapping)}
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {/* Add Mapping Form */}
                  {hospitalityCompanies?.length > 0 && (
                    <div className={styles.mappingForm}>
                      <div className={styles.mappingFormTitle}>Add New Mapping</div>
                      <div className="row g-3">
                        <div className="col-md-4">
                          <label className={styles.formLabel}>Company</label>
                          <select
                            className={styles.formSelect}
                            value={mappingForm.selectedCompanyId}
                            onChange={(e) => {
                              const val = e.target.value;
                              setMappingForm((prev) => ({
                                ...prev,
                                selectedCompanyId: val,
                                hotelId: "",
                              }));
                              if (val && onLoadHotels) onLoadHotels(val);
                            }}
                          >
                            <option value="" disabled>Select Company</option>
                            {hospitalityCompanies.map((company) => (
                              <option key={company.id} value={company.id}>
                                {company.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="col-md-4">
                          <label className={styles.formLabel}>Mapping Level</label>
                          <select
                            className={styles.formSelect}
                            value={mappingForm.mappingLevel}
                            onChange={(e) =>
                              setMappingForm((prev) => ({
                                ...prev,
                                mappingLevel: e.target.value,
                                hotelId: e.target.value === "company" ? "" : prev.hotelId,
                              }))
                            }
                          >
                            <option value="company">Company</option>
                            <option value="hotel">Specific Business Unit</option>
                          </select>
                        </div>
                        {mappingForm.mappingLevel === "hotel" && (
                          <div className="col-md-4">
                            <label className={styles.formLabel}>Business Unit</label>
                            <select
                              className={styles.formSelect}
                              value={mappingForm.hotelId}
                              onChange={(e) =>
                                setMappingForm((prev) => ({ ...prev, hotelId: e.target.value }))
                              }
                            >
                              <option value="">Select Business Unit</option>
                              {selectedCompanyHotels.map((hotel) => (
                                <option key={hotel.id} value={hotel.id}>
                                  {hotel.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                        {/* <div className="col-12">
                          <div className={styles.toggleWrap}>
                            <input
                              type="checkbox"
                              id="autoMapSwitch"
                              checked={Boolean(mappingForm.autoMapProjects)}
                              onChange={(e) =>
                                setMappingForm((prev) => ({
                                  ...prev,
                                  autoMapProjects: e.target.checked,
                                }))
                              }
                              style={{ accentColor: "#2E5BA8", marginTop: "2px" }}
                            />
                            <div>
                              <label htmlFor="autoMapSwitch" className={styles.toggleLabel}>
                                Auto add to active mapped projects
                              </label>
                              <div className={styles.toggleHint}>
                                When enabled, this user will automatically be added to all active projects
                              </div>
                            </div>
                          </div>
                        </div> */}
                        <div className="col-12">
                          <button
                            type="button"
                            className={styles.primaryBtn}
                            disabled={mappingForm.submitting || !mappingForm.selectedCompanyId}
                            onClick={handleMapSubmit}
                            style={{ width: "100%" }}
                          >
                            {mappingForm.submitting ? "Mapping..." : "Map User"}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Workflow Roles */}
              {isHospitality && (
                <div className={styles.modalSection}>
                  <div className={styles.modalSectionTitle}>Workflow Roles & Permissions</div>
                  <RoleScopeSelector
                    onAddRole={(scope) => setRoleScopes((prev) => [...prev, scope])}
                    existingRoles={roleScopes}
                    onRemoveRole={(index) =>
                      setRoleScopes((prev) => prev.filter((_, i) => i !== index))
                    }
                    isEditMode
                    userDepartments={userDepartments}
                    userId={account.id}
                  />
                </div>
              )}
            </div>

            <div className={styles.modalFooter}>
              <button type="button" className={styles.cancelBtn} onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className={styles.submitBtn} disabled={!isValid}>
                Update Account
              </button>
            </div>
          </Form>
        )}
      </Formik>
    </Modal>
  );
};

export default EditAccountModal;
