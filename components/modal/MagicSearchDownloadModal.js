import React, { useState } from "react";
import { Modal, Button } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileExcel, faDownload, faTimes, faUpload, faCloudArrowUp, faRocket } from "@fortawesome/free-solid-svg-icons";
import { getSImplifiedVersionOfBOQ, getBOQexcelToJsonAI, pollBOQResult, persistMagicSearchJob } from "@/services/rfq";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

const MagicSearchDownloadModal = ({ onUploadForRFQ }) => {
  const [show, setShow] = useState(false);
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [fileUrl, setFileUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [creatingRFQ, setCreatingRFQ] = useState(false);
  const [jsonData, setJsonData] = useState(null);

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    setFile(selectedFile);
    setFileName(selectedFile?.name || "");
  };


  const handleUpload = async () => {
  if (!file) return;
  setUploading(true);

  try {
    const persistJob = await persistMagicSearchJob(fileName, 'simplified');
    const webhook = persistJob.webhook;

    const startResponse = await getSImplifiedVersionOfBOQ(file, webhook);
    if(startResponse) {
      const response = startResponse.data;
      toast.success(response.message);
      setShow(false);
      onUploadForRFQ();
    } else toast.error("Server is too busy to handle your request, please try again in some time...")
  } catch (error) {
          console.error("Upload failed:", error);
          toast.error(error?.response?.data?.detail || "Simplified BOQ creation failed. Please try again.");

  } finally {
    setUploading(false);
  }
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
                          Download, fill and upload the BOQ file for smooth Tender / RFQ
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
                        

      <Modal show={show} onHide={handleClose} centered  >
        <Modal.Header closeButton className="p-3 border-b-2 " >
          <Modal.Title className="d-flex align-items-center">
            <FontAwesomeIcon icon={faFileExcel} className="me-2 text-success" />
            <span>Simplify Your BOQ</span>
          </Modal.Title>
        </Modal.Header>

        <div style={{ borderBottom: "1px solid #dee2e6" }}></div>


        <Modal.Body>
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
        </Modal.Body>

      </Modal>
    </>
  );
};

export default MagicSearchDownloadModal;
