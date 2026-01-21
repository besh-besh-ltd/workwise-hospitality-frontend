import React from 'react';
import { Badge, Table } from 'react-bootstrap';
import moment from 'moment';
import { BsFileText, BsCheckCircle } from 'react-icons/bs';

const StageQuotesReceived = ({ stage, lifecycleData }) => {
  const { details } = stage;
  const quotes = details.quotes || lifecycleData?.quotes || [];

  return (
    <div className="stage-quotes-received">
      <p className="text-muted mb-3" style={{ fontSize: '0.9rem' }}>
        Vendors submitted their quotes in response to the tender.
      </p>

      <div className="d-flex align-items-center gap-3 mb-3">
        <div className="d-flex align-items-center gap-2">
          <BsFileText className="text-primary" size={20} />
          <div>
            <div className="fw-bold">{quotes.length}</div>
            <div className="text-muted small">Quotes Received</div>
          </div>
        </div>
      </div>

      {quotes.length > 0 ? (
        <Table size="sm" bordered hover className="mb-0">
          <thead className="table-light">
            <tr>
              <th>Vendor</th>
              <th>Email</th>
              <th>Items</th>
              <th>Submitted</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {quotes.map((quote) => (
              <tr key={quote.id}>
                <td className="fw-semibold">
                  {quote.vendor_name || quote.organization_name || 'Unknown'}
                </td>
                <td className="text-muted small">{quote.vendor_email || 'N/A'}</td>
                <td>{quote.quote_items?.length || 0} items</td>
                <td>{moment(quote.created_at).format('DD MMM YYYY')}</td>
                <td>
                  <Badge bg={quote.status === 1 ? 'success' : 'secondary'}>
                    {quote.status === 1 ? 'Active' : 'Inactive'}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <div className="text-center text-muted py-4">
          <BsFileText size={32} className="opacity-50 mb-2" />
          <p className="mb-0">No quotes received yet</p>
        </div>
      )}
    </div>
  );
};

export default StageQuotesReceived;
