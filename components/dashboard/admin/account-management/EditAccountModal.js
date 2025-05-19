import React, { useState } from 'react';
import Modal from 'react-modal';
import { Field, Form, Formik } from 'formik';
import Select from 'react-select';
import FullLoader from '@/components/shared/FullLoader';
import { editAccountSchema } from '@/utils/schema';

const EditAccountModal = ({ account, isOpen, closeModal, roleOptions, projectOptions, onSave }) => {
    const [loading, setLoading] = useState(false);

    // Initial form values
    const initialValues = {
        id: account.id,
        name: account.name,
        email: account.email,
        mobile: account.mobile,
        role: roleOptions.find(r => r.value === account.role),
        projects: projectOptions.filter(p => account.projects.includes(p.value)),
        status: account.status
    };

    // Handle form submission
    const handleSubmit = (values, { setSubmitting }) => {
        setLoading(true);

        // Convert form values to the expected format
        const formattedValues = {
            ...values,
            role: values.role.value,
            projects: values.projects.map(p => p.value)
        };

        // Simulate API call
        setTimeout(() => {
            onSave(formattedValues);
            setLoading(false);
            setSubmitting(false);
        }, 500);
    };

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
                    {loading && <FullLoader />}

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
                                        <Field
                                            type="text"
                                            id="mobile"
                                            name="mobile"
                                            className={`form-control ${touched.mobile && errors.mobile ? 'is-invalid' : ''}`}
                                        />
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
