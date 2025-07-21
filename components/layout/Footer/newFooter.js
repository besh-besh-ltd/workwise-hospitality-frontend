import { faInstagram, faLinkedin, faTwitch, faXTwitter, faYoutube } from '@fortawesome/free-brands-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React from 'react';

const Footer = () => {
    return (
      <footer className="container-fluid bg-dark border-top pt-5 pb-3">
        <div className="container">
          <div className="row">
            <div className="col-md">
              <h5 className="fw-bold text-white">Company</h5>
              <ul className="list-unstyled">
                <li className="mb-2">
                  <a
                    href="https://letsworkwise.com/aboutus"
                    className="text-decoration-none text-white"
                  >
                    About Us
                  </a>
                </li>
                <li className="mb-2">
                  <a
                    href="https://letsworkwise.com/contactus"
                    className="text-decoration-none text-white"
                  >
                    Contact Us
                  </a>
                </li>
                <li className="mb-2">
                  <a
                    href="https://letsworkwise.com/privacypolicy"
                    className="text-decoration-none text-white"
                  >
                    Privacy Policy
                  </a>
                </li>
                <li className="mb-2">
                  <a
                    href="https://letsworkwise.com/terms-of-use"
                    className="text-decoration-none text-white"
                  >
                    Terms Of Use
                  </a>
                </li>
              </ul>
            </div>

            <div className="col-md">
              <h5 className="fw-bold text-white">Product</h5>
              <ul className="list-unstyled">
                <li className="mb-2">
                  <a
                    href="https://letsworkwise.com/vendor/control-panel"
                    className="text-decoration-none text-white"
                  >
                    Control Panel
                  </a>
                </li>
                <li className="mb-2">
                  <a
                    href="https://letsworkwise.com/vendor/transformers"
                    className="text-decoration-none text-white"
                  >
                     Transformers
                  </a>
                </li>
                <li className="mb-2">
                  <a
                    href="https://letsworkwise.com/vendor/cable-tray"
                    className="text-decoration-none text-white"
                  >
                    Cable Tray
                  </a>
                </li>
                <li className="mb-2">
                  <a
                    href="https://letsworkwise.com/vendor/flanges"
                    className="text-decoration-none text-white"
                  >
                    Flanges
                  </a>
                </li>
                <li className="mb-2">
                  <a
                    href="https://letsworkwise.com/vendor/valve"
                    className="text-decoration-none text-white"
                  >
                    Valve
                  </a>
                </li>
                <li className="mb-2">
                  <a
                    href="https://letsworkwise.com/sitemap"
                    className="text-decoration-none text-white"
                    style={{
                        backgroundColor: "#333",
                        color: "white",
                        padding: "2px 8px",
                        display: "inline-block",
                        marginTop: "8px",
                        borderRadius: "4px", // Adjust as needed
                      }}
                  >
                    More
                  </a> </li>
              </ul>
            </div>

            <div className="col-md">
              <h5 className="fw-bold text-white">Solutions</h5>
              <ul className="list-unstyled">
                <li className="mb-2">
                  <a
                    href="https://letsworkwise.com/solutions/civil"
                    className="text-decoration-none text-white cursor-pointer"
                  >
                    Civil
                  </a>
                </li>
                <li className="mb-2">
                  <a
                    href="https://letsworkwise.com/solutions/mechanical"
                    className="text-decoration-none text-white cursor-pointer"
                  >
                    Mechanical
                  </a>
                </li>
                <li className="mb-2">
                  <a
                    href="https://letsworkwise.com/solutions/electrical"
                    className="text-decoration-none text-white cursor-pointer"
                  >
                    Electrical
                  </a>
                </li>
                <li className="mb-2">
                  <a
                    href="https://letsworkwise.com/solutions/chemical"
                    className="text-decoration-none text-white cursor-pointer"
                  >
                    Chemical
                  </a>
                </li>
                <li className="mb-2">
                  <a
                    href="https://letsworkwise.com/solutions/fire-engineering"
                    className="text-decoration-none text-white cursor-pointer"
                  >
                    Fire Engineering
                  </a>
                </li>
              </ul>
            </div>

            {/* <div className="col-md">
              <h5 className="fw-bold text-white">Find Vendor</h5>
              <ul className="list-unstyled">
                <li className="mb-2">
                  <a
                    href="https://letsworkwise.com/vendor/civil"
                    className="text-decoration-none text-white"
                  >
                    Civil
                  </a>
                </li>
                <li className="mb-2">
                  <a
                    href="https://letsworkwise.com/vendor/electrical"
                    className="text-decoration-none text-white"
                  >
                    Electrical
                  </a>
                </li>
                <li className="mb-2">
                  <a
                    href="https://letsworkwise.com/vendor/instrumentation"
                    className="text-decoration-none text-white"
                  >
                    Instrumental
                  </a>
                </li>
                <li className="mb-2">
                  <a
                    href="https://letsworkwise.com/vendor/fire-&-gas-detection"
                    className="text-decoration-none text-white"
                  >
                    Fire & Gas Detection
                  </a>
                </li>
                <li className="mb-2">
                  <a
                    href="https://letsworkwise.com/vendor/paints"
                    className="text-decoration-none text-white"
                  >
                    Paints
                  </a>
                </li>
                <li className="mb-2">
                  <a
                    href="https://letsworkwise.com/vendor/all"
                    className="text-decoration-none text-white"
                    style={{
                      backgroundColor: "#333",
                      color: "white",
                      padding: "2px 8px",
                      display: "inline-block",
                      marginTop: "8px",
                      borderRadius: "4px"
                    }}
                  >
                    More
                  </a>
                </li>
              </ul>
            </div> */}

            {/* <div className="col-md">
                        <h5 className="fw-bold text-white">Resources</h5>
                        <ul className="list-unstyled">
                            <li className="mb-2"><a href="#" className="text-decoration-none text-white">Contractors</a></li>
                            <li className="mb-2"><a href="#" className="text-decoration-none text-white">Compliance</a></li>
                            <li className="mb-2"><a href="#" className="text-decoration-none text-white">Projects Management</a></li>
                            <li className="mb-2"><a href="#" className="text-decoration-none text-white">Payment</a></li>
                            <li className="mb-2"><a href="#" className="text-decoration-none text-white">Procurement</a></li>
                            <li className="mb-2"><a href="#" className="text-decoration-none text-white" style={{ backgroundColor: '#333', color: 'white', padding: '2px 8px', display: 'inline-block', marginTop: '8px' }}>More</a></li>
                        </ul>
                    </div> */}
          </div>
        </div>

        <div className="row mt-4 pt-3 border-top">
  {/* Left Section - Logo & Social */}
  <div className="col-md-6">
    <div className="d-flex flex-column flex-md-row align-items-center justify-content-center justify-content-md-start gap-4 py-3 py-md-0">
      {/* Logo */}
      <img
        src="/assets/images/logo.png"
        alt="Workwise"
        className="img-fluid"
        style={{ maxWidth: "150px" }}
      />
      
      {/* Social Icons */}
      <div className="d-flex gap-4">
        <a href="https://www.linkedin.com/company/workwise11/" className="text-white">
          <FontAwesomeIcon icon={faLinkedin} size="xl" />
        </a>
        <a href="https://www.youtube.com/@Workwise_Official" className="text-white">
          <FontAwesomeIcon icon={faYoutube} size="xl" />
        </a>
      </div>
    </div>
  </div>

  {/* Right Section - Privacy Links */}
  <div className="col-md-6">
    <div className="d-flex h-100 align-items-center justify-content-center justify-content-md-end">
      <small className="text-white text-center text-md-end">
        <a href="https://letsworkwise.com/privacypolicy" className="text-decoration-none text-white">
          Privacy Policy
        </a>{' '}
        |{' '}
        <a href="https://letsworkwise.com/terms-of-use" className="text-decoration-none text-white">
          Terms Of Use
        </a>{' '}
        |<br />
        Besh Besh Info Tech | All rights reserved
      </small>
    </div>
  </div>
</div>

      </footer>
    );
};

export default Footer;