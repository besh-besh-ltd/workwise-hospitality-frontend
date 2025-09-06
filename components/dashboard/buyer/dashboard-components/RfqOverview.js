import ChartComponent from '@/components/shared/ChartConfig/ChartComponent';
import Utils from '@/components/shared/ChartConfig/utils';
import { faArrowRight, faBell, faCartPlus, faCheckToSlot, faRectangleXmark, faStopwatch } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Link from 'next/link';
import AsyncSelect from 'react-select/async';
import Select from 'react-select';
import React, { useEffect, useState } from 'react'
import { toast } from 'react-toastify';
import FullLoader from '@/components/shared/FullLoader';
import { getRfqChartData, sendReminder } from '@/services/rfq';
import { formatDate } from "@/utils/sharedFunctions";
import { getProjectList } from '@/services/project';

const RfqOverview = ({ tableRfqData, notificationData, tableLoading }) => {
    const [rfqData, setRfqData] = useState(null);
    const [chartData, setChartData] = useState(null);
    const [chartTitle, setChartTitle] = useState('');
    const [selectedProject, setSelectedProject] = useState(null);
    const [filter, setFilter] = useState({ label: 'Last 7 days', value: 'past7days' });
    const [chartType, setChartType] = useState({ label: 'Cubic Line Chart', value: 'cubic' });
    const [loading, setLoading] = useState(false);
    const [reminderMap, setReminderMap] = useState(null);

    const getChartData = async () => {
        setLoading(true);
        try {
            const res = await getRfqChartData(
                filter.value,
                selectedProject ? selectedProject.value : null
            );
            generateChartData(res.data);
        } catch (error) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    }

    const getAllProjects = async () => {
        try {
            const res = await getProjectList();
            return res.data.map((item) => (
                { label: item.name, value: item.id }
            ));
        } catch (error) {
            toast.error(error.message)
        }
    }

    const handleChange = (selectedOption, actionMeta) => {
        const { name } = actionMeta;
        switch (name) {
            case 'date_range':
                setFilter(selectedOption);
                break;
            case 'chart_type':
                setChartType(selectedOption);
                break;
            case 'project_select':
                setSelectedProject(selectedOption);
                break;
            default:
                break;
        }
    }

    const generateChartData = (api_data) => {
        const title = Utils.CHART_TITLE({ labelType: filter.value });
        const { result: actualDates, labels: fullDateRange } = Utils.DATE_RANGE({ rangeType: filter.value });

        const sortedDates = actualDates.sort((a, b) => new Date(a) - new Date(b));

        const dateDataMap = sortedDates.reduce((acc, date) => {
            acc[date] = { new_rfqs: 0, closed_rfqs: 0, completed_rfqs: 0, quotes_received: 0 };
            return acc;
        }, {});

        let totals = { new_rfqs: 0, closed_rfqs: 0, completed_rfqs: 0, quotes_received: 0 };

        const isMonthly = ['past3months', 'past6months', 'wholeYear'].includes(filter.value);

        api_data.forEach(item => {
            const formattedPeriod = isMonthly
                ? new Date(`${item.date}-01`).toLocaleDateString('en-IN')
                : new Date(item.date).toLocaleDateString('en-IN');

            if (dateDataMap[formattedPeriod]) {
                const new_rfqs = parseInt(item.new_rfqs, 10);
                const closed_rfqs = parseInt(item.closed_rfqs, 10);
                const completed_rfqs = parseInt(item.completed_rfqs, 10);
                const quotes_received = parseInt(item.quotes_received, 10);

                dateDataMap[formattedPeriod] = { new_rfqs, closed_rfqs, completed_rfqs, quotes_received };

                totals.new_rfqs += new_rfqs;
                totals.closed_rfqs += closed_rfqs;
                totals.completed_rfqs += completed_rfqs;
                totals.quotes_received += quotes_received;
            }
        });

        const labels = Object.keys(dateDataMap);
        const preparedData = ['new_rfqs', 'closed_rfqs', 'completed_rfqs', 'quotes_received'].reduce((acc, key) => {
            acc[key] = labels.map(label => dateDataMap[label][key]);
            return acc;
        }, {});

        const dataSets = [
            {
                label: 'New RFQs',
                data: preparedData.new_rfqs,
                backgroundColor: Utils.CHART_COLORS.blue,
                borderColor: Utils.CHART_COLORS.blue
            },
            {
                label: 'Closed RFQs',
                data: preparedData.closed_rfqs,
                backgroundColor: Utils.CHART_COLORS.red,
                borderColor: Utils.CHART_COLORS.red
            },
            {
                label: 'Completed RFQs',
                data: preparedData.completed_rfqs,
                backgroundColor: Utils.CHART_COLORS.green,
                borderColor: Utils.CHART_COLORS.green
            },
            {
                label: 'Quotes Received',
                data: preparedData.quotes_received,
                backgroundColor: Utils.CHART_COLORS.yellow,
                borderColor: Utils.CHART_COLORS.yellow
            },
        ].map(item => (chartType.value === 'cubic' ? { ...item, tension: 0.4 } : { ...item, fill: false }));

        setRfqData(totals);
        setChartTitle(title);
        setChartData({
            labels: fullDateRange,
            datasets: dataSets,
        });
    };

    const handleReminder = (e, data) => {
        e.preventDefault();
        setReminderMap((prevState) => {
            const newMap = new Map(prevState);
            newMap.set(data.id, true);
            return newMap;
        });
        sendReminder(data.id)
            .then((res) => {
                if (res.message && res.message != "") {
                    toast.success(res.message);
                }
            })
            .catch((err) => {
                toast.error(err.message);
            })
            .finally(() => {
                setReminderMap((prevState) => {
                    const newMap = new Map(prevState);
                    newMap.set(data.id, false);
                    return newMap;
                });
            })
    };

    useEffect(() => {
        getChartData();
    }, [filter, selectedProject])

    useEffect(() => {
        if (chartData) {
            const newDataset = chartData.datasets.map((item) => {
                if (chartType.value === 'cubic') {
                    return { ...item, tension: 0.4 };
                } else if (chartType.value === 'line') {
                    const { tension, ...otherParts } = item;
                    return otherParts;
                }
                return item;
            });

            setChartData((prevState) => ({
                ...prevState,
                datasets: newDataset,
            }));
        }
    }, [chartType])

    useEffect(() => {
        if (tableRfqData) {
            let rMap = new Map();
            tableRfqData.forEach((rfqItem) => {
                rMap.set(rfqItem.id, false)
            })
            setReminderMap(rMap);
        }
    }, [tableRfqData])


    return (
        <section className='hasFullloader mb-3'>
            <div className="row mb-3 align-items-stretch ">

                <div className="RFQ-section col-md-12">
                    <div className="rounded-2 shadow p-4">
                        <div className="d-flex justify-content-between align-items-start">
                            <div>
                                <h2 className="fs-4 fw-medium mb-0">RFQ Overview</h2>
                                {selectedProject && <p className="text-sm fw-semibold mb-0" >{selectedProject.label}</p>}
                                <p className="text-sm fw-medium" >{chartTitle.split(/from |for the |for /)[1]}</p>
                            </div>

                            <div className="col-md-7 d-flex justify-content-between gap-2">
                                <AsyncSelect
                                    cacheOptions
                                    loadOptions={getAllProjects}
                                    defaultOptions
                                    name="project_select"
                                    className="text-sm w-100"
                                    onChange={handleChange}
                                    value={selectedProject}
                                    placeholder="Choose Project"
                                    isClearable
                                    noOptionsMessage={() => "No Projects Found"}
                                    id="choose_project-chart_filters-rfq_overview_page"
                                />

                                <Select
                                    options={[
                                        { label: 'Cubic Line Chart', value: 'cubic' },
                                        { label: 'Line Chart', value: 'line' },
                                        { label: 'Bar Chart', value: 'bar' },
                                        // { label: 'Polar Chart', value: 'polarArea' },
                                        // { label: 'Radar Chart', value: 'radar' },
                                    ]}
                                    onChange={handleChange}
                                    value={chartType}
                                    defaultValue={{ label: 'Cubic Line Chart', value: 'cubic' }}
                                    name="chart_type"
                                    className="text-sm w-50"
                                    placeholder="Choose Type"
                                    isClearable={false}
                                    id="chart_type-chart_filters-rfq_overview_page"
                                />

                                <Select
                                    options={[
                                        { label: 'Last 7 days', value: 'past7days' },
                                        { label: 'This Month', value: 'currentMonth' },
                                        { label: 'Past 3 Months', value: 'past3months' },
                                        { label: 'Past 6 Months', value: 'past6months' },
                                        { label: 'Current Year', value: 'wholeYear' }
                                    ]}
                                    onChange={handleChange}
                                    value={filter}
                                    defaultValue={{ label: 'Last 7 days', value: 'past7days' }}
                                    name="date_range"
                                    className="text-sm w-50"
                                    placeholder="Choose Range"
                                    isClearable={false}
                                    id="date_range-chart_filters-rfq_overview_page"
                                />

                            </div>
                        </div>

                        <div className="row">
                            {/* RFQ Overview */}
                            <div className="overview-container col-md-3 pe-2">
                                <div className="h-100 hasFullLoader">
                                    {loading && <FullLoader />}
                                    <div className="d-flex flex-column justify-content-between gap-2">
                                        <div className="border border-dark rounded-4 px-4 py-3 opacity-75">
                                            <div className="d-flex justify-content-between align-items-center">
                                                <h3 className="fs-4 fw-medium mb-0">
                                                    {rfqData ? (rfqData.new_rfqs || 0) : 0}
                                                    <span className="d-block fs-6">New RFQs</span>
                                                </h3>
                                                <FontAwesomeIcon icon={faCartPlus} fontSize={28} />
                                            </div>
                                        </div>

                                        <div className="border border-dark rounded-4 px-4 py-3 opacity-75">
                                            <div className="d-flex justify-content-between align-items-center">
                                                <h3 className="fs-4 fw-medium mb-0">
                                                    {rfqData ? (rfqData.quotes_received || 0) : 0}
                                                    <span className="d-block fs-6">Quotes Received</span>
                                                </h3>
                                                <FontAwesomeIcon icon={faStopwatch} fontSize={28} />
                                            </div>
                                        </div>

                                        <div className="border border-dark rounded-4 px-4 py-3 opacity-75">
                                            <div className="d-flex justify-content-between align-items-center">
                                                <h3 className="fs-4 fw-medium mb-0">
                                                    {rfqData ? (rfqData.completed_rfqs || 0) : 0}
                                                    <span className="d-block fs-6">Completed RFQs</span>
                                                </h3>
                                                <FontAwesomeIcon icon={faCheckToSlot} fontSize={28} />
                                            </div>
                                        </div>

                                        <div className="border border-dark rounded-4 px-4 py-3 opacity-75">
                                            <div className="d-flex justify-content-between align-items-center">
                                                <h3 className="fs-4 fw-medium mb-0">
                                                    {rfqData ? (rfqData.closed_rfqs || 0) : 0}
                                                    <span className="d-block fs-6">Closed RFQs</span>
                                                </h3>
                                                <FontAwesomeIcon icon={faRectangleXmark} fontSize={28} />
                                            </div>
                                        </div>

                                        <div className="d-flex justify-content-center mt-2">
                                            <Link
                                                href="/dashboard/buyer/rfq-management?tab=create-rfq"
                                                className="btn btn-primary border-0 py-2"
                                                id="create_new_rfq-rfq_actions-rfq_overview_page"
                                            >
                                                Create New RFQ
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* RFQ Chart */}
                            <div className="rfq-chart-container col-md-9 ps-2">
                                <div className="h-100 hasFullLoader">
                                    {loading && <FullLoader />}
                                    {chartData &&
                                        <ChartComponent
                                            key={JSON.stringify(chartData.datasets)}
                                            data={chartData}
                                            chartTitle={chartTitle}
                                            chartType={chartType.value === 'cubic' ? 'line' : chartType.value}
                                        />}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="row mb-3 align-items-stretch">

                {/* RFQ Table */}
                <div className="rfq-table-container col-md-8 pe-2">
                    <div className="bg-white shadow rounded-2 p-4 h-100 hasFullLoader">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <h2 className="fs-4 fw-medium mb-0">Latest RFQs</h2>
                            <Link
                                href="/dashboard/buyer/rfq-management"
                                style={{ borderColor: "var(--primary-color)" }}
                                id="view_all_rfqs-rfq_table-rfq_overview_page"
                            >
                                <FontAwesomeIcon icon={faArrowRight} className="me-2" />
                                View All
                            </Link>
                        </div>
                        {tableLoading ? (
                            <FullLoader />
                        ) : tableRfqData ? (
                            tableRfqData.length > 0 ? (
                                <div className="table-responsive">
                                    <table className="table table-borderless table-sm text-center">
                                        <thead className="text-nowrap">
                                            <tr style={{ fontSize: "14px", fontWeight: "200" }}>
                                                <th>RFQ Details</th>
                                                <th>Total Products</th>
                                                <th>Quotes Recieved</th>
                                                <th>Queries</th>
                                                <th>Reminder</th>
                                                <th>Details</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-sm">
                                            {tableRfqData.map((rfq, index) => {
                                                let isRecievedFromAll = rfq.vendors[0]?.total_vendors - rfq.vendors[0]?.quote_received <= 0;
                                                return (
                                                    <tr key={index} className="align-middle border-bottom">
                                                        <td className="py-2">
                                                            <span className="d-block">{rfq.rfq_no}</span>
                                                            <span className="d-block">{rfq.project_name}</span>
                                                        </td>
                                                        <td className="py-2">
                                                            <span className="text-sm px-2 py-1">
                                                                {rfq.products?.length} {rfq.products?.length == 1 ? ' Product' : 'Products'}
                                                            </span>
                                                        </td>
                                                        <td className="py-2">
                                                            <span className="text-sm px-2 py-1">
                                                                {rfq.quotes?.length > 0
                                                                    ? `${rfq.quotes?.length} ${rfq.quotes?.length == 1 ? ' Quote' : 'Quotes'}`
                                                                    : 'No Quotes Yet'
                                                                }
                                                            </span>
                                                        </td>
                                                        <td className="py-2">
                                                            <Link
                                                                href={`/dashboard/buyer/query?rfq_id=${rfq?.id}&role=buyer`}
                                                                className="position-relative text-sm text-primary border border-primary px-2 py-1 rounded-3"
                                                                id={`view_queries_${rfq.id}-rfq_table-rfq_overview_page`}
                                                            >
                                                                View
                                                                {rfq.unseen_query_count > 0 &&
                                                                    <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                                                                        + {rfq.unseen_query_count}
                                                                        <span className="visually-hidden">unread messages</span>
                                                                    </span>}
                                                            </Link>
                                                        </td>
                                                        <td className="py-2">
                                                            {rfq.vendors.length > 0 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        if (!isRecievedFromAll) {
                                                                            handleReminder(e, rfq)
                                                                        }
                                                                    }}
                                                                    className={`page-link-btn border-0 p-2 my-3 rounded-2 ${isRecievedFromAll ? "btn disabled" : ""}`}
                                                                    role="button"
                                                                    disabled={isRecievedFromAll}
                                                                    aria-disabled={isRecievedFromAll}
                                                                    style={{ width: "200px", backgroundColor: isRecievedFromAll ? "var(--secondary-color)" : "var(--primary-color)" }}
                                                                    id={`send_reminder_${rfq.id}-rfq_actions-rfq_overview_page`}
                                                                >
                                                                    {(reminderMap && reminderMap.get(rfq.id)) ? (
                                                                        <>
                                                                            <span
                                                                                className="spinner-border spinner-border-sm"
                                                                                role="status"
                                                                            ></span>{" "}
                                                                            Processing request...
                                                                        </>
                                                                    ) : (
                                                                        isRecievedFromAll
                                                                            ? "All Quotes Received"
                                                                            : `Send Reminder (${rfq.vendors[0]?.total_vendors - rfq.vendors[0]?.quote_received}/${rfq.vendors[0]?.total_vendors})`
                                                                    )
                                                                    }
                                                                </button>
                                                            )}

                                                        </td>
                                                        <td className="py-2">
                                                            <span>
                                                                <Link
                                                                    href={`/dashboard/buyer/rfq-management-details?type=buyer-view&id=${rfq?.id}`}
                                                                    className='position-relative text-sm text-primary border border-primary px-2 py-1 rounded-3'
                                                                    id={`view_details_${rfq.id}-rfq_table-rfq_overview_page`}
                                                                >
                                                                    View
                                                                </Link>
                                                            </span>
                                                        </td>
                                                    </tr>
                                                )
                                            }
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <h3>You don't Have any RFQ's Yet...!</h3>
                            )
                        ) : (
                            <h3>No RFQ's Found...!</h3>
                        )}

                    </div>
                </div>

                {/* Notifications */}
                <div className="notification-container col-md-4 ps-2">
                    <div className="bg-white d-flex flex-column shadow rounded-2 p-4 h-100">
                        <h2 className="fs-4 fw-medium  ">Notifications</h2>
                        <div className="notification-section list-group h-100 overflow-y-auto" style={{ maxHeight: "450px" }}>
                            {notificationData && notificationData.length > 0
                                ? notificationData.map((notification) => (
                                    <Link
                                        href={notification.notification_type === 'rfq_created'
                                            ? `/dashboard/buyer/rfq-management-details?type=buyer-view&id=${notification.id}`
                                            : `/dashboard/buyer/quote-compare?rfq=${notification.id}`
                                        }
                                        className="notification-card card mb-1"
                                        id={`notification_${notification.notification_type}_${notification.id}-notifications-rfq_overview_page`}
                                    >
                                        <div className="card-body p-2">
                                            <h3 className="card-title fs-6 fw-semibold my-1">{notification?.notification_type == 'rfq_created'
                                                ? "New RFQ created" : "New Quotation Received"}</h3>
                                            <p className="card-text text-sm mb-0">{notification?.notification_type == 'rfq_created'
                                                ? `You created a new RFQ #${notification?.rfq_no} and shared it with the vendors.`
                                                : ` ${notification?.organization_name || notification?.vendor_name} has sent you a new quotation on RFQ #${notification?.rfq_no}.`}</p>
                                            <span className='d-block m-0 fw-semibold text-end' style={{ fontSize: "12px", color: "grey" }}>{formatDate(notification?.readable_date_time)}</span>
                                        </div>
                                    </Link>
                                ))
                                : <div className="h-100 d-flex flex-column justify-content-center align-items-center">
                                    <FontAwesomeIcon icon={faBell} fontSize={64} className='opacity-25 mb-4' />
                                    <h3 className="fs-6 text-center">
                                        You don't have any notifications yet...!
                                    </h3>
                                </div>
                            }
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default RfqOverview
