import React, { useState, useEffect } from "react";
const EXTERNAL_DATA_URL = 'https://letsworkwise.com';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.letsworkwise.com/api/v1'
import axios from "axios";

const SiteMap = () => {

    const [product, setProduct] = useState([]);

    const fetchProductDetails = async () => {
        await axios.get(`${API_URL}/seo/products/slug`)
            .then((data) => {
                setProduct(data.data?.data);

            })
            .catch((error) => {
                console.log(error)
                return []
            })
    }

    useEffect(() => {
        fetchProductDetails();
    }, [])


    return (
        <>
            <div>
                <h1 style={{ marginTop: '100px' }}>Product List</h1>
                <ul>
                    {product.length > 0 && product?.map((item, index) => (
                        <li key={index}>
                            <a href={EXTERNAL_DATA_URL+"/vendor/"+item} target="_blank" rel="noopener noreferrer">
                                {item}
                            </a>

                        </li>
                    ))}
                </ul>
            </div>
        </>
    );
};

export default SiteMap;

