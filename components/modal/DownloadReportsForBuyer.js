import { useCallback, useEffect, useState } from "react";
import Modal from "react-modal";
import Select, { components } from 'react-select';
import * as XLSX from "xlsx";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import {
  getProductReportData,
  getProjectList,
  getProjectReportData,
  sendReportOnEmail,
} from "@/services/project";
import { toast } from "react-toastify";
import {
  faSpinner,
  faDownload,
  faEnvelope,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { approvedProductList } from "@/services/products";
import { debounce } from "lodash";


// Custom styles for Product Select Component
const customStyles = {
  option: (provided, state) => ({
    ...provided,
    marginBottom: '1px solid #000',
    color: state.isSelected ? '#0d6efd' : '#212529',
    backgroundColor: state.isSelected ? '#f0f0f0' : provided.backgroundColor,
  }),
};

// Modified Select Component to show category along with Product Name
const CustomSelectOption = (props) => (
  <components.Option {...props}>
    <div>
      {props.data.label}
      <br />
      <small>{props.data.categories}</small>
    </div>
  </components.Option>
);

const DownloadReportsForBuyer = (props) => {
  const [reportType, setReportType] = useState("projectWise");
  const [dateRange, setDateRange] = useState({
    startDate: "2023-01-01",
    endDate: new Date().toISOString().split("T")[0],
  });
  const [email, setEmail] = useState("");
  const [selectedOption, setSelectedOption] = useState(null);
  const [options, setOptions] = useState([]);
  const [productList, setProductList] = useState([]);
  const [latestReportFile, setLatestReportFile] = useState(null);
  const [loadingState, setLoadingState] = useState(""); // "generate", "download", "email"
  const [optionLoading, setOptionLoading] = useState(false);


  // input changes for states
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    switch (name) {
      case "startDate":
      case "endDate":
        setDateRange((prevDates) => ({
          ...prevDates,
          [name]: value,
        }));
        setLatestReportFile(null);
        setEmail("");
        break;
      case "email":
        setEmail(value);
        break;
      case "reportType":
        setReportType(value);
        setOptions([]);
        setSelectedOption(null);
        setLatestReportFile(null);
        setEmail("");
        break;
      case "selection":
        setSelection(value);
        setLatestReportFile(null);
        setEmail("");
        break;
    }
  };

  // handel send report file to user
  const handleEmailSend = () => {
    if (!latestReportFile || !(latestReportFile instanceof Blob)) {
      toast.error("Invalid file. Please regenerate the report.");
      return;
    }

    if (!email?.trim()) {
      toast.error("Please provide a valid email address");
      return;
    }

    setLoadingState("email");

    // Dynamically generate the filename
    const dynamicFileName =
      reportType === "projectWise"
        ? `${selectedOption.label || "Projects"} from ${dateRange.startDate} to ${dateRange.endDate}.zip`
        : `${selectedOption.label || "Products"} from ${dateRange.startDate} to ${dateRange.endDate}.xlsx`;

    const formData = new FormData();
    formData.append("file", latestReportFile, dynamicFileName);
    formData.append("emails", email.trim());
    formData.append("startDate", dateRange.startDate);
    formData.append("endDate", dateRange.endDate);

    sendReportOnEmail(formData)
      .then((res) => {
        toast.success("Email sent successfully");
      })
      .catch((error) => {
        toast.error("Email sent Failed");
      })
      .finally((fin) => {
        setLoadingState("");
      });
  };

  // Fetch project options
  const fetchProjectList = async () => {
    try {
      setOptionLoading(true);
      const res = await getProjectList();
      const formattedProjects = res.data.map((item) => ({
        label: item.name,
        value: item.id,
      }));
      setOptions(formattedProjects);
    } catch (error) {
      toast.error(error.message);
      console.error("Error fetching project list:", error);
    } finally {
      setOptionLoading(false);
    }
  };

  // Function to format product data along with it's categories 
  const formatGroupedData = (groupedData) => {
    return Object.values(groupedData).flatMap(items =>
      items.map(item => ({
        value: item.id,
        label: item.name,
        categories: item.product_categories.map(cat => cat.category_name).join(" | ")
      }))
    );
  }

  const groupBySlug = (data) => {
    const groupedData = data.reduce((acc, item) => {
      const slug = item.slug;
      if (!acc[slug]) acc[slug] = [];

      const isUnique = !acc[slug].some((existingItem) =>
        JSON.stringify(existingItem.product_categories) === JSON.stringify(item.product_categories)
      );
      if (isUnique) acc[slug].push(item);
      return acc;
    }, {});
    return formatGroupedData(groupedData);
  }


  // Debounced product search
  const fetchProducts = useCallback(
    debounce(async (inputValue) => {
      setOptions([])
      if (inputValue.length > 2) {
        setOptionLoading(true);
        approvedProductList(20, 1, inputValue)
          .then((res) => {
            const product_options = groupBySlug(res.data);
            setOptions(product_options);
            setProductList(res.data);
          })
          .catch((error) => {
            toast.error(error.message);
            console.log(error);
          })
          .finally(() => setOptionLoading(false));
      }
    }, 500), []);


  // once received response from API, generate report file
  // excel for product and zip for project
  const handelGenerateReport = async () => {

    if (new Date(dateRange.startDate) > new Date(dateRange.endDate)) {
      toast.error("The end date cannot be before the start date.");
      return;
    }

    if (reportType === "projectWise") {
      if (!selectedOption) {
        toast.error("Select a project name to generate report");
        return;
      }

      setLoadingState("generate");

      const payload = {
        projectId: selectedOption.value,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      };

      try {
        const res = await getProjectReportData(payload);
        const zipBlob = await createProjectReportZip(res); // Wait for the ZIP Blob
        setLatestReportFile(zipBlob); // Store Blob in state
        toast.success("Project report successfully generated");
      } catch (error) {
        toast.error("Failed to generate project report");
        console.error("Error generating ZIP report:", error);
      }
    } else if (reportType === "productWise") {
      if (!selectedOption) {
        toast.error("Select a product name to generate report");
        return;
      }

      setLoadingState("generate");

      const payload = {
        productId: selectedOption.value,
        productName: selectedOption.label,
        productCategory: productList.find((prodItem)=> prodItem.id === selectedOption.value).product_categories[0]?.id,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      };

      try {
        const res = await getProductReportData(payload);
        if(res.length <= 0) {
          toast.error("Not enough data to generate report")
          setLoadingState("done")
          return;
        }
        const fileBlob = createProductWiseExcelReport(res);
        setLatestReportFile(fileBlob); // Store Excel Blob in state
        toast.success("Product report successfully generated");
      } catch (error) {
        toast.error("Failed to generate product report");
        console.error("Error generating product report:", error);
      }
    }

    setLoadingState("");
  };


  // handel create excel for product report - part of product report
  const createProductWiseExcelReport = (productData) => {
    const wb = XLSX.utils.book_new(); // Create a new workbook

    productData.forEach((rfq) => {
      const ws_data = [];

      // RFQ Information Section
      ws_data.push(["RFQ Information"]);
      ws_data.push(["RFQ No", rfq.rfq_no]);
      ws_data.push(["Product Name", rfq.product_name]);
      ws_data.push(["Product Description", rfq.product_description || "N/A"]);
      ws_data.push(["RFQ Comment", rfq.rfq_comment]);
      ws_data.push(["Company Name", rfq.company_name]);
      ws_data.push(["Contact Name", rfq.contact_name]);
      ws_data.push(["Contact Number", rfq.contact_number]);
      ws_data.push(["Quote Submission Deadline", rfq.bid_end_date]);
      ws_data.push(["Location", rfq.location]);
      ws_data.push([]); // Blank line to separate sections

      // Vendor Quotes Section
      ws_data.push(["Vendor Quotes"]);
      ws_data.push([
        "Vendor Name",
        "Unit Price",
        "Package Price",
        "Tax",
        "Freight Price",
        "Total Price",
        "Quantity",
        "Delivery Period",
        "Product Name",
        "Comment",
      ]);

      rfq.vendors.forEach((vendor) => {
        vendor?.quote_details?.forEach((quote) => {
          quote?.quote_items?.forEach((item) => {
            ws_data.push([
              vendor.vendor_name,
              item.unit_price,
              item.package_price,
              item.tax,
              item.freight_price,
              item.total_price,
              item.quantity,
              item.delivery_period,
              item.product_name,
              item.comment,
            ]);
          });
        });
      });

      const ws = XLSX.utils.aoa_to_sheet(ws_data);
      XLSX.utils.book_append_sheet(wb, ws, `RFQ-${rfq.rfq_no}`);
    });

    // Generate Blob
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    return blob;
    // const buffer = XLSX.write(wb, { type: "array" });
    // // saveAs(new Blob([buffer]), "ProductWise_Report.xlsx");
    // return buffer;
  };


  // handel create excel for project details - part of project report
  const createProjectDetailExcel = (project) => {
    const wb = XLSX.utils.book_new();
    const projectData = [
      ["Project Name", project.project_name],
      ["Project Description", project.project_description],
      ["Project Location", project.project_location],
    ];
    const wsProject = XLSX.utils.aoa_to_sheet(projectData);
    XLSX.utils.book_append_sheet(wb, wsProject, `Project Details`);

    // direct download in user system
    // XLSX.writeFile(wb, `Project_${project.project_id}_Details.xlsx`);

    return XLSX.write(wb, { type: "buffer" });
  };


  // handel create excel for rfq's - part of project report
  const createProjectRfqDetailsExcel = (rfq) => {
    const wb = XLSX.utils.book_new();
    const rfqData = [
      ["RFQ Number", rfq.rfq_no],
      ["Company Name", rfq.company_name],
      ["Contact Name", rfq.contact_name],
      ["Contact Number", rfq.contact_number],
      ["Quote Submission Deadline", rfq.bid_end_date],
      ["Location", rfq.location],
      ["RFQ Status", rfq.status],
      ...(rfq.is_tender !== 1 ? [["RFQ Type", rfq.rfq_type]] : []),
      ["Reverse Auction", rfq.reverse_auction ? "Yes" : "No"],
    ];

    if (rfq.terms) {
      rfqData.push(["Terms"]);
      rfq.terms.forEach((term) => {
        rfqData.push(["", term.term_content]);
      });
    }

    if (rfq.rfq_files) {
      rfqData.push(["RFQ Files"]);
      rfq.rfq_files.forEach((file) => {
        rfqData.push(["", file.file_type, file.file_url]);
      });
    }

    const wsRFQ = XLSX.utils.aoa_to_sheet(rfqData);
    XLSX.utils.book_append_sheet(wb, wsRFQ, `RFQ Details`);

    // Add Product, Vendor, and Product File Details in a single sheet for each product
    rfq.products.forEach((product, index) => {
      let sheetName = `product_vendor_list_${index + 1}`;

      const productVendorData = [
        ["Product Name", product.product_name],
        ["Product Comment", product.comment],
        ...product.specs.map((spec) => [spec.title, spec.value]),
        [], // Empty row for visual separation
        ["Product Files"],
      ];

      product.product_files?.forEach((file) => {
        productVendorData.push([file.file_type, file.file_url]);
      });

      productVendorData.push([]); // Adding another separation before vendor details
      productVendorData.push([
        "Vendor Name",
        "Vendor Email",
        "Vendor Mobile",
        "Vendor Address",
      ]);

      product.vendors.forEach((vendor) => {
        productVendorData.push([
          vendor.vendor_name,
          vendor.vendor_email,
          vendor.vendor_mobile,
          vendor.vendor_address || "N/A", // Handle null addresses
        ]);
      });

      const wsProductVendors = XLSX.utils.aoa_to_sheet(productVendorData);
      XLSX.utils.book_append_sheet(wb, wsProductVendors, sheetName);
    });

    //  direct download excel file
    // XLSX.writeFile(wb, `RFQ_${rfq.rfq_no}_Details.xlsx`);

    return XLSX.write(wb, { type: "buffer" });
  };


  // handel create zip file for projectm rfqDetails and project excel file - part of project report
  const createProjectReportZip = async (projectDetailsData) => {
    const zip = new JSZip();

    // Create folders within the ZIP
    const projectFolder = zip.folder("Project Details");
    const rfqFolder = zip.folder("RFQ Details");
    const quotationFolder = zip.folder("Quotations Details");

    // Loop through each project and add project details to the Project Details folder
    projectDetailsData.rfqDetails.forEach((project) => {
      const projectBuffer = createProjectDetailExcel(project);
      projectFolder.file(
        `${project.project_name}_Details.xlsx`,
        projectBuffer
      );

      // Add RFQ details to the RFQ Details folder
      project.rfq_details.forEach((rfq) => {
        const rfqBuffer = createProjectRfqDetailsExcel(rfq);
        rfqFolder.file(`RFQ_${rfq.rfq_no}_Details.xlsx`, rfqBuffer);
      });
    });

    // Add quotation details to the Quotations Details folder
    projectDetailsData.quoteList.forEach((rfqArray, index) => {
      const quoteBuffer = createProjectQuotesDetailsExcel(rfqArray, index);
      quotationFolder.file(`Quotations_for_RFQ_${rfqArray[0]?.rfq[0]?.rfq_no}.xlsx`, quoteBuffer);
    });

    // // Generate the ZIP file and trigger download
    // zip.generateAsync({ type: "blob" }).then(function (content) {
    //   saveAs(content, `${projectName} Report.zip`);
    // });

    const content = await zip.generateAsync({ type: "blob" }); // Ensures content is a Blob
    // saveAs(content, `${projectName}_Report.zip`); // Optional: Save ZIP locally
    return content; // Return the Blob to store in state
  };


  // handel create excel for quotations - part of project report
  function createProjectQuotesDetailsExcel(rfqArray, index) {
    // Create a new workbook and add a worksheet
    const workbook = XLSX.utils.book_new();
    const worksheetData = [];

    // Headers for current quotations
    worksheetData.push([
      "RFQ NO",
      "Product ID",
      "Unit Price",
      "Package Price",
      "Tax",
      "Freight Price",
      "Total Price",
      "Comment",
      "Vendor Name",
      "Vendor Email",
      "Quote Status", // Latest or Previous
      "Finalized", // Yes or No
    ]);

    // Iterate through each RFQ and its quotations and previous_quotes
    rfqArray.forEach((rfq) => {
      rfq.quotations.forEach((quote) => {
        // Adding current quotation details
        worksheetData.push([
          rfq.rfq[0]?.rfq_no,
          rfq.product_id,
          quote.unit_price,
          quote.package_price,
          quote.tax,
          quote.freight_price,
          quote.total_price,
          quote.comment,
          quote.quote_details.vendor_details.name,
          quote.quote_details.vendor_details.email,
          "Latest", // Status for current quotation
          quote.finalization ? "Yes" : "No", // Finalized column
        ]);

        // If there are previous quotes, add them as well
        if (quote.previous_quotes && quote.previous_quotes.length > 0) {
          quote.previous_quotes.forEach((prevQuote) => {
            worksheetData.push([
              rfq.rfq_no,
              rfq.product_id,
              prevQuote.unit_price,
              prevQuote.package_price,
              prevQuote.tax,
              prevQuote.freight_price,
              prevQuote.total_price,
              prevQuote.comment,
              quote.quote_details.vendor_details.name, // Vendor details from current quote
              quote.quote_details.vendor_details.email,
              "Previous", // Status for previous quotes
              "No", // Previous quotes are never finalized
            ]);
          });
        }
      });
    });

    // Convert data to a worksheet and add it to the workbook
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      `Quotation Details ${index + 1}`
    );

    // Convert workbook to a binary buffer
    return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  }

  // download generated report in user system
  const handleDownloadFile = () => {
    setLoadingState("download");

    if (latestReportFile) {
      const fileName =
        reportType === "projectWise"
          ? `${selectedOption.label || "Projects"} from ${dateRange.startDate} to ${dateRange.endDate} project report.zip`
          : `${selectedOption.label || "Products"} from ${dateRange.startDate} to ${dateRange.endDate} product report.xlsx`;

      saveAs(latestReportFile, fileName); // Download the file
    }

    setLoadingState("");
  };


  // filter project name by project id
  const getProjectNameById = (projectId) => {
    const project = projectOptions.filter(p => p.value == projectId);
    return project ? project[0].label : "Project";
  };

  useEffect(() => {
    if (reportType === "projectWise") {
      fetchProjectList();
    }
  }, [reportType]);


  return (
    <Modal
      isOpen={props.isOpen}
      onRequestClose={props.closeModal}
      shouldCloseOnOverlayClick={true}
      contentLabel="Download Reports"
      className="report-download-modal"
      style={{
        overlay: {
          backgroundColor: "rgba(0, 0, 0, 0.5)",
        },
        content: {
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          maxWidth: "90vw",
          width: "700px",
          border: "none",
          background: "#fff",
          borderRadius: "10px",
          padding: "20px",
          maxHeight: "100vh",
          height: "auto",
        },
      }}
    >
      <div className="modal-content">
        <div className="modal-header">
          <h5 className="modal-title">Download Reports</h5>
          <button
            type="button"
            style={{
              backgroundColor: "transparent",
              fontSize: "20px",
              border: "none",
              fontSize: "30px",
            }}
            className="close"
            data-dismiss="modal"
            aria-label="Close"
            onClick={props.closeModal}
          >
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div className="modal-body">
          <form>
            <div className="d-flex gap-4 align-items-center mb-2">
              <div className="w-100">
                <label htmlFor="reportType">Report Type</label>
                <select
                  id="reportType"
                  className="form-control"
                  name="reportType"
                  value={reportType}
                  onChange={handleInputChange}
                >
                  <option value="projectWise">Project Wise</option>
                  <option value="productWise">Product Wise</option>
                </select>
              </div>
              {reportType === "productWise" || reportType === "projectWise" ? (
                <div className="w-100">
                  <label htmlFor="selection">
                    {reportType === "projectWise" ? "Select Project" : "Select Product"}
                  </label>
                  <Select
                    name="selection"
                    options={options}
                    value={selectedOption}
                    onInputChange={(inputValue) => {
                      const sanitizedInput = typeof inputValue === "string" ? inputValue : "";
                      reportType === "productWise" && fetchProducts(sanitizedInput);
                    }}
                    onChange={(selectedOption) => setSelectedOption(selectedOption)}
                    {...(reportType === "productWise" && {
                      components: { Option: CustomSelectOption },
                    })}
                    styles={customStyles}
                    isLoading={optionLoading}
                    placeholder={
                      reportType === "productWise"
                        ? "Search product..."
                        : "Choose project..."
                    }
                    noOptionsMessage={() => (reportType === "productWise" && options.length == 0) ? "Enter atleast 3 chracters" : "No options Found"}
                    isSearchable
                    isClearable
                  />
                </div>
              ) : null}
            </div>

            <div className="d-flex gap-4 justify-content-between">
              <div className="w-100">
                <label htmlFor="startDate">Start Date</label>
                <input
                  type="date"
                  className="form-control"
                  id="startDate"
                  name="startDate"
                  value={dateRange.startDate}
                  onChange={handleInputChange}
                />
              </div>
              <div className="w-100">
                <label htmlFor="endDate">End Date</label>
                <input
                  type="date"
                  className="form-control"
                  id="endDate"
                  name="endDate"
                  value={dateRange.endDate}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            {/* Conditional Button Logic */}
            {latestReportFile ? (
              // Download Button
              <button
                type="button"
                className="btn btn-success w-100 mt-2"
                onClick={handleDownloadFile}
                disabled={loadingState === "download"}
              >
                {loadingState === "download" ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} spin /> Downloading...
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faDownload} className="me-2" />
                    {`Download ${reportType === "projectWise" ? "Project" : "Product"
                      } Report`}
                  </>
                )}
              </button>
            ) : (
              // Generate Button
              <button
                type="button"
                className="btn btn-primary w-100 mt-3"
                onClick={handelGenerateReport}
                disabled={loadingState === "generate"}
              >
                {loadingState === "generate" ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} spin /> Generating...
                  </>
                ) : (
                  "Generate Report"
                )}
              </button>
            )}
            {/* // Show Send Email input/button only if file exists */}
            {latestReportFile && (
              <>
                <div className="w-100 mt-4">
                  <label htmlFor="email">Email</label>
                  <input
                    type="text"
                    placeholder="Enter email"
                    className="form-control"
                    id="email"
                    name="email"
                    value={email}
                    onChange={handleInputChange}
                  />
                </div>
                <button
                  type="button"
                  className="btn btn-primary  w-100 mt-2"
                  onClick={handleEmailSend}
                  disabled={loadingState === "email"}
                >
                  {loadingState === "email" ? (
                    <>
                      <FontAwesomeIcon icon={faSpinner} spin /> Sending Email...
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faEnvelope} /> Share on Email
                    </>
                  )}
                </button>
              </>
            )}

            {/* </div> */}
          </form>
        </div>
      </div>
    </Modal>
  );
};

export default DownloadReportsForBuyer;
