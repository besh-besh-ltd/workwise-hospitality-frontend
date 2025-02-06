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
                            <li className="mb-2"><a href="https://letsworkwise.com/aboutus" className="text-decoration-none text-white">About Us</a></li>
                            <li className="mb-2"><a href="https://letsworkwise.com/contactus" className="text-decoration-none text-white">Contact Us</a></li>
                        </ul>
                    </div>

                    <div className="col-md">
                        <h5 className="fw-bold text-white">Product</h5>
                        <ul className="list-unstyled">
                            <li className="mb-2"><a href="https://letsworkwise.com/vendor/pipes" className="text-decoration-none text-white">Pipes</a></li>
                            <li className="mb-2"><a href="https://letsworkwise.com/vendor/steel-coils" className="text-decoration-none text-white">Steel Coils</a></li>
                            <li className="mb-2"><a href="https://letsworkwise.com/vendor/valve" className="text-decoration-none text-white">Valve</a></li>
                            <li className="mb-2"><a href="https://letsworkwise.com/vendor/fire-extinguishers" className="text-decoration-none text-white">Fire Extinguisher</a></li>
                            <li className="mb-2"><a href="https://letsworkwise.com/vendor/shaping-machine" className="text-decoration-none text-white">Milling Machines</a></li>
                            <li className="mb-2">
                                <a href="https://letsworkwise.com/vendor/all"
                                    className="text-decoration-none text-white"
                                    style={{ backgroundColor: '#333', color: 'white', padding: '2px 8px', display: 'inline-block', marginTop: '8px' }}
                                >
                                    More
                                </a></li>
                        </ul>
                    </div>

                    <div className="col-md">
                        <h5 className="fw-bold text-white">Solutions</h5>
                        <ul className="list-unstyled">
                        <li className="mb-2"><a href="https://letsworkwise.com/solutions/civil" className="text-decoration-none text-white">Civil</a></li>
                        <li className="mb-2"><a href="https://letsworkwise.com/solutions/electrical" className="text-decoration-none text-white">Electrical</a></li>
                            <li className="mb-2"><a href="https://letsworkwise.com/solutions/mechanical" className="text-decoration-none text-white">Mechanical</a></li>
                            <li className="mb-2"><a href="https://letsworkwise.com/solutions/electronics-communication" className="text-decoration-none text-white"> Electronics Communication </a></li>
                            <li className="mb-2"><a href="https://letsworkwise.com/solutions/fire-engineering" className="text-decoration-none text-white"> Fire Engineering </a></li>
                            <li className="mb-2"><a href="https://letsworkwise.com/solutions/safety-security" className="text-decoration-none text-white"> Safety Security </a></li>
                        </ul>
                    </div>

                    <div className="col-md">
                        <h5 className="fw-bold text-white">Find Vendor</h5>
                        <ul className="list-unstyled">
                            <li className="mb-2"><a href="https://letsworkwise.com/vendor/civil" className="text-decoration-none text-white">Civil</a></li>
                            <li className="mb-2"><a href="https://letsworkwise.com/vendor/electrical" className="text-decoration-none text-white">Electrical</a></li>
                            <li className="mb-2"><a href="https://letsworkwise.com/vendor/instrumentation" className="text-decoration-none text-white">Instrumental</a></li>
                            <li className="mb-2"><a href="https://letsworkwise.com/vendor/fire-&-gas-detection" className="text-decoration-none text-white">Fire & Gas Detection</a></li>
                            <li className="mb-2"><a href="https://letsworkwise.com/vendor/paints" className="text-decoration-none text-white">Paints</a></li>
                            <li className="mb-2"><a href="https://letsworkwise.com/vendor/all" className="text-decoration-none text-white" style={{ backgroundColor: '#333', color: 'white', padding: '2px 8px', display: 'inline-block', marginTop: '8px' }}>More</a></li>
                        </ul>
                    </div>

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
                <div className="col-md-6 d-flex align-items-center">
                    <div className="row">
                        <div className="col-sm-6 col-md-6 mb-3">
                            <img src="/assets/images/logo.png" alt="Workwise" className="img-fluid" style={{ maxWidth: '150px' }} />
                        </div>
                        <div className="col-sm-6 col-md-6 mb-3">
                            <div className="h-100 d-flex align-items-center gap-2">
                                <a href="#" className="text-white p-2" >
                                    <FontAwesomeIcon icon={faLinkedin} size='xl' />
                                </a>
                                <a href="#" className="text-white p-2" >
                                    <FontAwesomeIcon icon={faInstagram} size='xl' />
                                </a>
                                <a href="#" className="text-white p-2" >
                                    <FontAwesomeIcon icon={faXTwitter} size='xl' />
                                </a>
                                <a href="#" className="text-white p-2" >
                                    <FontAwesomeIcon icon={faYoutube} size='xl' />
                                </a>
                            </div>
                        </div>
                    </div>

                </div>
                <div className="col-md-6 text-md-end">
                    <small className="text-white">
                        <a href="https://letsworkwise.com/privacypolicy" className="text-decoration-none text-white">Privacy Policy</a> |
                        <a href="https://letsworkwise.com/terms-of-use" className="text-decoration-none text-white"> Terms Of Use</a> |
                        {/* <a href="#" className="text-decoration-none text-white"> Cookie Policy</a> */}
                        <br />
                         workwise | All rights reserved 
                    </small>
                </div>
            </div>
        </footer>
    );
};

export default Footer;