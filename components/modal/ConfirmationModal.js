import React, { useEffect, useState } from 'react';
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
    showCloseButton = false,
    customFooter = null,
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

    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setIsProcessing(false);
        }
    }, [isOpen]);

    const handleConfirmClick = async () => {
        if (isProcessing) return;
        setIsProcessing(true);
        try {
            await onConfirm?.();
        } finally {
            setIsProcessing(false);
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
                shouldCloseOnOverlayClick={!isProcessing}
                shouldCloseOnEsc={!isProcessing}
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
                            id="close_confirmation_modal-modal_header-confirmation_modal"
                            disabled={isProcessing}
                    ></button>
                    </div>
                )}

                <div className="modal-body text-center p-2">
                    <div className='p-2 d-flex flex-column' style={{ minHeight: '200px' }}>
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

                        {customFooter}

                        {/* Buttons */}
                        <div className='d-flex flex-wrap justify-content-center gap-3 mt-4'>
                            <button 
                                onClick={onClose} 
                                className="btn btn-outline-secondary p-2"
                                id="cancel_confirmation_modal-modal_body-confirmation_modal"
                                disabled={isProcessing}
                            >
                                {cancelButtonText}
                            </button>
                            <button 
                                onClick={handleConfirmClick} 
                                className={`btn ${getButtonClass(confirmButtonColor)} p-2`}
                                id="confirm_confirmation_modal-modal_body-confirmation_modal"
                                disabled={isProcessing}
                            >
                                {isProcessing && (
                                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                )}
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