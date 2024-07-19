import React from 'react';
import { Container, Row, Col, Button, Image } from 'react-bootstrap';
import { useRouter } from "next/router";

const ThankYouPage = () => {
    const navigate = useRouter();

    const handleGoToHomePage = () => {
        // navigate.push('/');
    };

    return (

        <div className='mt-4'>
            <section className="buyer-common-header sc-pt-80">
                <div className="container-fluid">
                </div>
            </section>

            <section className="buyer-sec-1">
                <div className="container-fluid">
                    <div className="d-flex justify-content-center col-12">
                        <Container className="my-5">
                            <Row className="justify-content-center">
                                <Col md={6} className="text-center">
                                    <Image
                                        src="/assets/images/logo.png"
                                        alt="Workwise"
                                        width={300}
                                        height={150}
                                        priority={true}
                                        className="img-fluid"
                                    />
                                    <h1 className="mb-4">Thank You!</h1>
                                    <p className="lead mb-4">
                                        Thank you for subscribing to our plan.
                                    </p>
                                    <Button variant="primary" onClick={handleGoToHomePage}>
                                        Go to Dashboard
                                    </Button>
                                </Col>
                            </Row>
                        </Container>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default ThankYouPage;