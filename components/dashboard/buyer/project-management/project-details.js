import DynamicFormModal from '@/components/modal/DynamicFormModal';
import Loader from '@/components/shared/Loader';
import Pagination from '@/components/shared/Pagination';
import { getProjectBudget, getProjectById, updateProject, uploadProjectFile } from '@/services/project';
import { faEdit } from '@fortawesome/free-regular-svg-icons';
import { faCloudArrowUp, faWandMagicSparkles } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { set } from 'lodash';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRouter } from 'next/router';
import React, { useEffect, useRef, useState } from 'react'
import PlaceholderLoading from 'react-placeholder-loading'
import { toast } from 'react-toastify';
import { formatDisplayDate } from "@/utils/sharedFunctions";

const ProjectDetails = () => {
    const pathname = usePathname();
    const router = useRouter();

    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [totalData, setTotalData] = useState(100);

    const [uploading, setUploading] = useState(false);
    const [loading, setLoading] = useState(false);
    const [editLoading, setEditLoading] = useState(false);
    const [projectDetails, setProjectDetails] = useState(null);
    const [openEditProject, setOpenEditProject] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [dropdownValue, setDropdownValue] = useState("");
    const [files, setFiles] = useState({});
    const [projectBudget, setProjectBudget] = useState([]);
    const [avlBudget , setAvlBudget] = useState(0);

    const { projectID } = router.query;

    const projectIdRef = useRef(null);
    const fileInputRef = useRef(null);

    const fileTypeDisplayNames = {
        vendorList: "Vendor List",
        tenderDocument: "Tender Document",
        boq: "BOQ",
        po: "PO",
        tc : "T&C",
        otherDocuments: "Other Documents",
    };

    const fileTypeOrder = ["vendorList", "tenderDocument", "boq", "po","tc", "otherDocuments"];

    const getProjectDetails = () => {
        setLoading(true)
        const payload = { page, limit };

        getProjectById(projectIdRef.current, payload)
            .then((res) => {
                // Extract project data with fallbacks for different response formats
                const projectData = res?.data?.data?.[0] || 
                                   (Array.isArray(res?.data) ? res.data[0] : res?.data?.data || res?.data);
                
                if (projectData) {
                    setProjectDetails(projectData);
                    setTotalData(projectData.rfqs?.length || 0);
                    setFiles(projectData.files || {});
                } else {
                    toast.error("Could not retrieve project details");
                }
            })
            .catch((error) => {
                console.error("Error fetching project details:", error);
                toast.error("Failed to load project details");
            })
            .finally(() => {
                setLoading(false);
            });
    }

    const handleFileChange = (e) => {
        const uploadedFiles = e.target.files;
        if (!uploadedFiles || !uploadedFiles.length) return;
    
        const maxFileSize = 25000000;
        const oversizedFiles = [];
        const validFiles = [];
    
        Array.from(uploadedFiles).forEach((file) => {
            if (file.size > maxFileSize) {
                oversizedFiles.push(file.name);
            } else {
                validFiles.push(file);
            }
        });
    
        if (oversizedFiles.length > 0) {
            toast.error(`The following files are too large (>25MB): ${oversizedFiles.join(", ")}`);
        }
    
        setSelectedFiles(validFiles);
    };
    
 const getProjectBudgetData = async () => {
        if (!projectID) return;
        
        setLoading(true);
        try {
            const res = await getProjectBudget(projectID);
           let avlAmount = 0;
           const processedData = (res || []).map((item) => {
             avlAmount += parseFloat(item.total_value) || 0;
             return {
               ...item,
               total_value: parseFloat(item.total_value) || 0,
             };
           });
           setAvlBudget(avlAmount);

        setProjectBudget(processedData);
        // Handle different response structures
            if (res) {
                setProjectBudget(res);
            
            } else {
                setProjectBudget([]);
            }
            
        } catch (error) {
            setProjectBudget([]); // Reset to empty array on error
        } finally {
            setLoading(false);
        }
    };
   useEffect(() => {
        if (projectID && projectID !== 'undefined') {
            getProjectBudgetData();
        }
    }, [projectID]);

  


    const handleDropdownChange = (e) => {
        setDropdownValue(e.target.value);
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedFiles.length || !dropdownValue) {
            toast.error("Please select files and a dropdown value before submitting.");
            return;
        }

        const formData = new FormData();
        selectedFiles.forEach((file) => formData.append("files", file));
        formData.append("project_id", projectIdRef.current);
        formData.append("file_type", dropdownValue);

        setUploading(true);
        try {

            const response = await uploadProjectFile(formData); 

            setSelectedFiles([]);

            setFiles((prevFiles) => ({
                ...prevFiles,
                [response.file_type]: [
                  ...(prevFiles[response.file_type] || []),
                  ...response.files.map((file) => ({
                    url: file.location,
                    name: file.originalname,
                  })),
                ],
              }));
              
            fileInputRef.current.value = "";
            
            toast.success("Files uploaded successfully!");
        } catch (err) {
            console.error("Error uploading files:", err);
            toast.error("Failed to upload files.");
        } finally {
            setUploading(false);
        }
    };

    const handleEditProject = (values, resetForm) => {
        setEditLoading(true);
        let payload = {
            status: 1,
            description: values.description,
            location: values.location,
            ended_at: values.ended_at ? values.ended_at: null,
            rfq_type: values.rfq_type,
            reverse_auction: values.reverse_auction == "1" ? 1 : 0,
            budget: values.budget || 0, // Ensure budget is always a number
        };

        setOpenEditProject(false);
        updateProject(projectIdRef.current, payload)
            .then((res) => {
                toast.success(`Project "${res?.data?.name}" has been updated successfully!`, { position: "top-right" });
                 // Call getProjectDetails instead of getProjects which doesn't exist
                getProjectDetails();
            })
            .catch((error) => {
                toast.error(error.message?.response?.data?.message, { position: "top-right", });
                console.log(error)
            })
            .finally(() => {
                resetForm();                
                setEditLoading(false);
            })
    }

    useEffect(() => {
        const pathParts = pathname?.split('/');
        const pathLen = pathParts?.length;
        if (pathname && !isNaN(pathLen)) {
            const projectId = pathParts[pathLen - 1];
            if (projectId) {
                projectIdRef.current = projectId;
                getProjectDetails();
            }
        }
    }, [pathname, page, limit])


    return (
      <>
        {editLoading && <Loader />}
        <section className="vendor-common-header sc-pt-80">
          <div className="container-fluid d-flex align-items-center justify-content-between">
            <h1 className="heading mb-0 fs-1">Project Details</h1>
          </div>
        </section>

        <section className="vendor-mngt-sec-1">
          <div className="container-fluid">
            <div className="row">
              <div className="col-md-12">
                <div className="vendor-mngt-con">
                  {/* Project Overview Section */}
                  <div className="details-table p-4 mb-5">
                    <div className="d-flex justify-content-between">
                      <h3 className="title mb-0">
                        {loading ? (
                          <span className="d-block mt-1">
                            <PlaceholderLoading
                              shape="rect"
                              width={80}
                              height={20}
                            />
                          </span>
                        ) : (
                          projectDetails?.name
                        )}
                      </h3>
                      <button
                        type="button"
                        className="page-link backBtn btn btn-primary text-sm text-white px-2 m-0 "
                        style={{
                          width: "100px",
                          backgroundColor: "var(--primary-color)",
                        }}
                        onClick={() => setOpenEditProject(true)}
                                            id="edit_project-project_actions-project_details_page"
                      >
                        <FontAwesomeIcon icon={faEdit} className="me-2" />
                        Edit
                      </button>
                    </div>
                    <hr />

                    <div className="row">
                      <div className="col-md-6">
                        <div className="mb-2">
                          <span className="fw-bold">Description </span>
                          {loading ? (
                            <span className="d-block mt-1">
                              <PlaceholderLoading
                                shape="rect"
                                width={80}
                                height={20}
                              />
                            </span>
                          ) : (
                            <span className="d-block fw-medium text-muted px-2">
                              {projectDetails?.description || "---"}
                            </span>
                          )}
                        </div>
                        <div className="mb-2">
                          <span className="fw-bold">Location </span>
                          {loading ? (
                            <span className="d-block mt-1">
                              <PlaceholderLoading
                                shape="rect"
                                width={80}
                                height={20}
                              />
                            </span>
                          ) : (
                            <span className="d-block fw-medium text-muted px-2">
                              {projectDetails?.location || "---"}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="row">
                          <div className="col-md-4 mb-2">
                            <span className="fw-bold">Total Tender / RFQs </span>
                            {loading ? (
                              <span className="d-block mt-1">
                                <PlaceholderLoading
                                  shape="rect"
                                  width={80}
                                  height={20}
                                />
                              </span>
                            ) : (
                              <span className="d-block fw-medium text-muted px-2">
                                {projectDetails?.total_rfqs || "---"}
                              </span>
                            )}
                          </div>
                          <div className="col-md-4 mb-2">
                            <span className="fw-bold">Open Tender / RFQs </span>
                            {loading ? (
                              <span className="d-block mt-1">
                                <PlaceholderLoading
                                  shape="rect"
                                  width={80}
                                  height={20}
                                />
                              </span>
                            ) : (
                              <span className="d-block fw-medium text-muted px-2">
                                {projectDetails?.open_rfqs || "---"}
                              </span>
                            )}
                          </div>
                          <div className="col-md-4 mb-2">
                            <span className="fw-bold">Closed Tender / RFQs </span>
                            {loading ? (
                              <span className="d-block mt-1">
                                <PlaceholderLoading
                                  shape="rect"
                                  width={80}
                                  height={20}
                                />
                              </span>
                            ) : (
                              <span className="d-block fw-medium text-muted px-2">
                                {projectDetails?.closed_rfqs || "---"}
                              </span>
                            )}
                          </div>
                          <div className="col-md-4 mb-2">
                            <span className="fw-bold">Create Date </span>
                            {loading ? (
                              <span className="d-block mt-1">
                                <PlaceholderLoading
                                  shape="rect"
                                  width={80}
                                  height={20}
                                />
                              </span>
                            ) : (
                              <span className="d-block fw-medium text-muted px-2">
                                {projectDetails?.created_at?.slice(0, 10) ||
                                  "---"}
                              </span>
                            )}
                          </div>
                          <div className="col-md-4 mb-2">
                            <span className="fw-bold">End Date </span>
                            {loading ? (
                              <span className="d-block mt-1">
                                <PlaceholderLoading
                                  shape="rect"
                                  width={80}
                                  height={20}
                                />
                              </span>
                            ) : (
                              <span className="d-block fw-medium text-muted px-2">
                                {projectDetails?.ended_at?.slice(0, 10) ||
                                  "---"}
                              </span>
                            )}
                          </div>
                          <div className="col-md-4 mb-2" />
                          <div className="col-md-4 mb-2">
                            <span className="fw-bold">Project Stage </span>
                            {loading ? (
                              <span className="d-block mt-1">
                                <PlaceholderLoading
                                  shape="rect"
                                  width={80}
                                  height={20}
                                />
                              </span>
                            ) : (
                              <span className="d-block fw-medium text-muted px-2">
                                {projectDetails?.rfq_type == "firm"
                                  ? "Firm"
                                  : projectDetails?.rfq_type == "budgetary"
                                  ? "Budgetary"
                                  : "---"}
                              </span>
                            )}
                          </div>
                          <div className="col-md-4 mb-2">
                            <span className="fw-bold">Reverse Auction </span>
                            {loading ? (
                              <span className="d-block mt-1">
                                <PlaceholderLoading
                                  shape="rect"
                                  width={80}
                                  height={20}
                                />
                              </span>
                            ) : (
                              <span className="d-block fw-medium text-muted px-2">
                                {projectDetails?.reverse_auction
                                  ? "Enabled"
                                  : "Disabled"}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="row">
                    {/* Project Files Column */}
                    <div
                      className="col-md-6 pe-3"
                      style={{ maxHeight: "500px", overflowY: "auto" }}
                    >
                      <div className="project-files filter mb-5">
                        <h3 className="title">Project Files</h3>
                        <hr />

                        {fileTypeOrder.map(
                          (fileType) =>
                            files[fileType] &&
                            files[fileType].length > 0 && (
                              <div
                                key={fileType}
                                className="uploaded-files mt-4"
                              >
                                <h6 className="fw-bold">
                                  {fileTypeDisplayNames[fileType]}
                                </h6>
                                <div className="row mt-2">
                                  {files[fileType].map((file, idx) => (
                                    <div key={idx} className="col-md-2 px-2">
                                      <span
                                        className="badge bg-secondary d-inline-flex align-items-center justify-content-between w-100 my-1 py-2"
                                        style={{
                                          overflow: "hidden",
                                          textOverflow: "ellipsis",
                                          whiteSpace: "nowrap",
                                        }}
                                      >
                                        <a
                                          href={file.url}
                                          className="text-white"
                                          style={{
                                            textDecoration: "none",
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            maxWidth: "90%",
                                          }}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                        >
                                          {file.name}
                                        </a>
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )
                        )}

                        {Object.keys(files).length === 0 && (
                          <div>No file uploaded for this project yet!</div>
                        )}

                        <hr />

                        <div className="container mt-4 p-0 m-0">
                          <form onSubmit={handleSubmit}>
                            <div className="row g-3 align-items-center justify-content-between">
                              {/* File Input */}
                              <div className="col-md-6">
                                <input
                                  type="file"
                                  className="form-control"
                                  multiple
                                  onChange={handleFileChange}
                                  disabled={uploading}
                                  ref={fileInputRef}
                                  id="file_select-file_upload-project_details_page"
                                />
                              </div>

                              {/* Dropdown */}
                              <div className="col-md-4">
                                <select
                                  value={dropdownValue}
                                  onChange={handleDropdownChange}
                                  className="form-select col-md-2"
                                  style={{ minWidth: "150px" }}
                                  disabled={uploading}
                                >
                                  <option value="" disabled>
                                    Select Document Type
                                  </option>
                                  <option value="vendorList">
                                    Vendor List
                                  </option>
                                  <option value="tenderDocument">
                                    Tender Document
                                  </option>
                                  <option value="boq">BOQ</option>
                                  <option value="po">PO</option>
                                  <option value="tc">T&C</option>
                                  <option value="otherDocuments">
                                    Other Documents
                                  </option>
                                </select>
                              </div>

                              <div className="col-md-2">
                                {/* Submit Button */}
                                <button
                                  type="submit"
                                  className="btn btn-secondary py-2"
                                  disabled={
                                    uploading ||
                                    !selectedFiles.length ||
                                    !dropdownValue
                                  }
                                                    id="save_project_files-file_upload-project_details_page"
                                >
                                  {uploading ? "Uploading..." : "Save Files"}
                                </button>
                              </div>
                            </div>
                          </form>
                        </div>
                      </div>
                    </div>

                    {/* Project Budget Column */}
                    <div
                      className="col-md-6 ps-3"
                      style={{
                        maxHeight: "300px",
                        overflowY: "auto",
                        border: "1px solid #a5a5a5",
                        borderRadius: "25px",
                        padding: "20px",
                      }}
                    >
                      <div
                        className="project-budget mb-5"
                        style={{ display: "flex", flexDirection: "column" }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <h3 className="title">Project Procurement Budget</h3>
                          {!projectDetails?.budget ||
                          projectDetails?.budget == 0 ? (
                            <button
                              type="button"
                              className="page-link backBtn btn btn-primary text-sm text-white px-2 m-0"
                              style={{
                                width: "180px",
                                backgroundColor: "var(--primary-color)",
                              }}
                              onClick={() => setOpenEditProject(true)}
                            >
                              <FontAwesomeIcon icon={faEdit} className="me-2" />
                              Add Budget
                            </button>
                          ) : (
                            <div style={{ textAlign: "right" }}>
                              <p style={{ margin: "0", fontWeight: "500" }}>
                                Budget: {" "} ₹{projectDetails?.budget}
                              </p>
                              <p style={{ margin: "0", fontWeight: "500" }}>
                                Available Budget: ₹
                                {Math.max(
                                  0,
                                  projectDetails?.budget - avlBudget
                                )}
                              </p>
                            </div>
                          )}
                        </div>
                        <hr />

                        {/* Budget Header */}
                        <div className="budget-header d-flex justify-content-between mb-1 p-2 bg-light rounded fw-bold">
                          <span>Tender / RFQ No</span>
                          <span style={{ width: "150px", textAlign: "center" }}>
                            Vendor
                          </span>
                          <span style={{ width: "150px", textAlign: "center" }}>
                            Date
                          </span>
                          <span className="text-end">Amount</span>
                        </div>

                        {/* Budget Items */}
                        <div className="budget-items">
                          {projectBudget?.length > 0 ? (
                            projectBudget.map((item) => (
                              <div
                                key={item.id}
                                className="budget-item d-flex justify-content-between align-items-center mb-3 p-2 border-bottom"
                              >
                                <span className="text-muted">
                                  {item.rfq_no}
                                </span>
                                <span style={{ width: "150px" }}>
                                  {item.vendor_name}
                                </span>
                                <span style={{ width: "80px" }}>
                                  {formatDisplayDate(item.updated_at)}
                                </span>
                                <span className="text-danger fw-bold text-end">
                                  ₹{parseFloat(item.total_value).toFixed(2)}
                                </span>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-3 text-muted">
                              No budget data available
                            </div>
                          )}
                        </div>

                        {/* Budget Summary */}
                        {projectBudget?.length > 0 && (
                          <div className="budget-summary mt-4 pt-3 border-top">
                            <div className="d-flex justify-content-between">
                              <span className="fw-bold">Total Items:</span>
                              <span className="fw-bold">
                                {projectBudget.length}
                              </span>
                            </div>
                            <div className="d-flex justify-content-between mt-2">
                              <span className="fw-bold">
                                Total Expenditure:
                              </span>
                              <span className="text-danger fw-bold">
                                ₹
                                {projectBudget
                                  .reduce(
                                    (sum, item) =>
                                      sum + parseFloat(item.total_value),
                                    0
                                  )
                                  .toFixed(2)}
                              </span>
                            </div>
                            <div className="d-flex justify-content-between mt-2">
                              <span className="fw-bold">Budget:</span>
                              <span className="text-danger fw-bold">
                                ₹{projectDetails?.budget || 0}
                              </span>
                            </div>
                            <div className="d-flex justify-content-between mt-2">
                              <span className="fw-bold">Available Budget:</span>
                              <span className="text-danger fw-bold">
                                ₹
                                {Math.max(
                                  0,
                                  (projectDetails?.budget ?? 0) -
                                    (avlBudget ?? 0)
                                )}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Tender / RFQ Details Table */}
                  <span className="title">Tender / RFQs for this Project</span>
                  <div className="details-table p-4 ">
                    <div className="row">
                      <div className="col-sm-4 col-md-6"></div>
                      <div className="col-sm-8 col-md-6">
                        <div className="d-flex justify-content-end">
                          <Link
                            href="/dashboard/buyer/vendor-management"
                            className="page-link backBtn btn btn-secondary text-sm text-white px-2 mt-0 "
                            style={{ flex: "0 0 250px" }}
                            id="upload_vendors-rfq_actions-project_details_page"
                          >
                            {" "}
                            <FontAwesomeIcon
                              icon={faCloudArrowUp}
                              className="me-2"
                            />{" "}
                            Upload your Vendors
                          </Link>
                          <Link
                            href="/boq-automation"
                            className="page-link backBtn btn btn-secondary text-sm text-white px-2 mt-0 "
                            style={{ flex: "0 0 250px" }}
                            id="generate_rfq_from_boq-rfq_actions-project_details_page"
                          >
                            {" "}
                            <FontAwesomeIcon
                              icon={faWandMagicSparkles}
                              className="me-2"
                            />{" "}
                            Generate Tender / RFQ from BOQ
                          </Link>
                        </div>
                      </div>
                    </div>

                    <div className="table-responsive">
                      <table className="table table-striped">
                        <thead>
                          <tr>
                            <th scope="col">Sl No.</th>
                            <th scope="col">Tender / RFQ Number</th>
                            <th scope="col">Tender / RFQ Type</th>
                            <th scope="col">Reverse Auction</th>
                            <th scope="col">Total Vendors</th>
                            <th scope="col">Quotes Recieved</th>
                            <th scope="col">Created Date</th>
                            <th scope="col">End Date</th>
                            <th scope="col">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {loading && (
                            <tr>
                              <td>
                                <PlaceholderLoading
                                  shape="rect"
                                  width={100}
                                  height={50}
                                />
                              </td>
                              <td>
                                <PlaceholderLoading
                                  shape="rect"
                                  width={100}
                                  height={50}
                                />
                              </td>
                              <td>
                                <PlaceholderLoading
                                  shape="rect"
                                  width={100}
                                  height={50}
                                />
                              </td>
                              <td>
                                <PlaceholderLoading
                                  shape="rect"
                                  width={100}
                                  height={50}
                                />
                              </td>
                              <td>
                                <PlaceholderLoading
                                  shape="rect"
                                  width={100}
                                  height={50}
                                />
                              </td>
                              <td>
                                <PlaceholderLoading
                                  shape="rect"
                                  width={100}
                                  height={50}
                                />
                              </td>
                              <td>
                                <PlaceholderLoading
                                  shape="rect"
                                  width={100}
                                  height={50}
                                />
                              </td>
                            </tr>
                          )}
                          {!loading &&
                            projectDetails &&
                            projectDetails?.rfqs?.length > 0 &&
                            projectDetails?.rfqs?.map((rfqItem, index) => {
                              return (
                                <tr key={`rfq_item_${rfqItem.id}`}>
                                  <td>{index + 1}</td>
                                  <td>{rfqItem.rfq_details?.rfq_no}</td>
                                  <td>
                                    {rfqItem.rfq_details?.is_tender === 1 ? "---" : (rfqItem.rfq_details?.rfq_type || "---")}
                                  </td>
                                  <td>
                                    {rfqItem.rfq_details?.reverse_auction == 1
                                      ? "Enabled"
                                      : "Disabled"}
                                  </td>
                                  <td>{rfqItem.vendors?.total_vendors}</td>
                                  <td>{rfqItem.vendors?.quote_received}</td>
                                  <td>
                                    {rfqItem.rfq_details?.timestamp?.slice(
                                      0,
                                      10
                                    ) || "---"}
                                  </td>
                                  <td>
                                    {rfqItem.rfq_details?.bid_end_date || "---"}
                                  </td>
                                  <td>
                                    <Link
                                      href={`/dashboard/buyer/rfq-management-details?type=buyer-view&id=${rfqItem?.rfq_details?.id}`}
                                      className="page-link"
                                      id={`view_rfq_${rfqItem?.rfq_details?.rfq_no}-rfq_list-project_details_page`}
                                    >
                                      View
                                    </Link>
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>

                    <Pagination
                      page={page}
                      setPage={setPage}
                      limit={limit}
                      setLimit={setLimit}
                      totalData={totalData}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Edit Project Modal Section */}
        {openEditProject && (
          <DynamicFormModal
            type={"edit-project"}
            projectData={projectDetails}
            openModal={openEditProject}
            closeModal={() => setOpenEditProject(false)}
            handleEditProject={handleEditProject}
          />
        )}
      </>
    );
}

export default ProjectDetails
