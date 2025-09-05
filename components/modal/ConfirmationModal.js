import React from 'react';
import Modal from "react-modal";

const ConfirmationModal = ({
    isOpen,
    onClose,
    onConfirm,
    title = "Confirm Action",
    description = "Are you sure you want to proceed with this action?",
    confirmButtonColor = "danger",
    confirmButtonText = "Confirm",
    cancelButtonText = "Cancel",
    showCloseButton = false
}) => {
    const getButtonClass = (color) => {
        switch (color) {
            case 'danger':
                return 'btn-danger';
            case 'warning':
                return 'btn-warning';
            case 'success':
                return 'btn-success';
            case 'info':
                return 'btn-info';
            case 'primary':
                return 'btn-primary';
            case 'secondary':
                return 'btn-secondary';
            default:
                return 'btn-danger';
        }
    };

    return (
        <div className=''>
            <Modal
                isOpen={isOpen}
                onRequestClose={onClose}
                ariaHideApp={false}
                contentLabel="Confirmation Modal"
                className="contact-modal contact-modal-new"
                style={{
                    overlay: {
                        backgroundColor: "rgba(0, 0, 0, 0.75)",
                        zIndex: 9999
                    },
                    content: {
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        maxWidth: "500px",
                        width: "90%",
                        border: "none",
                        background: "transparent",
                        overflow: "hidden",
                        padding: "20px",
                        maxHeight: "100vh",
                        height: "auto",
                        alignContent: 'center'
                    },
                }}
            >

                {showCloseButton && (
                    <div className="modal-header border-0 pb-0">
                        <button
                            onClick={onClose}
                            className="btn-close"
                            aria-label="Close"
                        ></button>
                    </div>
                )}

                <div className="modal-body text-center">
                    <div className='p-4 d-flex flex-column' style={{ minHeight: '200px' }}>
                        {/* Title */}
                        <div className="mb-4">
                            <h4 className='fw-bold'>{title}</h4>
                        </div>
                        
                        {/* Description */}
                        <div className="flex-grow-1 d-flex align-items-center justify-content-center">
                            <p 
                                className='text-muted' 
                                style={{ fontSize: '16px', lineHeight: '1.5' }}
                                dangerouslySetInnerHTML={{ 
                                    __html: description.replace(/\\n/g, '<br />') 
                                }}
                            />
                        </div>

                        {/* Buttons */}
                        <div className='d-flex justify-content-center gap-3 mt-4'>
                            <button 
                                onClick={onClose} 
                                className="btn btn-outline-secondary px-4 py-2"
                                style={{ minWidth: '100px' }}
                            >
                                {cancelButtonText}
                            </button>
                            <button 
                                onClick={onConfirm} 
                                className={`btn ${getButtonClass(confirmButtonColor)} px-4 py-2`}
                                style={{ minWidth: '100px' }}
                            >
                                {confirmButtonText}
                            </button>
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default ConfirmationModal; 