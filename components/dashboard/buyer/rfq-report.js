import React, { useEffect, useState } from "react";
import Link from "next/link";
import { rfqReport, exportRfq } from "@/services/products";
import Loader from "@/components/shared/Loader";
import Select from "react-select";
import axiosFormData from "@/lib/axiosFormData";
import { useRouter } from "next/router";
import { ToastContainer, toast } from "react-toastify";
import { Image } from "react-bootstrap";

const ProductManagement = () => {
  const router = useRouter();
  const id = Date.now().toString();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [uploadProgress, setuploadProgress] = useState(0);

  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");

  const month_arr = [
    {
      value: "01",
      label: "January",
    },
    {
      value: "02",
      label: "February",
    },
    {
      value: "03",
      label: "March",
    },
    {
      value: "04",
      label: "April",
    },
    {
      value: "05",
      label: "May",
    },
    {
      value: "06",
      label: "June",
    },
    {
      value: "07",
      label: "July",
    },
    {
      value: "08",
      label: "August",
    },
    {
      value: "09",
      label: "September",
    },
    {
      value: "10",
      label: "October",
    },
    {
      value: "11",
      label: "November",
    },
    {
      value: "12",
      label: "December",
    },
  ];

  const year_arr = [
    {
      value: "2024",
      label: "2024",
    },
    {
      value: "2025",
      label: "2025",
    },
    {
      value: "2026",
      label: "2026",
    },
    {
      value: "2027",
      label: "2027",
    },
    {
      value: "2028",
      label: "2028",
    },
    {
      value: "2029",
      label: "2029",
    },
    {
      value: "2030",
      label: "2030",
    },
    {
      value: "2031",
      label: "2031",
    },
    {
      value: "2032",
      label: "2032",
    },
    {
      value: "2033",
      label: "2033",
    },
    {
      value: "2034",
      label: "2034",
    },
  ];

  const getProducts = () => {
    setLoading(true);
    // setProducts([]);
    rfqReport(month, year)
      .then((res) => {
        console.log("res==============>", res);
        setLoading(false);
        // setTotalPages(Math.ceil(res?.data?.rfq?.length / limit));
        // res.data.map((item) => (item.isChecked = false));
        setProducts(res.rfq);
      })
      .catch((err) => {
        setLoading(false);
      });
  };

  const customSelectStyles = {
    control: (base) => ({
      ...base,
      height: "52px",
      maxWidth: "300px",
      borderRadius: "6px",
      paddingLeft: "10px",
      marginRight: "15px",
    }),
  };

  const exportProducts = () => {
    const checkedProduct = products.reduce(
      (acc, ele) => (ele.isChecked == true ? acc.concat(ele.id) : acc),
      []
    );
    setLoading(true);
    exportRfq(month, year)
      .then((res) => {
        setLoading(false);
        setProducts((prev) =>
          prev?.map((item) => ({ ...item, isChecked: false }))
        );
        const downloadLink = document.createElement("a");
        downloadLink.href = window.URL.createObjectURL(res);
        downloadLink.setAttribute("download", "export_rfq.xlsx"); // Set desired file name
        document.body.appendChild(downloadLink);

        // Trigger the download
        downloadLink.click();

        // Cleanup
        document.body.removeChild(downloadLink);
      })
      .catch((err) => {
        console.log(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    getProducts();
    // getVendorApproveLists();
  }, []);
  useEffect(() => {
    getProducts();
  }, []);

  return (
    <>
      <section className="vendor-common-header sc-pt-80">
        <div className="container-fluid">
          <h1 className="heading">RFQ Report</h1>
        </div>
      </section>

      <section className="vendor-mngt-sec-1">
        <div className="container-fluid">
          <div className="row">
            <div className="col-md-12">
              <div className="vendor-mngt-con">
                {/* Content for Manage RFQs tab */}
                <span className="title">RFQ</span>

                <div className="filter ">
                  <div className="d-flex justify-content-around">
                    <div className="d-flex justify-content-start  col-6">
                      <div className="col-md-4">
                        <div className="filter-options">
                          <Select
                            id={id}
                            options={year_arr}
                            placeholder="Search by Year"
                            styles={customSelectStyles}
                            isClearable={true}
                            // id="long-value-select"
                            instanceId="long-value-select"
                            onChange={(e) => setYear(e ? e.value : "")}
                          />
                        </div>
                      </div>
                      <div className="col-md-4">
                        <div className="filter-options">
                          <Select
                            id={id}
                            options={month_arr}
                            placeholder="Search by Month"
                            styles={customSelectStyles}
                            isClearable={true}
                            // id="long-value-select"
                            instanceId="long-value-select"
                            onChange={(e) => setMonth(e ? e.value : "")}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="d-flex justify-content-end col-6">
                      {month != "" && year != "" && (
                        <div className="col-md-3">
                          <div className="action-btn">
                            <button
                              className="btn btn-primary"
                              onClick={() => {
                                getProducts();
                              }}
                            >
                              Generate Report
                            </button>
                          </div>
                        </div>
                      )}
                      {month != "" && year != "" && (
                        <div
                          className="col-md-3"
                          style={{ marginLeft: "10px" }}
                        >
                          <div className="action-btn">
                            <Link
                              href="#"
                              className="btn btn-primary"
                              onClick={() => {
                                exportProducts();
                              }}
                            >
                              Export
                            </Link>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="details-table">
                  {loading && <Loader />}
                  <div className="table-responsive">
                    <table className="table table-striped">
                      <thead>
                        <tr>
                          <th scope="col">RFQ No</th>
                          <th scope="col">Quotation </th>
                          <th scope="col">RFQ Finalize</th>
                        </tr>
                      </thead>
                      <tbody>
                        {products &&
                          products.map((item) => {
                            return (
                              <>
                                {console.log("itemm++++++", item)}
                                <tr key={item.id}>
                                  <td>
                                    <Link
                                      href={`/dashboard/buyer/rfq-management-details?type=buyer-view&id=${item.id}`}
                                      className="page-links"
                                    >
                                      {item.rfq_no}
                                    </Link>
                                  </td>
                                  <td>{item.quote_received}</td>
                                  <td>{item.finilize_status}</td>
                                </tr>
                              </>
                            );
                          })}
                        {products.length == 0 && (
                          <tr>
                            <td colSpan="6">No item found.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <ToastContainer />
    </>
  );
};

export default ProductManagement;
