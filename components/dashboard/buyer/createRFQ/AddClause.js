import { toast } from "react-toastify";
import React, { useEffect, useRef, useState } from 'react';
import { Modal, Form, Tab, Nav, Button, Accordion, Table } from 'react-bootstrap';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCloudArrowUp, faDownload, faPaperclip, faTrash, faFilePdf } from "@fortawesome/free-solid-svg-icons";
import { handleFileUpload } from "@/utils/sharedFunctions";
import FileLink from "@/components/shared/FileLink";
import { faEdit } from "@fortawesome/free-regular-svg-icons";
import { addClause, addClauseUsingFile, getClausesByRfqProductId, removeClause, updateClause } from "@/services/rfq";
import FullLoader from "@/components/shared/FullLoader";


function AddClauseModal({ show, onClose, product, rfq_id, onClauseChange }) {
    const [clauseFile, setClauseFile] = useState(null);
    const [active, setActive] = useState('clause');
    const [message, setMessage] = useState("");
    const [files, setFiles] = useState([]);
    const [fileLoading, setFileLoading] = useState(false);
    const [loading, setLoading] = useState(false);
    const [uploadLoading, setUploadLoading] = useState(false);
    const fileInputRef = useRef(null);
    const [currentClause, setCurrentClause] = useState(null);
    const [update, setUpdate] = useState(false);
    const [previousClauses, setPreviousClauses] = useState(null);
    const [fileName, setFileName] = useState('');
    const [clauseErrors, setClauseErrors] = useState([]);
    const [extractedClauses, setExtractedClauses] = useState([]);

    const handleAttachFileClick = () => {
        fileInputRef.current.click(); // Trigger the file input when the "Attach file" button is clicked
    };

    const uploadToServer = async (e) => {
        setFileLoading(true)
        try {
            const filePath = await handleFileUpload(e);
            const newList = [...files, filePath];
            setFiles(newList);
        } catch (error) {
            toast.error(error.message);
        } finally {
            setFileLoading(false);
            e.target.value = null;
        }
    }

    const getPreviousClauses = async () => {
        const payload = {
            // rfq_id,
            rfq_product_id: product.id
        }
        if (active === 'clause') setLoading(true);
        try {
            const res = await getClausesByRfqProductId(payload);
            if (res.data)
                setPreviousClauses(res.data);
        } catch (error) {
            toast.error("Failed to load clauses. Please try again.");
            console.log(error)
        } finally {
            if (active === 'clause') setLoading(false);
            if (!loading || active === 'clause') {
            setClauseFile(null);
            setFileName('');
            }
        }
    }

    const handleAddClause = async () => {
        if (message.trim() === "") {
            toast.error("Message is required");
            return;
        }

        const payload = {
            rfq_id,
            rfq_product_id: product.id,
            clause_text: message,
            file_url: files
        }

        setLoading(true);
        try {
            const res = await addClause(payload);
            toast.success(res.message)
            getPreviousClauses();
            onClauseChange && onClauseChange({
                action: 'add',
                payload: {
                    ...payload,
                    product_variant_id: product.product_id,
                    variant: product.variant,
                },
            });

        } catch (error) {
            console.log(error)
        } finally {
            setLoading(false);
            setMessage("");
            setFiles([]);
        }
    };

    const handleUpdateClause = async () => {
        const payload = {
            clause_id: currentClause.clause_id,
            clause_text: message,
            file_url: files
        }
        setLoading(true);
        try {
            const res = await updateClause(payload);
            toast.success(res.message)
            getPreviousClauses();
            onClauseChange && onClauseChange({
                action: 'update',
                payload: {
                    ...payload,
                    rfq_product_id: product.id,
                    product_variant_id: product.product_id,
                    variant: product.variant,
                },
            });

        } catch (error) {
            console.log(error)
        } finally {
            setLoading(false);
            setMessage("");
            setFiles([]);
            setCurrentClause(null);
            setUpdate(false);
        }
    }

    const handleDeleteClause = async (clause_id) => {
        setLoading(true);
        try {
            setClauseErrors([]);
            const res = await removeClause(clause_id);
            toast.success(res.message)
            getPreviousClauses();
            onClauseChange && onClauseChange({
                action: 'delete',
                payload: {
                    clause_id,
                    rfq_product_id: product.id,
                    product_variant_id: product.product_id,
                    variant: product.variant,
                },
            });
        } catch (error) {
            console.log(error)
        } finally {
            setLoading(false);
        }
    }

    const openUpdateField = (clause, index) => {
        const updatedClauses = previousClauses.filter((_, idx) => idx !== index);
        setPreviousClauses(updatedClauses);
        setMessage(clause.clause_text);
        setFiles(clause.files);
        setUpdate(true);
        setCurrentClause(clause);
    }

    const handleRemoveFile = (fileType, file) => {
        const fileList = files.filter((fileItem) => fileItem !== file);
        setFiles(fileList);
    }

    useEffect(() => {
        if(show) {
        getPreviousClauses();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [show, product.id])


    const handleMagicFileUpload = (event) => {
        const file = event.target.files[0];
        if (file) {
            const fileType = file.name.split('.').pop().toLowerCase();
            if (fileType !== 'pdf') {
                toast.error('Please upload a valid PDF file');
            } else {
                setFileName(file.name);
                setClauseFile(file);
            }
        }
        event.target.value = null;
    };

    const uploadClauseFile = async () => {
        if (!clauseFile) {
            toast.error("Please select a file!");
            return;
        }

        setLoading(true);
        setUploadLoading(true);
        setClauseErrors([]);
        setExtractedClauses([]);
        
        try {
            toast.info("Processing file. This may take a moment...", {
                autoClose: false,
                toastId: "clause-processing"
            });
            
            const formData = new FormData();
            formData.append('file', clauseFile); 
            formData.append('rfq_id', rfq_id); 
            formData.append('rfq_product_id', product.id); 

            const res = await addClauseUsingFile(formData);
            
            toast.dismiss("clause-processing");
            
            if(res?.status){
                toast.success(res.message);            
                // Changes by Agnij 2025-05-14 [Remove structured clause processing]
                // Only process direct clauses (array of strings or objects with .text)
                let allClauses = [];
                if (res?.clauses && Array.isArray(res.clauses)) {
                    allClauses = [...allClauses, ...res.clauses.map(clause => 
                        typeof clause === 'string' ? clause : (clause.text || clause.value || JSON.stringify(clause))
                    )];
                }
                // Remove duplicates
                const uniqueClauses = [...new Set(allClauses)];
                setExtractedClauses(uniqueClauses);
                setClauseFile(null);
                setFileName('');
            } else {
                setClauseErrors(res?.errors || []);
                toast.error("Error uploading the file");
            }
        } catch (error) {
            toast.dismiss("clause-processing");
            console.log(error)
            toast.error(error.message || "An unexpected error occurred.");
            setClauseErrors([{ Row: 0, error: error.message || "An unexpected error occurred."}]);
        } finally{
            setLoading(false);
            setUploadLoading(false);
            getPreviousClauses();
        }
    };

    const addSingleExactedClause = (clause) => {
        setExtractedClauses([...extractedClauses, clause]);
    };

    return (

        <Modal show={show} onHide={onClose} centered size="lg">
            <Modal.Header closeButton>
                <Modal.Title className="text-right w-100 p-3">
                    Technical Clause for - {product.name}
                </Modal.Title>
            </Modal.Header>
            <Modal.Body style={{ minHeight: "200px" }}>
                <Tab.Container defaultActiveKey="clause">
                    <Nav variant="tabs">
                        <Nav.Item>
                            <Nav.Link onClick={()=>setActive('clause')} eventKey="clause">Clauses</Nav.Link>
                        </Nav.Item>
                        <Nav.Item>
                            <Nav.Link onClick={()=>setActive('bulkclause')} eventKey="bulkclause">Add Bulk Clauses</Nav.Link>
                        </Nav.Item>
                    </Nav>

                    <Tab.Content>
                        {/* Clauses Tab */}
                        <Tab.Pane eventKey="clause">
                            <div className="d-flex flex-column mb-3 mt-2">
                                <Form.Control
                                    as="textarea"
                                    placeholder="Message"
                                    rows={2}
                                    className="me-2"
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                />
                                <div className="d-flex justify-content-between align-items-start mt-2">
                                    <div role="button" onClick={handleAttachFileClick} className="text-sm" style={{ maxWidth: "80%" }}>
                                        <FontAwesomeIcon icon={faPaperclip} className="opacity-75 me-2" />
                                        Attach File
                                        {fileLoading && (
                                            <div className="spinner-border spinner-border-sm text-primary ms-2" role="status">
                                                <span className="visually-hidden">Loading...</span>
                                            </div>
                                        )}
                                        {files.length > 0 && (
                                            <FileLink
                                                Files={files}
                                                ColumnClass="col-md-6"
                                                Style={{ fontSize: "12px" }}
                                                showDownload={false}
                                                RemoveFile={handleRemoveFile}
                                            />
                                        )}
                                    </div>

                                    {update ? (
                                        <button
                                            type="button"
                                            className="btn btn-warning p-1"
                                            style={{ width: "100px" }}
                                            onClick={handleUpdateClause}
                                            disabled={!message || message.length === 0}
                                        >
                                            Update
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            className="btn btn-primary p-1"
                                            style={{ width: "100px" }}
                                            onClick={handleAddClause}
                                            disabled={!message || message.length === 0}
                                        >
                                            Add
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Hidden file input field triggered by the "Attach file" button */}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".pdf"
                                style={{ display: 'none' }}
                                onChange={(e) => uploadToServer(e)}
                            />

                            {/* Show Previous Clauses */}
                            <strong className="text-primary">List of Clauses</strong>
                            {loading && <FullLoader />}
                            <div className="mt-2">
                                {!loading && previousClauses && previousClauses.length > 0 && (
                                    <div className="list-group" style={{ maxHeight: '180px', overflowY: 'auto' }}>
                                        {previousClauses.map((clause, index) => (
                                            <li key={index} className="list-group-item ">
                                                <p className="text-sm mb-1">
                                                    <strong>Message:</strong> {clause.clause_text}
                                                </p>
                                                {clause.files.length > 0 && (
                                                    <div className="d-flex gap-2 align-items-start text-sm mb-1">
                                                        <strong className="text-nowrap my-1">Files :</strong>
                                                        <div style={{ width: "90%" }}>
                                                            <FileLink
                                                                Files={clause.files}
                                                                ColumnClass="col-md-5"
                                                                Style={{ fontSize: "12px" }}
                                                                showDownload={true}
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                                <div className="d-flex justify-content-end">
                                                    <button
                                                        type="button"
                                                        className="btn btn-warning p-1 me-2"
                                                        style={{ width: "110px", fontSize: "12px" }}
                                                        onClick={() => openUpdateField(clause)}
                                                    >
                                                        <FontAwesomeIcon icon={faEdit} className="me-2" />
                                                        Update
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn btn-danger p-1"
                                                        style={{ width: "110px", fontSize: "12px" }}
                                                        onClick={() => handleDeleteClause(clause.clause_id)}
                                                    >
                                                        <FontAwesomeIcon icon={faTrash} className="me-2" />
                                                        Remove
                                                    </button>
                                                </div>
                                            </li>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </Tab.Pane>

                        {/* Technical Evaluation Tab */}
                        <Tab.Pane eventKey="bulkclause">                            

                            <div className="col-md-10 mx-auto mt-2">
                                    <div className="d-flex gap-1 mb-1">
                                        <h2 className="title fs-6 mb-0">Step 1: </h2>
                                        <div
                                            title="Upload PDF files with your technical clauses and information"
                                            className="d-flex justify-content-between align-items-center ">
                                            <p className="fw-semibold mb-0 me-2" style={{ color: "var(--primary-color)" }}>Upload a PDF file with your technical clauses and other information</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-md-10 mx-auto">
                                    <h2 className="title fs-6 mb-2">Step 2: Upload Your File.</h2>
                                    <div
                                        className="file-drop-area text-center rounded py-1"
                                        style={{
                                            border: '2px dashed grey',
                                            cursor: 'pointer',
                                            backgroundColor: '#fff',
                                            color: 'green',
                                        }}
                                        onClick={() => document.getElementById('fileInput').click()}
                                    >
                                        <FontAwesomeIcon icon={fileName ? faFilePdf : faCloudArrowUp} style={{ fontSize: "30px" }} />
                                        <p className="fw-semibold ">{fileName || 'Upload / Drag and drop your PDF file here'}</p>
                                        
                                        {/* Changes by Agnij 2025-05-14 [Added document guidance] */}
                                        {!fileName && (
                                            <div className="small text-muted mt-1">
                                                <p className="mb-1">Please ensure your document contains:</p>
                                                <ul className="text-start small ps-4 mb-0">
                                                    <li>Specifications related to <strong>{product.name || 'selected product'}</strong></li>
                                                    <li>Technical details, standards, and requirements</li>
                                                    <li>Clear product identification</li>
                                                </ul>
                                            </div>
                                        )}
                                    </div>

                                    {/* Hidden File Input */}
                                    <input
                                        id="fileInput"
                                        type="file"
                                        accept=".pdf"
                                        style={{ display: 'none' }}
                                        onChange={handleMagicFileUpload}
                                    />
                                </div>
                                
                                {/* Show Errors if any */}
                                {clauseErrors && clauseErrors.length > 0 && (
                                    <div className="col-md-10 mx-auto mt-3">
                                        <div className="alert alert-warning d-flex align-items-center border-0" 
                                             style={{ background: "rgba(255, 248, 230, 0.6)", boxShadow: "0 2px 6px rgba(0,0,0,0.05)" }} role="alert">
                                            <FontAwesomeIcon icon={faFilePdf} className="me-3" style={{ fontSize: '1.8rem', color: '#ffc107' }} />
                                            <div>
                                                <h6 className="fw-bold mb-1" style={{ color: '#664d03' }}>
                                                    Document doesn't match the selected product
                                                </h6>
                                                <p className="mb-0" style={{ color: '#664d03' }}>
                                                    The AI couldn't find relevant information about <b>{product.name}</b> in this document.
                                                    <br/>
                                                    <span className="mt-2 d-block">
                                                        Please upload a document that specifically contains technical details for <b>{product.name}</b>.
                                                    </span>
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Show extracted clauses after AI processing */}
                                {extractedClauses && extractedClauses.length > 0 && (
                                    <div className="border rounded p-3 mb-3">
                                        <h6 className="text-primary mb-3">Extracted Clauses <span className="text-muted">({extractedClauses.length})</span></h6>
                                        <div className="clause-list" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                            {extractedClauses.map((clause, index) => (
                                                <div key={index} className="border-bottom pb-2 mb-2">
                                                    <p className="mb-1">{clause}</p>
                                                    <div className="d-flex justify-content-end">
                                                        <Button 
                                                            variant="outline-primary" 
                                                            size="sm"
                                                            onClick={() => addSingleExactedClause(clause)}
                                                        >
                                                            <i className="far fa-plus-square"></i> Add
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                        </Tab.Pane>

                        <Tab.Pane eventKey="file">
                            <div className="d-flex flex-column mb-3 mt-2">

                                <div className="d-flex align-items-center justify-content-center m-3">
                                    <label htmlFor="formFile" className="form-label d-flex align-items-center gap-2 mb-0">
                                        <div className="btn btn-light px-3 py-2">
                                            <FontAwesomeIcon icon={faFilePdf} className="me-2" /> Select File
                            </div>
                                        <input
                                            type="file"
                                            id="formFile"
                                            accept=".pdf"
                                            style={{ display: 'none' }}
                                            onChange={handleMagicFileUpload}
                                        />
                                        {fileName && <div className="file-name text-primary-emphasis">{fileName}</div>}
                                    </label>
                                </div>
                                <div className="d-flex align-items-center justify-content-center text-center text-muted mb-3">
                                    <small>(PDF files only)</small>
                                </div>

                                {/* Changes by Agnij May 13, 2025 [Added upload loading indicator] */}
                                {uploadLoading && (
                                    <div className="text-center">
                                        <div className="spinner-border text-primary mb-3" role="status">
                                            <span className="visually-hidden">Loading...</span>
                                                        </div>
                                        <p>Processing your document. Please wait...</p>
                                                    </div>
                                                )}

                                {clauseErrors && clauseErrors.length > 0 && (
                                    <div className="alert alert-danger mt-3">
                                        <h6>
                                          <i className="fas fa-exclamation-triangle me-2"></i>
                                          Document Processing Error:
                                        </h6>
                                        <ul className="mb-0">
                                          {clauseErrors.map((error, index) => (
                                            <li key={index} className="mb-1">{error.error}</li>
                                          ))}
                                        </ul>
                                        
                                        {/* Changes by Agnij 2025-05-14 [Improved error guidance] */}
                                        <div className="border-top mt-3 pt-2 text-muted small">
                                          <p className="mb-1"><strong>Common issues:</strong></p>
                                          <ul>
                                            <li>Make sure the document contains information about the selected product</li>
                                            <li>Check if the product name appears in the document</li>
                                            <li>Try a document with more specific technical specifications</li>
                                          </ul>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Tab.Pane>

                    </Tab.Content>
                </Tab.Container>
            </Modal.Body>

            <Modal.Footer>
                <div className="d-flex gap-2 ms-auto">
                    {active === 'clause' ? (
                <button
                    type="button"
                            className="btn btn-primary p-2"
                    style={{ width: "120px" }}
                    onClick={() => {
                                if (message.trim() !== "" || files.length > 0) {
                                    if (update) {
                                        handleUpdateClause();
                                    } else {
                            handleAddClause();
                                    }
                                } else {
                                    toast.info("No changes to save.")
                                }
                            }}
                            disabled={loading}
                        >
                            {loading && active === 'clause' ? (
                                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                            ) : update ? 'Update' : 'Save'}
                </button>
                    ) : (
                        <>
                            {/* Show Upload button if there's a file to upload and no extracted clauses yet */}
                            {!extractedClauses.length && (
                <button
                type="button"
                                    className="btn btn-primary p-2"
                style={{ width: "120px" }}
                                    onClick={() => uploadClauseFile()}
                                    disabled={uploadLoading || !clauseFile}
                                >
                                    {uploadLoading ? (
                                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                    ) : (
                                        'Upload'
                                    )}
                                </button>
                            )}
                            
                            {/* Show buttons to add all clauses or clear results if we have extracted clauses */}
                            {extractedClauses.length > 0 && (
                                <>
                                    <button 
                                        type="button"
                                        className="btn btn-success p-2"
                                        style={{ width: "150px" }}
                                        onClick={() => {
                                            // Add all extracted clauses one by one
                                            const addAllClauses = async () => {
                                                setLoading(true);
                                                try {
                                                    for (const clause of extractedClauses) {
                                                        await addClause({
                                                            rfq_id: rfq_id,
                                                            rfq_product_id: product.id,
                                                            clause_text: clause,
                                                            file_url: []
                                                        });
                                                    }
                                                    toast.success(`Added ${extractedClauses.length} clauses successfully`);
                                                    setExtractedClauses([]);
                                                    getPreviousClauses();
                                                } catch (error) {
                                                    toast.error("Error adding clauses: " + error.message);
                                                } finally {
                                                    setLoading(false);
                                                }
                                            };
                                            addAllClauses();
                                        }}
                                        disabled={loading} 
                                    >
                                        {loading ? (
                                            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                        ) : (
                                            'Add All Clauses'
                                        )}
                                    </button>
                                    <button 
                                        type="button"
                                        className="btn btn-warning p-2"
                                        onClick={() => {
                                            setExtractedClauses([]);
                                            setClauseErrors([]);
                                            setFileName('');
                                            setClauseFile(null);
                                        }}
                                    >
                                        Clear Results
                                    </button>
                                </>
                            )}
                        </>
                    )}
                    <button
                        type="button"
                        className="btn btn-secondary p-2"
                        onClick={onClose}
                    >
                        Close
            </button>
                </div>
            </Modal.Footer>
        </Modal >
    
    );
}

export default AddClauseModal;
