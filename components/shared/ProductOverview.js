import { getProductPriceStats } from '@/services/rfq';
import { formatPrice } from '@/utils/sharedFunctions';
import { Chart } from 'chart.js';
import React, { useEffect, useState } from 'react'
import PlaceholderLoading from 'react-placeholder-loading';

const DATA_COUNT = 6;
const labels = [];
for (let i = 0; i < DATA_COUNT; ++i) {
    labels.push(i.toString());
}

const chartData = {
    labels: labels,
    datasets: [
        {
            label: 'Active RFQs',
            data: [0, 20, 60, 30, 90, 120],
            backgroundColor: "#FFA500",
            borderColor: "#FFA500",
            fill: false,
            cubicInterpolationMode: 'monotone',
            tension: 0.4
        }, {
            label: 'Completed RFQs',
            data: [0, 35, 68, 100, 50, 70],
            backgroundColor: "#000080",
            borderColor: "#000080",
            fill: false,
            tension: 0.4
        }, {
            label: 'Closed RFQs',
            data: [0, 50, 30, 75, 120, 100],
            backgroundColor: "#02c969",
            borderColor: "#02c969",
            fill: false
        }
    ]
};

const config = {
    type: 'line',
    data: chartData,
    options: {
        responsive: true,
        plugins: {
            title: {
                display: true,
                text: 'Chart.js Line Chart'
            },
        },
        interaction: {
            intersect: false,
        },
        scales: {
            x: {
                display: true,
                title: {
                    display: true
                }
            },
            y: {
                display: true,
                title: {
                    display: true,
                    text: 'Value'
                },
                suggestedMin: -10,
                suggestedMax: 200
            }
        }
    },
};

const ProductOverview = ({ data, setShowInsights }) => {
    const [productOverview, setProductOverview] = useState(null);
    const [prodStats, setProdStats] = useState(null);
    const [loading, setLoading] = useState(false);

    const getOverViewDetails = () => {
        setLoading(true)
        getProductPriceStats({ search_key: data?.product_name })
            .then((res) => {
                if (!res.data?.market[0]?.general?.min) {
                    setShowInsights(false)
                }
                else {
                    setProductOverview(res.data)
                    setProdStats(res.data?.market?.monthly)
                }
            })
            .catch((error) => {
                console.log(error)
                setShowInsights(false)
            })
            .finally(() => {
                setLoading(false)
            })
    }

    const decodeDate = (timestamp) => {
        // Ensure the timestamp is a valid number
        const validTimestamp = Number(timestamp);
        if (isNaN(validTimestamp)) {
            return;
        }

        const date = new Date(validTimestamp);
        if (isNaN(date.getTime())) {
            return;
        }
        return date.toUTCString().slice(0, 16);
    }

    useEffect(() => {
        getOverViewDetails();
    }, [data])

    // useEffect(() => {
    //     if (prodStats && prodStats.length > 0) {
    //         let prod_ctx = document.getElementById("bar_chart_prod")?.getContext("2d");
    //         if (prod_ctx) {
    //             window.myLine = new Chart(prod_ctx, config);
    //         }
    //     }
    // }, [prodStats]);

    return (
        <div className="row mt-4">

            {/* overview section */}
            <div className="col-6 p-2">
                <h3 className='fs-6 fw-medium'>Based on Our Market Intelligence</h3>
                <div className="d-flex justify-content-around fw-medium border rounded-3 p-2">
                    <div>
                        <span>Minimum Price </span>
                        {loading
                            ? <span className="d-block mt-1"><PlaceholderLoading shape="rect" width={80} height={20} /></span>
                            : <span className="d-block fw-medium text-muted text-sm mt-1">{formatPrice(productOverview?.market[0]?.general?.min) || "---"}</span>
                        }
                    </div>
                    <div>
                        <span>Maximum Price </span>
                        {loading
                            ? <span className="d-block mt-1"><PlaceholderLoading shape="rect" width={80} height={20} /></span>
                            : <span className="d-block fw-medium text-muted text-sm mt-1">{formatPrice(productOverview?.market[0]?.general?.max) || "---"}</span>
                        }
                    </div>
                    <div>
                        <span>Average Price </span>
                        {loading
                            ? <span className="d-block mt-1"><PlaceholderLoading shape="rect" width={80} height={20} /></span>
                            : <span className="d-block fw-medium text-muted text-sm mt-1">{formatPrice(productOverview?.market[0]?.general?.avg?.toFixed(2)) || "---"}</span>
                        }
                    </div>
                </div>
            </div>

            {/* user specific data section */}
            {productOverview?.personal[1] ? 
                <div className="col-6 p-2">
                    <h3 className='fs-6 fw-medium'>Your Last Finalized Quote </h3>
                    <div className="d-flex justify-content-around fw-medium border rounded-3 p-2">
                        <div>
                            <span>Base Price </span>
                            {loading
                                ? <span className="d-block mt-1"><PlaceholderLoading shape="rect" width={80} height={20} /></span>
                                : <span className="d-block fw-medium text-muted text-sm mt-1">{formatPrice(productOverview?.personal[1]?.unit_price) || "---"}</span>
                            }
                        </div>
                        <div>
                            <span>Date </span>
                            {loading
                                ? <span className="d-block mt-1"><PlaceholderLoading shape="rect" width={80} height={20} /></span>
                                : <span className="d-block fw-medium text-muted text-sm mt-1">{decodeDate(productOverview?.personal[1]?.quote_timestamp) || "---"}</span>
                            }
                        </div>
                    </div>
                </div>
                :
                productOverview?.personal[0] &&
                <div className="col-6 p-2">
                    <h3 className='fs-6 fw-medium'>Your Last Received Quote </h3>
                    <div className="d-flex justify-content-around fw-medium border rounded-3 p-2">
                        <div>
                            <span>Base Price </span>
                            {loading
                                ? <span className="d-block mt-1"><PlaceholderLoading shape="rect" width={80} height={20} /></span>
                                : <span className="d-block fw-medium text-muted text-sm mt-1">{formatPrice(productOverview?.personal[0]?.unit_price) || "---"}</span>
                            }
                        </div>
                        <div>
                            <span>Date </span>
                            {loading
                                ? <span className="d-block mt-1"><PlaceholderLoading shape="rect" width={80} height={20} /></span>
                                : <span className="d-block fw-medium text-muted text-sm mt-1">{decodeDate(productOverview?.personal[0]?.quote_timestamp) || "---"}</span>
                            }
                        </div>
                    </div>
                </div>
            }

            {/* <div className="col-md-6">
                {productOverview && (
                    <>
                        <p>
                            <strong>Product Name : </strong>
                            {data?.product_name}
                        </p>
                        <p>
                            <strong>Last Purchase Date : </strong>
                            {decodeDate(productOverview?.last_purchase_date)}
                        </p>
                        <p>
                            <strong>Last Purchase Price : </strong>
                            {productOverview?.last_purchase_price}
                        </p>
                        <p>
                            <strong>Last Purchase Quantity : </strong>
                            {productOverview?.last_purchase_quantity}
                        </p>
                        <p>
                            <strong>Minimum Price : </strong>
                            {productOverview?.min_price}
                        </p>
                        <p>
                            <strong>Maximum Price : </strong>
                            {productOverview?.max_price}
                        </p>
                    </>
                )}
            </div> */}

            {/* stats section */}
            {/* <div className="col-md-7">
                <div className="buy-stats">
                    <div className="d-flex justify-content-between align-items-center p-4 border-bottom">
                        <h3 className="fs-5 fw-semibold mb-0">Pricing Insights</h3>
                        <select name="buyer-chart-select" id="buyer_chart_select" className="w-25 px-3 py-2 rounded-2" >
                            <option value="weekly" selected>Weekly</option>
                            <option value="monthly" >Monthly</option>
                            <option value="yearly" >Yearly</option>
                        </select>
                    </div>
                    <div className="buy-stats-container position-relative d-flex justify-content-center align-items-center p-4">
                        <canvas id="bar_chart_prod"></canvas>
                    </div>
                </div>
            </div> */}

        </div>
    )
}

export default ProductOverview
