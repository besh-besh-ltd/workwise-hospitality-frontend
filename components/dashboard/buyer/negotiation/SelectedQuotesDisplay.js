import React from 'react';
import { Badge, Alert } from 'react-bootstrap';
import { BsCheckCircleFill, BsXCircleFill, BsClockFill } from 'react-icons/bs';

const statusConfig = {
  PENDING: {
    variant: 'warning',
    icon: BsClockFill,
    label: 'Pending Approval',
    description: 'The following quotes are awaiting approval'
  },
  APPROVED: {
    variant: 'success',
    icon: BsCheckCircleFill,
    label: 'Approved',
    description: 'The following quotes have been approved'
  },
  REJECTED: {
    variant: 'danger',
    icon: BsXCircleFill,
    label: 'Rejected',
    description: 'The following quotes were rejected'
  }
};

const SelectedQuotesDisplay = ({
  quotes = [],
  vendorCodeMap = {},
  vendorNameMap = {},
  status = 'PENDING'
}) => {
  if (!quotes || quotes.length === 0) return null;

  const config = statusConfig[status] || statusConfig.PENDING;
  const StatusIcon = config.icon;

  // Sort quotes by price (lowest first)
  const sortedQuotes = [...quotes].sort((a, b) => {
    const priceA = parseFloat(a.quoted_price || a.total_price || 0);
    const priceB = parseFloat(b.quoted_price || b.total_price || 0);
    return priceA - priceB;
  });

  return (
    <Alert variant={config.variant} className="mb-3">
      <div className="d-flex align-items-center gap-2 mb-2">
        <StatusIcon size={20} />
        <strong>{config.label}</strong>
      </div>
      <p className="mb-2 small">{config.description}</p>

      <div className="selected-quotes-list">
        <strong className="small">Selected Quotes:</strong>
        <div className="d-flex flex-wrap gap-2 mt-2">
          {sortedQuotes.map((quote, index) => {
            const vendorName = quote.vendor_name || quote.vendor?.organization_name || quote.vendor?.name
              || (quote.vendor_id && vendorNameMap[quote.vendor_id])
              || 'Unknown Vendor';

            const quotedPrice = parseFloat(quote.quoted_price || quote.total_price || 0);
            const previousPrice = parseFloat(quote.previous_price || 0);
            const priceDiff = previousPrice > 0 ? quotedPrice - previousPrice : 0;

            return (
              <div
                key={quote.quote_id || quote.id || index}
                className="p-2 rounded border"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.7)',
                  minWidth: '120px'
                }}
              >
                <div className="fw-bold d-flex align-items-center gap-1">
                  {vendorName}
                  {index === 0 && (
                    <Badge bg="success" style={{ fontSize: '0.65rem' }}>Lowest</Badge>
                  )}
                </div>
                <div className="small">
                  {quotedPrice.toLocaleString('en-IN', {
                    style: 'currency',
                    currency: 'INR',
                    minimumFractionDigits: 2
                  })}
                </div>
                {previousPrice > 0 && priceDiff !== 0 && (
                  <div className="small">
                    <Badge
                      bg={priceDiff < 0 ? 'success' : 'danger'}
                      style={{ fontSize: '0.6rem' }}
                    >
                      {priceDiff < 0 ? '↓' : '↑'} {Math.abs(priceDiff).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </Badge>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Alert>
  );
};

export default SelectedQuotesDisplay;
