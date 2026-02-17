import React, { useEffect, useState } from "react";
import Select from "react-select";
import Link from "next/link";
import { getRfqs } from "@/services/rfq";
import { getPoData, getPoDetails, handleMarkGRN, handlePOApproval, handlePOInitialization, updatePODetails } from "@/services/po";
import { useRouter } from "next/router";
import { getProjectList } from "@/services/project";
import POListing from "./POListing";
import PurchaseOrderDetails from "./PODetails";
import { toast } from "react-toastify";
import { getCompanyUsers } from "@/services/Auth";
import RejectRemarksModal from "./RejectRemarksModal";
import ConfirmationModal from "@/components/modal/ConfirmationModal";
import UpdateGRNModal from "./UpdateGRNModal";
import { Badge } from "react-bootstrap";
import RFQListSidebar from "@/components/shared/RFQListSidebar";

const PurchaseOrders = () => {
  const router = useRouter();

  const { rfq, po, edit } = router.query;
  const [loading, setloading] = useState(false);
  const [rfqLoading, setRFQLoading] = useState(false);
  const [myRFQs, setmyRFQs] = useState([]);
  const [rfqNo, setRfqNo] = useState(null);
  const [projects, setProjects] = useState(null);
  const [selectedproject, setSelectedproject] = useState(null);
  const [poData, setPOData] = useState(null);
  const [totalData, setTotalData] = useState(0);
  const [approvalLevel, setApprovalLevel] = useState(null);
  const [poDetails, setPODetails] = useState(null);
  const [companyUsers, setCompanyUsers] = useState([]);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showGRNModal, setShowGRNModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
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
      project_id: selectedproject ? selectedproject : -1,
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

  const openRejectRemarksModal = (po_id, data, selectedPO) => {
    setSelectedPODetail({
      po_id,
      data,
      selectedPO,
    })
    setShowRejectModal(true);
  }

  const openApproveRemarksModal = (po_id, data) => {
    setSelectedPODetail({
      po_id,
      data,
    })
    setShowApproveModal(true);
  }

  const openGRNUpdateModal = (po_id, data, selectedPO) => {
    setSelectedPODetail({
      po_id,
      data,
      selectedPO,
    })
    setShowGRNModal(true);
  }

  const rejectWithRemarks = async (remarks) => {
    const res = await handlePOApproval(selectedPODetail.po_id, {...selectedPODetail.data, remarks});
    if(res) {
      toast.success(res.message);
    } else {
      throw new Error("Something went wrong while making a decision, please try again!")
    }
    setShowRejectModal(false);
  }

  const approveWithRemarks = async (remarks) => {
    const res = await handlePOApproval(selectedPODetail.po_id, {...selectedPODetail.data, remarks});
    if(res) {
      toast.success(res.message);
    } else {
      throw new Error("Something went wrong while making a decision, please try again!")
    }
    setShowApproveModal(false);
  }

  const handleConfirmGRNUpdate = async (file) => {
    await handleMarkGRN(selectedPODetail.po_id, file);
    toast.success(`GRN Marked for PO #${selectedPODetail.data.po_number}`);
    setShowGRNModal(false);
    getPOData();
  }

  const handlePODecision = async (po_id, data, selectedPO) => {
    try {
      setloading(true);
      if(data.type == 'approval') {
        if(data.decision == 'rejected') {
          openRejectRemarksModal(po_id, data, selectedPO);
          return;
        } else {
          openApproveRemarksModal(po_id, data);
          return;
        }
      } else {
        openGRNUpdateModal(po_id, data, selectedPO);
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
          <div className="row" style={{ flexWrap: 'nowrap', gap: '16px' }}>
              <RFQListSidebar
                title="Purchase Orders"
                rfqList={myRFQs}
                loading={rfqLoading}
                selectedRfqId={rfq}
                linkPrefix="/dashboard/buyer/purchase-order"
                linkQueryKey="rfq"
                tabs={[
                  {
                    key: 'action_required',
                    label: 'Action Required',
                    filter: (item) => item.approval_required === true,
                  },
                  {
                    key: 'action_completed',
                    label: 'Completed',
                    filter: (item) => !item.approval_required,
                  },
                ]}
                defaultTab="action_required"
                rfqNo={rfqNo}
                onRfqNoChange={(val) => setRfqNo(val)}
                searchPlaceholder="Search by number..."
                projects={projects || []}
                onProjectChange={(val) => setSelectedproject(val)}
                showTypeFilter={false}
                getItemTags={(item, isSelected) => {
                  if (isSelected) return [];
                  const tags = [];
                  if (item.approval_required) {
                    tags.push({ label: 'Approval Pending', variant: 'warning' });
                  } else {
                    tags.push({ label: 'Processed', variant: 'success' });
                  }
                  return tags;
                }}
                pageId="purchase_order"
              />
            <div className="col-md-10" style={{ flex: '1 1 0%', width: 'auto', maxWidth: 'none' }}>
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
                      handleInitiatePO={handleInitiatePO}
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
                          `/dashboard/buyer/purchase-order/?rfq=${rfq}`,
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

      <UpdateGRNModal 
        show={showGRNModal} 
        onClose={() => setShowGRNModal(false)} 
        onAction={handleConfirmGRNUpdate}
      />

      <RejectRemarksModal show={showRejectModal} poData={selectedPODetail.selectedPO} onClose={() => setShowRejectModal(false)} onAction={(remarks) => rejectWithRemarks(remarks)}/>
      <RejectRemarksModal type="approve" show={showApproveModal} onClose={() => setShowApproveModal(false)} onAction={(remarks) => approveWithRemarks(remarks)}/>
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

export default PurchaseOrders;