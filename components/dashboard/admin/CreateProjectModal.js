import React, { useState } from 'react';
import Modal from 'react-modal';
import { Field, Form, Formik } from 'formik';
import * as Yup from 'yup';
import Select from 'react-select';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import FullLoader from '@/components/shared/FullLoader';

const CreateProjectModal = ({ isOpen, closeModal, onSave }) => {
    const [loading, setLoading] = useState(false);

    // Validation schema
    const validationSchema = Yup.object().shape({
        name: Yup.string().required('Project name is required'),
        description: Yup.string().required('Project description is required'),
        location: Yup.string().required('Location is required'),
    });

    // Initial form values
    const initialValues = {
        name: '',
        description: '',
        location: '',
        rfq_type: '',
        reverse_auction: 0,
        ended_at: ''
    };

    // RFQ type options
    const rfqTypeOptions = [
        { value: 'budgetary', label: 'Budgetary' },
        { value: 'firm', label: 'Firm' }
    ];

    // Reverse auction options
    const reverseAuctionOptions = [
        { value: 1, label: 'Enabled' },
        { value: 0, label: 'Disabled' }
    ];

    // Handle form submission
    const handleSubmit = (values, { setSubmitting, resetForm }) => {
        setLoading(true);

        // Simulate API call
        setTimeout(() => {
            onSave(values);
            setLoading(false);
            setSubmitting(false);
            resetForm();
            closeModal();
        }, 500);
    };

    return (
        <Modal
            isOpen={isOpen}
            onRequestClose={closeModal}
            ariaHideApp={false}
            contentLabel="Create Project Modal"
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
                    <h5 className="modal-title">Create New Project</h5>
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
                        validationSchema={validationSchema}
                        onSubmit={handleSubmit}
                    >
                        {({ errors, touched, values, setFieldValue, isSubmitting }) => (
                            <Form>
                                <div className="mb-3">
                                    <label htmlFor="name" className="form-label">Project Name <span className="text-danger">*</span></label>
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

                                <div className="mb-3">
                                    <label htmlFor="description" className="form-label">Description <span className="text-danger">*</span></label>
                                    <Field
                                        as="textarea"
                                        id="description"
                                        name="description"
                                        className={`form-control ${touched.description && errors.description ? 'is-invalid' : ''}`}
                                        rows="4"
                                    />
                                    {touched.description && errors.description && (
                                        <div className="invalid-feedback">{errors.description}</div>
                                    )}
                                </div>

                                <div className="mb-3">
                                    <label htmlFor="location" className="form-label">Location <span className="text-danger">*</span></label>
                                    <Field
                                        type="text"
                                        id="location"
                                        name="location"
                                        className={`form-control ${touched.location && errors.location ? 'is-invalid' : ''}`}
                                    />
                                    {touched.location && errors.location && (
                                        <div className="invalid-feedback">{errors.location}</div>
                                    )}
                                </div>

                                <div className="row mb-3">
                                    <div className="col-md-6">
                                        <label htmlFor="rfq_type" className="form-label">RFQ Type</label>
                                        <Select
                                            id="rfq_type"
                                            name="rfq_type"
                                            options={rfqTypeOptions}
                                            value={rfqTypeOptions.find(option => option.value === values.rfq_type) || null}
                                            onChange={(option) => setFieldValue('rfq_type', option ? option.value : '')}
                                            placeholder="Select..."
                                            classNamePrefix="react-select"
                                        />
                                    </div>
                                    <div className="col-md-6">
                                        <label htmlFor="reverse_auction" className="form-label">Reverse Auction</label>
                                        <Select
                                            id="reverse_auction"
                                            name="reverse_auction"
                                            options={reverseAuctionOptions}
                                            value={reverseAuctionOptions.find(option => option.value === values.reverse_auction) || null}
                                            onChange={(option) => setFieldValue('reverse_auction', option ? option.value : 0)}
                                            placeholder="Disabled"
                                            classNamePrefix="react-select"
                                        />
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <label htmlFor="ended_at" className="form-label">End Date</label>
                                    <div className="input-group">
                                        <Field
                                            type="date"
                                            id="ended_at"
                                            name="ended_at"
                                            className="form-control"
                                            placeholder="mm/dd/yyyy"
                                        />
                                        <span className="input-group-text">
                                            <i className="calendar-icon"></i>
                                        </span>
                                    </div>
                                    <small className="form-text text-muted">
                                        Optional: Set an end date for the project
                                    </small>
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
                                        Create Project
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

export default CreateProjectModal;
