import React, { useState, useEffect } from 'react';
import Modal from 'react-modal';
import { Field, Form, Formik } from 'formik';
import Select from 'react-select';
import FullLoader from '@/components/shared/FullLoader';
import { editAccountSchema } from '@/utils/schema';
import { toast } from 'react-toastify';
import { addTeamMember, removeTeamMember } from '@/services/project';
import { getCountryCodes } from '@/services/cms';

const EditAccountModal = ({ account, isOpen, closeModal, roleOptions, projectOptions, onSave }) => {
    // Grouped states to reduce individual state declarations
    const [modalState, setModalState] = useState({
        loading: false,
        countryCodes: []
    });
    
    // Check if projectOptions are loading
    const isProjectsLoading = projectOptions.length === 0;

    // Parse mobile number to extract country code and number
    const parseMobile = (mobile) => {
        if (!mobile) return { countryCode: "+91", mobileNumber: "" };
        
        const parts = mobile.split('-');
        if (parts.length === 2) {
            return { countryCode: parts[0], mobileNumber: parts[1] };
        }
        return { countryCode: "+91", mobileNumber: mobile };
    };

    const { countryCode, mobileNumber } = parseMobile(account.mobile);

    // Initial form values
    const initialValues = {
        id: account.id,
        name: account.name,
        email: account.email,
        mobile: mobileNumber,
        countryCode: countryCode,
        role: roleOptions.find(r => r.value === account.role),
        projects: isProjectsLoading ? [] : projectOptions.filter(p => account.projects.includes(p.value)),
        status: account.status
    };

    // Handle form submission
    const handleSubmit = async (values, { setSubmitting }) => {
        setModalState(prev => ({ ...prev, loading: true }));

        try {
            // Format mobile with country code
            const formattedMobile = `${values.countryCode}-${values.mobile}`;
            
            // Convert form values to the expected format
            const formattedValues = {
                ...values,
                mobile: formattedMobile,
                role: values.role.value,
                projects: values.projects.map(p => p.value)
            };

            // Get project IDs that need to be added/removed
            const originalProjectIds = account.projects || [];
            const newProjectIds = formattedValues.projects;
            
            const projectsToAdd = newProjectIds.filter(id => !originalProjectIds.includes(id));
            const projectsToRemove = originalProjectIds.filter(id => !newProjectIds.includes(id));
            
            // Handle project assignment updates
            const projectPromises = [];
            
            // Add user to new projects
            projectsToAdd.forEach(projectId => {
                projectPromises.push(
                    addTeamMember(projectId, {
                        user_id: account.id,
                        role: formattedValues.role
                    })
                );
            });
            
            // Remove user from projects
            projectsToRemove.forEach(projectId => {
                projectPromises.push(removeTeamMember(projectId, account.id));
            });
            
            // Wait for all project operations to complete
            if (projectPromises.length > 0) {
                await Promise.all(projectPromises);
            }
            
            // Call the parent onSave to update user details
            onSave(formattedValues);
            toast.success("Account updated successfully!");
        } catch (error) {
            toast.error("Failed to update account. Please try again.");
        } finally {
            setModalState(prev => ({ ...prev, loading: false }));
            setSubmitting(false);
        }
    };

    // Fetch country codes when modal opens
    useEffect(() => {
        if (isOpen) {
            const fetchCountryCodes = async () => {
                try {
                    const response = await getCountryCodes();
                    if (response?.data) {
                        setModalState(prev => ({
                            ...prev,
                            countryCodes: response.data
                        }));
                    }
                } catch (error) {
                    console.error("Error fetching country codes:", error);
                }
            };
            
            fetchCountryCodes();
        }
        }, [isOpen]);

    return (
        <Modal
            isOpen={isOpen}
            onRequestClose={closeModal}
            ariaHideApp={false}
            contentLabel="Edit Account Modal"
            className="modal-dialog modal-dialog-centered"
            style={{
                overlay: {
                    backgroundColor: "rgba(0, 0, 0, 0.75)",
                    zIndex: 1050,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                },
                content: {
                    position: "relative",
                    top: "auto",
                    left: "auto",
                    right: "auto",
                    bottom: "auto",
                    border: "none",
                    background: "transparent",
                    overflow: "visible",
                    padding: 0,
                    borderRadius: 0,
                    maxWidth: "650px",
                    width: "100%",
                    margin: "0 auto"
                },
            }}
        >
            <div className="modal-content">
                <div className="modal-header border-bottom">
                    <h5 className="modal-title">Edit Account</h5>
                    <button
                        type="button"
                        className="btn-close"
                        onClick={closeModal}
                        aria-label="Close"
                    ></button>
                </div>

                <div className="modal-body p-3 hasFullLoader">
                    {modalState.loading && <FullLoader />}

                    <Formik
                        initialValues={initialValues}
                        validationSchema={editAccountSchema}
                        onSubmit={handleSubmit}
                    >
                        {({ errors, touched, values, setFieldValue, isSubmitting }) => (
                            <Form>
                                <div className="mb-3">
                                    <label htmlFor="name" className="form-label">Name <span className="text-danger">*</span></label>
                                    <Field
                                        type="text"
                                        id="name"
                                        name="name"
                                        className={`form-control ${touched.name && errors.name ? 'is-invalid' : ''}`}
                                    />
                                    {touched.name && errors.name && (
                                        <div className="invalid-feedback">{errors.name}</div>
                                    )}
                                </div>

                                <div className="row mb-3">
                                    <div className="col-md-6">
                                        <label htmlFor="email" className="form-label">Email <span className="text-danger">*</span></label>
                                        <Field
                                            type="email"
                                            id="email"
                                            name="email"
                                            className={`form-control ${touched.email && errors.email ? 'is-invalid' : ''}`}
                                        />
                                        {touched.email && errors.email && (
                                            <div className="invalid-feedback">{errors.email}</div>
                                        )}
                                    </div>
                                    <div className="col-md-6">
                                        <label htmlFor="mobile" className="form-label">Mobile <span className="text-danger">*</span></label>
                                        <div className="d-flex">
                                            {/*START: Country Code Selector */}
                                            <Field name="countryCode">
                                                {({ field, form }) => (
                                                    <select
                                                        {...field}
                                                        className="form-select me-2"
                                                        style={{ maxWidth: "120px" }}
                                                        onChange={(e) => {
                                                            form.setFieldValue("countryCode", e.target.value);
                                                        }}
                                                    >
                                                        {modalState.countryCodes.map((country) => (
                                                            <option key={country.id} value={country.phone_code}>
                                                                {country.country_code} ({country.phone_code})
                                                            </option>
                                                        ))}
                                                    </select>
                                                )}
                                            </Field>
                                            {/*END: Country Code Selector */}
                                            
                                            <Field
                                                type="text"
                                                id="mobile"
                                                name="mobile"
                                                placeholder="Enter mobile number"
                                                className={`form-control ${touched.mobile && errors.mobile ? 'is-invalid' : ''}`}
                                            />
                                        </div>
                                        {touched.mobile && errors.mobile && (
                                            <div className="invalid-feedback">{errors.mobile}</div>
                                        )}
                                    </div>
                                </div>

                                <div className="row mb-3">
                                    <div className="col-md-6">
                                        <label htmlFor="role" className="form-label">Role <span className="text-danger">*</span></label>
                                        <Select
                                            id="role"
                                            name="role"
                                            options={roleOptions}
                                            value={values.role}
                                            onChange={(option) => setFieldValue('role', option)}
                                            styles={{
                                                option: (provided, state) => ({
                                                    ...provided,
                                                    color: state.data.color,
                                                    fontWeight: 'bold'
                                                })
                                            }}
                                        />
                                    </div>
                                    <div className="col-md-6">
                                        <label htmlFor="status" className="form-label">Status</label>
                                        <Field
                                            as="select"
                                            id="status"
                                            name="status"
                                            className="form-select"
                                        >
                                            <option value="active">Active</option>
                                            <option value="inactive">Inactive</option>
                                        </Field>
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <label htmlFor="projects" className="form-label">Assigned Projects</label>
                                    <Select
                                        id="projects"
                                        name="projects"
                                        options={projectOptions}
                                        value={values.projects}
                                        onChange={(options) => setFieldValue('projects', options)}
                                        isMulti
                                        isLoading={isProjectsLoading}
                                        placeholder={isProjectsLoading ? "Loading projects..." : "Select projects to assign"}
                                    />
                                </div>

                                <div className="modal-footer p-0 pt-3 border-top-0 d-flex justify-content-between">
                                    <button
                                        type="button"
                                        className="btn btn-outline-secondary"
                                        onClick={closeModal}
                                        disabled={isSubmitting}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                        disabled={isSubmitting}
                                    >
                                        Save Changes
                                    </button>
                                </div>
                            </Form>
                        )}
                    </Formik>
                </div>
            </div>
        </Modal>
    );
};

export default EditAccountModal;
