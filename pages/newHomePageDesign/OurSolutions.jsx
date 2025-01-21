import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Nav, Tab } from 'react-bootstrap'
import React, { useState } from 'react'
import Link from 'next/link'


const tabs = [
    "Electrical",
    "Mechanical",
    "Piping and Plumbing",
    "HVAC",
    "Project Management",
    "Fire & Safety"
]

const OurSolutions = () => {
    const [navTabs, setNavTabs] = useState(tabs || []);
    const [activeTab, setActiveTab] = useState(tabs[0]);

    return (
        <section className="container-fluid py-5" >
            <div className="container text-center">
                <h2 className="mb-5">Our Solutions</h2>

                {navTabs?.length > 0 && (
                    <Tab.Container activeKey={activeTab}>
                        <Nav variant="tabs">
                            {navTabs.map((navItem, index) => (
                                <Nav.Item key={`nav_item_${index}`}>
                                    <Nav.Link
                                        eventKey={navItem}
                                        onClick={() => setActiveTab(navItem)}
                                    >
                                        {navItem}
                                    </Nav.Link>
                                </Nav.Item>
                            ))}
                        </Nav>

                        <Tab.Content className="bg-light py-4" style={{ borderRadius: "0 0 15px 15px" }}>
                            <Tab.Pane eventKey={activeTab}>
                                <>
                                    <div className="row p-2 p-3 p-lg-5">
                                        <div className="col-md-4 mb-3">
                                            <div className="card">
                                                <div className="card-body py-5">
                                                    Energy Efficiency Solutions
                                                </div>
                                            </div>
                                        </div>
                                        <div className="col-md-4 mb-3">
                                            <div className="card">
                                                <div className="card-body py-5">
                                                    Electrical System Design & Layout
                                                </div>
                                            </div>
                                        </div>
                                        <div className="col-md-4 mb-3">
                                            <div className="card">
                                                <div className="card-body py-5">
                                                    Preventive Maintenance and Testing
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="d-flex justify-content-center align-items-center mb-4">
                                        <Link
                                            href="/solutions"
                                            className="btn btn-primary border-0"
                                            style={{ width: "100%", maxWidth: "300px" }}
                                        >
                                            Discover {activeTab} Solutions
                                        </Link>
                                    </div>
                                </>
                            </Tab.Pane>
                        </Tab.Content>

                    </Tab.Container>
                )}
            </div>
        </section>
    )
}

export default OurSolutions
