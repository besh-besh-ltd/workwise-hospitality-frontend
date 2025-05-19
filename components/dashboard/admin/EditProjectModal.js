import React, { useState, useEffect } from 'react';
import Modal from 'react-modal';
import { Field, Form, Formik } from 'formik';
import * as Yup from 'yup';
import Select from 'react-select';
import FullLoader from '@/components/shared/FullLoader';

const EditProjectModal = ({ project, isOpen, closeModal, onSave }) => {
    const [loading, setLoading] = useState(false);
    const [teamMembers, setTeamMembers] = useState([]);
    const [selectedTeamMembers, setSelectedTeamMembers] = useState([]);

    // Validation schema
    const validationSchema = Yup.object().shape({
        name: Yup.string().required('Project name is required'),
        description: Yup.string().required('Project description is required'),
        location: Yup.string().required('Location is required'),
    });

    // Role options with color coding
    const roleOptions = [
        { value: 8, label: "Top Management", color: "#2E5BA8" },
        { value: 2, label: "Procurement", color: "#428B41" },
        { value: 9, label: "Engineering", color: "#FFE600" },
        { value: 10, label: "Finance", color: "#5b5b5b" },
    ];

    // Initial form values
    const initialValues = {
        id: project.id,
        name: project.name,
        description: project.description,
        location: project.location,
        rfq_type: project.rfq_type,
        reverse_auction: project.reverse_auction,
        ended_at: project.ended_at ? new Date(project.ended_at).toISOString().split('T')[0] : '',
        team_members: selectedTeamMembers
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

    // Load team members
    useEffect(() => {
        // Simulate API call to get team members
        setTimeout(() => {
            const mockTeamMembers = [
                { value: 1, label: "John Doe (Top Management)", role: 8 },
                { value: 2, label: "Jane Smith (Procurement)", role: 2 },
                { value: 3, label: "Mike Johnson (Engineering)", role: 9 },
                { value: 4, label: "Sarah Williams (Finance)", role: 10 },
                { value: 5, label: "Robert Brown (Top Management)", role: 8 },
                { value: 6, label: "Emily Davis (Procurement)", role: 2 },
                { value: 7, label: "David Wilson (Engineering)", role: 9 },
                { value: 8, label: "Lisa Miller (Finance)", role: 10 }
            ];

            setTeamMembers(mockTeamMembers);

            // Set selected team members based on project data
            // In a real app, this would come from the project data
            const projectTeamMembers = project.team_members || [1, 3, 5];
            const selectedMembers = mockTeamMembers.filter(member =>
                projectTeamMembers.includes(member.value)
            );
            setSelectedTeamMembers(selectedMembers);
        }, 300);
    }, [project.id]);

    // Handle form submission
    const handleSubmit = (values, { setSubmitting }) => {
        setLoading(true);

        // Format team members for API
        const formattedValues = {
            ...values,
            team_members: values.team_members.map(member => member.value)
        };

        // Simulate API call
        setTimeout(() => {
            onSave(formattedValues);
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
                        validationSchema={validationSchema}
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

                                <div className="mb-4">
                                    <label htmlFor="team_members" className="form-label">Assign Teams</label>
                                    <Select
                                        id="team_members"
                                        name="team_members"
                                        options={teamMembers}
                                        value={values.team_members}
                                        onChange={(selectedOptions) => setFieldValue('team_members', selectedOptions || [])}
                                        isMulti
                                        placeholder="Select team members..."
                                        classNamePrefix="react-select"
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

export default EditProjectModal;
