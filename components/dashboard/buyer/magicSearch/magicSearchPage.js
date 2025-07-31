import { faCloudArrowUp, faClose } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useEffect, useRef, useState } from 'react';
import { Button } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import { toast } from "react-toastify";
import { faFileExcel } from "@fortawesome/free-regular-svg-icons";
import { getFuturedate, formatISOToDateTimeLocal, handleFileUpload, extractfileName } from "@/utils/sharedFunctions";
import { getProjectList } from "@/services/project";
import { createRfq, getBOQexcelToJsonAI, getMagicRFQPreview, vendorApproveList, getDraftData, pollBOQResult, persistMagicSearchJob } from "@/services/rfq";
import ReviewProducts from "./ReviewProducts";
import FullLoader from "@/components/shared/FullLoader";
import ConfirmationModal from "@/components/modal/ConfirmationModal";
import Select from 'react-select';
import { getCities, getCountries, getCountryCodes, getStates } from "@/services/cms";
import ProductSearchModal from "../../../modal/ProductSearchModal";
import { vendorConditions } from "../../vendor/search";
import axiosInstance from "@/lib/axios";
import MagicSearchDownloadModal from "@/components/modal/MagicSearchDownloadModal";
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
                            <div className="col-md-8 mx-auto mt-2">
                              <MagicSearchDownloadModal
                                onUploadForRFQ={handleUploadForRFQ}
                              />
                            </div>
                            <div className="col-md-8 mx-auto">
                              <h2 className="title fs-6 mb-2">
                                Step 2: Upload Your File and other details.
                              </h2>
                              <div
                                className="file-drop-area text-center rounded py-4"
                                style={{
                                  border: "2px dashed grey",
                                  cursor: "pointer",
                                  backgroundColor: "#fff",
                                  color: "green",
                                }}
                                onClick={() =>
                                  document.getElementById("fileInput").click()
                                }
                              >
                                <FontAwesomeIcon
                                  icon={fileName ? faFileExcel : faCloudArrowUp}
                                  style={{ fontSize: "45px" }}
                                />
                                <p className="fw-semibold ">
                                  {fileName ||
                                    "Upload / Drag and drop your excel file here"}
                                </p>
                              </div>

                              {/* //{ Hidden File Input } */}
                              <input
                                id="fileInput"
                                type="file"
                                accept=".xlsx, .xls"
                                style={{ display: "none" }}
                                onChange={handleMagicFileUpload}
                              />

                              {/* Custom Instructions Input */}
                              {/* <div className="mt-3">
                        <label htmlFor="customInstructions" className="form-label">
                          <strong>Custom Instructions (Optional)</strong>
                        </label>
                        <textarea
                          id="customInstructions"
                          className="form-control"
                          rows="3"
                          placeholder="Add any specific instructions or requirements for the AI when preparing the RFQ..."
                          value={customInstructions}
                          onChange={(e) => setCustomInstructions(e.target.value)}
                        />
                        <small className="form-text text-muted">
                          These instructions will be considered by the AI when processing your BOQ and preparing the RFQ.
                        </small>
                      </div> */}
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
                              ) : (
                                <Button
                                  variant="secondary"
                                  className="ms-auto border-0 mt-4"
                                  style={{ width: "280px" }}
                                  onClick={uploadToServer}
                                >
                                  Automatically Generate RFQ's
                                </Button>
                              )}
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
