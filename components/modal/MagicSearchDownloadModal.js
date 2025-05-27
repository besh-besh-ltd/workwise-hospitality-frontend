import React, { useState } from "react";
import { Modal, Button } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileExcel, faDownload, faTimes, faUpload, faCloudArrowUp, faRocket } from "@fortawesome/free-solid-svg-icons";
import { getSImplifiedVersionOfBOQ, getBOQexcelToJsonAI } from "@/services/rfq";
import { useRouter } from "next/navigation";

const MagicSearchDownloadModal = ({ onUploadForRFQ }) => {
  const router = useRouter()
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
      const response = await getSImplifiedVersionOfBOQ(file);
      setFileUrl(response?.data?.download_excel_url);
      setJsonData(response?.data?.download_url);
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setUploading(false);
    }
  };

 const handleDownload = async () => {
  if (!fileUrl) return;

  const tryDownload = async (url) => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Fetch failed with status: " + response.status);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = fileUrl.split("/").pop() || "processed-boq.xlsx";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
      console.log("Download successful from:", url);
      return true;
    } catch (err) {
      console.error("Download failed from:", url, err);
      return false;
    }
  };

  // First try with https
  const httpsUrl = fileUrl.replace("http://", "https://");
  const success = await tryDownload(httpsUrl);

  // If https fails, retry once with original http
  if (!success) {
    await tryDownload(fileUrl);
  }
};


  const handleCreateRFQ = async () => {
    if (!file) {
      console.error("Original file not found for RFQ creation.");
      return;
    }
    setCreatingRFQ(true);
    try {
      const response = await getBOQexcelToJsonAI(file); // Get jsonUrl
      const jsonUrl = response?.data?.download_url;
      if (jsonUrl) {
        onUploadForRFQ(jsonUrl); // Call MagicSearchPage to proceed
        setShow(false);
      } else {
        console.error("No JSON URL received from getBOQexcelToJsonAI.");
      }
    } catch (error) {
      console.error("Error creating RFQ:", error);
    } finally {
      setCreatingRFQ(false);
    }
  };

  const handleClose = () => {
    setShow(false);
    setFile(null);
    setFileUrl(null);
    setFileName("");
  };

  
const handleViewBOQ = () => {
  if (!jsonData) {
    console.error("No JSON data available for viewing.");
    return;
  }
  const viewUrl = `magic-search/view?jsonUrl=${encodeURIComponent(jsonData)}`;
  window.open(viewUrl, '_blank'); // Open in a new tab
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
                        

      <Modal show={show} onHide={handleClose} centered  >
        <Modal.Header closeButton className="p-3 border-b-2 " >
          <Modal.Title className="d-flex align-items-center">
            <FontAwesomeIcon icon={faFileExcel} className="me-2 text-success" />
            <span>Simplify Your BOQ</span>
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
                <Button variant="primary" onClick={handleDownload} className="me-2">
                  <FontAwesomeIcon icon={faDownload} className="me-2" />
                  Download BOQ
                </Button>
                <Button variant="primary"  onClick={handleViewBOQ} disabled={creatingRFQ}>
                  <FontAwesomeIcon icon={faRocket} className="me-2" />
                  View BOQ
                </Button>
                <Button variant="success" onClick={handleCreateRFQ} disabled={creatingRFQ} className="mt-3" >
                  <FontAwesomeIcon icon={faRocket} className="me-2" />
                  {creatingRFQ ? "Processing..." : "Create RFQ's"}
                </Button>
              </div>
            </>
          )}
        </Modal.Body>

      </Modal>
    </>
  );
};

export default MagicSearchDownloadModal;
