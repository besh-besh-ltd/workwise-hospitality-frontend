import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPhone } from '@fortawesome/free-solid-svg-icons';

const CallButton = () => {
    const [showText, setShowText] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    useEffect(() => {
        const toggleText = () => {
            setShowText(true);
            setTimeout(() => {
                setShowText(false);
            }, 4000);
        };

        const initialDelay = setTimeout(() => {
            toggleText();
            const interval = setInterval(toggleText, 6000);
            return () => clearInterval(interval);
        }, 6000);

        return () => clearTimeout(initialDelay);
    }, []);


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
            transition: 'background-color 0.3s'
        },
        callText: {
            fontSize: '16px',
            color: 'white',
            backgroundColor: '#28a745',
            borderRadius: '8px 0 0 8px',
            padding: '7px 14px',
            transform: showText || isHovered ? 'translateX(0)' : 'translateX(100%)',
            transition: 'opacity 0.5s ease, transform 0.5s ease',
            opacity: showText || isHovered ? 1 : 0,
            position: 'absolute',
            right: '100%',
            whiteSpace: 'nowrap'
        }
    };

    return (
        <div style={styles.callButtonContainer}>
            <div 
                className="d-flex align-items-center"
                style={styles.callText}
            >
                Let's Talk
            </div>
            <button
                style={styles.callButton}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                <FontAwesomeIcon icon={faPhone} size="2x" />
            </button>
        </div>
    );
};

export default CallButton;