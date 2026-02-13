import React from 'react'
import Modal from "react-bootstrap/Modal";
import { FiMonitor, FiAlertTriangle, FiLogIn, FiX } from "react-icons/fi";

const modalCSS = `
  .asd-modal .modal-content {
    border: none;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 25px 60px rgba(0, 0, 0, 0.15);
    animation: asdSlideUp 0.35s cubic-bezier(0.4, 0, 0.2, 1);
    font-family: Poppins, sans-serif;
  }

  @keyframes asdSlideUp {
    from { opacity: 0; transform: translateY(20px) scale(0.97); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }

  .asd-modal .modal-header {
    border: none;
    padding: 16px 20px 0 20px;
  }
  .asd-modal .modal-body {
    padding: 4px 32px 32px;
  }
  .asd-modal .modal-header .btn-close {
    opacity: 0.4;
    transition: opacity 0.2s ease;
  }
  .asd-modal .modal-header .btn-close:hover {
    opacity: 0.8;
  }

  .asd-icon-wrap {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    background: linear-gradient(135deg, rgba(46, 91, 168, 0.12) 0%, rgba(46, 91, 168, 0.04) 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 20px;
    position: relative;
  }
  .asd-icon-wrap::after {
    content: '';
    position: absolute;
    inset: -5px;
    border-radius: 50%;
    border: 2px solid rgba(46, 91, 168, 0.12);
    animation: asdPulse 2.5s ease-in-out infinite;
  }
  @keyframes asdPulse {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.1); opacity: 0.4; }
  }
  .asd-icon {
    font-size: 30px;
    color: #2E5BA8;
  }

  .asd-title {
    font-family: Poppins, sans-serif;
    font-weight: 700;
    font-size: 22px;
    color: #0f172a;
    text-align: center;
    margin-bottom: 8px;
    line-height: 30px;
  }

  .asd-desc {
    font-family: Poppins, sans-serif;
    font-size: 14px;
    color: #64748b;
    text-align: center;
    line-height: 22px;
    margin-bottom: 24px;
    font-weight: 400;
  }

  .asd-info-card {
    background: #fffbeb;
    border-left: 4px solid #f59e0b;
    border-radius: 0 8px 8px 0;
    padding: 14px 16px;
    margin-bottom: 28px;
    display: flex;
    gap: 12px;
    align-items: flex-start;
  }
  .asd-info-icon {
    color: #f59e0b;
    font-size: 18px;
    margin-top: 1px;
    flex-shrink: 0;
  }
  .asd-info-text {
    font-family: Poppins, sans-serif;
    font-size: 13px;
    color: #92400e;
    line-height: 20px;
    font-weight: 400;
  }

  .asd-btn-primary {
    width: 100%;
    padding: 14px;
    border: none;
    border-radius: 10px;
    background: linear-gradient(135deg, #2E5BA8 0%, #3d6fbe 100%);
    color: #fff;
    font-weight: 600;
    font-size: 14px;
    font-family: Poppins, sans-serif;
    cursor: pointer;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    letter-spacing: 0.02em;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin-bottom: 12px;
  }
  .asd-btn-primary:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 14px rgba(46, 91, 168, 0.35);
    background: linear-gradient(135deg, #264fa0 0%, #3565b2 100%);
  }
  .asd-btn-primary:active {
    transform: translateY(0);
    box-shadow: 0 2px 6px rgba(46, 91, 168, 0.2);
  }
  .asd-btn-primary .asd-btn-icon {
    transition: transform 0.25s ease;
    font-size: 16px;
  }
  .asd-btn-primary:hover .asd-btn-icon {
    transform: translateX(3px);
  }

  .asd-btn-secondary {
    width: 100%;
    padding: 13px;
    border: 1.5px solid #e2e8f0;
    border-radius: 10px;
    background: #ffffff;
    color: #64748b;
    font-weight: 500;
    font-size: 14px;
    font-family: Poppins, sans-serif;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .asd-btn-secondary:hover {
    background: #f8fafc;
    border-color: #cbd5e1;
    color: #475569;
  }
  .asd-btn-secondary:active {
    background: #f1f5f9;
  }
`;

const LoginWithOtherDeviceModal = ({ show, onHide, handleRetryLogin }) => {
    return (
        <>
            <style>{modalCSS}</style>
            <Modal
                show={show}
                onHide={onHide}
                size="md"
                aria-labelledby="active-session-modal"
                centered
                className="asd-modal"
                backdrop="static"
            >
                <Modal.Header closeButton />
                <Modal.Body>
                    <div className="asd-icon-wrap">
                        <FiMonitor className="asd-icon" />
                    </div>

                    <h3 className="asd-title">Active Session Detected</h3>

                    <p className="asd-desc">
                        Your account is currently signed in on another device.
                        Would you like to continue here instead?
                    </p>

                    <div className="asd-info-card">
                        <FiAlertTriangle className="asd-info-icon" />
                        <span className="asd-info-text">
                            Continuing will end your session on the other device.
                            Any unsaved work on that device may be lost.
                        </span>
                    </div>

                    <button
                        className="asd-btn-primary"
                        onClick={handleRetryLogin}
                        id="confirm_device_login-actions-device_modal"
                    >
                        <FiLogIn className="asd-btn-icon" />
                        Continue on This Device
                    </button>

                    <button
                        className="asd-btn-secondary"
                        onClick={onHide}
                        id="cancel_device_login-actions-device_modal"
                    >
                        <FiX style={{ fontSize: '15px' }} />
                        Cancel
                    </button>
                </Modal.Body>
            </Modal>
        </>
    );
};

export default LoginWithOtherDeviceModal
