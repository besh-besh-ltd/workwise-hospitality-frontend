import React, { useEffect, useState } from "react";
import Select from "react-select";
import Link from "next/link";
import { getRfqs } from "@/services/rfq";
import { getPoData, getPoDetails, handleMarkDispatched, handlePOApproval, handlePOInitialization, handleRaiseInvoice, updatePODetails } from "@/services/po";
import { useRouter } from "next/router";
import { getProjectList } from "@/services/project";
import POListing from "./POListing";
import PurchaseOrderDetails from "./PODetails";
import { toast } from "react-toastify";
import { getCompanyUsers } from "@/services/Auth";
import ConfirmationModal from "@/components/modal/ConfirmationModal";
import RaiseInvoiceModal from "./RaiseInvoiceModal";
import { Badge } from "react-bootstrap";

const OrderBook = () => {
  const router = useRouter();

  const { rfq, po, edit } = router.query;
  const [loading, setloading] = useState(false);
  const [rfqLoading, setRFQLoading] = useState(false);
  const [myRFQs, setmyRFQs] = useState([]);
  const [rfqNo, setRfqNo] = useState(null);
  const [poData, setPOData] = useState(null);
  const [totalData, setTotalData] = useState(0);
  const [approvalLevel, setApprovalLevel] = useState(null);
  const [poDetails, setPODetails] = useState(null);
  const [companyUsers, setCompanyUsers] = useState([]);
  const [showRaiseInvoiceModal, setShowRaiseInvoiceModal] = useState(false);
  const [showMarkDispatchedModal, setShowMarkDispatchedModal] = useState(false);
  const [selectedPODetail, setSelectedPODetail] = useState({
    po_id: null,
    data: null,
    selectedPO: null,
  })
  const [initiatePOModal, setInitiatePOModal] = useState({
    selectedPO: null,
    showModal: false
  });

  const [page, setpage] = useState(1);
  const [limit, setlimit] = useState(100);
  const [isEditing, setIsEditing] = useState(edit == 'true')

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
      rfq_no: rfqNo ? parseInt(rfqNo.replace("#", "")) : null,
      sort: "DESC",
      module_keys: "po",
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
          setApprovalLevel(value.approval_level);
        }
    }).finally(() => setloading(false));
  };

  const openRaiseInvoiceModal = (po_id, data, selectedPO) => {
    setSelectedPODetail({
      po_id,
      data,
      selectedPO,
    })
    setShowRaiseInvoiceModal(true);
  }

  const handleConfirmRaiseInvoice = async (file) => {
    await handleRaiseInvoice(selectedPODetail.po_id, file);
    toast.success(`Invoice Raised for PO #${selectedPODetail.data.po_number}`);
    setShowRaiseInvoiceModal(false);
    getPOData();
  }

  const markAsDispatched = async (po_id, po_number) => {
    try {
      await handleMarkDispatched(po_id);
      toast.success(`Marked as dispatched for PO #${po_number}`);
      setShowRaiseInvoiceModal(false);
      getPOData();
    } catch (error) {
      toast.warning("Something went wrong while marking this PO as dispatched!") 
    }
  }

  const handlePODecision = async (po_id, data, selectedPO) => {
    try {
      setloading(true);
      if(data.type == 'invoice') {
        openRaiseInvoiceModal(po_id, data, selectedPO);
        return;
      } else {
        await markAsDispatched(po_id, data.po_number);
      }
    } catch (error) {
      console.error(error);
      toast.error(error.message ?? 'Something went wrong while making a decision, please try again!')
    } finally {
      setloading(false);
    }
  }

  const handleInitiatePO = async (po_id) => {
   setInitiatePOModal({
    showModal: true,
    selectedPO: po_id,
   }) 
  }

  const confirmInitiatePO = async () => {
    try {
      setloading(true);
      const res = await handlePOInitialization(initiatePOModal.selectedPO);
      getPOData(poMeta);
      if(res) {
        toast.success(res.message);
      } else {
        throw new Error("Something went wrong while making a decision, please try again!")
      }
    } catch (error) {
      console.error(error);
      const message = error?.response?.data?.message || error.message || 'Something went wrong while making a decision, please try again!'
      toast.error(message)
    } finally {
      setloading(false);
      setInitiatePOModal({
        showModal: false,
        selectedPO: null
      })
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

  const handlePOEdit = async (payload) => {
    if(!po) return;

    try {
      setloading(true);
      const response = await updatePODetails(po, payload)
      console.log("PO UPDATE RESPONSE:", response);
    } finally {
      setloading(false);
    }
  }

  useEffect(() => {
    getPOData();
  }, [rfq]);

  useEffect(() => { fetchCompanyUsers(); }, [])
  
  useEffect(() => {
    getPODetails();
  }, [po]);

  useEffect(() => {
    console.log("EDIT:", edit)
    setIsEditing(edit == 'true')
  }, [edit])

  useEffect(() => {
    const handler = setTimeout(() => {
      getAllRFQs(true);
    }, 1000);

    return () => {
      clearTimeout(handler);
    };
  }, [rfqNo]);

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
                {!rfqLoading && myRFQs && myRFQs.length === 0 ? (
                  <p style={{ textAlign: "center" }}>No RFQs yet!</p>
                ) : !rfqLoading && myRFQs && myRFQs.length > 0 ? (
                  <ul
                    className="overflow-y-auto mt-1"
                    style={{ maxHeight: "70vh" }}
                  >
                    {myRFQs.map((item) => {
                      const isSelected = item.id == rfq;
                      return (
                        <li
                          key={item.id}
                          className={`${
                            isSelected ? "active rounded" : ""
                          }`}
                          style={!isSelected && item.approval_required ? { backgroundColor: '#fff3f3', borderLeft: '3px solid #dc3545' } : {}}
                        >
                          <Link
                            href={`/dashboard/vendor/order-book/?rfq=${item?.id}`}
                            className={`${
                              isSelected ? "text-white" : "text-dark"
                            }`}
                            id={`rfq_item_${item.rfq_no}-rfq_selection-purchase_order_page`}
                          >
                            <span className="d-flex align-items-center gap-1 flex-wrap">
                              RFQ #{item?.rfq_no}
                              {!isSelected && item.approval_required && (
                                <Badge bg="danger" style={{ fontSize: '0.6rem', padding: '2px 5px' }}>Your Approval Required</Badge>
                              )}
                            </span>
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
                      handleProgressStatus={handlePODecision}
                      rfq_id={rfq}
                      refetchPOList={getPOData}
                      handleInitiatePO={handleInitiatePO}
                      onSelect={(po_id) =>
                        router.push(
                          `/dashboard/vendor/order-book/?rfq=${rfq}&po=${po_id}`
                        )
                      }
                      onEdit={(po_id) =>
                        router.push(
                          `/dashboard/vendor/order-book/?rfq=${rfq}&po=${po_id}&edit=true`
                        )
                      }
                      companyUsers={companyUsers}
                      approvalLevel={approvalLevel}
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
                      handleInitiatePO={handleInitiatePO}
                      handleBack={() => {
                        setPODetails(null);
                        router.push(
                          `/dashboard/vendor/order-book/?rfq=${rfq}`,
                          null,
                          { shallow: true }
                        );
                      }}
                      companyUsers={companyUsers}
                      isEditing={isEditing}
                      setIsEditing={setIsEditing}
                      handleUpdatePO={async (payload) => {
                        console.log("PO EDIT PAYLOAD:", payload)
                        await handlePOEdit(payload);
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <RaiseInvoiceModal 
        show={showRaiseInvoiceModal} 
        onClose={() => setShowRaiseInvoiceModal(false)} 
        onAction={handleConfirmRaiseInvoice}
      />

      <ConfirmationModal
        isOpen={initiatePOModal.showModal}
        onClose={() => setInitiatePOModal({
          showModal: false,
          selectedPO: null
        })}
        onConfirm={confirmInitiatePO}
        title="Initiate this PO"
        description={`Are you sure you want to initiate this PO? Once initiated this action cannot be reversed!`}
        confirmButtonColor="warning"
        confirmButtonText="Initiate PO"
        cancelButtonText="Cancel"
      />
    </>
  );
};

export default OrderBook;