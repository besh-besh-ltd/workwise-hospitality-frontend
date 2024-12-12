import ChartComponent from '@/components/shared/ChartConfig/ChartComponent';
import Utils from '@/components/shared/ChartConfig/utils';
import { faArrowRight, faCartPlus, faCheckToSlot, faRectangleXmark, faStopwatch } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Link from 'next/link';
import Select from 'react-select';
import React, { useEffect, useState } from 'react'
import { toast } from 'react-toastify';
import FullLoader from '@/components/shared/FullLoader';
import { getRfqChartData } from '@/services/rfq';


const RfqOverview = ({ data, loading }) => {
    const [filter, setFilter] = useState({ label: 'Last 7 days', value: 'past7days' });
    const [chartAPIdata, setChartAPIdata] = useState(null);
    const [chartData, setChartData] = useState(null);
    const [chartLoding, setchartLoading] = useState(false);

    const getChartData = async ()=> {
        setchartLoading(true);
        try {
            const res = await getRfqChartData(filter.value);
            console.log(res)
            generateChartData();
        } catch (error) {
            toast.error(error.message);
        } finally {
            setchartLoading(false);
        }
    }

    const handleRangeChange = (selectedOption, actionMeta) => {
        setFilter(selectedOption);
    }

    const generateChartData = () => {
        const { labels } = Utils.dateRange({ rangeType: filter.value });
        const data = Utils.numbers({ count: labels.length, min: 10, max: 100 });

        setChartData({
            labels,
            datasets: [
                {
                    label: 'Example Data',
                    data,
                    backgroundColor: Utils.CHART_COLORS.blue,
                    borderColor: Utils.CHART_COLORS.blue,
                    borderWidth: 1,
                    fill: true,
                },
            ],
        });
    };

    useEffect(() => {
        getChartData();
    }, [filter])

    return (
        <section className='hasFullloader mb-3'>
            <div className="row mb-3 align-items-stretch">

                {/* RFQ Overview */}
                <div className="overview-container col-md-3 pe-2">
                    <div className="bg-primary text-white rounded-2 shadow p-4 h-100 hasFullLoader">
                        <h2 className="fs-4 text-white fw-semibold">RFQ Overview</h2>
                        {loading
                            ? <FullLoader />
                            : <div className="d-flex flex-column justify-content-between gap-2">
                                <div className="border border-white rounded-4 px-4 py-3">
                                    <div className="d-flex justify-content-between align-items-center">
                                        <h3 className="fs-4 fw-medium text-white mb-0">
                                            {data ? (data.new_rfqs || 0) : 0}
                                            <span className="d-block fs-6 text-white">New RFQs</span>
                                        </h3>
                                        <FontAwesomeIcon icon={faCartPlus} fontSize={28} />
                                    </div>
                                </div>

                                <div className="border border-white rounded-4 px-4 py-3">
                                    <div className="d-flex justify-content-between align-items-center">
                                        <h3 className="fs-4 fw-medium text-white mb-0">
                                            {data ? (data.pending_responses || 0) : 0}
                                            <span className="d-block fs-6 text-white">Pending RFQs</span>
                                        </h3>
                                        <FontAwesomeIcon icon={faStopwatch} fontSize={28} />
                                    </div>
                                </div>

                                <div className="border border-white rounded-4 px-4 py-3">
                                    <div className="d-flex justify-content-between align-items-center">
                                        <h3 className="fs-4 fw-medium text-white mb-0">
                                            {data ? (data.completed_rfqs || 0) : 0}
                                            <span className="d-block fs-6 text-white">Completed RFQs</span>
                                        </h3>
                                        <FontAwesomeIcon icon={faCheckToSlot} fontSize={28} />
                                    </div>
                                </div>

                                <div className="border border-white rounded-4 px-4 py-3">
                                    <div className="d-flex justify-content-between align-items-center">
                                        <h3 className="fs-4 fw-medium text-white mb-0">
                                            {data ? (data.closed_rfqs || 0) : 0}
                                            <span className="d-block fs-6 text-white">Closed RFQs</span>
                                        </h3>
                                        <FontAwesomeIcon icon={faRectangleXmark} fontSize={28} />
                                    </div>
                                </div>

                                <div className="d-flex justify-content-center mt-2">
                                    <Link
                                        href="/dashboard/buyer/rfq-management?tab=create-rfq"
                                        className="btn btn-secondary border-0 py-2"
                                    >
                                        Create New RFQ
                                    </Link>
                                </div>
                            </div>}
                    </div>
                </div>

                {/* RFQ Chart */}
                <div className="rfq-chart-container col-md-9 ps-2">
                    <div className="bg-white shadow rounded-2 p-4 h-100 hasFullLoader">
                        {chartLoding
                            ? <FullLoader />
                            : <>
                                <div className="d-flex justify-content-between align-items-center">
                                    <h3 className="fs-4 fw-medium mb-0">RFQ Stats</h3>
                                    <div className="col-md-2">
                                        <Select
                                            options={[
                                                { label: 'Last 7 days', value: 'past7days' },
                                                { label: 'This Month', value: 'currentMonth' },
                                                { label: 'Past 3 Months', value: 'past3months' },
                                                { label: 'Past 6 Months', value: 'past6months' },
                                                { label: 'Current Year', value: 'wholeYear' }
                                            ]}
                                            onChange={handleRangeChange}
                                            value={filter}
                                            defaultValue={{ label: 'Last 7 days', value: 'past7days' }}
                                            name="rfq_range"
                                            className="text-sm"
                                            placeholder="Choose Range"
                                            isClearable={false}
                                        />
                                    </div>
                                </div>
                                {chartData && <ChartComponent data={chartData} chartType='line' />}
                            </>
                        }
                    </div>
                </div>
            </div>

            <div className="row mb-3 align-items-stretch">

                {/* RFQ Table */}
                <div className="rfq-table-container col-md-9 pe-2">
                    <div className="bg-white shadow rounded-2 p-4 h-100 hasFullLoader">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <h2 className="fs-4 fw-medium mb-0">Latest RFQs</h2>
                            <Link
                                href="/dashboard/buyer/rfq-management"
                                className="border border-2 px-2 py-1 rounded-3"
                            >
                                <FontAwesomeIcon icon={faArrowRight} className="me-2" />
                                View All
                            </Link>
                        </div>
                        {loading
                            ? <FullLoader />
                            : <>
                                {(data && data.rfq_data)
                                    ? (data.rfq_data.length > 0 ?
                                        <table className="table table-hover table-borderless table-sm text-center">
                                            <thead>
                                                <tr style={{ fontSize: "14px", fontWeight: "200" }}>
                                                    <th>RFQ Details</th>
                                                    <th>New Quotes</th>
                                                    <th>New Queries</th>
                                                    <th>Status</th>
                                                    <th>Send Reminder</th>
                                                </tr>
                                            </thead>
                                            <tbody className='text-sm'>
                                                {data.rfq_data.map(() => (
                                                    <tr className="align-middle border-bottom">
                                                        <td>
                                                            <span className="d-block">402763</span>
                                                            <span className="d-block">Kolkata Metro</span>
                                                        </td>
                                                        <td>
                                                            <span className="text-sm text-bg-success px-2 py-1 rounded-3">
                                                                Quotes <span className="badge text-bg-danger ms-1">+4</span>
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <span className="text-sm text-bg-primary px-2 py-1 rounded-3">
                                                                Queries <span className="badge text-bg-danger ms-1">+7</span>
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <span className="text-sm text-bg-warning px-2 py-1 rounded-3">
                                                                Pending
                                                            </span>
                                                        </td>
                                                        <td className="d-block mt-2">
                                                            <span className="text-sm text-bg-warning px-2 py-1 rounded-3">
                                                                Send Reminder
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))
                                                }
                                            </tbody>
                                        </table>
                                        : <h3>You don't Have any RFQ's Yet...!</h3>
                                    )
                                    : <h3>No RFQ's Found...!</h3>
                                }
                            </>
                        }
                    </div>
                </div>

                {/* Notifications */}
                <div className="rfq-table-container col-md-3 ps-2">
                    <div className="bg-white shadow rounded-2 p-4 h-100">
                        <h2 className="fs-4 fw-medium ">Notifications</h2>
                        <hr className="my-1" />
                    </div>
                </div>
            </div>
        </section>
    )
}

export default RfqOverview
