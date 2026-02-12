import React, { useEffect } from 'react'
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";

const LoginWithOtherDeviceModal = (props) => {
    const { onHide, show, email, password, employeeCode, loginSubmitHandler, loginWithGoogle, loginWith } = props;
    const handleLogin = () => {
        if (loginWith === 'google') {
            loginWithGoogle();
        } else if (loginWith === 'employee_code') {
            loginSubmitHandler({ employee_code: employeeCode, password }, true);
        } else {
            loginSubmitHandler({ email, password }, true);
        }
    }
    return (
        <Modal
            show={show}
            onHide={onHide}
            size="md"
            aria-labelledby="contained-modal-title-vcenter"
            centered
        >
            <Modal.Header closeButton>
                <Modal.Title className="p-3">Login With Other Device</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                Do you want to Login with current device ?
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={() => onHide()}>
                    Cancel
                </Button>
                <Button variant="primary" onClick={() => handleLogin()}>
                    Yes
                </Button>
            </Modal.Footer>
        </Modal>
    )
}

export default LoginWithOtherDeviceModal