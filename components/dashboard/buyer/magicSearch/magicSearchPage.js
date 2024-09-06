import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import { Button } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';

function MagicSearchPage() {
    const [fileName, setFileName] = useState('');
    const [loading, setLoading] = useState(false); // Set true for loading UI

    // Message rotation state for loading UI
    const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

    // Array of messages to display during loading
    const messages = [
        'Please wait...',
        'We are uploading your Excel file...',
        'Almost there...',
        'Finalizing upload...',
        'Hang tight!'
    ];

    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (file) {
            const fileType = file.name.split('.').pop().toLowerCase();
            const validTypes = ['xlsx', 'xls'];
            if (!validTypes.includes(fileType)) {
                alert('Please upload a valid Excel file (xlsx, xls)');
            } else {
                setFileName(file.name);
            }
        }
    };


    // Rotating messages logic for loader
    useEffect(() => {
        let messageInterval;

        if (loading) {
            messageInterval = setInterval(() => {
                setCurrentMessageIndex((prevIndex) => (prevIndex + 1) % messages.length);
            }, 1500); // Rotate every 1.5 seconds
        }

        // Clean up interval on component unmount
        return () => {
            clearInterval(messageInterval);
        };
    }, [loading, messages.length]);


    return (
        <>

            {loading && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.7)',
                        color: 'white',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        flexDirection: 'column',
                        zIndex: 9999,
                        fontSize: '24px'
                    }}
                >
                    <p>{messages[currentMessageIndex]}</p>
                </div>
            )}


            {/* Header Section */}
            <section className="vendor-common-header sc-pt-80">
                <div className="container-fluid text-center">
                    <h1 className="heading">Magic Search</h1>
                    <Link href="/products" className="page-link backBtn">
                        <FontAwesomeIcon icon={faArrowLeft} /> Go back
                    </Link>
                </div>
            </section>

            {/* File Upload Section */}
            <section className="search-sec-1">
                <div className="container-fluid product-search">
                    <div className="col-md-8 mx-auto text-center">
                        {/* Drag and Drop Area */}
                        <div
                            className="file-drop-area border border-success rounded p-5"
                            style={{
                                border: '2px solid green',
                                cursor: 'pointer',
                                backgroundColor: '#fff',
                                color: 'green',
                            }}
                            onClick={() => document.getElementById('fileInput').click()}
                        >
                            <p>{fileName || 'Upload / Drag and drop your excel file here'}</p>
                        </div>

                        {/* Hidden File Input */}
                        <input
                            id="fileInput"
                            type="file"
                            accept=".xlsx, .xls"
                            style={{ display: 'none' }}
                            onChange={handleFileUpload}
                        />
                    </div>
                </div>
            </section>

            {/* Text Area Section */}
            <section className="search-sec-2 pb-4">
                <div className="container-fluid col-md-8  ">
                    <h6 className="font-bold" > Add your comments </h6>
                    <textarea rows="3" className="form-control border border-success " placeholder="Enter any additional details here..." />
                </div>
                <div className="text-center mt-3">
                    <Button variant="secondary" className="mt-0 mb-0"  onClick={()=>{setLoading(!loading)}}>Submit</Button>
                </div>
            </section>
        </>
    );
}

export default MagicSearchPage;
