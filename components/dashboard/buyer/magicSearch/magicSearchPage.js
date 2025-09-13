import { faCloudArrowUp, faClose } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useEffect, useRef, useState } from 'react';
import { Button } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import { toast } from "react-toastify";
import { faFileExcel } from "@fortawesome/free-regular-svg-icons";
import { getFuturedate, formatISOToDateTimeLocal, handleFileUpload, extractfileName } from "@/utils/sharedFunctions";
import { getProjectList } from "@/services/project";
import { createRfq, getBOQexcelToJsonAI, getMagicRFQPreview, vendorApproveList, getDraftData, pollBOQResult, persistMagicSearchJob, getSImplifiedVersionOfBOQ, handleUploadFile } from "@/services/rfq";
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
    const [fileData, setFileData] = useState({
      file: null,
      s3Url: null,
      name: null,
    })
    const [reviewData, setReviewData] = useState(null);
    // const [customInstructions, setCustomInstructions] = useState(''); // Commented out custom instruction flow

    const [loading, setLoading] = useState(false);
    const [apiData, setApiData] = useState(null);
    const [tab, setTab] = useState('upload-file'); // upload-file, processing-files

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [pendingRemoval, setPendingRemoval] = useState(null);
    
    // Confirmation modal states for file uploads
    const [showSimplifyConfirmModal, setShowSimplifyConfirmModal] = useState(false);
    const [showRFQConfirmModal, setShowRFQConfirmModal] = useState(false);

    // BOQ Simplification states
    const [simplifyFileData, setSimplifyFileData] = useState({
      file: null,
      s3Url: null,
      name: null,
    })
    const [simplifyUploading, setSimplifyUploading] = useState(false);

    // Update URL when tab changes
    const handleTabChange = (newTab) => {
        setTab(newTab);
        router.push({
            pathname: router.pathname,
            query: { ...router.query, tab: newTab }
        }, undefined, { shallow: true });
    };

    const handleUploadRawFile = async (type) => {
      setLoading(true);
      try {
        const res = await handleUploadFile(type == 'boq-to-rfq' ? fileData.file : simplifyFileData.file);
        if(res && res.data) {
          let path = res.data[0].file_path;
          if(type == 'boq-to-rfq')
            setFileData((prev) => ({ ...prev, s3Url: path }));
          else if (type == 'simplify')
            setSimplifyFileData((prev) => ({ ...prev, s3Url: path }));
        }
      } catch (error) {
        console.error(error);
        toast.error(error.message ?? "Something went wrong while uploading file")
      } finally {
        setLoading(false);
      }
    }

    // Handle tab persistence on page load/refresh
    useEffect(() => {
        if (router.query?.tab) {
            setTab(router.query.tab);
        }
    }, [router.query?.tab]);

    useEffect(() => {
      if(fileData.file)
        handleUploadRawFile('boq-to-rfq');
    }, [fileData.file])

    useEffect(() => {
      if(simplifyFileData.file)
        handleUploadRawFile('simplify');
    }, [simplifyFileData.file])

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
                setFileData(prev => ({...prev, file, name: file.name}));
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
                setSimplifyFileData(prev => ({...prev, file, name: file.name}));
            }
        }
        // when we upload the same file again.
        event.target.value = null;
    };

    const handleSimplifyUpload = async () => {
        if (!simplifyFileData.file) {
            toast.error("Please select a file!");
            return;
        }
        await confirmSimplifyUpload();
    };

    const confirmSimplifyUpload = async () => {
        try {
            setSimplifyUploading(true);
            const persistJob = await persistMagicSearchJob(simplifyFileData.name, 'simplified', simplifyFileData.s3Url);
            const webhook = persistJob.webhook;

            const startResponse = await getSImplifiedVersionOfBOQ(simplifyFileData.file, webhook);
            
            // Show modal after API call regardless of response
            setShowSimplifyConfirmModal(true);
            
            if (startResponse) {
                const response = startResponse.data;
                toast.success(response.message);
            } else {
                toast.error("Server is too busy to handle your request, please try again in some time...");
            }
        } catch (error) {
            console.error("Upload failed:", error);
            toast.error(error?.response?.data?.detail || "Simplified BOQ creation failed. Please try again.");
            
            // Show modal even on error
            setShowSimplifyConfirmModal(true);
        } finally {
            setSimplifyUploading(false);
        }
    };

    const handleSimplifyConfirm = () => {
        setSimplifyFileData({
          file: null,
          s3Url: null,
          name: null,
        })
        handleTabChange('processing-files');
        setShowSimplifyConfirmModal(false);
    };

    const closeSimplifyConfirmModal = () => {
        setShowSimplifyConfirmModal(false);
    };

const uploadToServer = async (processed_file, raw_url) => {
  if (!fileData.file && !processed_file) {
    toast.error("Please select a file!");
    return;
  }

  if (!fileData.file && processed_file && !processed_file instanceof File) {
    toast.error("Processed file is not an instance of File!");
    return;
  }

  const curFile = fileData.file || processed_file;
  const curFileName = fileData.name || processed_file.name;

  try {
    setLoading(true);

    // Step 1: Start async task and get task_id
    console.log("FILE DATA:", fileData);
    const persistJob = await persistMagicSearchJob(curFileName, 'rfq', raw_url || fileData.s3Url);
    const webhook = persistJob.webhook;
    
    if(!webhook) {
      setShowRFQConfirmModal(true);
      return toast.info("The BOQ is already under processing, please head to the list of files tab to view more!")
    }

    const startResponse = await getBOQexcelToJsonAI(curFile, webhook);

    // Show modal after API call regardless of response
    setShowRFQConfirmModal(true);

    if (startResponse) {
      const response = startResponse.data;
      toast.success(response.message);
    } else {
      toast.error("Server is too busy to handle your request, please try again in some time...");
    }
  } catch (error) {
    console.log(error);
    console.error(error?.response?.data?.message);
    toast.error(
      error?.response?.data?.message ||
        "RFQ creation failed. Please try again later."
    );
    
    // Show modal even on error
    setShowRFQConfirmModal(true);
  } finally {
    setLoading(false);
  }
};

const confirmRFQUpload = async () => {
  try {
    // Only switch tab on confirmation
    handleTabChange("processing-files");
  } catch (error) {
    console.error("Failed to switch tab:", error);
    toast.error("Failed to switch to processing tab.");
  } finally {
    setFileData({
      file: null,
      s3Url: null,
      name: null,
    });
    setShowRFQConfirmModal(false);
  }
};

const closeRFQConfirmModal = () => {
  setShowRFQConfirmModal(false);
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
    handleTabChange('processing-files')
    // setApiData(response);
  } catch (error) {
    console.error("RFQ Preview fetch failed:", error);
    toast.error("Failed to generate RFQ preview.");
  } finally {
    setLoading(false);
  }
};

    const handleRFQCreateFromProcessedFile = async (excel_link, file_name, raw_file_url) => {
      try {
        if(process.env.NEXT_PUBLIC_ENV == "production" && !excel_link.includes("https")) {
          excel_link = excel_link.replace("http", "https")
        }
        
        const response = await fetch(excel_link);
        const blob = await response.blob();

        // Extract file name from URL or use fallback
        const urlParts = excel_link.split("/");
        const filename =
          file_name ?? urlParts[urlParts.length - 1] ?? "downloaded.xlsx";

        // Create a File instance
        const file = new File([blob], filename, { type: blob.type });

        await uploadToServer(file, raw_file_url);
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
          <div className="container-fluid">
            <h1 className="heading text-start">BOQ Automation</h1>
          </div>
        </section>

        {/* File Upload Section */}
        <section className="buyer-rfq-sec-1 buyer-rfq-sec-tab">
          <div className="container-fluid">
            <div className="row">
              <div className="col-md-12">
                <div className="tabs-container">
                  <button
                    id="upload_file-magic_search_tabs-magic_search_page"
                    className={`tab ${tab === "upload-file" ? "active" : ""}`}
                    onClick={() => handleTabChange("upload-file")}
                  >
                    Upload File
                  </button>
                  <button
                    id="processing_files-magic_search_tabs-magic_search_page"
                    className={`tab ${tab === "processing-files" ? "active" : ""}`}
                    onClick={() => handleTabChange("processing-files")}
                  >
                    List of Files
                  </button>
                </div>

                {tab === "upload-file" && (
                  <section className="">
                    <div className="product-search">
                      <div className="container-lg bg-white rounded-4 p-5 shadow-sm" style={{ padding: '40px 60px' }}>
                        {!reviewData ? (
                          <>
                            {/* Side by side components */}
                            <div className="row">
                              {/* BOQ Simplification Component */}
                              <div className="col-md-6">
                                <div className="h-100 p-4 border rounded-3 bg-white shadow" style={{ marginBottom: '20px' }}>
                                  <div className="mb-4">
                                    <div className="d-flex align-items-center mb-3">
                                      <FontAwesomeIcon 
                                        icon={faFileExcel} 
                                        className="text-success me-3" 
                                        style={{ fontSize: "48px" }} 
                                      />
                                      <h3 className="h5 mb-0">Simplify Your BOQ</h3>
                                    </div>
                                    <p className="text-muted small">
                                      Transform messy BOQs into structured, organized data ready for RFQs in seconds.
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
                                      icon={simplifyFileData.name ? faFileExcel : faCloudArrowUp}
                                      style={{ fontSize: "45px" }}
                                    />
                                    <p className="fw-semibold mb-0">
                                      {simplifyFileData.name || "Upload/Drag & drop your Excel file here"}
                                    </p>
                                  </div>

                                  <input
                                    id="simplifyFileInput"
                                    type="file"
                                    accept=".xlsx, .xls"
                                    style={{ display: "none" }}
                                    onChange={handleSimplifyFileUpload}
                                  />

                                  <div className="mb-3">
                                    <small className="text-muted">
                                      Only Excel files supported
                                    </small>
                                  </div>

                                  <div className="text-center">
                                    <Button 
                                      variant="success" 
                                      onClick={handleSimplifyUpload} 
                                      disabled={loading || simplifyUploading || !simplifyFileData.file}
                                      className="px-4 w-100"
                                    >
                                      <FontAwesomeIcon icon={faCloudArrowUp} className="me-2" />
                                      {simplifyUploading ? "Simplifying..." : "Simplify BOQ Now"}
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
                                <div className="h-100 p-4 border rounded-3 bg-white shadow" style={{ marginBottom: '20px' }}>
                                  <div className="mb-4">
                                    <div className="d-flex align-items-center mb-3">
                                      <FontAwesomeIcon 
                                        icon={faFileExcel} 
                                        className="text-primary me-3" 
                                        style={{ fontSize: "48px" }} 
                                      />
                                      <h3 className="h5 mb-0">Create RFQ with AI</h3>
                                    </div>
                                    <p className="text-muted small">
                                      Generate comprehensive RFQs automatically with AI assistance for faster procurement.
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
                                      icon={fileData.name ? faFileExcel : faCloudArrowUp}
                                      style={{ fontSize: "45px" }}
                                    />
                                    <p className="fw-semibold mb-0">
                                      {fileData.name || "Upload/Drag & drop your Excel file here"}
                                    </p>
                                  </div>

                                  <input
                                    id="fileInput"
                                    type="file"
                                    accept=".xlsx, .xls"
                                    style={{ display: "none" }}
                                    onChange={handleMagicFileUpload}
                                  />

                                  <div className="mb-3">
                                    <small className="text-muted">
                                      Only Excel files supported
                                    </small>
                                  </div>

                                  <div className="text-center">
                                    <Button 
                                      variant="primary" 
                                      onClick={uploadToServer} 
                                      disabled={loading || !fileData.file}
                                      className="px-4 w-100"
                                    >
                                      <FontAwesomeIcon icon={faCloudArrowUp} className="me-2" />
                                      {loading ? "Generating RFQ..." : "Generate RFQ Now"}
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
                                  id="edit_my_rfq-magic_search_actions-magic_search_page"
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
          title="Remove Vendors"
          description="This will remove all vendors for this product. Do you want to continue?"
          confirmButtonColor="danger"
          confirmButtonText="Yes"
          cancelButtonText="No"
          showCloseButton={true}
        />

        {/* BOQ Simplification Confirmation Modal */}
        <ConfirmationModal
          isOpen={showSimplifyConfirmModal}
          onClose={closeSimplifyConfirmModal}
          onConfirm={handleSimplifyConfirm}
          title="BOQ Simplification Initiated"
          description={`BOQ simplification has been initiated for the file "${simplifyFileData.name}". Do you want to switch to the processing tab to monitor the progress?`}
          confirmButtonColor="success"
          confirmButtonText="Switch to Processing"
          cancelButtonText="Cancel"
          showCloseButton={false}
        />

        {/* RFQ Generation Confirmation Modal */}
        <ConfirmationModal
          isOpen={showRFQConfirmModal}
          onClose={closeRFQConfirmModal}
          onConfirm={confirmRFQUpload}
          title="RFQ Generation Initiated"
          description={`RFQ generation has been initiated for the file "${fileData.name}". Do you want to switch to the processing tab to monitor the progress?`}
          confirmButtonColor="primary"
          confirmButtonText="Switch to Processing"
          cancelButtonText="Cancel"
          showCloseButton={false}
        />
      </>
    );
}

export default MagicSearchPage;
