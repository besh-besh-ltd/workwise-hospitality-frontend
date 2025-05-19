import React, { useState } from 'react';
import Modal from 'react-modal';
import { Field, Form, Formik } from 'formik';
import * as Yup from 'yup';
import Select from 'react-select';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClose } from '@fortawesome/free-solid-svg-icons';
import FullLoader from '@/components/shared/FullLoader';

const EditAccountModal = ({ account, isOpen, closeModal, roleOptions, projectOptions, onSave }) => {
    const [loading, setLoading] = useState(false);

    // Validation schema
    const validationSchema = Yup.object().shape({
        name: Yup.string().required('Name is required'),
        email: Yup.string().email('Invalid email').required('Email is required'),
        mobile: Yup.string().required('Mobile number is required'),
    });

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
            className="contact-modal contact-modal-new"
            style={{
                overlay: {
                    backgroundColor: "rgba(0, 0, 0, 0.75)",
                },
                content: {
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: "50vw",
                    maxWidth: "600px",
                    maxHeight: "90vh",
                    border: "none",
                    background: "#fff",
                    overflow: "auto",
                    padding: "20px",
                    borderRadius: "8px",
                },
            }}
        >
            <div className="modal-header d-flex justify-content-between align-items-center mb-3">
                <h3 className="m-0">Edit Account</h3>
                <button
                    onClick={closeModal}
                    className="btn-close"
                    aria-label="Close"
                ></button>
            </div>
            
            <div className="modal-body hasFullLoader">
                {loading && <FullLoader />}
                
                <Formik
                    initialValues={initialValues}
                    validationSchema={validationSchema}
                    onSubmit={handleSubmit}
                >
                    {({ errors, touched, values, setFieldValue, isSubmitting }) => (
                        <Form>
                            <div className="row mb-3">
                                <div className="col-md-12">
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

                            <div className="row mb-4">
                                <div className="col-md-12">
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
                            </div>

                            <div className="d-flex justify-content-end">
                                <button
                                    type="button"
                                    className="btn btn-outline-secondary me-2"
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
        </Modal>
    );
};

export default EditAccountModal;
