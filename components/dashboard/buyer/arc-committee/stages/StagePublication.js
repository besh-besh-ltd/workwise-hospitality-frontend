import React from 'react';
import moment from 'moment';
import { BsCalendar, BsGlobe } from 'react-icons/bs';

const StagePublication = ({ stage, rfq }) => {
  const { details } = stage;

  return (
    <div className="stage-publication">
      <p className="text-muted mb-3" style={{ fontSize: '0.9rem' }}>
        The tender was published and made available to vendors for quoting.
      </p>

      <div className="row g-3 mb-3">
        <div className="col-md-6">
          <div className="d-flex align-items-start gap-2">
            <BsGlobe className="text-success mt-1" />
            <div>
              <div className="text-muted small">Published On</div>
              <div className="fw-semibold">
                {details.publishDate
                  ? moment(details.publishDate).format('DD MMM YYYY, HH:mm')
                  : stage.timestamp
                    ? moment(stage.timestamp).format('DD MMM YYYY, HH:mm')
                    : 'N/A'
                }
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="d-flex align-items-start gap-2">
            <BsCalendar className="text-warning mt-1" />
            <div>
              <div className="text-muted small">Bid End Date</div>
              <div className="fw-semibold">
                {details.bidEndDate || rfq?.bid_end_date
                  ? moment(details.bidEndDate || rfq?.bid_end_date).format('DD MMM YYYY')
                  : 'N/A'
                }
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actor info */}
      {stage.actor && (
        <div className="pt-3 border-top">
          <div className="d-flex justify-content-between align-items-center">
            <div className="text-muted small">
              <strong>Published by:</strong> {stage.actor}
            </div>
            {stage.timestamp && (
              <div className="text-muted small">
                {moment(stage.timestamp).format('DD MMM YYYY, HH:mm')}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StagePublication;
