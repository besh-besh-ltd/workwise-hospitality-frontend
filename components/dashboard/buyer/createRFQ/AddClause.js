import { toast } from "react-toastify";
import React, { useEffect, useRef, useState } from 'react';
import { Modal, Form, Tab, Nav} from 'react-bootstrap';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCloudArrowUp, faDownload, faPaperclip, faTrash } from "@fortawesome/free-solid-svg-icons";
import { handleFileUpload } from "@/utils/sharedFunctions";
import FileLink from "@/components/shared/FileLink";
import { faEdit, faFileExcel  } from "@fortawesome/free-regular-svg-icons";
import { addClause, addClauseUsingFile, getClausesByRfqProductId, removeClause, updateClause } from "@/services/rfq";
import FullLoader from "@/components/shared/FullLoader";


function AddClauseModal({ show, onClose, product, rfq_id }) {
    const [clauseFile, setClauseFile] = useState(null);
    const [active, setActive] = useState('clause');
    const [message, setMessage] = useState("");
    const [files, setFiles] = useState([]);
    const [fileLoading, setFileLoading] = useState(false);
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef(null);
    const [currentClause, setCurrentClause] = useState(null);
    const [update, setUpdate] = useState(false);
    const [previousClauses, setPreviousClauses] = useState(null);
    const [fileName, setFileName] = useState('');
    const [clauseErrors, setClauseErrors] = useState([]);

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
        try {
            setLoading(true);
            const res = await getClausesByRfqProductId(payload);
            if (res.data)
                setPreviousClauses(res.data);
        } catch (error) {
            console.log(error)
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

        const payload = {
            rfq_id,
            rfq_product_id: product.id,
            clause_text: message,
            file_url: files
        }

        try {
            setLoading(true)
            const res = await addClause(payload);
            toast.success(res.message)
            getPreviousClauses();

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

        try {
            setLoading(true)
            const res = await updateClause(payload);
            toast.success(res.message)
            getPreviousClauses();

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
        try {
            setClauseErrors([]);
            setLoading(true)
            const res = await removeClause(clause_id);
            toast.success(res.message)
            getPreviousClauses();

        } catch (error) {
            console.log(error)
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
        getPreviousClauses();
    }, [])


    const handleMagicFileUpload = (event) => {
        const file = event.target.files[0];
        if (file) {
            const fileType = file.name.split('.').pop().toLowerCase();
            const validTypes = ['xlsx', 'xls', 'pdf'];
            if (!validTypes.includes(fileType)) {
                toast.error('Please upload a valid file (PDF, xlsx, xls)');
            } else {
                setFileName(file.name);
                setClauseFile(file);
            }
        }
        // when we have already taken the file in the state
        event.target.value = null;
    };

    const uploadClauseFile = async () => {
        if (!clauseFile) {
            toast.error("Please select a file!");
            return;
        }

        try {
            setClauseErrors([]);
            setLoading(true);

            // Create a new FormData object
            const formData = new FormData();
            formData.append('file', clauseFile); 
            formData.append('rfq_id', rfq_id); 
            formData.append('rfq_product_id', product.id); 

            // Send the FormData to your endpoint
            const res = await addClauseUsingFile(formData);
            if(res?.status){
                toast.success(res.message);            
            }else{
                setClauseErrors(res?.errors);
                toast.error("Error file uploading the file");
            }
        } catch (error) {
            console.log(error)
            toast.error(error.message);
            setLoading(false);
        } finally{
            getPreviousClauses();
        }
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
                                accept=".pdf, .docx, .doc, .xlsx, .xls, .csv, .png, .jpg, .jpeg"
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
                                        <a
                                            title="Download this sample Excel and fill all the columns. You can also upload PDF files directly."
                                            href="/Sample Bulk Clause Format.xlsx"
                                            className="d-flex justify-content-between align-items-center "
                                            style={{ cursor: "pointer" }}>
                                            <p className="fw-semibold mb-0 me-2" style={{ color: "var(--primary-color)" }}>Download, fill and upload the Bulk Clause file (Excel) or upload a PDF file</p>
                                            <FontAwesomeIcon icon={faDownload} style={{ fontSize: "16px", color: "var(--primary-color" }} />
                                        </a>
                                    </div>
                                </div>
                                <div className="col-md-10 mx-auto">
                                    <h2 className="title fs-6 mb-2">Step 2: Upload Your File and other details.</h2>
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
                                        <FontAwesomeIcon icon={fileName ? faFileExcel : faCloudArrowUp} style={{ fontSize: "30px" }} />
                                        <p className="fw-semibold ">{fileName || 'Upload / Drag and drop your file (PDF or Excel) here'}</p>
                                    </div>

                                    {/* //{ Hidden File Input } */}
                                    <input
                                        id="fileInput"
                                        type="file"
                                        accept=".xlsx, .xls, .pdf"
                                        style={{ display: 'none' }}
                                        onChange={handleMagicFileUpload}
                                    />
                                </div>
                            <div className="mt-2">
                                {!loading && clauseErrors && clauseErrors.length > 0 && (
                                    <div className="list-group" style={{ maxHeight: '180px', overflowY: 'auto' }}>
                                        <strong className="text-danger">Errors</strong>
                                        {clauseErrors.map((error, index) => (
                                            <li key={index} className="list-group-item ">
                                                <p className="text-sm mb-1">
                                                    <strong>Row {error?.Row + 1} : </strong> {error?.error}
                                                </p>
                                            </li>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className={clauseErrors.length>0 ? `mt-4`: `mt-3`}>
                                <strong className="text-primary">List of Clauses</strong>
                                {loading && <FullLoader />}
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

                    </Tab.Content>
                </Tab.Container>
            </Modal.Body>

            <Modal.Footer>
                {active==='clause'
                ?
                <button
                    type="button"
                    className="btn btn-secondary border-0 p-2"
                    style={{ width: "120px" }}
                    onClick={() => {
                        if (message !== "")
                            handleAddClause();
                        toast.success("Clauses Saved successfully.");
                        onClose();
                    }}
                >
                    Save
                </button>
                : 
                <button
                type="button"
                className="btn btn-secondary border-0 p-2"
                style={{ width: "120px" }}
                onClick={() => {
                        uploadClauseFile();
                }}
            >
                upload
            </button>
                }
            </Modal.Footer>
        </Modal >
    
    );
}

export default AddClauseModal;
