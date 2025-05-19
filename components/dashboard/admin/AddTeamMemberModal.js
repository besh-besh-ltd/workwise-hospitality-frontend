import React, { useState, useEffect } from 'react';
import Modal from 'react-modal';
import { Field, Form, Formik } from 'formik';
import * as Yup from 'yup';
import Select from 'react-select';
import FullLoader from '@/components/shared/FullLoader';

const AddTeamMemberModal = ({ isOpen, closeModal, onSave, roleOptions }) => {
    const [loading, setLoading] = useState(false);
    const [users, setUsers] = useState([]);

    // Mock users data
    const mockUsers = [
        {
            id: 1,
            name: "John Doe",
            email: "john.doe@example.com",
            role: 8 // Top Management
        },
        {
            id: 2,
            name: "Jane Smith",
            email: "jane.smith@example.com",
            role: 2 // Procurement
        },
        {
            id: 3,
            name: "Robert Johnson",
            email: "robert.johnson@example.com",
            role: 9 // Engineering
        },
        {
            id: 4,
            name: "Emily Davis",
            email: "emily.davis@example.com",
            role: 10 // Finance
        },
        {
            id: 5,
            name: "Michael Wilson",
            email: "michael.wilson@example.com",
            role: 8 // Top Management
        },
        {
            id: 6,
            name: "Sarah Brown",
            email: "sarah.brown@example.com",
            role: 2 // Procurement
        }
    ];

    // Load mock users
    useEffect(() => {
        setUsers(mockUsers);
    }, []);

    // Validation schema
    const validationSchema = Yup.object().shape({
        user: Yup.object().required('User is required'),
    });

    // Initial form values
    const initialValues = {
        user: null,
    };

    // Format user options for select
    const userOptions = users.map(user => ({
        value: user.id,
        label: `${user.name} (${user.email})`,
        email: user.email,
        role: user.role,
        name: user.name
    }));

    // Handle form submission
    const handleSubmit = (values, { setSubmitting, resetForm }) => {
        setLoading(true);

        // Format the data
        const teamMember = {
            id: values.user.value,
            name: values.user.name,
            email: values.user.email,
            role: values.user.role
        };

        // Simulate API call
        setTimeout(() => {
            onSave(teamMember);
            setLoading(false);
            setSubmitting(false);
            resetForm();
            closeModal();
        }, 500);
    };

    // Get role label and color
    const getRoleInfo = (roleId) => {
        const role = roleOptions.find(r => r.value === roleId);
        return role || { label: "Unknown", color: "#000000" };
    };

    return (
        <Modal
            isOpen={isOpen}
            onRequestClose={closeModal}
            ariaHideApp={false}
            contentLabel="Add Team Member Modal"
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
                    maxWidth: "700px",
                    width: "100%",
                    margin: "0 auto"
                },
            }}
        >
            <div className="modal-content">
                <div className="modal-header border-bottom">
                    <h5 className="modal-title">Add Team Member</h5>
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
                                <div className="mb-4">
                                    <label htmlFor="user" className="form-label">Select User <span className="text-danger">*</span></label>
                                    <Select
                                        id="user"
                                        name="user"
                                        options={userOptions}
                                        value={values.user}
                                        onChange={(option) => setFieldValue('user', option)}
                                        className={`${touched.user && errors.user ? 'is-invalid' : ''}`}
                                        styles={{
                                            // Make the menu position fixed to prevent modal scrolling
                                            menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                                            menu: (base) => ({
                                                ...base,
                                                // Allow the dropdown menu to be taller
                                                maxHeight: '200px',
                                            }),
                                            menuList: (base) => ({
                                                ...base,
                                                // Allow the dropdown menu to scroll
                                                maxHeight: '200px',
                                            })
                                        }}
                                        menuPortalTarget={document.body}
                                        menuPosition={'fixed'}
                                    />
                                    {touched.user && errors.user && (
                                        <div className="invalid-feedback d-block">{errors.user}</div>
                                    )}
                                </div>

                                {values.user && (
                                    <div className="mb-4">
                                        <div className="card bg-light">
                                            <div className="card-body">
                                                <h5 className="card-title">User Details</h5>
                                                <div className="d-flex justify-content-between mb-2">
                                                    <span>Name:</span>
                                                    <strong>{values.user.name}</strong>
                                                </div>
                                                <div className="d-flex justify-content-between mb-2">
                                                    <span>Email:</span>
                                                    <strong>{values.user.email}</strong>
                                                </div>
                                                <div className="d-flex justify-content-between align-items-center">
                                                    <span>Role:</span>
                                                    <span
                                                        className="badge"
                                                        style={{
                                                            backgroundColor: getRoleInfo(values.user.role).color,
                                                            color: getRoleInfo(values.user.role).color === "#FFE600" ? "#000" : "#fff",
                                                            padding: "6px 10px"
                                                        }}
                                                    >
                                                        {getRoleInfo(values.user.role).label}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

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
                                        disabled={isSubmitting || !values.user}
                                    >
                                        Add to Team
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

export default AddTeamMemberModal;
