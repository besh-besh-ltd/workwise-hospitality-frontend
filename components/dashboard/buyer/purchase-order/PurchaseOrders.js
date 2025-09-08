import React, { useEffect, useState } from "react";
import Select from "react-select";
import Link from "next/link";
import { getRfqs } from "@/services/rfq";
import { getPoData, getPoDetails, handlePOApproval } from "@/services/po";
import { useRouter } from "next/router";
import { getProjectList } from "@/services/project";
import POListing from "./POListing";
import PurchaseOrderDetails from "./PODetails";
import { toast } from "react-toastify";
import { getCompanyUsers } from "@/services/Auth";

const PurchaseOrders = () => {
  const router = useRouter();

  const { rfq, po } = router.query;
  const [loading, setloading] = useState(false);
  const [rfqLoading, setRFQLoading] = useState(false);
  const [myRFQs, setmyRFQs] = useState([]);
  const [rfqNo, setRfqNo] = useState(null);
  const [projects, setProjects] = useState(null);
  const [selectedproject, setSelectedproject] = useState(null);
  const [poData, setPOData] = useState(null);
  const [totalData, setTotalData] = useState(0);
  const [poDetails, setPODetails] = useState(null);
  const [companyUsers, setCompanyUsers] = useState([]);

  const [page, setpage] = useState(1);
  const [limit, setlimit] = useState(100);

  const [poMeta, setPOMeta] = useState({
    page: 1,
    limit: 10,
  })

  const fetchCompanyUsers = async () => {
    try {
      const res = await getCompanyUsers();
      setCompanyUsers(res.data);
    } catch (error) {
      console.error(error);
      toast.error(error.message ?? 'Something went wrong while fetching company users!');
    }
  };

  const getAllRFQs = (rfqNumberChange = false) => {
    setRFQLoading(true);
    getRfqs({
      tech_eval: false,
      po: true,
      page,
      limit,
      project_id: selectedproject ? selectedproject : -1,
      rfq_no: rfqNo ? parseInt(rfqNo.replace("#", "")) : null,
      sort: "DESC",
    })
      .then((res) => {
        setRFQLoading(false);
        const newData = Array.isArray(res) ? res : [];

        if (rfqNumberChange) {
          setpage(1);
          setlimit(100);
          setmyRFQs(newData);
        } else {
          setmyRFQs((prevRFQs) => {
            const all = [...prevRFQs, ...newData];
            const unique = [];
            const seen = new Set();
            for (const rfq of all) {
              if (!seen.has(rfq.id)) {
                unique.push(rfq);
                seen.add(rfq.id);
              }
            }
            return unique;
          });
        }
      })
      .finally(() => {
        setRFQLoading(false);
      });
  };

  const getPOData = (filters = {}) => {
    if(!rfq) return;

    setloading(true);
    getPoData(rfq, { ...poMeta, ...filters }).then(value => {
        if(value) {
          setPOData(value.data);
          setTotalData(value.total);
        }
    }).finally(() => setloading(false));
  };

  const handlePODecision = async (po_id, data) => {
    try {
      setloading(true);
      const res = await handlePOApproval(po_id, data);
      if(res) {
        toast.success(res.message);
      } else {
        throw new Error("Something went wrong while making a decision, please try again!")
      }
    } catch (error) {
      console.error(error);
      toast.error(error.message ?? 'Something went wrong while making a decision, please try again!')
    } finally {
      setloading(false);
    }
  }

  const getPODetails = () => {
    if(!po) return;

    setloading(true);
    getPoDetails(po).then(value => {
        if(value)
            setPODetails(value);
    }).finally(() => setloading(false));
  }

  const getAllProjects = () => {
    getProjectList()
      .then((res) => {
        let d = [];
        res.data.map((item) => {
          d.push({ label: item.name, value: item.id });
        });
        setProjects(d);
      })
      .catch((error) => {
        console.log(error);
      });
  };

  useEffect(() => {
    getAllRFQs(true);
  }, [selectedproject]);

  useEffect(() => {
    getPOData();
  }, [rfq]);

  useEffect(() => { fetchCompanyUsers(); }, [])
  
  useEffect(() => {
    getPODetails();
  }, [po]);

  useEffect(() => {
    const handler = setTimeout(() => {
      getAllRFQs(true);
    }, 1000);

    return () => {
      clearTimeout(handler);
    };
  }, [rfqNo]);

  useEffect(() => {
      getAllProjects();
    }, []);

  return (
    <>
      <section className="quote-common-header compare-received-quote sc-pt-80">
        <div className="container-fluid">
          <div className="row">
            <div className="col-md-6">
              <h3 className="heading">Purchase Order Management</h3>
            </div>
          </div>
        </div>
      </section>

      <section className="quote-edit-sec-1">
        <div className="container-fluid">
          <div className="row">
            <div className="col-md-2">
              <div className="hasFullLoader">
                <p className="px-1 pt-3 fs-6 mb-1 fw-medium">
                  Please select a RFQ
                </p>
                <div className="py-1">
                  <label>Search RFQ No.</label>
                  <input
                    className="form-control react-select"
                    style={{
                      borderRadius: "0.25rem",
                      borderColor: "#ced4da",
                      boxShadow: "none",
                    }}
                    value={rfqNo}
                    onChange={(e) => setRfqNo(e.target.value)}
                    name="rfq_type"
                    placeholder="Ex. 123456"
                    isClearable
                    id="search_rfq_no-rfq_selection-purchase_order_page"
                  />
                </div>
                <div className="py-2">
                  <label>Select Project</label>
                  <Select
                    options={projects}
                    onChange={(selectedOption) =>
                      setSelectedproject(
                        selectedOption?.value ? selectedOption.value : -1
                      )
                    }
                    name="project_id"
                    placeholder="Select"
                    isClearable
                    id="select_project_filter-rfq_selection-purchase_order_page"
                  />
                </div>
                {!rfqLoading && myRFQs && myRFQs.length === 0 ? (
                  <p style={{ textAlign: "center" }}>No RFQs yet!</p>
                ) : !rfqLoading && myRFQs && myRFQs.length > 0 ? (
                  <ul
                    className="overflow-y-auto mt-1"
                    style={{ maxHeight: "70vh" }}
                  >
                    {myRFQs.map((item) => {
                      return (
                        <li
                          key={item.id}
                          className={`${
                            item.id == rfq ? "active rounded" : ""
                          }`}
                        >
                          <Link
                            href={`/dashboard/buyer/purchase-order/?rfq=${item?.id}`}
                            className={`${
                              item.id == rfq ? "text-white" : "text-dark"
                            }`}
                            id={`rfq_item_${item.rfq_no}-rfq_selection-purchase_order_page`}
                          >
                            RFQ #{item?.rfq_no}
                            {item.project_name && item.project_name != "" && (
                              <b
                                className="d-block fw-semibold"
                                style={{ fontSize: "14px" }}
                              >
                                {item.project_name}
                              </b>
                            )}
                          </Link>
                        </li>
                      );
                    })}

                    {rfqLoading && (
                      <div className="d-flex justify-content-center align-items-center">
                        Loading ...
                        <div
                          className="spinner-border spinner-border-sm text-primary ms-2"
                          role="status"
                        >
                          <span className="visually-hidden">Loading...</span>
                        </div>
                      </div>
                    )}
                  </ul>
                ) : null}
              </div>
            </div>
            <div className="col-md-10">
              {!rfq && (
                <div className="quote-sec-table quote-sec-tab mb-0">
                  <div className="quote-sec-table-sub">
                    <h4 className="text-center">
                      Please select a RFQ to view its purchase orders!
                    </h4>
                  </div>
                </div>
              )}
              {rfq && !po && poData && (
                <div className="quote-sec-table quote-sec-tab mb-0">
                  <div>
                    <POListing
                      poList={poData}
                      totalData={totalData}
                      rfq_id={rfq}
                      refetchPOList={getPOData}
                      handlePODecision={handlePODecision}
                      onSelect={(po_id) =>
                        router.push(
                          `/dashboard/buyer/purchase-order/?rfq=${rfq}&po=${po_id}`
                        )
                      }
                      onEdit={(po_id) =>
                        router.push(
                          `/dashboard/buyer/purchase-order/?rfq=${rfq}&po=${po_id}&edit=true`
                        )
                      }
                      companyUsers={companyUsers}
                    />
                  </div>
                </div>
              )}
              {po && poDetails && (
                <div className="quote-sec-table quote-sec-tab mb-0">
                  <div>
                    <PurchaseOrderDetails
                      data={poDetails}
                      handlePODecision={handlePODecision}
                      refetchPODetails={getPODetails}
                      handleBack={() => {
                        setPODetails(null);
                        router.push(
                          `/dashboard/buyer/purchase-order/?rfq=${rfq}`,
                          null,
                          { shallow: true }
                        );
                      }}
                      companyUsers={companyUsers}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default PurchaseOrders;
