import React from 'react';
import { Modal, Button, Table } from 'react-bootstrap';

const FinalizeHistoryModal = ({
  show,
  onHide,
  history,
  quantity,
  calculateTotal,
}) => {

    const getFormattedDate = (date) => {
      return new Date(date).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });
    };
  return (
    <Modal
      show={show}
      onHide={onHide}
      centered
      size="xl"
      contentClassName="p-4"
      dialogClassName="custom-modal-width"
    >
      <Modal.Header closeButton>
        <Modal.Title className="fw-semibold fs-4">Finalization History</Modal.Title>
      </Modal.Header>

      <Modal.Body className="pt-2 pb-4 px-0">
        <p className="mb-3 text-muted">
          The below vendor(s) were finalized before the current finalized vendor.
          <br/>
          This helps you track previous decisions and modifications to vendor selection.
        </p>

        <div className="table-responsive border rounded">
          <Table striped bordered hover className="mb-0">
            <thead className="table-light">
              <tr>
                <th>Vendor ID</th>
                <th>Vendor Name</th>
                <th>Quoted Price</th>
                <th>Finalized At</th>
                <th>Changed At</th>
                <th>Changed By</th>
              </tr>
            </thead>
            <tbody>
              {history.length > 0 ? (
                history.map((entry, index) => (
                  <tr key={index}>
                    <td>{entry.vendor_id}</td>
                    <td>{entry.vendor_name}</td>
                    <td>₹{calculateTotal(entry.quote_info, quantity) || '—'}</td>
                    <td>{getFormattedDate(entry.finalized_at)}</td>
                    <td>{getFormattedDate(entry.changed_at)}</td>
                    <td>{entry.changed_by}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-3">
                    No previous finalizations found.
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </div>
      </Modal.Body>

      <Modal.Footer className="d-flex justify-content-end p-0 pt-3">
        <Button variant="secondary" style={{ padding: "0.7rem", margin: '0' }} onClick={onHide}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default FinalizeHistoryModal;