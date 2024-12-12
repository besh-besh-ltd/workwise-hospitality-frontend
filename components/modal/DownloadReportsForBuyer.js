import { useEffect, useState } from "react";
import Modal from "react-modal";
import * as XLSX from "xlsx";

const projectData = [
  {
    project_id: 33,
    project_name: "downlaod report",
    project_description: "myb pro sba s",
    project_location: "Mumbai, Maharastra",
    project_status: 1,
    project_created_at: "2024-12-11T12:10:05.682Z",
    project_updated_at: "2024-12-11T12:10:05.682Z",
    project_ended_at: "2025-01-10T00:00:00.000Z",
    rfqs: [
      {
        rfq_id: 693,
        rfq_no: 402830,
        status: 1,
        comment: "com global",
        location: "Mumbai, Maharastra",
        products: [
          {
            name: "WATER MONITOR",
            specs: [
              {
                title: "Size",
                value: "w size",
                variant: 0,
              },
              {
                title: "Spec",
                value: "water spec",
                variant: 0,
              },
              {
                title: "Quantity",
                value: "101",
                variant: 0,
              },
              {
                title: "Unit",
                value: "un1",
                variant: 0,
              },
            ],
            vendors: [
              {
                quotes: [
                  {
                    status: "No quote",
                    quote_id: 0,
                    is_regret: 0,
                    quote_items: [
                      {
                        tax: 0,
                        comment: "No quote present",
                        item_id: 0,
                        quantity: "0",
                        unit_price: 0,
                        total_price: 0,
                        product_name: "No product",
                        freight_price: 0,
                        package_price: 0,
                        delivery_period: "No delivery",
                      },
                    ],
                    regret_reason: "No quote",
                    global_comment: "No quote present",
                    global_payment_term: "None",
                  },
                ],
                vendor_id: 385,
                vendor_name: "mukul VTD Pvt Ltd",
                vendor_email: "mukuljatav8958+vendor12@gmail.com",
                vendor_mobile: "8987654567",
                organization_name: "Vendor Pvt Ltd",
              },
              {
                quotes: [
                  {
                    status: 1,
                    quote_id: 278,
                    is_regret: 0,
                    quote_items: [
                      {
                        tax: 18,
                        comment: "total 70775",
                        item_id: 492,
                        quantity: "101",
                        unit_price: 555,
                        total_price: 70775,
                        product_name: "WATER MONITOR",
                        freight_price: 3,
                        package_price: 4,
                        delivery_period: "5",
                      },
                    ],
                    regret_reason: null,
                    global_comment: "gc",
                    global_payment_term: "pt ",
                  },
                ],
                vendor_id: 134,
                vendor_name: "Imtiaj Vendor",
                vendor_email: "imtiaj@letsworkwise.com",
                vendor_mobile: "32165478901",
                organization_name: "Pacific Industrial Supply",
              },
            ],
            product_id: 7067,
            description: null,
          },
          {
            name: "PC AND SERVER",
            specs: [
              {
                title: "Size",
                value: "p size",
                variant: 0,
              },
              {
                title: "Spec",
                value: "pc spec",
                variant: 0,
              },
              {
                title: "Quantity",
                value: "201",
                variant: 0,
              },
              {
                title: "Unit",
                value: "n2",
                variant: 0,
              },
            ],
            vendors: [
              {
                quotes: [
                  {
                    status: "No quote",
                    quote_id: 0,
                    is_regret: 0,
                    quote_items: [
                      {
                        tax: 0,
                        comment: "No quote present",
                        item_id: 0,
                        quantity: "0",
                        unit_price: 0,
                        total_price: 0,
                        product_name: "No product",
                        freight_price: 0,
                        package_price: 0,
                        delivery_period: "No delivery",
                      },
                    ],
                    regret_reason: "No quote",
                    global_comment: "No quote present",
                    global_payment_term: "None",
                  },
                ],
                vendor_id: 267,
                vendor_name: "gyan Pvt ltd",
                vendor_email: "gyan@letsworkwise.com",
                vendor_mobile: "8987676752",
                organization_name: "hyan",
              },
              {
                quotes: [
                  {
                    status: 1,
                    quote_id: 278,
                    is_regret: 0,
                    quote_items: [
                      {
                        tax: 18,
                        comment: "total 84510",
                        item_id: 491,
                        quantity: "201",
                        unit_price: 333,
                        total_price: 84510,
                        product_name: "PC AND SERVER",
                        freight_price: 3,
                        package_price: 4,
                        delivery_period: "9",
                      },
                    ],
                    regret_reason: null,
                    global_comment: "gc",
                    global_payment_term: "pt ",
                  },
                ],
                vendor_id: 134,
                vendor_name: "Imtiaj Vendor",
                vendor_email: "imtiaj@letsworkwise.com",
                vendor_mobile: "32165478901",
                organization_name: "Pacific Industrial Supply",
              },
            ],
            product_id: 7043,
            description: "null",
          },
        ],
        timestamp: "2024-12-11T12:14:48.608072",
        bid_end_date: "2025-01-10",
        company_name: "mukul testing 2",
        contact_name: "mukul jatav",
        contact_number: "7877990000",
      },
      {
        rfq_id: 571,
        rfq_no: 402708,
        status: 1,
        comment: "",
        location: "Mumbai, Maharastra",
        products: [
          {
            name: "WATER MONITOR",
            specs: [
              {
                title: "Size",
                value: "size ",
                variant: 0,
              },
              {
                title: "Spec",
                value: "water ",
                variant: 0,
              },
              {
                title: "Quantity",
                value: "121",
                variant: 0,
              },
              {
                title: "Unit",
                value: "uni1",
                variant: 0,
              },
            ],
            vendors: [
              {
                quotes: [
                  {
                    status: 1,
                    quote_id: 277,
                    is_regret: 0,
                    quote_items: [
                      {
                        tax: 18,
                        comment: "total 152775",
                        item_id: 490,
                        quantity: "121",
                        unit_price: 1000,
                        total_price: 152775,
                        product_name: "WATER MONITOR",
                        freight_price: 3,
                        package_price: 4,
                        delivery_period: "9",
                      },
                    ],
                    regret_reason: null,
                    global_comment: "gc",
                    global_payment_term: "pt ",
                  },
                ],
                vendor_id: 134,
                vendor_name: "Imtiaj Vendor",
                vendor_email: "imtiaj@letsworkwise.com",
                vendor_mobile: "32165478901",
                organization_name: "Pacific Industrial Supply",
              },
              {
                quotes: [
                  {
                    status: "No quote",
                    quote_id: 0,
                    is_regret: 0,
                    quote_items: [
                      {
                        tax: 0,
                        comment: "No quote present",
                        item_id: 0,
                        quantity: "0",
                        unit_price: 0,
                        total_price: 0,
                        product_name: "No product",
                        freight_price: 0,
                        package_price: 0,
                        delivery_period: "No delivery",
                      },
                    ],
                    regret_reason: "No quote",
                    global_comment: "No quote present",
                    global_payment_term: "None",
                  },
                ],
                vendor_id: 119,
                vendor_name: "EdgeCase Solutions",
                vendor_email: "b2bportal2023+38@gmail.com",
                vendor_mobile: "1234567890",
                organization_name: "EdgeCase Solutions",
              },
            ],
            product_id: 7067,
            description: null,
          },
        ],
        timestamp: "2024-12-11T12:10:31.884712",
        bid_end_date: "2025-01-10",
        company_name: "Sudhir Switchgears Pvt Ltd",
        contact_name: "Sudhir Switchgears Pvt Ltd",
        contact_number: "9999000670",
      },
    ],
  },
];

const productData = [
  {
    rfq_id: 683,
    rfq_no: 402820,
    product_name: "FUSE",
    product_description: "null",
    rfq_comment: "",
    company_name: "Imtiaj Pvt. Ltd. Rename",
    contact_name: "Imtiaj Buyer",
    contact_number: "1234567897",
    bid_end_date: "2024-12-15",
    location: "Mumbai, Maharastra",
    rfq_status: 1,
    rfq_timestamp: "2024-12-08 15:22:53.01598",
    product_specs: [
      {
        variant: 0,
        spec_title: "Quantity",
        spec_value: "56",
      },
      {
        variant: 0,
        spec_title: "Size",
        spec_value: "sie",
      },
      {
        variant: 0,
        spec_title: "Spec",
        spec_value: "fuse tech on, 1 ven",
      },
      {
        variant: 0,
        spec_title: "Unit",
        spec_value: "un",
      },
    ],
    vendors: [
      {
        variant: 0,
        vendor_id: 333,
        vendor_name: "yashmukul testing vendor 4",
        vendor_email: "mukul@dtplindia.in",
        quote_details: [
          {
            status: 1,
            quote_id: 276,
            is_regret: 0,
            quote_items: [
              {
                tax: 18,
                comment: "71 t",
                quantity: "56",
                unit_price: 1,
                total_price: 71,
                product_name: "FUSE",
                freight_price: 3,
                package_price: 4,
                delivery_period: "",
              },
            ],
            regret_reason: null,
            global_comment: "",
            global_payment_term: "",
          },
        ],
        vendor_mobile: "8958200049",
        organization_name: null,
      },
    ],
  },
  {
    rfq_id: 682,
    rfq_no: 402819,
    product_name: "FUSE",
    product_description: "null",
    rfq_comment: "sd",
    company_name: "Imtiaj Pvt. Ltd. Rename",
    contact_name: "Imtiaj Buyer",
    contact_number: "1234567897",
    bid_end_date: "2024-12-26",
    location: "Mumbai, Maharastra",
    rfq_status: 1,
    rfq_timestamp: "2024-12-08 12:50:34.04161",
    product_specs: [
      {
        variant: 0,
        spec_title: "Quantity",
        spec_value: "23",
      },
      {
        variant: 0,
        spec_title: "Size",
        spec_value: "fus tds attached",
      },
      {
        variant: 0,
        spec_title: "Spec",
        spec_value: "fuse spec, changes to check state manageent",
      },
      {
        variant: 0,
        spec_title: "Unit",
        spec_value: "Pieces",
      },
    ],
    vendors: [
      {
        variant: 0,
        vendor_id: 134,
        vendor_name: "Imtiaj Vendor",
        vendor_email: "imtiaj@letsworkwise.com",
        quote_details: [
          {
            status: 1,
            quote_id: 274,
            is_regret: 0,
            quote_items: [
              {
                tax: 18,
                comment: "total 26136, latest",
                quantity: "23",
                unit_price: 900,
                total_price: 26136,
                product_name: "FUSE",
                freight_price: 3,
                package_price: 4,
                delivery_period: "",
              },
            ],
            regret_reason: null,
            global_comment: "wer",
            global_payment_term: "FUSE total 26136",
          },
        ],
        vendor_mobile: "32165478901",
        organization_name: "Pacific Industrial Supply",
      },
    ],
  },
];

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

  const downloadProjectWiseExcelReport = () => {
    projectData.forEach((project) => {
      // Create a new workbook for each project
      const wb = XLSX.utils.book_new();

      // Project Summary Sheet
      const projectSummaryData = [
        ["Project Name", project.project_name],
        ["Project Description", project.project_description],
        ["Project Location", project.project_location],
        ["Start Date", project.project_created_at],
        ["End Date", project.project_ended_at],
      ];
      const wsProject = XLSX.utils.aoa_to_sheet(projectSummaryData);
      XLSX.utils.book_append_sheet(wb, wsProject, "Project Summary");

      // Individual RFQ Sheets
      project.rfqs.forEach((rfq) => {
        // RFQ Details
        const rfqDetails = [
          ["RFQ ID", rfq.rfq_id],
          ["RFQ Number", rfq.rfq_no],
          ["End Date", rfq.bid_end_date],
          ["Company Name", rfq.company_name],
          ["Contact Name", rfq.contact_name],
          ["Contact Number", rfq.contact_number],
        ];

        const vendorNames = [];

        // product.vendors.forEach((vendor) => { console.log  })

        // Prepare headers for products and vendor quotes
        const headers = ["Product Name", "Specs", "Size", "Quantity", "Unit"];
        const vendorHeaders = [];
        rfq.products[0]?.vendors.forEach((vendor) => {
          vendorHeaders.push({ name: vendor.vendor_name, colSpan: 5 });
          headers.push(
            "Unit Price",
            "Tax %",
            "Freight %",
            "Package %",
            "Total %"
          );
        });

        const rfqData = [headers];

        // Populate rows for each product and corresponding vendor quotes
        rfq.products.forEach((product) => {
          const productDetails = [
            product.name,
            product.specs.find((spec) => spec.title === "Spec")?.value || "",
            product.specs.find((spec) => spec.title === "Size")?.value || "",
            product.specs.find((spec) => spec.title === "Quantity")?.value ||
              "",
            product.specs.find((spec) => spec.title === "Unit")?.value || "",
          ];

          product.vendors.forEach((vendor) => {
            vendor.quotes.forEach((quote) => {
              quote.quote_items.forEach((item) => {
                productDetails.push(
                  item.unit_price || "-",
                  item.tax || "-",
                  item.freight_price || "-",
                  item.package_price || "-",
                  item.total_price || "-"
                );
              });
            });
          });

          rfqData.push(productDetails);
        });

        const wsRFQ = XLSX.utils.aoa_to_sheet(rfqDetails.concat(rfqData));
        XLSX.utils.book_append_sheet(wb, wsRFQ, `RFQ ${rfq.rfq_no}`);
      });

      // Write the workbook to a file and trigger download
      XLSX.writeFile(wb, `Project_${project.project_id}.xlsx`);
    });
  };

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
                onClick={downloadProjectWiseExcelReport}
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
