import React, { useState } from 'react';
import Modal from 'react-modal';
import { Field, Form, Formik } from 'formik';
import Select from 'react-select';
import FullLoader from '@/components/shared/FullLoader';
import { editProjectSchema } from '@/utils/schema';

const EditProjectModal = ({ project, isOpen, closeModal, onSave }) => {
    const [loading, setLoading] = useState(false);

    // Format date for input fields
    const formatDateForInput = (dateString) => {
        if (!dateString) return '';
        
        try {
            const date = new Date(dateString);
            return date.toISOString().split('T')[0];
        } catch (e) {
            return '';
        }
    };

    // Initial form values
    const initialValues = {
        id: project.id,
        name: project.name || '',
        description: project.description || '',
        location: project.location || '',
        rfq_type: project.rfq_type || '',
        reverse_auction: project.reverse_auction !== undefined ? project.reverse_auction : 0,
        ended_at: formatDateForInput(project.ended_at),
        status: project.status || 1
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

    // Status options
    const statusOptions = [
        { value: 1, label: 'Active' },
        { value: 0, label: 'Inactive' }
    ];

    // Handle form submission
    const handleSubmit = (values, { setSubmitting }) => {
        setLoading(true);

        const formattedValues = {
            ...values,
            reverse_auction: Number(values.reverse_auction),
            status: Number(values.status)
        };

        onSave(formattedValues);
        setLoading(false);
        setSubmitting(false);
    };

    return (
        <Modal
            isOpen={isOpen}
            onRequestClose={closeModal}
            ariaHideApp={false}
            contentLabel="Edit Project Modal"
            className="modal-dialog modal-dialog-centered modal-lg"
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
                    maxWidth: "900px",
                    width: "100%",
                    margin: "0 auto"
                },
            }}
        >
            <div className="modal-content">
                <div className="modal-header border-bottom">
                    <h5 className="modal-title">Edit Project</h5>
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
                        validationSchema={editProjectSchema}
                        onSubmit={handleSubmit}
                        enableReinitialize={true}
                    >
                        {({ errors, touched, values, setFieldValue, isSubmitting }) => (
                            <Form>
                                <div className="row">
                                    <div className="col-md-6 mb-3">
                                        <label htmlFor="name" className="form-label">Project Name <span className="text-danger">*</span></label>
                                        <Field
                                            type="text"
                                            id="name"
                                            name="name"
                                            className={`form-control ${touched.name && errors.name ? 'is-invalid' : ''}`}
                                            placeholder="Demo Project Name"
                                            disabled={true} // Project name cannot be changed
                                        />
                                        {touched.name && errors.name && (
                                            <div className="invalid-feedback">{errors.name}</div>
                                        )}
                                    </div>

                                    <div className="col-md-6 mb-3">
                                        <label htmlFor="reverse_auction" className="form-label">Reverse Auction <span className="text-danger">*</span></label>
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

                                <div className="row">
                                    <div className="col-md-6 mb-3">
                                        <label htmlFor="location" className="form-label">Location <span className="text-danger">*</span></label>
                                        <Field
                                            type="text"
                                            id="location"
                                            name="location"
                                            className={`form-control ${touched.location && errors.location ? 'is-invalid' : ''}`}
                                            placeholder="JBR Tech Park, Bengaluru, Karnataka"
                                        />
                                        {touched.location && errors.location && (
                                            <div className="invalid-feedback">{errors.location}</div>
                                        )}
                                    </div>

                                    <div className="col-md-6 mb-3">
                                        <label htmlFor="status" className="form-label">Status <span className="text-danger">*</span></label>
                                        <Select
                                            id="status"
                                            name="status"
                                            options={statusOptions}
                                            value={statusOptions.find(option => option.value === values.status) || null}
                                            onChange={(option) => setFieldValue('status', option ? option.value : 1)}
                                            placeholder="Active"
                                            classNamePrefix="react-select"
                                        />
                                    </div>
                                </div>

                                <div className="row">
                                    <div className="col-md-12 mb-3">
                                        <label htmlFor="description" className="form-label">Project Description <span className="text-danger">*</span></label>
                                        <Field
                                            as="textarea"
                                            id="description"
                                            name="description"
                                            className={`form-control ${touched.description && errors.description ? 'is-invalid' : ''}`}
                                            rows="4"
                                            placeholder="Include details like:
- The scope of work (e.g., fabrication, pipeline installation, civil construction).
- Project timelines and critical milestones.
- Any specific technical requirements or challenges.
- Location of the project or areas it covers."
                                        />
                                        {touched.description && errors.description && (
                                            <div className="invalid-feedback">{errors.description}</div>
                                        )}
                                    </div>
                                </div>

                                <div className="row">
                                    <div className="col-md-6 mb-3">
                                        <label htmlFor="ended_at" className="form-label">Project End Date</label>
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
                                    </div>

                                    <div className="col-md-6 mb-3">
                                        <label htmlFor="rfq_type" className="form-label">Project Stage</label>
                                        <Select
                                            id="rfq_type"
                                            name="rfq_type"
                                            options={rfqTypeOptions}
                                            value={rfqTypeOptions.find(option => option.value === values.rfq_type) || null}
                                            onChange={(option) => setFieldValue('rfq_type', option ? option.value : '')}
                                            placeholder="Select Project Stage"
                                            classNamePrefix="react-select"
                                        />
                                    </div>
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

export default EditProjectModal;
