import { useEffect, useState } from "react";
import Modal from "react-modal";
import * as XLSX from "xlsx";
import JSZip from "jszip";
import { saveAs } from "file-saver";

const DownloadReportsForBuyer = (props) => {
  const [searchObj, setSearchedObject] = useState({
    stareDate: "2023-01-01",
    endDate: "2024-12-10",
    productName: "PLC system (Programmable Logic Controller)",
  });

  useEffect(() => {
    document.body.style.overflow = props.isOpen ? "hidden" : "auto";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [props.isOpen]);

  const handleDownload = () => {
    // Your download logic here
    console.log("Downloading...");
  };

  const handleEmailSend = () => {
    // Email sending logic here
    console.log("Sending email...");
  };

  const downloadProductWiseExcelReport = () => {
    const wb = XLSX.utils.book_new(); // Create a new workbook

    productData.forEach((rfq) => {
      const ws_data = [];

      // RFQ Information Section
      ws_data.push(["RFQ Information"]);
      ws_data.push(["RFQ ID", rfq.rfq_id]);
      ws_data.push(["RFQ No", rfq.rfq_no]);
      ws_data.push(["Product Name", rfq.product_name]);
      ws_data.push(["Product Description", rfq.product_description || "N/A"]);
      ws_data.push(["RFQ Comment", rfq.rfq_comment]);
      ws_data.push(["Company Name", rfq.company_name]);
      ws_data.push(["Contact Name", rfq.contact_name]);
      ws_data.push(["Contact Number", rfq.contact_number]);
      ws_data.push(["Bid End Date", rfq.bid_end_date]);
      ws_data.push(["Location", rfq.location]);
      ws_data.push([]); // Blank line to separate sections

      // Vendor Quotes Section
      ws_data.push(["Vendor Quotes"]);
      ws_data.push([
        "Vendor ID",
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
        vendor.quote_details.forEach((quote) => {
          quote.quote_items.forEach((item) => {
            ws_data.push([
              vendor.vendor_id,
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

    // This will save the workbook after all sheets are added
    XLSX.writeFile(wb, "RFQs_Report.xlsx");
  };

  const downloadProjectDetails = (project) => {
    const wb = XLSX.utils.book_new();
    const projectData = [
      ["Project ID", project.project_id],
      ["Project Name", project.project_name],
      ["Project Description", project.project_description],
      ["Project Location", project.project_location],
      ["Project Status", project.project_status],
    ];
    const wsProject = XLSX.utils.aoa_to_sheet(projectData);
    XLSX.utils.book_append_sheet(wb, wsProject, `Project Details`);

    // direct download in user system
    // XLSX.writeFile(wb, `Project_${project.project_id}_Details.xlsx`);

    return XLSX.write(wb, { type: "buffer" });
  };

  const downloadRfqDetails = (rfq) => {
    const wb = XLSX.utils.book_new();
    const rfqData = [
      ["RFQ ID", rfq.rfq_id],
      ["RFQ Number", rfq.rfq_no],
      ["Company Name", rfq.company_name],
      ["Contact Name", rfq.contact_name],
      ["Contact Number", rfq.contact_number],
      ["Bid End Date", rfq.bid_end_date],
      ["Location", rfq.location],
      ["RFQ Status", rfq.status],
      ["RFQ Type", rfq.rfq_type],
      ["Is Published", rfq.is_published],
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
        ["Product ID", product.product_id],
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
        "Vendor ID",
        "Vendor Name",
        "Vendor Email",
        "Vendor Mobile",
        "Vendor Address",
      ]);

      product.vendors.forEach((vendor) => {
        productVendorData.push([
          vendor.vendor_id,
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

    XLSX.utils.book_append_sheet(wb, wsRFQ, `RFQ-${rfq.rfq_no}`);
    return XLSX.write(wb, { type: "buffer" });
  };

  // const createExcelReport = () => {
  //     response.projectDetail.forEach(project => {
  //         downloadProjectDetails(project);
  //         project.rfq_details.forEach(rfq => {
  //             downloadRfqDetails(rfq);
  //         });
  //     });
  // };

  const createZipAndDownload = async () => {
    const zip = new JSZip();

    // Loop through each project and add project and RFQ details to the zip
    response.projectDetail.forEach((project) => {
      const projectBuffer = downloadProjectDetails(project);
      zip.file(`Project_${project.project_id}_Details.xlsx`, projectBuffer);

      project.rfq_details.forEach((rfq) => {
        const rfqBuffer = downloadRfqDetails(rfq);
        zip.file(`RFQ_${rfq.rfq_no}_Details.xlsx`, rfqBuffer);
      });
    });

    // Generate the ZIP file and trigger download
    zip.generateAsync({ type: "blob" }).then(function (content) {
      saveAs(content, "Projects_Report.zip");
    });
  };
  // Usage: call createExcelReport with the provided data
  // createExcelReport(yourJsonDataHere);

  return (
    <Modal
      isOpen={props.isOpen}
      // onRequestClose={props.onRequestClose}
      ariaHideApp={false}
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
          width: "600px",
          border: "none",
          background: "#fff",
          overflow: "hidden",
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
            className="close"
            data-dismiss="modal"
            aria-label="Close"
          >
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div className="modal-body">
          <form>
            <div className=" d-flex gap-4 justify-content-between  ">
              <div className="w-100">
                <label for="startDate">Start Date</label>
                <input type="date" className="form-control" id="startDate" />
              </div>
              <div className="w-100">
                <label for="endDate">End Date</label>
                <input type="date" className="form-control" id="endDate" />
              </div>
            </div>
            <div className="align-items-center mt-2">
              <div className=" d-flex gap-4">
                <div className="w-100">
                  <label className="w-100" for="reportType">
                    Report Type
                  </label>
                  <select id="reportType" className="w-100">
                    <option value="projectWise">Project Wise</option>
                    <option value="productWise">Product Wise</option>
                    <option value="vendorWise">Vendor Wise</option>
                  </select>
                </div>

                <div className="w-100">
                  <label for="projectName">Enter project name</label>
                  <select id="reportType" className="w-100">
                    <option value="projectWise">Project Wise</option>
                    <option value="productWise">Product Wise</option>
                    <option value="vendorWise">Vendor Wise</option>
                  </select>
                </div>
              </div>

              <button
                type="button"
                className=" w-100 mb-4 mt-4 btn btn-primary btn-block"
                onClick={createZipAndDownload}
              >
                Download
              </button>
            </div>

            <div className="d-flex gap-4 align-items-end mt-2">
              <div className="w-100">
                <label for="endDate">Enter project name</label>
                <input
                  type="text"
                  placeholder="xyz@gmail.com"
                  className="form-control  yy"
                  id="reportName"
                />
              </div>

              <div className="w-100">
                <button type="button" className=" w-100 btn btn-secondary">
                  Send Email
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </Modal>
  );
};

export default DownloadReportsForBuyer;
