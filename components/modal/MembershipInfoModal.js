import React from "react";
import Modal from "react-modal";
import { BsX, BsCalendar3, BsGrid3X3GapFill, BsBuilding, BsArrowRight } from "react-icons/bs";
import { MdHeight } from "react-icons/md";

const modalOverlayStyle = {
  backgroundColor: "rgba(0, 0, 0, 0.6)",
  backdropFilter: "blur(6px)",
  zIndex: 1050,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const modalContentStyle = {
  position: "relative",
  top: "auto",
  left: "auto",
  right: "auto",
  bottom: "auto",
  border: "none",
  background: "transparent",
  overflow: "visible",
  padding: 0,
  borderRadius: 0,
  maxWidth: "700px",
  width: "95%",
  margin: "0 auto",
};

const getFinancialYearEndDate = () => {
  const now = new Date();
  const year = now.getMonth() < 3 ? now.getFullYear() : now.getFullYear() + 1;
  return `31st March ${year}`;
};

const MembershipInfoModal = ({ show, onHide, onProceed }) => {
  const expiryDate = getFinancialYearEndDate();

  return (
    <Modal
      isOpen={show}
      onRequestClose={onHide}
      ariaHideApp={false}
      contentLabel="Vendor Subscription Info"
      shouldCloseOnOverlayClick={true}
      style={{ overlay: modalOverlayStyle, content: modalContentStyle }}
    >
      <div className="membership-modal-wrap">
        {/* Header */}
        <div className="membership-modal-header">
          <div>
            <h2>Vendor Subscription</h2>
            <p>Transparent pricing — pay only for what you need</p>
          </div>
          <button type="button" className="membership-modal-close" onClick={onHide}>
            <BsX size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="membership-modal-body">
          {/* Validity Banner */}
          <div className="membership-validity">
            <BsCalendar3 size={15} className="membership-validity-icon" />
            <div>
              <p className="membership-validity-title">Membership Valid Until: {expiryDate}</p>
              <p className="membership-validity-sub">
                All subscriptions are valid until 31st March of the ongoing financial year, regardless of when you subscribe.
              </p>
            </div>
          </div>

          {/* Pricing */}
          <h5 className="membership-section-title">How Pricing Works</h5>

          <div className="membership-pricing-card">
            <div className="membership-pricing-row">
              <div className="membership-pricing-icon" style={{ background: "rgba(46, 91, 168, 0.08)" }}>
                <BsGrid3X3GapFill size={16} style={{ color: "#2E5BA8" }} />
              </div>
              <div>
                <p className="membership-pricing-label">&#8377;500 per Category</p>
                <p className="membership-pricing-desc">Each category covers multiple products under it</p>
              </div>
            </div>

            <div className="membership-pricing-divider" />

            <div className="membership-pricing-row">
              <div className="membership-pricing-icon" style={{ background: "rgba(46, 91, 168, 0.08)" }}>
                <BsBuilding size={16} style={{ color: "#2E5BA8" }} />
              </div>
              <div>
                <p className="membership-pricing-label">Multiplied by Business Units</p>
                <p className="membership-pricing-desc">The category fee applies per business unit you operate with</p>
              </div>
            </div>

            <div className="membership-pricing-divider" />

            <div className="membership-pricing-formula">
              <span className="membership-formula-label">Pricing Formula</span>
              <span className="membership-formula-text">Total = Categories &times; &#8377;500 &times; Business Units</span>
            </div>
          </div>

          {/* Example */}
          <h5 className="membership-section-title">Example</h5>

          <div className="membership-example">
            <p className="membership-example-text">
              If you select <strong>2 categories</strong> (e.g., Kitchen Equipment, Housekeeping Supplies) and <strong>4 business units</strong>:
            </p>
            <div className="membership-example-calc">
              <span className="membership-pill">2 Categories</span>
              <span className="membership-operator">&times;</span>
              <span className="membership-pill membership-pill-highlight">&#8377;500</span>
              <span className="membership-operator">&times;</span>
              <span className="membership-pill">4 Business Units</span>
              <span className="membership-operator">=</span>
              <span className="membership-pill membership-pill-result">&#8377;4,000</span>
            </div>
            <p className="membership-example-note">
              The exact amount will be calculated based on your selections during registration.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="membership-modal-footer">
          <button onClick={onProceed} className="membership-btn-primary">
            Proceed to Register
            <BsArrowRight size={16} />
          </button>
        </div>
      </div>

      <style jsx global>{`
        .membership-modal-wrap {
          background: #fff;
          border-radius: 16px;
          display: flex;
          flex-direction: column;
          max-height: 90vh;
          overflow: scroll;
        }

        .membership-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px 14px;
          border-bottom: 1px solid #f1f5f9;
          flex-shrink: 0;
        }

        .membership-modal-header h2 {
          font-size: 18px;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 2px;
        }

        .membership-modal-header p {
          font-size: 13px;
          color: #64748b;
          margin: 0;
        }

        .membership-modal-close {
          width: 34px;
          height: 34px;
          border-radius: 8px;
          border: none;
          background: #f1f5f9;
          color: #64748b;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s;
          flex-shrink: 0;
        }

        .membership-modal-close:hover {
          background: #e2e8f0;
          color: #334155;
        }

        .membership-modal-body {
          padding: 16px 24px;
        }

        .membership-modal-footer {
          padding: 14px 24px 20px;
          flex-shrink: 0;
        }

        /* Validity */
        .membership-validity {
          padding: 12px 14px;
          background: #f2f6ff;
          border: 1px solid #dbeafe;
          border-left: 3px solid #2E5BA8;
          border-radius: 0 8px 8px 0;
          display: flex;
          align-items: flex-start;
          gap: 10px;
          margin-bottom: 16px;
        }

        .membership-validity-icon {
          color: #2E5BA8;
          margin-top: 1px;
          flex-shrink: 0;
        }

        .membership-validity-title {
          margin: 0;
          font-size: 13px;
          font-weight: 600;
          color: #0f172a;
        }

        .membership-validity-sub {
          margin: 2px 0 0;
          font-size: 12px;
          color: #64748b;
          line-height: 1.4;
        }

        /* Section title */
        .membership-section-title {
          font-size: 12px;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin: 0 0 10px;
        }

        /* Pricing card */
        .membership-pricing-card {
          border: 1.5px solid #e2e8f0;
          border-radius: 10px;
          overflow: hidden;
          margin-bottom: 16px;
        }

        .membership-pricing-row {
          padding: 12px 14px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .membership-pricing-icon {
          width: 34px;
          height: 34px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .membership-pricing-label {
          margin: 0;
          font-size: 14px;
          font-weight: 600;
          color: #1e293b;
        }

        .membership-pricing-desc {
          margin: 1px 0 0;
          font-size: 12px;
          color: #94a3b8;
        }

        .membership-pricing-divider {
          height: 1px;
          background: #f1f5f9;
          margin: 0 14px;
        }

        .membership-pricing-formula {
          padding: 10px 14px;
          background: #f8fafc;
          text-align: center;
        }

        .membership-formula-label {
          display: block;
          font-size: 11px;
          font-weight: 600;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.4px;
          margin-bottom: 2px;
        }

        .membership-formula-text {
          font-size: 15px;
          font-weight: 700;
          color: #2E5BA8;
        }

        /* Example */
        .membership-example {
          background: #f2f6ff;
          border: 1px solid #dbeafe;
          border-radius: 10px;
          padding: 14px 16px;
        }

        .membership-example-text {
          margin: 0 0 10px;
          font-size: 13px;
          color: #334155;
          line-height: 1.5;
        }

        .membership-example-text strong {
          color: #2E5BA8;
        }

        .membership-example-calc {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          flex-wrap: wrap;
          margin-bottom: 8px;
        }

        .membership-pill {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 5px 10px;
          font-size: 13px;
          font-weight: 600;
          color: #334155;
          white-space: nowrap;
        }

        .membership-pill-highlight {
          color: #2E5BA8;
          border-color: #bfdbfe;
        }

        .membership-pill-result {
          background: #2E5BA8;
          border-color: #2E5BA8;
          color: #fff;
        }

        .membership-operator {
          font-size: 14px;
          color: #94a3b8;
          font-weight: 700;
        }

        .membership-example-note {
          margin: 0;
          font-size: 12px;
          color: #94a3b8;
          text-align: center;
        }

        /* CTA */
        .membership-btn-primary {
          width: 100%;
          padding: 10px 24px;
          background: #2E5BA8;
          color: #fff;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .membership-btn-primary:hover {
          background: #264FA0;
        }

        /* Responsive */
        @media (max-width: 480px) {
          .membership-modal-body {
            padding: 14px 18px;
          }

          .membership-modal-header {
            padding: 16px 18px 12px;
          }

          .membership-modal-footer {
            padding: 12px 18px 16px;
          }

          .membership-pill {
            padding: 4px 8px;
            font-size: 12px;
          }

          .membership-operator {
            font-size: 12px;
          }

          .membership-formula-text {
            font-size: 13px;
          }
        }
      `}</style>
    </Modal>
  );
};

export default MembershipInfoModal;
