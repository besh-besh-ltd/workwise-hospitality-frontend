import React, { useState, useEffect } from 'react';
import Modal from 'react-modal';
import { Field, Form, Formik } from 'formik';
import Select from 'react-select';
import FullLoader from '@/components/shared/FullLoader';
import { addTeamMemberSchema } from '@/utils/schema';
import { toast } from 'react-toastify';
import { getCompanyUsers } from '@/services/Auth';

const AddTeamMemberModal = ({ isOpen, closeModal, onSave, roleOptions }) => {
    const [loading, setLoading] = useState(false);
    const [users, setUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(false);

    // Fetch users from API
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                setLoadingUsers(true);
                // Using the actual API instead of mock data
                const response = await getCompanyUsers();
                
                if (response.status) {
                    const formattedUsers = response.data.map(user => ({
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        role: user.role,
                        status: user.status
                    }));
                    
                    // Only show active users
                    const activeUsers = formattedUsers.filter(user => user.status === 'active');
                    setUsers(activeUsers);
                } else {
                    console.error(`[${new Date().toISOString()}] AddTeamMemberModal: Failed to fetch users - API returned error status`);
                    toast.error("Failed to fetch users");
                    setUsers([]);
                }
            } catch (error) {
                console.error(`[${new Date().toISOString()}] AddTeamMemberModal: Error fetching users:`, error);
                toast.error("Failed to fetch users");
                setUsers([]);
            } finally {
                setLoadingUsers(false);
            }
        };
        
        if (isOpen) {
            fetchUsers();
        }
    }, [isOpen]);

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

        // Format the data for the API
        const teamMember = {
            user_id: values.user.value,
            role: parseInt(values.user.role) // Ensure role is a number
        };


        // Call the actual API through the parent component
        onSave(teamMember)
            .then((response) => {
                resetForm();
                setLoading(false);
                setSubmitting(false);
            })
            .catch((error) => {
                console.error(`[${new Date().toISOString()}] AddTeamMemberModal: Error adding team member:`, error);
                
                // Try to extract a meaningful error message
                let errorMessage = "Failed to add team member";
                if (error.response?.data?.message) {
                    errorMessage = error.response.data.message;
                } else if (error.message?.response?.data?.message) {
                    errorMessage = error.message.response.data.message;
                }
                
                toast.error(errorMessage);
                setLoading(false);
                setSubmitting(false);
            });
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
                    {loadingUsers && <FullLoader />}

                    <Formik
                        initialValues={initialValues}
                        validationSchema={addTeamMemberSchema}
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
                                        isLoading={loadingUsers}
                                        placeholder={loadingUsers ? "Loading users..." : "Select a user"}
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
