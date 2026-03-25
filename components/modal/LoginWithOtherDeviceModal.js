import React, { useEffect, useRef } from 'react'
import Modal from "react-bootstrap/Modal";
import { FiMonitor, FiAlertTriangle } from "react-icons/fi";

const LoginWithOtherDeviceModal = ({ show, onHide, handleRetryLogin, loading = false, onCancel }) => {
    const continueBtnRef = useRef(null);

    // Auto-focus the continue button when modal opens so Enter triggers it
    useEffect(() => {
        if (show && continueBtnRef.current) {
            continueBtnRef.current.focus();
        }
    }, [show]);

    const handleContinue = () => {
        handleRetryLogin?.();
    };

    const handleCancel = () => {
        if (loading) return;
        onHide?.();
        onCancel?.();
    };

    return (
        <>
            <style>{`
                .asd-modal .modal-content {
                    border: none;
                    border-radius: 16px;
                    overflow: hidden;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.12);
                    font-family: Poppins, sans-serif;
                }
                .asd-modal .modal-dialog {
                    max-width: 420px;
                }
            `}</style>
            <Modal
                show={show}
                onHide={loading ? undefined : handleCancel}
                centered
                className="asd-modal"
                backdrop="static"
                keyboard={!loading}
            >
                <div style={{ padding: '32px 32px 28px' }}>
                    {/* Icon */}
                    <div style={{
                        width: 64, height: 64, borderRadius: '50%',
                        background: 'rgba(46, 91, 168, 0.08)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 20px',
                    }}>
                        <FiMonitor size={28} color="#2E5BA8" />
                    </div>

                    {/* Title */}
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', textAlign: 'center', margin: '0 0 8px' }}>
                        Active Session Detected
                    </h3>

                    <p style={{ fontSize: '0.84rem', color: '#64748b', textAlign: 'center', lineHeight: 1.6, margin: '0 0 20px' }}>
                        Your account is currently signed in on another device.
                        Would you like to continue here instead?
                    </p>

                    {/* Warning */}
                    <div style={{
                        display: 'flex', alignItems: 'flex-start', gap: 10,
                        padding: '12px 14px', background: '#fffbeb',
                        border: '1px solid #fef3c7', borderLeft: '3px solid #f59e0b',
                        borderRadius: '0 8px 8px 0', marginBottom: 24,
                    }}>
                        <FiAlertTriangle size={16} color="#f59e0b" style={{ flexShrink: 0, marginTop: 1 }} />
                        <span style={{ fontSize: '0.78rem', color: '#92400e', lineHeight: 1.5 }}>
                            Continuing will end your session on the other device. Any unsaved work may be lost.
                        </span>
                    </div>

                    {/* Actions */}
                    <button
                        ref={continueBtnRef}
                        onClick={handleContinue}
                        disabled={loading}
                        id="confirm_device_login-actions-device_modal"
                        style={{
                            width: '100%', padding: '12px', border: 'none', borderRadius: 10,
                            background: loading ? '#9ca3af' : '#2E5BA8',
                            color: '#fff', fontWeight: 600, fontSize: '0.88rem',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                            transition: 'all 0.15s', marginBottom: 10,
                            fontFamily: 'Poppins, sans-serif',
                        }}
                    >
                        {loading ? (
                            <><span className="spinner-border spinner-border-sm" style={{ width: 14, height: 14 }} /> Logging In... Please wait</>
                        ) : 'Continue on This Device'}
                    </button>

                    <button
                        onClick={handleCancel}
                        disabled={loading}
                        id="cancel_device_login-actions-device_modal"
                        style={{
                            width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: 10,
                            background: '#fff', color: '#64748b', fontWeight: 500, fontSize: '0.88rem',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            opacity: loading ? 0.5 : 1,
                            transition: 'all 0.15s',
                            fontFamily: 'Poppins, sans-serif',
                        }}
                    >
                        Cancel
                    </button>
                </div>
            </Modal>
        </>
    );
};

export default LoginWithOtherDeviceModal
