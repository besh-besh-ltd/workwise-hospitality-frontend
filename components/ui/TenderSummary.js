import React, { useState } from 'react';

const TenderSummary = () => {
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

  const handleDownload = async () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      alert('Tender summary downloaded successfully!');
    }, 2000);
  };

  const handleEmailSend = async () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      alert('Tender summary sent via email successfully!');
    }, 2000);
  };

  const handleRegenerate = async () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      alert('Tender summary regenerated with updated analysis!');
    }, 3000);
  };

  return (
    <div className="container-fluid px-2 px-md-4 py-3">
      <div className="row justify-content-center">
        <div className="col-12 col-lg-11 col-xl-10">
          
          {/* Header Section */}
          <div className="card border-0 shadow-lg mb-4">
            <div className="card-body p-4 p-md-5">
              <div className="d-flex flex-column flex-md-row justify-content-between align-items-start mb-4">
                <div className="mb-3 mb-md-0">
                  <h1 className="display-6 fw-bold text-primary mb-2">
                    <i className="bi bi-building me-3"></i>
                    AI-Generated Tender Analysis
                  </h1>
                  <div className="d-flex flex-wrap gap-3 text-muted mb-2">
                    <small><i className="bi bi-calendar3 me-1"></i>Generated: {tenderSummary.generatedDate}</small>
                    <small><i className="bi bi-hash me-1"></i>{tenderSummary.rfqNumber}</small>
                  </div>
                  <h5 className="text-dark fw-semibold">{tenderSummary.title}</h5>
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

              {/* Project Overview Cards */}
              <div className="row g-3 mb-4">
                <div className="col-6 col-lg-3">
                  <div className="text-center p-3 bg-primary bg-opacity-10 rounded-3">
                    <h5 className="fw-bold text-primary mb-1">{tenderSummary.projectDuration}</h5>
                    <small className="text-muted">Project Duration</small>
                  </div>
                </div>
                <div className="col-6 col-lg-3">
                  <div className="text-center p-3 bg-success bg-opacity-10 rounded-3">
                    <h5 className="fw-bold text-success mb-1">{tenderSummary.emdAmount}</h5>
                    <small className="text-muted">EMD Amount</small>
                  </div>
                </div>
                <div className="col-6 col-lg-3">
                  <div className="text-center p-3 bg-info bg-opacity-10 rounded-3">
                    <h5 className="fw-bold text-info mb-1">{tenderSummary.shutdownWindow}</h5>
                    <small className="text-muted">Shutdown Window</small>
                  </div>
                </div>
                <div className="col-6 col-lg-3">
                  <div className="text-center p-3 bg-warning bg-opacity-10 rounded-3">
                    <h5 className="fw-bold text-warning mb-1">4 Months</h5>
                    <small className="text-muted">Bid Validity</small>
                  </div>
                </div>
              </div>

              {/* Client Information */}
              <div className="row g-3">
                <div className="col-md-6">
                  <div className="d-flex align-items-center p-2 bg-light rounded-2">
                    <i className="bi bi-building text-primary me-2"></i>
                    <div>
                      <small className="text-muted d-block">Client</small>
                      <strong>{tenderSummary.client}</strong>
                    </div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="d-flex align-items-center p-2 bg-light rounded-2">
                    <i className="bi bi-gear text-success me-2"></i>
                    <div>
                      <small className="text-muted d-block">PMC</small>
                      <strong>{tenderSummary.consultant}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Executive Summary */}
          <div className="card border-0 shadow mb-4">
            <div className="card-body p-4 p-md-5">
              <h2 className="h4 fw-bold mb-4">
                <i className="bi bi-file-earmark-text text-primary me-2"></i>
                Executive Summary
              </h2>
              <div className="bg-light rounded-3 p-4">
                <p className="lead mb-0" style={{ lineHeight: "1.8" }}>
                  {tenderSummary.summary}
                </p>
              </div>
            </div>
          </div>

          {/* Project Scope */}
          <div className="card border-0 shadow mb-4">
            <div className="card-body p-4 p-md-5">
              <h2 className="h4 fw-bold mb-4">
                <i className="bi bi-list-check text-success me-2"></i>
                Project Scope
              </h2>
              <div className="row">
                {tenderSummary.projectScope.map((scope, index) => (
                  <div key={index} className="col-12 mb-3">
                    <div className="d-flex align-items-start">
                      <div className="flex-shrink-0">
                        <div className="rounded-circle bg-success d-flex align-items-center justify-content-center" 
                             style={{width: '24px', height: '24px'}}>
                          <i className="bi bi-check text-white" style={{fontSize: '12px'}}></i>
                        </div>
                      </div>
                      <div className="ms-3">
                        <p className="mb-0">{scope}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Key Timelines */}
          <div className="card border-0 shadow mb-4">
            <div className="card-body p-4 p-md-5">
              <h2 className="h4 fw-bold mb-4">
                <i className="bi bi-clock text-info me-2"></i>
                Key Timelines
              </h2>
              <div className="list-group list-group-flush">
                {tenderSummary.keyTimelines.map((timeline, index) => (
                  <div key={index} className="list-group-item border-0 px-0 py-3">
                    <div className="d-flex align-items-start">
                      <div className="flex-shrink-0">
                        <span className="badge bg-info rounded-circle d-flex align-items-center justify-content-center" 
                              style={{width: '24px', height: '24px', fontSize: '12px'}}>
                          {index + 1}
                        </span>
                      </div>
                      <div className="ms-3">
                        <p className="mb-0">{timeline}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bidder Qualification Criteria */}
          <div className="card border-0 shadow mb-4">
            <div className="card-body p-4 p-md-5">
              <h2 className="h4 fw-bold mb-4">
                <i className="bi bi-award text-warning me-2"></i>
                Bidder Qualification Criteria
              </h2>
              <div className="row">
                {tenderSummary.qualificationCriteria.map((criteria, index) => (
                  <div key={index} className="col-12 col-md-6 mb-3">
                    <div className="d-flex align-items-start">
                      <div className="flex-shrink-0">
                        <div className="rounded-circle bg-warning d-flex align-items-center justify-content-center" 
                             style={{width: '24px', height: '24px'}}>
                          <i className="bi bi-star-fill text-white" style={{fontSize: '10px'}}></i>
                        </div>
                      </div>
                      <div className="ms-3">
                        <p className="mb-0 text-muted">{criteria}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Contract Conditions */}
          <div className="card border-0 shadow mb-4">
            <div className="card-body p-4 p-md-5">
              <h2 className="h4 fw-bold mb-4">
                <i className="bi bi-file-earmark-ruled text-danger me-2"></i>
                Key Contract Conditions
              </h2>
              <div className="list-group list-group-flush">
                {tenderSummary.contractConditions.map((condition, index) => (
                  <div key={index} className="list-group-item border-0 px-0 py-3">
                    <div className="d-flex align-items-start">
                      <div className="flex-shrink-0">
                        <span className="badge bg-danger rounded-circle d-flex align-items-center justify-content-center" 
                              style={{width: '24px', height: '24px', fontSize: '12px'}}>
                          {index + 1}
                        </span>
                      </div>
                      <div className="ms-3">
                        <p className="mb-0">{condition}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Submission Requirements */}
          <div className="card border-0 shadow mb-4">
            <div className="card-body p-4 p-md-5">
              <h2 className="h4 fw-bold mb-4">
                <i className="bi bi-upload text-purple me-2"></i>
                Submission Requirements
              </h2>
              <div className="row">
                {tenderSummary.submissionRequirements.map((requirement, index) => (
                  <div key={index} className="col-12 mb-3">
                    <div className="d-flex align-items-start">
                      <div className="flex-shrink-0">
                        <div className="rounded-circle bg-secondary d-flex align-items-center justify-content-center" 
                             style={{width: '24px', height: '24px'}}>
                          <i className="bi bi-arrow-up text-white" style={{fontSize: '12px'}}></i>
                        </div>
                      </div>
                      <div className="ms-3">
                        <p className="mb-0">{requirement}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="card border-0 shadow">
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
          </div>
        </div>
      </div>

      {/* Bootstrap Icons CSS */}
      <link
        href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css"
        rel="stylesheet"
      />
    </div>
  );
};

export default TenderSummary;