import { toast } from "react-toastify";
import React, { useEffect, useRef, useState } from 'react';
import { Modal, Form } from 'react-bootstrap';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPaperclip, faTrash } from "@fortawesome/free-solid-svg-icons";
import { extractfileName, handleFileUpload } from "@/utils/sharedFunctions";
import FileLink from "@/components/shared/FileLink";
import { faEdit } from "@fortawesome/free-regular-svg-icons";
import { addClause, getClausesByRfqProductId, removeClause, updateClause } from "@/services/rfq";
import { useSelector, useDispatch } from "react-redux";
import Loader from "@/components/shared/Loader";
import FullLoader from "@/components/shared/FullLoader";
import {
    removeFiles,
} from "@/redux/slice";

function AddClauseModal({ show, onClose, product, rfq_id }) {
    const [clauses, setClauses] = useState([]);
    const [message, setMessage] = useState("");
    const [files, setFiles] = useState([]);
    const [fileLoading, setFileLoading] = useState(false);
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef(null);
    const rfqDetails = useSelector((data) => data.rfq_id);
    const [currentClause, setCurrentClause] = useState(null);
    const [update, setUpdate] = useState(false);
    const [previousClauses, setPreviousClauses] = useState(null);
    const dispatch = useDispatch();

    const handleRemoveFile = (fileUrl, type) => {
        const updatedFiles = files.filter((file) => file !== fileUrl);
        setFiles(updatedFiles);
        dispatch(
            removeFiles({
                value: fileUrl,
            })
        );
    };
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
        }
    }

    const handleAddClause = async () => {
        if (message.trim() === "") {
            toast.error("Message is required");
            return;
        }

        const payload = {
            rfq_id: rfqDetails,
            rfq_product_id: product.id,
            clause_text: message,
            file_url: files
        }

        try {
            setLoading(true)
            const res = await addClause(payload);
            toast.success(res.message)

            // Add new clause to the list
            // const newClause = { message, files };
            // setClauses([...clauses, newClause]);
            getPreviousClauses();

        } catch (error) {
            console.log(error)
        } finally {
            setLoading(false);
            // Reset input fields
            setMessage("");
            setFiles([]);
        }
    };

    const openUpdateField = (clause, index) => {
        // Remove clause from the list
        const updatedClauses = clauses.filter((_, idx) => idx !== index);
        setClauses(updatedClauses);
        setMessage(clause.clause_text);
        setFiles(clause.files);
        setUpdate(true);
        setCurrentClause(clause);
    }

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

            // Add new clause to the list
            // const newClause = { message, files };
            // setClauses([...clauses, newClause]);
            getPreviousClauses();

        } catch (error) {
            console.log(error)
        } finally {
            setLoading(false);
            // Reset input fields
            setMessage("");
            setFiles([]);
            setCurrentClause(null);
            setUpdate(false);
        }
    }

    const handleDeleteClause = async (clause_id) => {
        console.log("delete caluse id = ", clause_id);
        try {
            setLoading(true)
            const res = await removeClause(clause_id);
            toast.success(res.message)

            // Remove clause from the list
            // const updatedClauses = clauses.filter((_, idx) => idx !== index);
            // setClauses(updatedClauses)
            getPreviousClauses();

        } catch (error) {
            console.log(error)
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        getPreviousClauses();
    }, [])

    return (
        <Modal
            show={show}
            onHide={onClose}
            centered
            size="lg"
        >
            <Modal.Header closeButton>
                <Modal.Title className="text-right w-100 p-3">
                    Add Technical Clause for - {product.name}
                </Modal.Title>
            </Modal.Header>
            <Modal.Body style={{ minHeight: "200px" }}>
                <div className="d-flex flex-column mb-3">
                    <Form.Control
                        as="textarea"
                        placeholder="Message"
                        rows={2}
                        className="me-2"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                    />
                    <div className="d-flex justify-content-between align-items-start mt-2">
                        <div role="button" onClick={handleAttachFileClick} className="text-sm">
                            <FontAwesomeIcon icon={faPaperclip} className="opacity-75 me-2" />
                            Attach File
                            {fileLoading &&
                                <div className="spinner-border spinner-border-sm text-primary ms-2" role="status">
                                    <span className="visually-hidden">Loading...</span>
                                </div>
                            }


                            {/* Display the filename below the Attach file button if a file is selected */}
                            {files && files.length > 0 &&
                                files.map(file => (
                                    <>
                                        <div
                                            key={file}
                                            className="d-flex justify-content-between align-items-center mt-2"
                                            style={{ fontSize: "12px" }}
                                        >
                                            <FileLink
                                                Files={file}
                                                // ColumnClass="col-md-4"
                                                Style={{ fontSize: "12px" }}
                                                showDownload={false}
                                            />
                                            <span
                                                style={{
                                                    fontSize: '16px',
                                                    color: 'grey',
                                                    cursor: 'pointer',
                                                    marginLeft: '5px',
                                                    // left:"0",
                                                    fontWeight:"700",
                                                    textDecoration: 'none',
                                                }}
                                                onMouseOver={(e) => (e.target.style.color = 'darkred')}
                                                onMouseOut={(e) => (e.target.style.color = 'grey')}
                                                onClick={(e) => {e.stopPropagation();handleRemoveFile(file)}}
                                            >
                                                x
                                            </span>

                                        </div>
                                    </>
                                ))
                            }
                            {/* {files && files.length > 0 && (
                                files.map((file) => {
                                    return (
                                        <span
                                            style={{
                                                fontSize: '16px',
                                                color: 'grey',
                                                cursor: 'pointer',
                                                marginLeft: '20px',
                                                textDecoration: 'none',
                                            }}
                                            onMouseOver={(e) => (e.target.style.color = 'darkred')}
                                            onMouseOut={(e) => (e.target.style.color = 'grey')}
                                            onClick={(e) => handleRemoveFile(file)}
                                        >
                                            x
                                        </span>

                                    )
                                })
                            )} */}

                        </div>


                        {update ? (
                            <button
                                type="button"
                                className="btn btn-warning p-1"
                                style={{ width: "100px" }}
                                onClick={handleUpdateClause}
                                disabled={!message || message.length == 0}
                            >
                                Update
                            </button>
                        ) : (
                            <button
                                type="button"
                                className="btn btn-primary p-1"
                                style={{ width: "100px" }}
                                onClick={handleAddClause}
                                disabled={!message || message.length == 0}
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
                {loading && <FullLoader />}
                <div className="mt-4">
                    {previousClauses && previousClauses.length > 0 && (
                        <div className="list-group" style={{ maxHeight: '180px', overflowY: 'auto' }}>
                            {previousClauses.map((clause, index) => (
                                <li key={index} className="list-group-item ">
                                    <p className="text-sm mb-0">
                                        <strong>Message:</strong> {clause.clause_text}
                                    </p>
                                    {clause.files.length > 0 && clause.files.map((file) => ((
                                        <div className="d-flex gap-2 align-items-center text-sm">
                                            <strong className="text-nowrap">Files :</strong>
                                            <FileLink
                                                Files={file}
                                                ColumnClass="col-md-3"
                                                Style={{ fontSize: "12px" }}
                                            />
                                        </div>
                                    )))}
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


                {/* To Do List: Display Added Clauses */}
                {/* {!update &&
                    <div className="mt-4">
                        {clauses.length > 0 && (
                            <div className="list-group" style={{ maxHeight: '180px', overflowY: 'auto' }}>
                                {clauses.map((clause, index) => (
                                    <li key={index} className="list-group-item ">
                                        <p className="text-sm mb-0">
                                            <strong>Message:</strong> {clause.message}
                                        </p>
                                        {clause.files.length > 0 && (
                                            <div className="d-flex gap-2 align-items-center text-sm">
                                                <strong className="text-nowrap">Files :</strong>
                                                <FileLink
                                                    Files={clause.files}
                                                    ColumnClass="col-md-3"
                                                    Style={{ fontSize: "12px" }}
                                                />
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
                                                onClick={() => handleDeleteClause(clause.clause_id, index)}
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
                } */}


            </Modal.Body>
            <Modal.Footer>
                <button
                    type="button"
                    className="btn btn-secondary border-0 p-2"
                    style={{ width: "120px" }}
                    onClick={() => {
                        toast.success("Clauses Saved successfully.")
                        onClose()
                    }}
                >
                    Save
                </button>
            </Modal.Footer>
        </Modal >
    );
}

export default AddClauseModal;

