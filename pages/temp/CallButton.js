import React, { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPhone } from '@fortawesome/free-solid-svg-icons';

const CallButton = () => {
    const [showText, setShowText] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setShowText(true);
        }, 3000); 

        return () => clearTimeout(timer); 
    }, []);

    // Inline styles
    const styles = {
        callButtonContainer: {
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            display: 'flex',
            alignItems: 'center', 
            zIndex: 1000
        },
        callButton: {
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            padding: '15px',
            cursor: 'pointer',
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
            transition: 'background-color 0.3s',
            position: 'relative', 
        },
        callText: {
            paddingRight: '14px', 
            fontSize: '16px',
            color: '#333',
            backgroundColor: '#28a745',
            borderRadius: '8px 0 0 8px',
            padding: '7px',
            transform: 'translateX(100%)', // Start off-screen to the right
            transition: 'opacity 0.5s ease, transform 0.5s ease', // Transition for opacity and transform
            opacity: 0, // Start hidden
            position: 'absolute', // Position it absolutely
            right: '100%', // Position it to the left of the button
            whiteSpace: 'nowrap', // Prevent text wrapping
        },
        callTextVisible: {
            opacity: 1,
            transform: 'translateX(0)', // Move to original position
        },
    };

    return (
        <div style={styles.callButtonContainer}>
            {showText && (
                <div
                className="text-white"
                    style={{
                        ...styles.callText,
                        ...(isHovered ? styles.callTextVisible : {}),
                    }}
                >
                    Let's Talk
                </div>
            )}
            <button
                style={styles.callButton}
                onMouseOver={() => {
                    setIsHovered(true);
                }}
                onMouseOut={() => {
                    setIsHovered(false);
                }}
            >
                <FontAwesomeIcon icon={faPhone} size="2x" />
            </button>            
        </div>
    );
};

export default CallButton;