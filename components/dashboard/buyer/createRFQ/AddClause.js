import { toast } from "react-toastify";
import React, { useEffect, useRef, useState } from 'react';
import { Modal, Form, Tab, Nav, Button, Accordion, Table } from 'react-bootstrap';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCloudArrowUp, faDownload, faPaperclip, faTrash, faFilePdf } from "@fortawesome/free-solid-svg-icons";
import { handleFileUpload } from "@/utils/sharedFunctions";
import FileLink from "@/components/shared/FileLink";
import { faEdit } from "@fortawesome/free-regular-svg-icons";
import { addClause, addClauseUsingFile, getClausesByRfqProductId, removeClause, updateClause, updateMinimumPassingScore } from "@/services/rfq";
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
    const [weightage, setWeightage] = useState("");
    const [minimumPassingScore, setMinimumPassingScore] = useState(null);
    const [showMinimumScoreInput, setShowMinimumScoreInput] = useState(false);
    const [tempMinimumScore, setTempMinimumScore] = useState("");

    // Sampling clause specific state
    const [showSamplingForm, setShowSamplingForm] = useState(false);
    const [samplingWeightage, setSamplingWeightage] = useState("");

    // Compute if sampling clause already exists
    const existingSamplingClause = previousClauses?.find(c => c.clause_type === 'sampling');
    const hasSamplingClause = !!existingSamplingClause;

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
        setLoading(true);
        try {
            const res = await getClausesByRfqProductId(payload);
            // Response structure (axios interceptor unwraps response.data):
            // res = { success, vendor_response, minimum_passing_score, data: [...] }
            let clausesData = [];
            if (res && res.data && Array.isArray(res.data)) {
                clausesData = res.data;
            }

            // Show all clauses (both regular and sampling)
            setPreviousClauses(clausesData);

            // Fetch minimum passing score from response
            // res is already the backend response (axios interceptor unwraps it)
            const minimumScore = res?.minimum_passing_score;

            if (minimumScore !== undefined && minimumScore !== null) {
                // Convert to number to ensure proper handling (including 0)
                const score = Number(minimumScore);
                if (!isNaN(score)) {
                    setMinimumPassingScore(score);
                } else {
                    setMinimumPassingScore(null);
                }
            } else {
                setMinimumPassingScore(null);
            }
        } catch (error) {
            console.error("Error fetching clauses:", error);
            toast.error("Failed to load clauses. Please try again.");
        } finally {
            setLoading(false);
            setClauseFile(null);
            setFileName('');
        }
    }

    const handleAddClause = async () => {
        if (message.trim() === "") {
            toast.error("Message is required");
            return;
        }

        if (!weightage || weightage === "") {
            toast.error("Marks is required");
            return;
        }

        const payload = {
            rfq_id,
            rfq_product_id: product.id,
            clause_text: message,
            file_url: files,
            clause_type: 'clause',
            weightage: parseInt(weightage)
        }

        setLoading(true);
        try {
            const res = await addClause(payload);
            toast.success(res.message || res.data?.message || "Clause added successfully");
            // Wait a bit to ensure database has updated, then refresh clauses
            setTimeout(() => {
                getPreviousClauses();
            }, 100);
            onClauseChange && onClauseChange({
                action: 'add',
                payload: {
                    ...payload,
                    product_variant_id: product.product_id,
                    variant: product.variant,
                },
            });

        } catch (error) {
            toast.error(error.message)
        } finally {
            setLoading(false);
            setMessage("");
            setFiles([]);
            setWeightage("");
        }
    };

    const handleAddSamplingClause = async () => {
        // Check if sampling clause already exists
        if (previousClauses?.some(c => c.clause_type === 'sampling')) {
            toast.error("A sampling clause already exists for this item");
            return;
        }

        if (!samplingWeightage || samplingWeightage === "") {
            toast.error("Marks is required for sampling clause");
            return;
        }

        const payload = {
            rfq_id,
            rfq_product_id: product.id,
            clause_text: "Sampling",
            file_url: [],
            clause_type: 'sampling',
            weightage: parseInt(samplingWeightage)
        };

        setLoading(true);
        try {
            const res = await addClause(payload);
            toast.success("Sampling clause added successfully");
            setShowSamplingForm(false);
            setSamplingWeightage("");
            setTimeout(() => {
                getPreviousClauses();
            }, 100);
            onClauseChange && onClauseChange({
                action: 'add',
                payload: {
                    ...payload,
                    product_variant_id: product.product_id,
                    variant: product.variant,
                },
            });
        } catch (error) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateClause = async () => {
        if (!weightage || weightage === "") {
            toast.error("Marks is required");
            return;
        }

        const payload = {
            clause_id: currentClause.clause_id,
            clause_text: message,
            file_url: files,
            clause_type: currentClause.clause_type || 'clause',
            weightage: parseInt(weightage)
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
            toast.error(error.message)
        } finally {
            setLoading(false);
            setMessage("");
            setFiles([]);
            setWeightage("");
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
            toast.error(error.message)
        } finally {
            setLoading(false);
        }
    }

    const openUpdateField = (clause, index) => {
        const updatedClauses = previousClauses.filter((_, idx) => idx !== index);
        setPreviousClauses(updatedClauses);
        setMessage(clause.clause_text);
        setFiles(clause.files);
        setWeightage(clause.weightage || "");
        setUpdate(true);
        setCurrentClause(clause);
    }

    const handleUpdateMinimumScore = async () => {
        if (!tempMinimumScore || tempMinimumScore === "") {
            toast.error("Please enter minimum passing percentage");
            return;
        }

        const newMinimumScore = parseInt(tempMinimumScore);

        if (newMinimumScore < 0 || newMinimumScore > 100) {
            toast.error("Minimum passing percentage must be between 0 and 100");
            return;
        }

        const payload = {
            rfq_id,
            rfq_product_id: product.id,
            minimum_passing_score: newMinimumScore
        }

        setLoading(true);
        try {
            const res = await updateMinimumPassingScore(payload);
            
            if (res && res.status === 1) {
                const savedScore = parseInt(tempMinimumScore);
                // Immediately update the state so button shows the value
                setMinimumPassingScore(savedScore);
                toast.success(res.message || "Minimum passing percentage updated successfully");
                setShowMinimumScoreInput(false);
                setTempMinimumScore("");
                // Refresh clauses to ensure data is in sync - wait a bit for DB to update
                setTimeout(async () => {
                    await getPreviousClauses();
                }, 300);
            } else {
                toast.error(res?.message || "Failed to update minimum passing percentage");
            }
        } catch (error) {
            toast.error(error.message || "Failed to update minimum passing percentage");
        } finally {
            setLoading(false);
        }
    }

    const handleCancelMinimumScore = () => {
        setShowMinimumScoreInput(false);
        setTempMinimumScore("");
    }

    const handleOpenMinimumScoreInput = () => {
        // Use current state value, useEffect will sync if it changes
        const scoreToShow = (minimumPassingScore !== null && minimumPassingScore !== undefined) 
            ? minimumPassingScore.toString() 
            : "";
        setTempMinimumScore(scoreToShow);
        setShowMinimumScoreInput(true);
    }

    const handleRemoveFile = (fileType, file) => {
        const fileList = files.filter((fileItem) => fileItem !== file);
        setFiles(fileList);
    }

    useEffect(() => {
        if(show) {
            // Reset input state when modal opens
            setShowMinimumScoreInput(false);
            setTempMinimumScore("");
            // Fetch clauses and minimum passing score - this will set minimumPassingScore
            getPreviousClauses();
        } else {
            // Reset state when modal closes
            setShowMinimumScoreInput(false);
            setTempMinimumScore("");
            // Don't reset minimumPassingScore here - let it persist until next fetch
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [show, product.id])

    // Sync tempMinimumScore when minimumPassingScore changes and input is shown
    useEffect(() => {
        if (showMinimumScoreInput && minimumPassingScore !== null && minimumPassingScore !== undefined) {
            setTempMinimumScore(minimumPassingScore.toString());
        }
    }, [showMinimumScoreInput, minimumPassingScore])


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
            }
        } catch (error) {
            toast.dismiss("clause-processing");
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

        <Modal show={show} onHide={() => {
            setShowMinimumScoreInput(false);
            setTempMinimumScore("");
            setShowSamplingForm(false);
            setSamplingWeightage("");
            onClose();
        }} centered size="lg" dialogClassName="add-clause-modal-dialog">
            <style>{`.add-clause-modal-dialog { max-width: 950px; }`}</style>
            <Modal.Header closeButton className="p-3">
                <Modal.Title className="w-100 d-flex justify-content-between align-items-center gap-3">
                    <span className="text-truncate me-2">Technical and Sampling Clause for - {product.name}</span>
                    {!showMinimumScoreInput && (
                        <button
                            type="button"
                            className="btn btn-outline-primary btn-sm text-nowrap flex-shrink-0 px-3 py-2"
                            onClick={handleOpenMinimumScoreInput}
                            style={{ minWidth: "max-content" }}
                        >
                            {(minimumPassingScore !== null && minimumPassingScore !== undefined)
                                ? `Edit minimum passing percentage (${minimumPassingScore})`
                                : "Set minimum passing percentage"}
                        </button>
                    )}
                </Modal.Title>
            </Modal.Header>
            <Modal.Body className="p-2" style={{ minHeight: "200px" }}>
                {showMinimumScoreInput ? (
                    <div className="d-flex flex-column gap-3 p-3">
                        <h5 className="mb-0">Set minimum passing percentage (out of 100)</h5>
                        <div className="alert alert-info p-2" style={{ fontSize: "12px" }}>
                            <strong>Minimum passing percentage:</strong> Enter a value between 0 and 100
                            <br />
                            <small>This percentage will be used to determine if vendors pass the technical evaluation.</small>
                        </div>
                        <Form.Control
                            type="number"
                            placeholder="Enter minimum passing percentage (0-100)"
                            min="0"
                            max="100"
                            value={tempMinimumScore}
                            onChange={(e) => setTempMinimumScore(e.target.value)}
                        />
                        {tempMinimumScore && !isNaN(parseInt(tempMinimumScore)) && (parseInt(tempMinimumScore) < 0 || parseInt(tempMinimumScore) > 100) && (
                            <small className="text-danger">
                                Minimum passing percentage must be between 0 and 100
                            </small>
                        )}
                        <div className="d-flex gap-2 justify-content-end">
                            <button
                                type="button"
                                className="btn btn-outline-secondary p-2"
                                onClick={handleCancelMinimumScore}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="btn btn-primary p-2"
                                onClick={handleUpdateMinimumScore}
                                disabled={loading || !tempMinimumScore || tempMinimumScore === ""}
                            >
                                {loading ? "Saving..." : "Save Score"}
                            </button>
                        </div>
                    </div>
                ) : (
                <Tab.Container activeKey={active} onSelect={(k) => {
                    if (k) {
                        if (k === 'clause') {
                            setActive('clause');
                            setMessage("");
                            setFiles([]);
                            setWeightage("");
                            setUpdate(false);
                            setCurrentClause(null);
                            setShowMinimumScoreInput(false);
                            setShowSamplingForm(false);
                            setSamplingWeightage("");
                        } else if (k === 'bulkclause') {
                            setActive('bulkclause');
                            setUpdate(false);
                            setCurrentClause(null);
                            setShowMinimumScoreInput(false);
                            setShowSamplingForm(false);
                            setSamplingWeightage("");
                        }
                    }
                }}>
                    <Nav variant="tabs">
                        <Nav.Item>
                            <Nav.Link eventKey="clause">Clauses</Nav.Link>
                        </Nav.Item>

                        <Nav.Item>
                            <Nav.Link eventKey="bulkclause">Add Bulk Clauses</Nav.Link>
                        </Nav.Item>
                    </Nav>

                    <Tab.Content>
                        {/* Clauses Tab */}
                        <Tab.Pane eventKey="clause">
                            {/* Sampling Clause Section - Dedicated area with clear visual distinction */}
                            <div className="border rounded p-3 mb-3 mt-2" style={{ backgroundColor: '#f8f9fa' }}>
                                <div className="d-flex justify-content-between align-items-center">
                                    <div>
                                        <strong className="text-primary">Sampling Clause</strong>
                                        <small className="text-muted d-block">Maximum 1 sampling clause per item</small>
                                    </div>
                                    {hasSamplingClause ? (
                                        <div className="d-flex align-items-center gap-2">
                                            <span className="badge bg-success">Added</span>
                                            <span className="small text-muted">Marks: {existingSamplingClause.weightage || 0}</span>
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-outline-danger p-2"
                                                onClick={() => handleDeleteClause(existingSamplingClause.clause_id)}
                                                disabled={loading}
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    ) : showSamplingForm ? (
                                        <div className="d-flex flex-column align-items-center gap-2">
                                            <Form.Control
                                                type="number"
                                                placeholder="Marks"
                                                size="sm"
                                                min="0"
                                                value={samplingWeightage}
                                                onChange={(e) => setSamplingWeightage(e.target.value)}
                                            />
                                            <div className="d-flex gap-2">
                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-primary p-2"
                                                    onClick={handleAddSamplingClause}
                                                    disabled={loading || !samplingWeightage}
                                                >
                                                    {loading ? '...' : 'Add'}
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-outline-secondary p-2"
                                                    onClick={() => {
                                                        setShowSamplingForm(false);
                                                        setSamplingWeightage("");
                                                    }}
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            className="btn btn-sm btn-outline-dark p-2"
                                            onClick={() => setShowSamplingForm(true)}
                                            disabled={loading}
                                        >
                                            + Add Sampling Clause
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Regular Clause Form */}
                            <div className="d-flex flex-column mb-3">
                                <Form.Control
                                    as="textarea"
                                    placeholder="Message"
                                    rows={2}
                                    className="me-2 mb-2"
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                />
                                <Form.Control
                                    type="number"
                                    placeholder="Marks"
                                    className="me-2"
                                    min="0"
                                    value={weightage}
                                    onChange={(e) => setWeightage(e.target.value)}
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
                                            disabled={!message || message.length === 0 || !weightage || weightage === ""}
                                        >
                                            Update
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            className="btn btn-primary p-1"
                                            style={{ width: "100px" }}
                                            onClick={handleAddClause}
                                            disabled={!message || message.length === 0 || !weightage || weightage === ""}
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

                            {/* Show Previous Clauses (excluding sampling clauses which are shown above) */}
                            <strong className="text-primary">List of Clauses</strong>
                            {loading && <FullLoader />}
                            <div className="mt-2">
                                {!loading && previousClauses && previousClauses.filter(c => c.clause_type !== 'sampling').length > 0 && (
                                    <div className="list-group" style={{ maxHeight: '180px', overflowY: 'auto' }}>
                                        {previousClauses.filter(c => c.clause_type !== 'sampling').map((clause, index) => (
                                            <li key={index} className="list-group-item ">
                                                <p className="text-sm mb-1">
                                                    <strong>Message:</strong> {clause.clause_text}
                                                </p>
                                                <p className="text-sm mb-1">
                                                    <strong>Marks:</strong> {clause.weightage || 0}
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
                                                        onClick={() => openUpdateField(clause, index)}
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

                        {/* Add Bulk Clauses Tab */}
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

                    </Tab.Content>
                </Tab.Container>
                )}
            </Modal.Body>

            {!showMinimumScoreInput && (
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
            )}
        </Modal >
    
    );
}

export default AddClauseModal;
