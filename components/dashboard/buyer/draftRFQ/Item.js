import React, { useState } from "react";
import Link from "next/link";
import moment from "moment";
import { Button } from "react-bootstrap";
import { deleteDraft } from "@/services/rfq";
import { toast } from "react-toastify";
import ConfirmationModal from "@/components/modal/ConfirmationModal";
import { formatRFQNumber, getEntityLabel } from "@/utils/sharedFunctions";

const DraftRFQItem = ({ data , refetch }) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingDraftId, setDeletingDraftId] = useState(null);
   
  const handleDeleteDarft = async (draft_id) => {
    try { 
      // Call the deleteDraft service function
      const response = await deleteDraft(draft_id);
      if (response && response.status === 1) {
        toast.success(`Draft ${getEntityLabel(data?.is_tender)} deleted successfully`);
        // Refetch the draft RFQs after successful deletion
        if (refetch && typeof refetch === "function") {
          refetch();
        }
      } else {
        toast.error(`Failed to delete draft ${getEntityLabel(data?.is_tender)}`);
      }
    } catch (error) {
      toast.error(`Error deleting draft ${getEntityLabel(data?.is_tender)}`);
    }
  };

  const openDeleteModal = (draftId) => {
    setDeletingDraftId(draftId);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setDeletingDraftId(null);
  };

  const confirmDelete = async () => {
    if (deletingDraftId) {
      await handleDeleteDarft(deletingDraftId);
      closeDeleteModal();
    }
  };

  const textCapitalize = (text) => {
    if (!text) return "";
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  };

  const list_products = () => {
    let productTitles = [];

    if (data?.products && data?.products?.length > 0) {
      data.products.map((item) => {
        if (item?.product_details && item?.product_details?.length > 0) {
          let n = item?.product_details[0].name;
          if (!productTitles.includes(n)) {
            productTitles.push(n);
          }
        }
      });

      const limitedProducts = productTitles.slice(0, 3);
      return (
        <span className="mproducts">
          {limitedProducts.map((title, index) => (
            <React.Fragment key={title}>
              {title}
              <br />
            </React.Fragment>
          ))}
        </span>
      );
    }

    return "---";
  };

  return (
    <>
      <tr>
        <td>
          {data?.title && <span className="d-block fw-bold">{data.title}</span>}
          <span className="d-block">{formatRFQNumber(data?.rfq_no, data?.is_tender)}</span>
          <span className="text-truncate">{data?.project_name}</span>
        </td>
        <td>{list_products()}</td>
        <td style={{ width: "190px" }}>
          <span className="d-flex justify-content-between">
            <b className="fw-semibold">Created: </b>
            {moment(data.timestamp).format("DD-MM-YYYY")}
          </span>
          <span className="d-flex justify-content-between">
            <b className="fw-semibold">End Date: </b>
            {data.bid_end_date
              ? moment(data.bid_end_date).format("DD-MM-YYYY hh:mm A")
              : "---"}
          </span>
          <span>
            <b className="fw-semibold ">Status: </b>
            {data.status === 5 ? (
              <span className="badge rounded-pill ms-5" style={{ backgroundColor: '#fd7e14', color: '#fff' }}>
                Withdrawn
              </span>
            ) : (
              <span className="badge rounded-pill text-bg-warning ms-5">
                Draft
              </span>
            )}
          </span>
          {data.status === 5 && (
            <small className="d-block text-muted mt-1" style={{ fontSize: '0.75rem' }}>
              Previously submitted for publishing
            </small>
          )}
        </td>

        <td>
          {data.is_tender === 1
            ? "---"
            : (data.rfq_type == "" || data.rfq_type == null)
              ? "---"
              : textCapitalize(data.rfq_type)}
        </td>
        <td>{data.reverse_auction == 1 ? "Enabled" : "Disabled"}</td>
        <td>
          <div className="d-flex gap-3">
            <Link
              href={`/dashboard/buyer/rfq-management?tab=create-rfq&draft_id=${data?.id}`}
              className="btn btn-sm btn-primary"
              style={{ width: "100px", padding: "9px 0" }}
              id={`edit_draft_rfq_${data?.id}-draft_actions-draft_rfq_page`}
            >
              Edit
            </Link>

            <Button
              className="btn btn-sm bg-danger border-0 text-white"
              style={{ width: "100px", padding: "0" }}
              onClick={() => openDeleteModal(data?.id)}
              id={`delete_draft_rfq_${data?.id}-draft_actions-draft_rfq_page`}
            >
              Delete
            </Button>
          </div>
        </td>
      </tr>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={closeDeleteModal}
        onConfirm={confirmDelete}
        title="Delete Draft RFQ"
        description={`Are you sure you want to delete draft ${data?.is_tender === 1 ? 'Tender' : 'RFQ'} #${data?.rfq_no || 'this draft'}?\nOnce deleted, you won't be able to recover it.`}
        confirmButtonColor="danger"
        confirmButtonText="Delete"
        cancelButtonText="Cancel"
      />
    </>
  );
};

export default DraftRFQItem;
