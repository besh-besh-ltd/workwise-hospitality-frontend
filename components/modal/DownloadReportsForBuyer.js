import { useEffect, useState } from "react";
import Modal from "react-modal";
import * as XLSX from "xlsx";



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


const response = {
  "projectDetail": [
      {
          "project_id": 31,
          "project_name": "project new 1",
          "project_description": "Des",
          "project_location": "new 1",
          "project_status": 1,
          "rfq_details": [
              {
                  "rfq_id": 691,
                  "rfq_no": 402828,
                  "comment": "sd",
                  "company_name": "Imtiaj Pvt. Ltd. Rename",
                  "response_email": "imtiaj.dev@gmail.com",
                  "contact_name": "Imtiaj Buyer",
                  "contact_number": "1234567897",
                  "bid_end_date": "2025-02-06",
                  "location": "new 1",
                  "is_published": 1,
                  "status": 1,
                  "rfq_type": "firm",
                  "reverse_auction": 0,
                  "rfq_files": null,
                  "terms": [
                      {
                          "term_content": "Manufacturing Clearance: All items shall be manufactured after providing you with manufacturing clearance\r\n"
                      },
                      {
                          "term_content": "Inspection: Materials will be Inspected at your works by approved Third Party Inspection Agency (TPIA) as per Approved QAP only.\r\n"
                      },
                      {
                          "term_content": "Testing Certificates: The Manufacturing Test certificate, Internal Inspection Report by TPIA & All materials Test Certificate shall be dispatched by the vendor to our Office along with the materials without any extra charges. All Testing shall be carried out as per approved QAP/ITP\r\n"
                      },
                      {
                          "term_content": "Other Important Original Documents: All Original documents including Tax Invoice, E-Way Bill, IRN & IVR along with Material Test Certificate, Manufacturer's Test Certificate, Internal Inspection Report to be courier to our Office\r\n"
                      },
                      {
                          "term_content": "Warranty: The material are to be guaranteed by you against defective design, material and workmanship for a period of 18 months from the date of receipt of material or 12 months from the date of commissioning whichever is earlier. Any defect found during the course of guarantee period, must be replaced/rectified free of cost within 5 days of receipt of such information, in case you fail to attend the same , it will be done through other sources and all expenses incurred towards such replacement/rectification will be borne by you.\r\n"
                      },
                      {
                          "term_content": "Quantity Variation: The quantities indicated in this may vary due to engineering & Actual site requirement. We reserve our right to change the size/quantities due to such change without any increase in prices. Any decreases in your prices shall be passed to our company.\r\n"
                      },
                      {
                          "term_content": "Shortage & Rejection: In case any shortage/rejection is observed at the time of delivery of goods at final destination, such items shall be replaced within seven (7) days from the date of receipt of any such notice from our end\r\n"
                      },
                      {
                          "term_content": "Order Cancellation: Our company reserves the right to cancel the order due to non-satisfactory performance of the vendor without any prior notice"
                      }
                  ],
                  "products": [
                      {
                          "product_id": 6810,
                          "product_name": "Temperature (T) Instruments",
                          "comment": "com com",
                          "datasheet": "",
                          "spec_file": "",
                          "qap_file": "",
                          "datasheet_file": "",
                          "variant": 0,
                          "product_files": null,
                          "specs": [
                              {
                                  "title": "Size",
                                  "value": "size temp"
                              },
                              {
                                  "title": "Spec",
                                  "value": "spec temp"
                              },
                              {
                                  "title": "Quantity",
                                  "value": "11"
                              },
                              {
                                  "title": "Unit",
                                  "value": "un1"
                              }
                          ],
                          "vendors": [
                              {
                                  "vendor_id": 439,
                                  "vendor_name": "testing yash1",
                                  "vendor_email": "yash+testing1@gmail.com",
                                  "vendor_mobile": "4563459871",
                                  "vendor_address": null
                              },
                              {
                                  "vendor_id": 446,
                                  "vendor_name": "gt1",
                                  "vendor_email": "gt@g.com",
                                  "vendor_mobile": "343452342634",
                                  "vendor_address": null
                              }
                          ]
                      }
                  ]
              },
              {
                  "rfq_id": 700,
                  "rfq_no": 402837,
                  "comment": "global comment",
                  "company_name": "Imtiaj Pvt. Ltd. Rename",
                  "response_email": "imtiaj.dev@gmail.com",
                  "contact_name": "Imtiaj Buyer",
                  "contact_number": "1234567897",
                  "bid_end_date": "2024-12-25",
                  "location": "new 1",
                  "is_published": 1,
                  "status": 1,
                  "rfq_type": "firm",
                  "reverse_auction": 0,
                  "rfq_files": [
                      {
                          "file_id": 62,
                          "file_type": "term_and_condition",
                          "file_url": "https://api.letsworkwise.com/user_document/1734228935905-ca9e903c-b453-4fbb-8312-7fe854e6fe17.jpg"
                      },
                      {
                          "file_id": 63,
                          "file_type": "term_and_condition",
                          "file_url": "https://api.letsworkwise.com/user_document/1734228942051-7468a8f8-481b-4631-bef5-bc360df849cf.jpg"
                      }
                  ],
                  "terms": [
                      {
                          "term_content": "Quantity Variation: The quantities indicated in this may vary due to engineering & Actual site requirement. We reserve our right to change the size/quantities due to such change without any increase in prices. Any decreases in your prices shall be passed to our company.\r\n"
                      }
                  ],
                  "products": [
                      {
                          "product_id": 6810,
                          "product_name": "Temperature (T) Instruments",
                          "comment": "com",
                          "datasheet": "",
                          "spec_file": "",
                          "qap_file": "",
                          "datasheet_file": "",
                          "variant": 0,
                          "product_files": [
                              {
                                  "file_id": 271,
                                  "file_type": "TDS",
                                  "file_url": "https://api.letsworkwise.com/user_document/1734228875233-c65bde90-c2db-45c4-a0a5-39051694994f.jpg"
                              },
                              {
                                  "file_id": 272,
                                  "file_type": "QAP",
                                  "file_url": "https://api.letsworkwise.com/user_document/1734228886823-b8dedcbc-816a-4723-b1ec-cf8440745df2.png"
                              },
                              {
                                  "file_id": 273,
                                  "file_type": "QAP",
                                  "file_url": "https://api.letsworkwise.com/user_document/1734228895250-bcae2966-e4f0-4242-bc48-86f5d961e694.jpg"
                              },
                              {
                                  "file_id": 274,
                                  "file_type": "SPEC",
                                  "file_url": "https://api.letsworkwise.com/user_document/1734228864743-02caff0a-2bae-4c97-abb9-227eb3ba92f1.jpg"
                              },
                              {
                                  "file_id": 275,
                                  "file_type": "SPEC",
                                  "file_url": "https://api.letsworkwise.com/user_document/1734228867527-b0bfb537-ba0e-4f9a-9de0-bf25efbb5fa9.png"
                              }
                          ],
                          "specs": [
                              {
                                  "title": "Size",
                                  "value": "size 1"
                              },
                              {
                                  "title": "Spec",
                                  "value": "temp 1"
                              },
                              {
                                  "title": "Quantity",
                                  "value": "1"
                              },
                              {
                                  "title": "Unit",
                                  "value": "un1"
                              }
                          ],
                          "vendors": [
                              {
                                  "vendor_id": 445,
                                  "vendor_name": "gtry1",
                                  "vendor_email": "gyan+try1@g.com",
                                  "vendor_mobile": "2352345234",
                                  "vendor_address": null
                              },
                              {
                                  "vendor_id": 267,
                                  "vendor_name": "gyan Pvt ltd",
                                  "vendor_email": "gyan@letsworkwise.com",
                                  "vendor_mobile": "8987676752",
                                  "vendor_address": null
                              },
                              {
                                  "vendor_id": 134,
                                  "vendor_name": "Imtiaj Vendor",
                                  "vendor_email": "imtiaj@letsworkwise.com",
                                  "vendor_mobile": "32165478901",
                                  "vendor_address": "jbr tech park, Karnataka, Bengaluru"
                              }
                          ]
                      },
                      {
                          "product_id": 6818,
                          "product_name": "PIPE/LOW TEMP STEEL",
                          "comment": "com",
                          "datasheet": "",
                          "spec_file": "",
                          "qap_file": "",
                          "datasheet_file": "",
                          "variant": 0,
                          "product_files": null,
                          "specs": [
                              {
                                  "title": "Size",
                                  "value": "size 2"
                              },
                              {
                                  "title": "Spec",
                                  "value": "pipe 1"
                              },
                              {
                                  "title": "Quantity",
                                  "value": "2"
                              },
                              {
                                  "title": "Unit",
                                  "value": "un2"
                              }
                          ],
                          "vendors": [
                              {
                                  "vendor_id": 439,
                                  "vendor_name": "testing yash1",
                                  "vendor_email": "yash+testing1@gmail.com",
                                  "vendor_mobile": "4563459871",
                                  "vendor_address": null
                              },
                              {
                                  "vendor_id": 270,
                                  "vendor_name": "Vendor Workwise Imtiaj",
                                  "vendor_email": "vendor@letsworkwise.com",
                                  "vendor_mobile": "9876543333",
                                  "vendor_address": ""
                              }
                          ]
                      }
                   ]
              }
          ]
      }
  ]
}


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
        ["Project Status", project.project_status]
    ];
    const wsProject = XLSX.utils.aoa_to_sheet(projectData);
    XLSX.utils.book_append_sheet(wb, wsProject, `Project Details`);
    XLSX.writeFile(wb, `Project_${project.project_id}_Details.xlsx`);
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
      ["Reverse Auction", rfq.reverse_auction ? "Yes" : "No"]
  ];

  if (rfq.terms) {
      rfqData.push(["Terms"]);
      rfq.terms.forEach(term => {
          rfqData.push(["", term.term_content]);
      });
  }

    if (rfq.rfq_files) {
        rfqData.push(["RFQ Files"]);
        rfq.rfq_files.forEach(file => {
            rfqData.push(["", file.file_type, file.file_url]);
        });
    }

  const wsRFQ = XLSX.utils.aoa_to_sheet(rfqData);
  XLSX.utils.book_append_sheet(wb, wsRFQ, `RFQ Details`);

  // Add Product, Vendor, and Product File Details in a single sheet for each product
  rfq.products.forEach((product, index) => {
        let sheetName = `product_vendor_list_${index+1}`;

      const productVendorData = [
          ["Product ID", product.product_id],
          ["Product Name", product.product_name],
          ["Product Comment", product.comment],
          ...product.specs.map(spec => [spec.title, spec.value]),
          [], // Empty row for visual separation
            ["Product Files"]
        ];

        product.product_files?.forEach(file => {
            productVendorData.push([file.file_type, file.file_url]);
        });

        productVendorData.push([]); // Adding another separation before vendor details
        productVendorData.push(["Vendor ID", "Vendor Name", "Vendor Email", "Vendor Mobile", "Vendor Address"]);

      product.vendors.forEach(vendor => {
          productVendorData.push([
              vendor.vendor_id,
              vendor.vendor_name,
              vendor.vendor_email,
              vendor.vendor_mobile,
              vendor.vendor_address || "N/A" // Handle null addresses
          ]);
      });

      const wsProductVendors = XLSX.utils.aoa_to_sheet(productVendorData);
      XLSX.utils.book_append_sheet(wb, wsProductVendors, sheetName);
  });

  XLSX.writeFile(wb, `RFQ_${rfq.rfq_no}_Details.xlsx`);
};

const createExcelReport = () => {
    response.projectDetail.forEach(project => {
        downloadProjectDetails(project);
        project.rfq_details.forEach(rfq => {
            downloadRfqDetails(rfq);
        });
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
                onClick={createExcelReport}
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
