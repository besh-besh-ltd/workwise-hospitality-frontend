import React, { useState, useEffect, useRef, useCallback } from "react";
import Modal from "react-modal";
import { Formik, Form } from "formik";
import { HiX, HiExclamationCircle } from "react-icons/hi";
import { dynamicAccountEditSchema } from "@/utils/schema";
import { getDepartments } from "@/services/rbac";
import { sendLog, SeverityNumber } from "@/lib/otel";
import CommonFormInput from "@/components/shared/CommonFormInput";
import RoleScopeSelector from "@/components/hospitality/RoleScopeSelector";
import { dedupeHospitalityMappings } from "./accessUtils";
import styles from "./ManageAccounts.module.scss";

/**
 * Report a modal prefetch failure to OpenTelemetry (lib/otel.js) instead of
 * swallowing it. An empty option list that is really a failed request is how
 * an admin ends up saving a form that erases data.
 */
const reportModalLoadFailure = (raw, source) => {
  try {
    const err = raw?.message && typeof raw.message === "object" ? raw.message : raw;
    sendLog({
      severityNumber: SeverityNumber.ERROR,
      severityText: "ERROR",
      body: err?.message || `Edit account modal prefetch failed (${source})`,
      attributes: {
        "error.type": err?.name || "EditAccountModalPrefetchError",
        "error.message": err?.message || String(err ?? ""),
        "http.response.status_code": err?.response?.status ?? 0,
        "browser.url": typeof window !== "undefined" ? window.location.href : "",
        "log.source": source,
      },
    });
  } catch (_) {
    /* telemetry must never break the flow */
  }
};

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

const EditAccountModal = ({
  isOpen,
  onClose,
  account,
  isHospitality,
  roleOptions,
  initialRoleScopes,
  userDepartments,
  userMappings,
  // "idle" | "loading" | "ready" | "error" — the parent's prefetch of role
  // scopes / departments / mappings. Saving before it reaches "ready" would
  // submit empty arrays, which the API reads as "delete every grant".
  dataStatus = "ready",
  onRetryLoad,
  onSave,
  isSaving = false,
}) => {
  const [roleScopes, setRoleScopes] = useState([]);
  const [departments, setDepartments] = useState([]);
  // The department *options* list is fetched here; a failure must not read as
  // "this user has no departments to pick from".
  const [departmentsError, setDepartmentsError] = useState(false);
  const pendingScopeRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setRoleScopes(initialRoleScopes || []);
    }
  }, [isOpen, initialRoleScopes]);

  const loadDepartmentOptions = useCallback(() => {
    setDepartmentsError(false);
    getDepartments()
      .then((res) => {
        const depts = (res?.data?.data || res?.data || []).map((d) => ({
          value: d.id,
          label: d.title,
        }));
        setDepartments(depts);
      })
      .catch((err) => {
        reportModalLoadFailure(err, "getDepartments");
        setDepartments([]);
        setDepartmentsError(true);
      });
  }, []);

  useEffect(() => {
    if (isOpen) loadDepartmentOptions();
  }, [isOpen, loadDepartmentOptions]);

  const isLoadingData = dataStatus === "idle" || dataStatus === "loading";
  const hasLoadError = dataStatus === "error" || departmentsError;
  const canSubmit = !isLoadingData && !hasLoadError;

  const handleRetry = () => {
    if (departmentsError) loadDepartmentOptions();
    if (dataStatus === "error" && onRetryLoad) onRetryLoad();
  };

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
    // Belt-and-braces: the submit button is disabled until the prefetch lands,
    // but Formik can also be submitted via Enter.
    if (!canSubmit) return;

    const formattedMobile = `${values.countryCode}-${values.mobile}`;
    let statusVal;
    if (typeof values.status === "object" && values.status !== null) {
      statusVal = values.status.value === "active" ? 1 : 0;
    } else if (typeof values.status === "string") {
      statusVal = values.status === "active" ? 1 : 0;
    } else {
      statusVal = 1;
    }

    // Auto-add pending role scope if the user filled the form but didn't click Add
    let finalRoleScopes = [...(roleScopes || [])];
    const pending = pendingScopeRef.current;
    if (pending && pending.role_id && pending.company_id) {
      const isDuplicate = finalRoleScopes.some(
        (r) =>
          r.role_id === pending.role_id &&
          r.company_id === pending.company_id &&
          (r.hotel_id || null) === (pending.hotel_id || null) &&
          (r.department_id || null) === (pending.department_id || null)
      );
      if (!isDuplicate) {
        finalRoleScopes.push(pending);
      }
    }

    let departmentIds = [];
    if (values.department_id && Array.isArray(values.department_id)) {
      departmentIds = values.department_id.map((dept) =>
        typeof dept === "object" ? dept.value : dept
      );
    }

    const roleScopeDeptIds = Array.from(
      new Set(
        finalRoleScopes
          .map((r) => r.department_id)
          .filter((id) => id !== null && id !== undefined)
      )
    );
    departmentIds = Array.from(new Set([...departmentIds, ...roleScopeDeptIds]));

    const filteredRoles = finalRoleScopes.map((role) => ({
      role_id: role.role_id,
      role_title: role.role_title || null,
      company_id: role.company_id || null,
      hotel_id: role.hotel_id || null,
      department_id: role.department_id || null,
      process_id: role.process_id || null,
      permissions: role.permissions || {},
    }));

    const payload = {
      id: values.id,
      name: values.name,
      email: values.email,
      mobile: formattedMobile,
      status: statusVal,
      department_ids: departmentIds,
      employee_type: values.employee_type?.value || null,
      employee_code: values.employee_code || null,
      payroll_company_id: values.payroll_company_id,
    };

    // Only send `roles` when the current list was actually loaded. For a
    // non-hospitality company the selector never renders and the scopes are
    // never fetched — sending `[]` there would tell the API to delete grants
    // this screen never showed anyone.
    if (Array.isArray(initialRoleScopes)) {
      payload.roles = filteredRoles;
    }

    /* An empty list is ambiguous on the wire: it is both "the admin removed
       the last role" and "this form never loaded". The API refuses the second
       reading unless the client vouches for the first. We can only vouch
       because `canSubmit` guarantees the real current state was rendered and
       the admin emptied it themselves. */
    const clearingRoles = Array.isArray(payload.roles)
      && payload.roles.length === 0
      && Array.isArray(initialRoleScopes) && initialRoleScopes.length > 0;
    const clearingDepartments = departmentIds.length === 0
      && Array.isArray(userDepartments) && userDepartments.length > 0;
    if (clearingRoles || clearingDepartments) {
      payload.confirm_clear_all_scopes = true;
    }

    onSave(payload);
  };

  const isAdmin = account.role === 7;

  // While saving, ignore close attempts (overlay click, ESC, X button) so the
  // user can't accidentally bail mid-request and end up in a confused state
  // where the API call lands but the modal is gone.
  const handleRequestClose = () => {
    if (isSaving) return;
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={handleRequestClose}
      shouldCloseOnOverlayClick={!isSaving}
      shouldCloseOnEsc={!isSaving}
      ariaHideApp={false}
      style={modalOverlayStyles}
    >
      <div className={styles.modalHeader}>
        <div>
          <h5 className={styles.modalTitle}>Edit Account</h5>
          <div className={styles.modalSubtitle}>
            Update details for <strong>{account.name}</strong>
          </div>
        </div>
        <button
          type="button"
          className={styles.modalClose}
          onClick={handleRequestClose}
          disabled={isSaving}
        >
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
            {hasLoadError && (
              <div className={styles.modalLoadError} role="alert">
                <HiExclamationCircle size={18} className={styles.modalLoadErrorIcon} />
                <div className={styles.modalLoadErrorText}>
                  <strong>Couldn&apos;t load this account&apos;s roles and departments.</strong>
                  <span>
                    Saving now could remove access this form never showed you, so
                    it&apos;s disabled until the data loads.
                  </span>
                </div>
                <button type="button" className={styles.modalLoadErrorRetry} onClick={handleRetry}>
                  Retry
                </button>
              </div>
            )}

            {isLoadingData && !hasLoadError && (
              <div className={styles.modalLoadingBar} aria-live="polite">
                <span className={styles.miniSpinner} aria-hidden="true" />
                Loading roles and departments…
              </div>
            )}

            {/* Locked while saving AND while the prefetch is unresolved —
                otherwise an admin could edit the role list against stale or
                empty data, only for the arriving fetch to discard the edit. */}
            <div
              className={styles.modalBody}
              style={(isSaving || !canSubmit) ? { pointerEvents: "none", opacity: 0.55, transition: "opacity 0.15s ease" } : { transition: "opacity 0.15s ease" }}
              aria-busy={isSaving || isLoadingData}
            >
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

              {/* Mapped Access Info (Hospitality only) */}
              {isHospitality && (
                <div className={styles.modalSection}>
                  <div className={styles.modalSectionTitle}>Mapped Access</div>
                  <div className={styles.mappedAccessInfo}>
                    <div className={styles.mappedAccessLabel}>Companies & Business Units</div>
                    {(() => {
                      const dedupedMappings = dedupeHospitalityMappings(userMappings || []);
                      if (dedupedMappings.length === 0) {
                        return (
                          <div className={styles.mappedAccessEmpty}>
                            No access assigned yet. Use the "Access" button in the table to manage.
                          </div>
                        );
                      }
                      return (
                        <div className={styles.mappedAccessBadges}>
                          {dedupedMappings.map((mapping) => (
                            <span
                              key={`${mapping.mapping_type}-${mapping.hospitality_hotel_id || "co"}-${mapping.hospitality_company_id}`}
                              className={`${styles.mappingBadge} ${
                                mapping.mapping_type === 0 ? styles.mappingCompany : styles.mappingHotel
                              }`}
                            >
                              {mapping.mapping_type === 0
                                ? mapping.company_name || "Company"
                                : `${mapping.company_name ? mapping.company_name + " → " : ""}${mapping.hotel_name || "BU"}`}
                            </span>
                          ))}
                        </div>
                      );
                    })()}
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
                    onReplaceRole={(index, newScope) =>
                      setRoleScopes((prev) =>
                        prev.map((r, i) => (i === index ? newScope : r))
                      )
                    }
                    isEditMode
                    userDepartments={userDepartments}
                    userId={account.id}
                    pendingScopeRef={pendingScopeRef}
                  />
                </div>
              )}
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={handleRequestClose}
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={styles.submitBtn}
                disabled={!isValid || isSaving || !canSubmit}
                title={
                  hasLoadError
                    ? "Reload this account's roles and departments before saving"
                    : isLoadingData
                      ? "Loading this account's roles and departments…"
                      : undefined
                }
              >
                {(isSaving || isLoadingData) && <span className={styles.submitBtnSpinner} aria-hidden="true" />}
                {isSaving ? "Saving..." : isLoadingData ? "Loading..." : "Update Account"}
              </button>
            </div>
          </Form>
        )}
      </Formik>
    </Modal>
  );
};

export default EditAccountModal;
