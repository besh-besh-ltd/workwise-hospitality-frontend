import React, { useState, useEffect } from "react";
const EXTERNAL_DATA_URL = 'https://letsworkwise.com';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.letsworkwise.com/api/v1'
import axios from "axios";
import FullLoader from "../shared/FullLoader";
import { Container, Row, Col } from 'react-bootstrap';

const SiteMap = () => {

    const [product, setProduct] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchProductDetails = async () => {
        setLoading(true);
        await axios.get(`${API_URL}/seo/products/slug`)
            .then((data) => {
                setProduct(data.data?.data);

            })
            .catch((error) => {
                console.log(error)
                return []
            })
            .finally(() => {
                setLoading(false);
            })
    }

    useEffect(() => {
        fetchProductDetails();
    }, [])


    return (
        <>
            <Container>
                    <h1 style={{ marginTop: '100px' }}>Product List</h1>
                        {loading && <FullLoader />}
                <Row>
                    {product.length > 0 && product.map((item, index) => (
                        <Col xs={12} sm={6} md={4} key={index} className="mb-3">
                            <div className="border p-3 text-center">
                                <a href={`${EXTERNAL_DATA_URL}/vendor/${item}`} target="_blank" rel="noopener noreferrer" >
                                    {item.replace(/-/g, " ")}
                                </a>
                            </div>
                        </Col>
                    ))}
                </Row>
            </Container>
        </>
    );
};

export default SiteMap;

