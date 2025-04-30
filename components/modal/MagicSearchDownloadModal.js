import React, { useState } from "react";
import { Modal, Button } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileExcel, faDownload, faTimes, faUpload, faCloudArrowUp } from "@fortawesome/free-solid-svg-icons";
import { getSImplifiedVersionOfBOQ } from "@/services/rfq";

const MagicSearchDownloadModal = () => {
  const [show, setShow] = useState(false);
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [fileUrl, setFileUrl] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    setFile(selectedFile);
    setFileName(selectedFile?.name || "");
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);

    try {
      const response = await getSImplifiedVersionOfBOQ(file);
      setFileUrl(response?.data?.download_excel);
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = () => {
    if (!fileUrl) return;
    const a = document.createElement("a");
    a.href = fileUrl;
    a.download = fileUrl.split("/").pop() || "processed-boq.xlsx";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleClose = () => {
    setShow(false);
    setFile(null);
    setFileUrl(null);
    setFileName("");
  };

  return (
    <>

            <div className="d-flex align-items-center gap-2 mb-3" onClick={() => setShow(true)}>
                      <h2 className="title fs-6 mb-0 ">Step 1: </h2>
                      <a
                        title="Download this sample Excel and fill all the columns."
                        className="d-flex justify-content-between align-items-center "
                        style={{ cursor: "pointer" }}
                      >
                        <p
                          className="fw-semibold mb-0 me-2"
                          style={{ color: "var(--primary-color)" }}
                        >
                          Download, fill and upload the BOQ file for smooth RFQ
                          Creation
                        </p>
                        <FontAwesomeIcon
                          icon={faDownload}
                          style={{
                            fontSize: "16px",
                            color: "var(--primary-color",
                          }}
                        />
                      </a>
                    </div>
                        
      {/* <Button variant="primary"   className="ms-auto border-0" style={{ width: "280px" }}>
        Simplified BOQ
      </Button> */}

      <Modal show={show} onHide={handleClose} centered  >
        <Modal.Header closeButton className="p-3 border-b-2 " >
          <Modal.Title className="d-flex align-items-center">
            <FontAwesomeIcon icon={faFileExcel} className="me-2 text-success" />
            <span>Create Simplify Your BOQ</span>
          </Modal.Title>
        </Modal.Header>

        <div style={{ borderBottom: "1px solid #dee2e6" }}></div>


        <Modal.Body>
          {!fileUrl ? (
            <>
              <p className="text-center mb-3">
                Upload your complex BOQ file and Workwise AI will simplify it for you.
              </p>

              <div
                className="file-drop-area text-center rounded py-4 mb-3"
                style={{
                  border: "2px dashed grey",
                  cursor: "pointer",
                  backgroundColor: "#fff",
                  color: "green"
                }}
                onClick={() => document.getElementById("fileInputModal").click()}
              >
                <FontAwesomeIcon icon={fileName ? faFileExcel : faCloudArrowUp} style={{ fontSize: "45px" }} />
                <p className="fw-semibold ">{fileName || "Upload / Drag and drop your excel file here"}</p>
              </div>

              <input
                id="fileInputModal"
                type="file"
                accept=".xlsx, .xls"
                style={{ display: "none" }}
                onChange={handleFileChange}
              />

              <div className="text-center">
                <Button variant="success" onClick={handleUpload} disabled={uploading || !file}>
                  <FontAwesomeIcon icon={faUpload} className="me-2" />
                  {uploading ? "Uploading..." : "Upload"}
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-center mb-3">
                BOQ processed! Click below to download the simplified version.
              </p>
              <div className="text-center">
                <Button variant="success" onClick={handleDownload}>
                  <FontAwesomeIcon icon={faDownload} className="me-2" />
                  Download BOQ
                </Button>
              </div>
            </>
          )}
        </Modal.Body>

        {/* <Modal.Footer>
          <Button variant="outline-secondary" onClick={handleClose}>
            <FontAwesomeIcon icon={faTimes} className="me-1" />
            Close
          </Button>
        </Modal.Footer> */}
      </Modal>
    </>
  );
};

export default MagicSearchDownloadModal;
