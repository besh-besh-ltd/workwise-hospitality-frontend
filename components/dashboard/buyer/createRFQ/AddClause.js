import { toast } from "react-toastify";
import React, { useRef, useState } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
function AddClauseModal({ show, onClose, productName }) {
    const [message, setMessage] = useState("");
    const [file, setFile] = useState(null);
    const [fileName, setFileName] = useState(""); // Store the file name
    const fileInputRef = useRef(null);
    const [clauses,setClauses] = useState([]);
    const [isFileInputVisible, setIsFileInputVisible] = useState(false);

    const handleFileChange = (event) => {
        const selectedFile = event.target.files[0];
        setFile(selectedFile);
        if (selectedFile) {
            setFileName(selectedFile.name); // Save the file name when a file is selected
        }
    };

    const handleAttachFileClick = () => {
        fileInputRef.current.click(); // Trigger the file input when the "Attach file" button is clicked
    };

    const handleAddClause = () => {
        if (message.trim() === "") {
          toast.error("Message is required");
          return;
        }
        const newClause = { message, fileName: file ? fileName : null };
        // Add new clause to the list
        setClauses([...clauses, newClause]);
    
        // Reset input fields
        setMessage("");
        setFileName("");
        setFile(null);
        setIsFileInputVisible(false);
      };

      const handleDeleteClause = (index) => {
        const updatedClauses = clauses.filter((_,idx) => idx !== index);
        setClauses(updatedClauses)
      }

    return (
        <Modal
            show={show}
            onHide={onClose}
            centered
            size="lg"     
        >
            <Modal.Header>
                <Modal.Title className="text-right w-100 p-3">
                    Add Technical Clause for - {productName}
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {/* Blue line below the product name */}
                <div className="border-top border-primary"></div>
                <div className="d-flex justify-content-end pt-4">
                    <Button 
                        variant="primary" 
                        className="px-2 py-2" 
                        onClick={handleAddClause}
                    >
                        Add Clause
                    </Button>
                </div>
                <div className="d-flex pt-3 pb-5">
                    <Form.Control
                        as="textarea"
                        placeholder="Message"
                        rows={2}
                        className="me-2"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                    />
                    <Button
                        variant="secondary"
                        className="px-2 py-2"
                        onClick={handleAttachFileClick}
                    >
                        Attach file
                    </Button>
                </div>

                {/* Hidden file input field triggered by the "Attach file" button */}
                <input
                    ref={fileInputRef}
                    type="file"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                />

                {/* Display the filename below the Attach file button if a file is selected */}
                {fileName && (
                    <div  style={{ fontSize: 'small', color: 'gray', marginTop: '2px' }}>
                        {fileName}
                    </div>
                )}
                 {/* To Do List: Display Added Clauses */}
                <div className="mt-4">
                {clauses.length > 0 && (
                    <div className="list-group" style={{maxHeight:'120px',overflowY:'auto'}}>
                    {clauses.map((clause, index) => (
                        <li key={index} className="list-group-item d-flex justify-content-between align-items-center ">
                            <div>
                            <strong>Message:</strong> {clause.message}
                                {clause.fileName ? (
                                    <div className="mt-2">
                                    <strong>File:</strong> {clause.fileName}
                                    </div>
                                ):<div className="mt-2">
                                <strong>File:</strong> Not Uploaded
                                </div>}
                            </div>
                        <div>
                        <Button 
                            variant="danger"
                            size="m"
                            className="py-2"
                            onClick={() => handleDeleteClause(index)}
                        >
                        Delete
                        </Button>
                        </div> 
                        </li>
                    ))}
                    </div>
                )}
                </div>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={onClose}>
                    Cancel
                </Button>
                <Button variant="secondary">
                    Save
                </Button>
                
            </Modal.Footer>
        </Modal>
    );
}

export default AddClauseModal;