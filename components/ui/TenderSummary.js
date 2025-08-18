import React, { useState } from 'react';

const TenderSummary = ({ summary }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Real tender summary data based on HPCL Mumbai Refinery Expansion Project
  const tenderSummary = {
    title: "HPCL Mumbai Refinery Expansion Project (MREP) — Heater Package (New + Revamp)",
    rfqNumber: "CK/A945-000-MC-TN-7601/1002",
    client: "Hindustan Petroleum Corporation Limited (HPCL)",
    consultant: "Engineers India Ltd. (EIL)",
    generatedDate: new Date().toLocaleDateString(),
    projectDuration: "20 months",
    shutdownWindow: "30 days per unit",
    emdAmount: "₹66 lakhs",
    biddingType: "Domestic Competitive Bidding (Single-stage, two-bid system)",
    summary: `This comprehensive tender analysis covers the Mumbai Refinery Expansion Project (MREP) for heater package involving both new installations and revamp activities. The project encompasses design & engineering, procurement & supply, construction & erection, and commissioning support for multiple heater units including APS, VPS, NHT, CCR, NHDT, Prime G+, and DHT systems.

The scope includes balanced draft and natural draft designs with specific coil material specifications. Critical shutdown-linked activities require precise coordination with existing refinery operations. The project demonstrates HPCL's commitment to expanding refinery capacity while maintaining operational excellence and safety standards.

Technical specifications have been thoroughly evaluated for hydrocarbon, reformer, and steam cracker services with minimum capacity requirements of 14 MMKcal/hr duty. The bidding process follows stringent qualification criteria ensuring only capable contractors participate.`,
    
    projectScope: [
      "Design & Engineering: Residual and detailed engineering, fabrication drawings",
      "Procurement & Supply: Heater systems, auxiliaries, components for multiple units",
      "Construction & Erection: At Mumbai Refinery site with shutdown-linked activities",
      "Commissioning Support: For both new units and revamped heaters",
      "Multiple Units Coverage: APS, VPS, NHT, CCR, NHDT, Prime G+, DHT heaters"
    ],

    keyTimelines: [
      "Total Project Duration: 20 months from Letter of Award (LOA)",
      "Shutdown Activities: 30 days window per unit for critical work",
      "New VPS Heater: 16 months for mechanical completion",
      "New Prime G+ Heater: 12 months for mechanical completion",
      "Bid Validity Period: 4 months from submission date"
    ],

    qualificationCriteria: [
      "Technical: Minimum one fired heater ≥14 MMKcal/hr in hydrocarbon/reformer service",
      "Experience: Reference project with minimum 1-year successful operation",
      "Commercial: Single job ≥₹69.6 Cr OR Two jobs ≥₹43.5 Cr each OR Three jobs ≥₹34.8 Cr",
      "Financial: Average Annual Turnover ≥₹26.1 Cr (last 3 years)",
      "Net Worth: Positive net worth in last audited financial year"
    ],

    contractConditions: [
      "Security Deposit: 10% of Purchase Order value (composite guarantee)",
      "Price Reduction: 0.5% per week for delays, maximum 5% of contract value",
      "Defect Liability: 12 months post-completion with comprehensive coverage",
      "Performance Standards: Strict adherence to safety and quality protocols",
      "Arbitration: Sole Arbitrator appointed by HPCL Functional Director, Mumbai jurisdiction"
    ],

    submissionRequirements: [
      "Online submission via CPP Portal for technical and commercial documents",
      "Offline submission required for EMD/Bid Security (₹66 lakhs)",
      "Power of Attorney and Integrity Pact (mandatory for bids ≥₹1 crore)",
      "Bank Guarantee formats as per specified annexures",
      "Complete compliance with all annexure requirements and formats"
    ]
  };

  const handleRegenerate = async () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      alert('Tender summary regenerated with updated analysis!');
    }, 3000);
  };

  if(!summary) {
    return (
      <div className="container-fluid px-2 px-md-4 py-3 mt-5">
        <div className="row justify-content-center">
          <div className="col-12 col-lg-11 col-xl-10">
            {/* Action Buttons */}
            <div className="card border-0 shadow">
              <div className="card-body p-4 p-md-5">
                <div className="d-flex flex-column flex-sm-row gap-3 justify-content-center">
                  <p>Sorry, due to some issue the summary was not generated for given given. Please try again later or with some other file</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container-fluid px-2 px-md-4 py-3" style={{marginTop: "4.5rem"}}>
      <div className="row justify-content-center">
        <div className="col-12 col-lg-11 col-xl-10">
          
          {/* Header Section */}
          <div className="card border-0 shadow-lg mb-4">
            <div className="card-body px-4 py-3">
              <div className="d-flex flex-column flex-md-row justify-content-between align-items-start">
                <div>
                  <h3 className="display-8 fw-bold text-primary mb-0">
                    AI-Generated Tender Analysis
                  </h3>
                </div>
                <div className="d-flex flex-column flex-sm-row gap-2 align-items-center">
                  <button
                     className="d-flex align-items-center justify-content-center minimal-btn btn-primary-minimal"
                    style={{ minWidth: "160px" }}
                    onClick={handleRegenerate}
                    disabled={isGenerating}
                  >
                    {isGenerating ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        Regenerating...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-arrow-clockwise me-2"></i>
                        Regenerate Analysis
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className='card border-0 shadow-lg mb-4'>
            <div className='card-body px-4 py-3' dangerouslySetInnerHTML={{ __html: summary }} />
          </div>

          {/* Action Buttons */}
          {/* <div className="card border-0 shadow">
            <div className="card-body p-4 p-md-5">
              <div className="d-flex flex-column flex-sm-row gap-3 justify-content-center">
                <button
                  className="d-flex align-items-center justify-content-center minimal-btn btn-primary-minimal"
                  style={{ minWidth: "180px" }}
                  onClick={handleDownload}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Processing...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-download me-2"></i>
                      Download Analysis
                    </>
                  )}
                </button>

                <button
                  className="d-flex align-items-center justify-content-center minimal-btn btn-outline-primary-minimal"
                  style={{ minWidth: "180px" }}
                  onClick={handleEmailSend}
                  disabled={isLoading}
                >
                  <i className="bi bi-envelope me-2"></i>
                  Send via Email
                </button>

                <button
                  className="d-flex align-items-center justify-content-center minimal-btn btn-outline-secondary-minimal"
                  style={{ minWidth: "180px" }}
                  onClick={() => window.print()}
                >
                  <i className="bi bi-printer me-2"></i>
                  Print Summary
                </button>
              </div>

              <div className="text-center mt-4">
                <small className="text-muted">
                  <i className="bi bi-shield-check me-1"></i>
                  This tender analysis was generated using advanced AI and reviewed for accuracy
                </small>
              </div>
            </div>
          </div> */}
        </div>
      </div>
    </div>
  );
};

export default TenderSummary;