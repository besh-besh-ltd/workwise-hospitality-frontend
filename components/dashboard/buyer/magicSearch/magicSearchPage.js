import { faCloudArrowUp, faClose } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useEffect, useRef, useState } from 'react';
import { Button } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import { toast } from "react-toastify";
import { faFileExcel } from "@fortawesome/free-regular-svg-icons";
import { getFuturedate, formatISOToDateTimeLocal, handleFileUpload, extractfileName } from "@/utils/sharedFunctions";
import { getProjectList } from "@/services/project";
import { createRfq, getBOQexcelToJsonAI, getMagicRFQPreview, vendorApproveList, getDraftData, pollBOQResult, persistMagicSearchJob, getSImplifiedVersionOfBOQ } from "@/services/rfq";
import ReviewProducts from "./ReviewProducts";
import FullLoader from "@/components/shared/FullLoader";
import ConfirmationModal from "@/components/modal/ConfirmationModal";
import Select from 'react-select';
import { getCities, getCountries, getCountryCodes, getStates } from "@/services/cms";
import ProductSearchModal from "../../../modal/ProductSearchModal";
import { vendorConditions } from "../../vendor/search";
import axiosInstance from "@/lib/axios";
import { useRouter } from "next/router";
import ProcessingRFQ from "./processingRFQ/ProcessingRFQ";

const MagicSearchPage = () => {
    const router = useRouter();
    const [file, setFile] = useState(null);
    const [fileName, setFileName] = useState('');
    const [reviewData, setReviewData] = useState(null);
    // const [customInstructions, setCustomInstructions] = useState(''); // Commented out custom instruction flow

    const [loading, setLoading] = useState(false);
    const [apiData, setApiData] = useState(null);
    const [tab, setTab] = useState(router.query?.tab ?? 'upload-file'); // upload-file, processing-files

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [pendingRemoval, setPendingRemoval] = useState(null);

    // BOQ Simplification states
    const [simplifyFile, setSimplifyFile] = useState(null);
    const [simplifyFileName, setSimplifyFileName] = useState('');
    const [simplifyUploading, setSimplifyUploading] = useState(false);

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1); // Tomorrow's date

    const defaultEndDate = new Date(today);
    defaultEndDate.setDate(today.getDate() + 30); // Default to 30 days ahead

    const handleMagicFileUpload = (event) => {
        const file = event.target.files[0];
        if (file) {
            const fileType = file.name.split('.').pop().toLowerCase();
            const validTypes = ['xlsx', 'xls'];
            if (!validTypes.includes(fileType)) {
                toast.error('Please upload a valid Excel file (xlsx, xls)');
            } else {
                setFileName(file.name);
                setFile(file);
            }
        }
        // when we upload the same file again.
        event.target.value = null;
    };

    const handleSimplifyFileUpload = (event) => {
        const file = event.target.files[0];
        if (file) {
            const fileType = file.name.split('.').pop().toLowerCase();
            const validTypes = ['xlsx', 'xls'];
            if (!validTypes.includes(fileType)) {
                toast.error('Please upload a valid Excel file (xlsx, xls)');
            } else {
                setSimplifyFileName(file.name);
                setSimplifyFile(file);
            }
        }
        // when we upload the same file again.
        event.target.value = null;
    };

    const handleSimplifyUpload = async () => {
        if (!simplifyFile) {
            toast.error("Please select a file!");
            return;
        }

        try {
            setSimplifyUploading(true);
            const persistJob = await persistMagicSearchJob(simplifyFileName, 'simplified');
            const webhook = persistJob.webhook;

            const startResponse = await getSImplifiedVersionOfBOQ(simplifyFile, webhook);
            if (startResponse) {
                const response = startResponse.data;
                toast.success(response.message);
                setSimplifyFile(null);
                setSimplifyFileName('');
                setTab('processing-files');
            } else {
                toast.error("Server is too busy to handle your request, please try again in some time...");
            }
        } catch (error) {
            console.error("Upload failed:", error);
            toast.error(error?.response?.data?.detail || "Simplified BOQ creation failed. Please try again.");
        } finally {
            setSimplifyUploading(false);
        }
    };

const uploadToServer = async (processed_file) => {
  if (!file && !processed_file) {
    toast.error("Please select a file!");
    return;
  }

  if (!file && processed_file && !processed_file instanceof File) {
    toast.error("Processed file is not an instance of File!");
    return;
  }

  const curFile = file || processed_file;
  const curFileName = fileName || processed_file.name;

  try {
    setLoading(true);

    // Step 1: Start async task and get task_id
    const persistJob = await persistMagicSearchJob(curFileName);
    const webhook = persistJob.webhook;

    const startResponse = await getBOQexcelToJsonAI(curFile, webhook);

    const response = startResponse.data;
    toast.success(response.message);
    setTab("processing-files");
  } catch (error) {
    console.log(error);
    console.error(error?.response?.data?.detail);
    toast.error(
      error?.response?.data?.detail ||
        "RFQ creation failed. Please try again later."
    );
  } finally {
    setLoading(false);
    setFile(null);
    setFileName("");
    // setCustomInstructions(''); // Reset custom instructions
  }
};

    // to handle the modal response
    const handleConfirm = () => {
        if (pendingRemoval) {
            const { prodItem } = pendingRemoval;
            setReviewData(prevData => ({
                ...prevData,
                products: prevData.products.filter(item =>
                    !(item.product_id === prodItem.product_id && item.variant === prodItem.variant)
                )
            }));
        }
        setIsModalOpen(false);
        setPendingRemoval(null);
    };

    const handleClose = () => {
        setIsModalOpen(false);
        setPendingRemoval(null);
    };

    const handleSeeMyRfq = () => {
      // router.push(`/dashboard/buyer/rfq-management?tab=create-rfq&draft_id=${apiData.savedRfq}`)
     window.open(
    `/dashboard/buyer/rfq-management?tab=create-rfq&draft_id=${apiData.savedRfq}`,
    '_blank'
  );
    };

    // once user created unstructure to structure excel fuile, and click on next button, we will call this function to create RFQ, by uploading the same file user uploaded to unstructure to structure
  const handleUploadForRFQ = async (webhook) => {
  try {
    setLoading(true);
    setTab('processing-files')
    // setApiData(response);
  } catch (error) {
    console.error("RFQ Preview fetch failed:", error);
    toast.error("Failed to generate RFQ preview.");
  } finally {
    setLoading(false);
  }
};

    const handleRFQCreateFromProcessedFile = async (excel_link, file_name) => {
      try {
        const response = await fetch(excel_link);
        const blob = await response.blob();

        // Extract file name from URL or use fallback
        const urlParts = excel_link.split("/");
        const filename =
          file_name ?? urlParts[urlParts.length - 1] ?? "downloaded.xlsx";

        // Create a File instance
        const file = new File([blob], filename, { type: blob.type });

        await uploadToServer(file);
      } catch (err) {
        console.error("Download or upload failed:", err);
        toast.error("Failed to download and upload file");
      }
    };

    return (
      <>
        {loading && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.7)",
              color: "white",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              flexDirection: "column",
              zIndex: 9999,
              fontSize: "24px",
            }}
          >
            <p>AI is scanning your BOQ...</p>
          </div>
        )}

        {/* Header Section */}
        <section className="vendor-common-header sc-pt-80">
          <div className="container-fluid text-center">
            <h1 className="heading">Magic Search</h1>
          </div>
        </section>

        {/* File Upload Section */}
        <section className="buyer-rfq-sec-1 buyer-rfq-sec-tab">
          <div className="container-fluid">
            <div className="row">
              <div className="col-md-12">
                <div className="tabs-container">
                  <button
                    className={`tab ${tab === "upload-file" ? "active" : ""}`}
                    onClick={() => setTab("upload-file")}
                  >
                    Upload File
                  </button>
                  <button
                    className={`tab ${tab === "processing-files" ? "active" : ""}`}
                    onClick={() => setTab("processing-files")}
                  >
                    Processing Files
                  </button>
                </div>

                {tab === "upload-file" && (
                  <section className="">
                    <div className="product-search">
                      <div className="container-lg bg-white rounded-4 p-5">
                        {!reviewData ? (
                          <>
                            {/* Side by side components */}
                            <div className="row">
                              {/* BOQ Simplification Component */}
                              <div className="col-md-6">
                                <div className="h-100 p-4 border rounded-3" style={{ backgroundColor: '#f8f9fa' }}>
                                  <div className="text-center mb-4">
                                    <FontAwesomeIcon 
                                      icon={faFileExcel} 
                                      className="text-success mb-3" 
                                      style={{ fontSize: "48px" }} 
                                    />
                                    <h3 className="h5 mb-2">Simplify Your BOQ</h3>
                                    <p className="text-muted small">
                                      Upload your complex BOQ file and Workwise AI will simplify it for you.
                                    </p>
                                  </div>

                                  <div
                                    className="file-drop-area text-center rounded py-4 mb-3"
                                    style={{
                                      border: "2px dashed #28a745",
                                      cursor: "pointer",
                                      backgroundColor: "#fff",
                                      color: "#28a745",
                                      transition: "all 0.3s ease"
                                    }}
                                    onClick={() => document.getElementById("simplifyFileInput").click()}
                                    onMouseEnter={(e) => {
                                      e.target.style.borderColor = "#1e7e34";
                                      e.target.style.backgroundColor = "#f8fff9";
                                    }}
                                    onMouseLeave={(e) => {
                                      e.target.style.borderColor = "#28a745";
                                      e.target.style.backgroundColor = "#fff";
                                    }}
                                  >
                                    <FontAwesomeIcon
                                      icon={simplifyFileName ? faFileExcel : faCloudArrowUp}
                                      style={{ fontSize: "45px" }}
                                    />
                                    <p className="fw-semibold mb-0">
                                      {simplifyFileName || "Upload / Drag and drop your excel file here"}
                                    </p>
                                  </div>

                                  <input
                                    id="simplifyFileInput"
                                    type="file"
                                    accept=".xlsx, .xls"
                                    style={{ display: "none" }}
                                    onChange={handleSimplifyFileUpload}
                                  />

                                  <div className="text-center">
                                    <Button 
                                      variant="success" 
                                      onClick={handleSimplifyUpload} 
                                      disabled={simplifyUploading || !simplifyFile}
                                      className="px-4"
                                    >
                                      <FontAwesomeIcon icon={faCloudArrowUp} className="me-2" />
                                      {simplifyUploading ? "Simplifying..." : "Simplify BOQ"}
                                    </Button>
                                  </div>

                                  <div className="text-center mt-3">
                                    <small className="text-muted">
                                      AI will restructure and clean your BOQ for better processing
                                    </small>
                                  </div>
                                </div>
                              </div>

                              {/* BOQ to RFQ Component */}
                              <div className="col-md-6">
                                <div className="h-100 p-4 border rounded-3" style={{ backgroundColor: '#f8f9fa' }}>
                                  <div className="text-center mb-4">
                                    <FontAwesomeIcon 
                                      icon={faFileExcel} 
                                      className="text-primary mb-3" 
                                      style={{ fontSize: "48px" }} 
                                    />
                                    <h3 className="h5 mb-2">BOQ to RFQ with AI</h3>
                                    <p className="text-muted small">
                                      Upload your BOQ file and automatically generate comprehensive RFQs.
                                    </p>
                                  </div>

                                  <div
                                    className="file-drop-area text-center rounded py-4 mb-3"
                                    style={{
                                      border: "2px dashed #007bff",
                                      cursor: "pointer",
                                      backgroundColor: "#fff",
                                      color: "#007bff",
                                      transition: "all 0.3s ease"
                                    }}
                                    onClick={() => document.getElementById("fileInput").click()}
                                    onMouseEnter={(e) => {
                                      e.target.style.borderColor = "#0056b3";
                                      e.target.style.backgroundColor = "#f8fbff";
                                    }}
                                    onMouseLeave={(e) => {
                                      e.target.style.borderColor = "#007bff";
                                      e.target.style.backgroundColor = "#fff";
                                    }}
                                  >
                                    <FontAwesomeIcon
                                      icon={fileName ? faFileExcel : faCloudArrowUp}
                                      style={{ fontSize: "45px" }}
                                    />
                                    <p className="fw-semibold mb-0">
                                      {fileName || "Upload / Drag and drop your excel file here"}
                                    </p>
                                  </div>

                                  <input
                                    id="fileInput"
                                    type="file"
                                    accept=".xlsx, .xls"
                                    style={{ display: "none" }}
                                    onChange={handleMagicFileUpload}
                                  />

                                  <div className="text-center">
                                    <Button 
                                      variant="primary" 
                                      onClick={uploadToServer} 
                                      disabled={loading || !file}
                                      className="px-4"
                                    >
                                      <FontAwesomeIcon icon={faCloudArrowUp} className="me-2" />
                                      {loading ? "Generating RFQ..." : "Generate RFQ"}
                                    </Button>
                                  </div>

                                  <div className="text-center mt-3">
                                    <small className="text-muted">
                                      AI will analyze your BOQ and create detailed RFQs automatically
                                    </small>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </>
                        ) : null}

                        <div className="mx-auto">
                          <div className="row">
                            <div className="col-7"></div>
                            <div className="col-5 d-flex">
                              {reviewData ? (
                                <Button
                                  variant="secondary"
                                  className="ms-auto border-0"
                                  style={{ width: "180px" }}
                                  onClick={handleSeeMyRfq}
                                >
                                  Edit My RFQ
                                </Button>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>
                )}
                {tab === "processing-files" && <ProcessingRFQ handleCreateRFQ={handleRFQCreateFromProcessedFile} />}
              </div>
            </div>
          </div>
        </section>

        <ConfirmationModal
          isOpen={isModalOpen}
          onClose={handleClose}
          onConfirm={handleConfirm}
          message={
            "This will remove all vendors for this product. Do you want to continue?"
          }
        />
      </>
    );
}

export default MagicSearchPage;
