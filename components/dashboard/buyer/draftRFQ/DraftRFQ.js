import { getDraftRFQs, deleteDraft } from "@/services/rfq";
import React, { useEffect, useState } from "react";
import RFQCard from "../manageRFQ/RFQCard/RFQCard";
import RFQListSkeleton from "../manageRFQ/RFQListSkeleton";
import Pagination from "@/components/shared/Pagination";
import { toast } from "react-toastify";
import { getEntityLabel } from "@/utils/sharedFunctions";
import ConfirmationModal from "@/components/modal/ConfirmationModal";

const fallbackFilterData = {
  project_id: -1,
  rfq_type: "",
  reverse_auction: "-1",
  sort: "DESC",
  rfq_no: null,
  is_tender: null,
  page: 1,
  limit: 10,
};

const DraftRFQ = ({ filterData: parentFilterData, setFilterData: setParentFilterData }) => {
  const [loading, setloading] = useState(false);
  // Use parent's shared filterData if provided (so the top FilterSection drives
  // this list too), otherwise fall back to local state for backward compat.
  const usingParentFilters = !!parentFilterData && !!setParentFilterData;
  const [localFilterData, setLocalFilterData] = useState(fallbackFilterData);
  const filterData = usingParentFilters ? parentFilterData : localFilterData;
  const setFilterData = usingParentFilters ? setParentFilterData : setLocalFilterData;

  const page = filterData.page || 1;
  const limit = filterData.limit || 10;
  const setpage = (p) => setFilterData((prev) => ({ ...prev, page: p }));
  const setlimit = (l) => setFilterData((prev) => ({ ...prev, limit: l, page: 1 }));

  const [myDraftRFQs, setMyDraftRFQs] = useState([]);
  const [totalDraftRFQs, setTotalDraftRFQs] = useState(0);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingDraft, setDeletingDraft] = useState(null);

  // Function to get all draft RFQs
  const getAllDraftRFQs = () => {
    setloading(true);

    getDraftRFQs({ ...filterData, page, limit })
      .then((res) => {
        setloading(false);
        if (res && res.status === 1) {
          setMyDraftRFQs(res.data || []);
          setTotalDraftRFQs(res.total_items || 0);
        } else {
          setMyDraftRFQs([]);
          setTotalDraftRFQs(0);
          toast.error(`Failed to fetch draft ${getEntityLabel(filterData?.is_tender, true)}`);
        }
      })
      .catch((err) => {
        setloading(false);
        toast.error(`Error fetching draft ${getEntityLabel(filterData?.is_tender, true)}`);
        setMyDraftRFQs([]);
        setTotalDraftRFQs(0);
      });
  };

  const handleDeleteDraft = async () => {
    if (!deletingDraft) return;
    try {
      const response = await deleteDraft(deletingDraft.id);
      if (response && response.status === 1) {
        toast.success(`Draft ${getEntityLabel(deletingDraft?.is_tender)} deleted successfully`);
        getAllDraftRFQs();
      } else {
        toast.error(`Failed to delete draft ${getEntityLabel(deletingDraft?.is_tender)}`);
      }
    } catch (error) {
      toast.error(`Error deleting draft ${getEntityLabel(deletingDraft?.is_tender)}`);
    } finally {
      setShowDeleteModal(false);
      setDeletingDraft(null);
    }
  };

  const openDeleteModal = (data) => {
    setDeletingDraft(data);
    setShowDeleteModal(true);
  };

  useEffect(() => {
    getAllDraftRFQs();
  }, [filterData]);

  return (
    <>
      <div className="manage-rfq-con">
        <div className="details-table mt-0">
          {/* Card Data Section — uses the same skeleton as other tabs for consistency */}
          {loading && <RFQListSkeleton count={limit > 5 ? 5 : limit} />}
          {!loading && myDraftRFQs.length == 0 && (
            <p>You don't have any draft Tender / RFQs yet!</p>
          )}
          {!loading && myDraftRFQs && myDraftRFQs.length > 0 && (
            <div className="d-flex flex-column gap-2">
              {myDraftRFQs.map((item) => (
                <RFQCard
                  key={`draft_rfq_card_${item.id}`}
                  data={item}
                  isDraft={true}
                  onDelete={openDeleteModal}
                />
              ))}
            </div>
          )}

          {!loading && myDraftRFQs.length > 0 && (
            <Pagination
              page={page}
              setPage={setpage}
              limit={limit}
              setLimit={setlimit}
              totalData={totalDraftRFQs}
            />
          )}
        </div>
      </div>

      {/* Delete Draft Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => { setShowDeleteModal(false); setDeletingDraft(null); }}
        onConfirm={handleDeleteDraft}
        title={`Delete Draft ${getEntityLabel(deletingDraft?.is_tender)}`}
        description={`Are you sure you want to delete draft ${getEntityLabel(deletingDraft?.is_tender)} #${deletingDraft?.rfq_no || 'this draft'}?\nOnce deleted, you won't be able to recover it.`}
        confirmButtonColor="danger"
        confirmButtonText="Delete"
        cancelButtonText="Cancel"
      />
    </>
  );
};

export default DraftRFQ;
