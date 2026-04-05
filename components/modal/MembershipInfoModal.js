import React from "react";
import Modal from "react-modal";
import { BsX, BsCheckCircleFill, BsXCircle, BsCalendar3 } from "react-icons/bs";

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
  maxWidth: "960px",
  width: "95%",
  margin: "0 auto",
};

const getFinancialYearEndDate = () => {
  const now = new Date();
  // Financial year ends on March 31. If we are in Jan-Mar (month 0-2),
  // end date is March 31 of the current year. Otherwise next year.
  const year = now.getMonth() < 3 ? now.getFullYear() : now.getFullYear() + 1;
  return `31st March ${year}`;
};

const MembershipInfoModal = ({ show, onHide, plans = [], allPlansInclude = [], onSelectPlan }) => {
  const expiryDate = getFinancialYearEndDate();

  return (
    <Modal
      isOpen={show}
      onRequestClose={onHide}
      ariaHideApp={false}
      contentLabel="Vendor Membership Plans"
      shouldCloseOnOverlayClick={true}
      style={{ overlay: modalOverlayStyle, content: modalContentStyle }}
    >
      <div style={{
        background: "#fff",
        borderRadius: "16px",
        maxHeight: "90vh",
        overflowY: "auto",
        boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
      }}>
        {/* Header */}
        <div style={{
          padding: "24px 28px 16px",
          borderBottom: "1px solid #eee",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          position: "sticky",
          top: 0,
          background: "#fff",
          borderRadius: "16px 16px 0 0",
          zIndex: 2,
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "22px", fontWeight: 700, color: "#0f172a" }}>
              Vendor Membership Plans
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: "14px", color: "#6c757d" }}>
              Choose the plan that fits your ambition
            </p>
          </div>
          <button
            type="button"
            onClick={onHide}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "4px",
              borderRadius: "6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#6c757d",
            }}
          >
            <BsX size={24} />
          </button>
        </div>

        {/* Validity Banner */}
        <div style={{
          margin: "16px 28px 0",
          padding: "14px 18px",
          background: "rgba(21, 137, 147, 0.06)",
          borderLeft: "3px solid #158993",
          borderRadius: "0 8px 8px 0",
          display: "flex",
          alignItems: "flex-start",
          gap: "12px",
        }}>
          <BsCalendar3 size={18} style={{ color: "#158993", marginTop: "2px", flexShrink: 0 }} />
          <div>
            <p style={{ margin: 0, fontSize: "15px", fontWeight: 600, color: "#0f172a" }}>
              Membership Valid Until: {expiryDate}
            </p>
            <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#6c757d", lineHeight: 1.5 }}>
              All vendor subscriptions are valid until 31st March of the ongoing financial year, regardless of when you subscribe.
            </p>
          </div>
        </div>

        {/* Plan Cards */}
        <div style={{
          padding: "20px 28px",
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "16px",
        }} className="membership-plans-grid">
          {plans.map((plan) => (
            <div
              key={plan.name}
              style={{
                border: plan.popular ? "2px solid #158993" : "1px solid #e2e8f0",
                borderRadius: "12px",
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                position: "relative",
                background: plan.popular ? "rgba(21, 137, 147, 0.02)" : "#fff",
              }}
            >
              {plan.popular && (
                <div style={{
                  position: "absolute",
                  top: "-11px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "#158993",
                  color: "#fff",
                  fontSize: "11px",
                  fontWeight: 600,
                  padding: "3px 14px",
                  borderRadius: "20px",
                  letterSpacing: "0.3px",
                  whiteSpace: "nowrap",
                }}>
                  RECOMMENDED
                </div>
              )}

              <h4 style={{ margin: "0 0 2px", fontSize: "18px", fontWeight: 700, color: "#0f172a" }}>
                {plan.name}
              </h4>
              <p style={{ margin: "0 0 10px", fontSize: "13px", color: "#6c757d" }}>
                {plan.subtitle}
              </p>
              <p style={{ margin: "0 0 16px", fontSize: "22px", fontWeight: 700, color: "#158993" }}>
                {plan.price}
              </p>

              {/* Features */}
              <div style={{ flex: 1, marginBottom: "16px" }}>
                {plan.features.map((feature) => (
                  <div
                    key={feature.name}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "8px",
                      padding: "5px 0",
                      fontSize: "13px",
                      lineHeight: 1.4,
                    }}
                  >
                    {feature.included ? (
                      <BsCheckCircleFill size={14} style={{ color: "#22c55e", marginTop: "2px", flexShrink: 0 }} />
                    ) : (
                      <BsXCircle size={14} style={{ color: "#cbd5e1", marginTop: "2px", flexShrink: 0 }} />
                    )}
                    <span style={{ color: feature.included ? "#334155" : "#94a3b8" }}>
                      {feature.name}
                      {feature.included && feature.value && (
                        <span style={{ fontWeight: 600, marginLeft: "4px" }}>
                          ({feature.value})
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>

              {/* CTA Button */}
              <button
                onClick={() => onSelectPlan(plan)}
                style={{
                  width: "100%",
                  padding: "10px 16px",
                  border: plan.popular ? "none" : "1px solid #158993",
                  borderRadius: "8px",
                  background: plan.popular ? "#158993" : "transparent",
                  color: plan.popular ? "#fff" : "#158993",
                  fontSize: "14px",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onMouseOver={(e) => {
                  if (!plan.popular) {
                    e.target.style.background = "rgba(21, 137, 147, 0.06)";
                  } else {
                    e.target.style.opacity = "0.9";
                  }
                }}
                onMouseOut={(e) => {
                  if (!plan.popular) {
                    e.target.style.background = "transparent";
                  } else {
                    e.target.style.opacity = "1";
                  }
                }}
              >
                {plan.cta.label}
              </button>
            </div>
          ))}
        </div>

        {/* Hospitality Pricing Note */}
        <div style={{
          margin: "0 28px",
          padding: "10px 14px",
          background: "#fffbeb",
          borderRadius: "8px",
          border: "1px solid #fde68a",
          fontSize: "13px",
          color: "#92400e",
          lineHeight: 1.5,
        }}>
          For hospitality vendors, pricing is calculated as: <strong>Categories &times; &#8377;500 &times; Business Units (Hotels)</strong>. The exact amount will be shown after you complete your profile.
        </div>

        {/* All Plans Include */}
        {allPlansInclude.length > 0 && (
          <div style={{
            padding: "16px 28px 24px",
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "16px",
            justifyContent: "center",
          }}>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "#64748b" }}>
              All plans include:
            </span>
            {allPlansInclude.map((item) => (
              <span
                key={item}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "13px",
                  color: "#475569",
                }}
              >
                <BsCheckCircleFill size={12} style={{ color: "#158993" }} />
                {item}
              </span>
            ))}
          </div>
        )}
      </div>

      <style jsx global>{`
        @media (max-width: 768px) {
          .membership-plans-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </Modal>
  );
};

export default MembershipInfoModal;
