import React, { useState } from 'react';
import Modal from 'react-modal';
import { Field, Form, Formik } from 'formik';
import * as Yup from 'yup';
import Select from 'react-select';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClose } from '@fortawesome/free-solid-svg-icons';
import FullLoader from '@/components/shared/FullLoader';

const EditProjectModal = ({ project, isOpen, closeModal, onSave }) => {
    const [loading, setLoading] = useState(false);

    // Validation schema
    const validationSchema = Yup.object().shape({
        name: Yup.string().required('Project name is required'),
        description: Yup.string().required('Project description is required'),
        location: Yup.string().required('Location is required'),
    });

    // Initial form values
    const initialValues = {
        id: project.id,
        name: project.name,
        description: project.description,
        location: project.location,
        rfq_type: project.rfq_type,
        reverse_auction: project.reverse_auction,
        ended_at: project.ended_at ? new Date(project.ended_at).toISOString().split('T')[0] : ''
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
    const handleSubmit = (values, { setSubmitting }) => {
        setLoading(true);
        
        // Simulate API call
        setTimeout(() => {
            onSave(values);
            setLoading(false);
            setSubmitting(false);
            closeModal();
        }, 500);
    };

    return (
        <Modal
            isOpen={isOpen}
            onRequestClose={closeModal}
            ariaHideApp={false}
            contentLabel="Edit Project Modal"
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
                <h3 className="m-0">Edit Project</h3>
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
                            </div>

                            <div className="row mb-3">
                                <div className="col-md-12">
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
                            </div>

                            <div className="row mb-3">
                                <div className="col-md-12">
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
                                        isClearable
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
                                    />
                                </div>
                            </div>

                            <div className="row mb-4">
                                <div className="col-md-6">
                                    <label htmlFor="ended_at" className="form-label">End Date</label>
                                    <Field
                                        type="date"
                                        id="ended_at"
                                        name="ended_at"
                                        className="form-control"
                                    />
                                    <small className="form-text text-muted">
                                        Optional: Set an end date for the project
                                    </small>
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

export default EditProjectModal;
