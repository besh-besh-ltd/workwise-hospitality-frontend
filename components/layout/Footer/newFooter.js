import { faLinkedin, faYoutube } from '@fortawesome/free-brands-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React from 'react';

const Footer = () => {
    return (
      <footer className="bg-dark text-white py-5" style={{ fontSize: '14px' }}>
        <div className="container">
          {/* Header Section with Logo and Social Icons */}
          <div className="row mb-4">
            <div className="col-md-6">
              <img
                src="/assets/images/logo.png"
                alt="Workwise"
                className="img-fluid"
                style={{ maxWidth: "140px", filter: "brightness(0) invert(1)" }}
              />
            </div>
            <div className="col-md-6 text-md-end">
              <div className="d-flex justify-content-md-end justify-content-end gap-3 mt-3 mt-md-0">
                <a href="https://www.linkedin.com/company/workwise11/" className="text-white">
                  <FontAwesomeIcon icon={faLinkedin} size="lg" />
                </a>
                <a href="https://www.youtube.com/@Workwise_Official" className="text-white">
                  <FontAwesomeIcon icon={faYoutube} size="lg" />
                </a>
              </div>
            </div>
          </div>

          {/* Main Content Sections */}
          <div className="row">
            {/* About Us */}
            <div className="col-lg-3 col-md-6 mb-4">
              <h6 className="text-white fw-bold mb-3">About Us</h6>
              <ul className="list-unstyled mb-0">
                <li className="mb-2">
                  <a href="/why-workwise/our-story" className="text-decoration-none" style={{ color: '#bbb' }}>
                    Our Story
                  </a>
                </li>
                <li className="mb-2">
                  <a href="/work-with-us/careers" className="text-decoration-none" style={{ color: '#bbb' }}>
                    Careers
                  </a>
                </li>
                <li className="mb-2">
                  <a href="/contactus" className="text-decoration-none" style={{ color: '#bbb' }}>
                    Contact
                  </a>
                </li>
                <li className="mb-2">
                  <a href="/work-with-us/TeamTimeline" className="text-decoration-none" style={{ color: '#bbb' }}>
                    Team
                  </a>
                </li>
              </ul>
            </div>

            {/* Solutions */}
            <div className="col-lg-3 col-md-6 mb-4">
              <h6 className="text-white fw-bold mb-3">Solutions</h6>
              <ul className="list-unstyled mb-0">
                <li className="mb-2">
                  <a href="/modules/boq" className="text-decoration-none" style={{ color: '#bbb' }}>
                    BOQ Simplification
                  </a>
                </li>
                <li className="mb-2">
                  <a href="/modules/rfq" className="text-decoration-none" style={{ color: '#bbb' }}>
                    RFQ Management
                  </a>
                </li>
                <li className="mb-2">
                  <a href="/modules/vendors" className="text-decoration-none" style={{ color: '#bbb' }}>
                    Vendor Discovery
                  </a>
                </li>
                <li className="mb-2">
                  <a href="/modules/evaluation" className="text-decoration-none" style={{ color: '#bbb' }}>
                    Evaluation
                  </a>
                </li>
                <li className="mb-2">
                  <a href="/modules/negotiation" className="text-decoration-none" style={{ color: '#bbb' }}>
                    Negotiation
                  </a>
                </li>
                <li className="mb-2">
                  <a href="/modules/payments" className="text-decoration-none" style={{ color: '#bbb' }}>
                    PO & Payment Tracking
                  </a>
                </li>
              </ul>
            </div>

            {/* Tools */}
            <div className="col-lg-3 col-md-6 mb-4">
              <h6 className="text-white fw-bold mb-3">Tools</h6>
              <ul className="list-unstyled mb-0">
                <li className="mb-2">
                  <a href="/ai-tools/cost-estimation" className="text-decoration-none" style={{ color: '#bbb' }}>
                    Project Estimator
                  </a>
                </li>
                <li className="mb-2">
                  <a href="/ai-tools/boq-simplification" className="text-decoration-none" style={{ color: '#bbb' }}>
                    BOQ Simplifier
                  </a>
                </li>
                <li className="mb-2">
                  <a href="/ai-tools/tender-summary" className="text-decoration-none" style={{ color: '#bbb' }}>
                    Tender Summary
                  </a>
                </li>
                <li className="mb-2">
                  <a href="/ai-tools/technical-summary" className="text-decoration-none" style={{ color: '#bbb' }}>
                    Tech Doc Summary
                  </a>
                </li>
              </ul>
            </div>

            {/* Resources */}
            <div className="col-lg-3 col-md-6 mb-4">
              <h6 className="text-white fw-bold mb-3">Resources</h6>
              <ul className="list-unstyled mb-0">
                <li className="mb-2">
                  <a href="https://blog.letsworkwise.com" className="text-decoration-none" style={{ color: '#bbb' }}>
                    Blog
                  </a>
                </li>
                <li className="mb-2">
                  <a href="/insights/events" className="text-decoration-none" style={{ color: '#bbb' }}>
                    Events
                  </a>
                </li>
                <li className="mb-2">
                  <a href="/insights/news" className="text-decoration-none" style={{ color: '#bbb' }}>
                    News
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Supplier Locations Section */}
          <div className="row mt-4">
            <div className="col-12">
              <h6 className="text-white fw-bold mb-3">Find Suppliers by Location</h6>
              <div className="row">
                <div className="col-md-4 mb-3">
                  <div className="d-flex flex-wrap gap-2">
                    <a href="/vendor/supplier-ahmedabad-gujarat" className="text-decoration-none" style={{ color: '#bbb', fontSize: '13px' }}>
                      Supplier in Ahmedabad
                    </a>
                    <span style={{ color: '#666' }}>|</span>
                    <a href="/vendor/supplier-vadodara-gujarat" className="text-decoration-none" style={{ color: '#bbb', fontSize: '13px' }}>
                      Supplier in Vadodara
                    </a>
                  </div>
                </div>
                <div className="col-md-4 mb-3">
                  <a href="/vendor/electrical-item-vendor-bhiwandi-maharashtra" className="text-decoration-none" style={{ color: '#bbb', fontSize: '13px' }}>
                    Electrical Item Vendor in Bhiwandi
                  </a>
                </div>
                <div className="col-md-4 mb-3">
                  <a href="/vendor/fire-safety-supplier-chennai-tamilnadu" className="text-decoration-none" style={{ color: '#bbb', fontSize: '13px' }}>
                    Fire Safety Supplier in Chennai
                  </a>
                </div>
                <div className="col-md-4 mb-3">
                  <a href="/vendor/mechanical-fabrication-vendor-pune-maharashtra" className="text-decoration-none" style={{ color: '#bbb', fontSize: '13px' }}>
                    Mechanical Fabrication Vendors in Pune
                  </a>
                </div>
                <div className="col-md-4 mb-3">
                  <a href="/vendor/cable-tray-manufacturer-delhi" className="text-decoration-none" style={{ color: '#bbb', fontSize: '13px' }}>
                    Cable Tray Manufacturer in Delhi
                  </a>
                </div>
                <div className="col-md-4 mb-3">
                  <a href="/vendor/all" className="text-decoration-none fw-bold" style={{ color: '#428B41', fontSize: '13px' }}>
                    View all supplier locations →
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Trust & Security and Legal Section */}
          <div className="row mt-4 pt-4 border-top border-secondary">
            <div className="col-md-6 mb-3">
              <h6 className="text-white fw-bold mb-3">Trust & Security</h6>
              <div className="d-flex flex-wrap gap-3 align-items-center mb-2">
                <span className="badge" style={{ backgroundColor: '#2D5A27', color: 'white', padding: '4px 8px' }}>
                  ISO Certified
                </span>
                <span className="badge" style={{ backgroundColor: '#FF9500', color: 'white', padding: '4px 8px' }}>
                  AWS Hosted
                </span>
                <span className="badge" style={{ backgroundColor: '#1976D2', color: 'white', padding: '4px 8px' }}>
                  Data Encrypted
                </span>
              </div>
            </div>
            <div className="col-md-6 mb-3">
              <h6 className="text-white fw-bold mb-3">Legal</h6>
              <div className="d-flex flex-wrap gap-3">
                <a href="/why-workwise/TrustSecurity" className="text-decoration-none" style={{ color: '#bbb', fontSize: '13px' }}>
                  Data Security Policy
                </a>
                <a href="/privacypolicy" className="text-decoration-none" style={{ color: '#bbb', fontSize: '13px' }}>
                  Privacy Policy
                </a>
                <a href="/terms-of-use" className="text-decoration-none" style={{ color: '#bbb', fontSize: '13px' }}>
                  Terms of Use
                </a>
              </div>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="row mt-4 pt-3 border-top border-secondary">
            <div className="col-md-6">
              <small style={{ color: '#bbb' }}>
                🇮🇳 Made proudly in India
              </small>
            </div>
            <div className="col-md-6 text-md-end">
              <small style={{ color: '#bbb' }}>
                © 2025 Beshbesh Infotech Limited. All rights reserved.
              </small>
            </div>
          </div>
        </div>
      </footer>
    );
};

export default Footer;