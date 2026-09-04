import ChartComponent from '@/components/shared/ChartConfig/ChartComponent';
import Utils from '@/components/shared/ChartConfig/utils';
import FullLoader from '@/components/shared/FullLoader';
import { getAnalyticsChartData, getFinalizedProductsList, getFinalizedVendorsList } from '@/services/rfq';
import React, { useEffect, useState } from 'react'
import AsyncSelect from "react-select/async";
import Select from 'react-select';
import { toast } from 'react-toastify';
import { formatDisplayDate } from "@/utils/sharedFunctions";


const AnalyticsReport = () => {
    const [chartData, setChartData] = useState(null);
    const [chartTitle, setChartTitle] = useState('');
    const [filter, setFilter] = useState({ label: 'Last 7 days', value: 'past7days' });
    const [chartType, setChartType] = useState({ label: 'Bar Chart', value: 'bar' });
    const [dataType, setDataType] = useState({ label: 'Finalized Quotes Count', value: 'quotes' });
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [selectedVendors, setSelectedVendors] = useState([]);
    const [loading, setLoading] = useState(false);

    const getChartData = async () => {
        setLoading(true);
        try {
            const res = await getAnalyticsChartData(
                filter.value,
                dataType.value,
                selectedProduct?.value,
                selectedVendors.map((item) => item?.value).join(',')
            );
            generateChartData(res.data);
        } catch (error) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    }

    const getVendorSelectionOption = async () => {
        try {
            const res = await getFinalizedVendorsList();
            return res.data.map((venItem) => ({
                value: venItem.user_id,
                label: venItem.company_name || venItem.organization_name || venItem.name
            }))
        } catch (error) {
            toast.error(error.message);
        }
    }

    const getProductSelectionOption = async () => {
        try {
            const res = await getFinalizedProductsList();
            return res.data;
        } catch (error) {
            toast.error(error.message);
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
            case 'cost_type':
                setDataType(selectedOption);
                break;
            case 'product_select':
                setSelectedProduct(selectedOption);
                break;
            case 'vendor_select':
                setSelectedVendors(selectedOption || []);
                break;
            default:
                break;
        }
    }

    const generateChartData = (api_data) => {
        const title = Utils.CHART_TITLE({ labelType: filter.value });
        const { result: actualDates, labels: fullDateRange } = Utils.DATE_RANGE({ rangeType: filter.value });

        const dateMap = {};
        api_data.forEach(({ date, company_name, organization_name, name, data_value }) => {
            const vendor_name = company_name || organization_name || name;
            const key = (filter.value === 'past3months' || filter.value === 'past6months' || filter.value === 'wholeYear')
                ? `${date}-01`
                : date;

            if (!dateMap[key]) dateMap[key] = {};
            dateMap[key][vendor_name] = (dateMap[key][vendor_name] || 0) + parseInt(data_value, 10);
        });

        const vendorNames = [...new Set(api_data.map(
            ({ company_name, organization_name, name }) => company_name || organization_name || name
        ))];

        const dateDataMap = actualDates.reduce((acc, date) => {
            acc[date] = vendorNames.reduce((vendorAcc, vendor) => {
                vendorAcc[vendor] = 0;
                return vendorAcc;
            }, {});
            return acc;
        }, {});

        Object.entries(dateMap).forEach(([date, vendors]) => {
            const formattedDate = formatDisplayDate(date);
            if (dateDataMap[formattedDate]) {
                Object.entries(vendors).forEach(([vendor_name, data_value]) => {
                    dateDataMap[formattedDate][vendor_name] = data_value;
                });
            }
        });

        const sortedDates = actualDates.sort((a, b) => new Date(a) - new Date(b));

        const dataSets = vendorNames.map(vendor => {
            const color = Utils.getRandomColor();
            return {
                label: vendor,
                data: sortedDates.map(date => dateDataMap[date][vendor] || 0),
                backgroundColor: color,
                borderColor: color,
                fill: false,
                ...(chartType.value === 'cubic' && { tension: 0.4 }),
            };
        });

        setChartTitle(title);
        setChartData({
            labels: fullDateRange,
            datasets: dataSets,
        });
    };


    useEffect(() => {
        getChartData();
    }, [filter, dataType, selectedProduct, selectedVendors])

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


    return (
        <section className='hasFullloader mb-3'>
            <div className="row mb-3">
                <div className="Analytics-container col-md-12">
                    <div className="rounded-2 shadow p-4">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <h2 className="fs-4 fw-medium mb-0">Analytics and Reports</h2>

                            <div className="col-md-4 d-flex justify-content-between gap-2">
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
                                    defaultValue={{ label: 'Bar Chart', value: 'bar' }}
                                    name="chart_type"
                                    className="text-sm w-100"
                                    placeholder="Choose Type"
                                    isClearable={false}
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
                                    className="text-sm w-100"
                                    placeholder="Choose Range"
                                    isClearable={false}
                                />
                            </div>
                        </div>

                        <div className="row">
                            <div className="col-md-3 my-4">
                                <Select
                                    options={[
                                        { label: 'Finalized Quotes Count', value: 'quotes' },
                                        { label: 'Finalized Quotes Costing', value: 'quote_costing' },
                                    ]}
                                    onChange={handleChange}
                                    value={dataType}
                                    defaultValue={{ label: 'Finalized Quotes Count', value: 'quotes' }}
                                    name="cost_type"
                                    className="text-sm w-100 mb-2"
                                    placeholder="Choose Range"
                                    isClearable={false}
                                />

                                <AsyncSelect
                                    cacheOptions
                                    loadOptions={getProductSelectionOption}
                                    defaultOptions
                                    name="product_select"
                                    className="text-sm w-100 mb-2"
                                    onChange={handleChange}
                                    value={selectedProduct}
                                    placeholder="Choose Product"
                                    isClearable
                                    noOptionsMessage={() => "No Finalized Products Yet"}
                                />

                                <AsyncSelect
                                    cacheOptions
                                    loadOptions={getVendorSelectionOption}
                                    defaultOptions
                                    name="vendor_select"
                                    className="text-sm w-100"
                                    onChange={handleChange}
                                    value={selectedVendors}
                                    placeholder="Choose Vendor"
                                    isClearable
                                    isMulti
                                    noOptionsMessage={() => "No Finalized Vendors Yet"}
                                />

                            </div>
                            <div className="col-md-9 my-4 hasFullLoader">
                                {loading && <FullLoader />}
                                {chartData &&
                                    <ChartComponent
                                        key={JSON.stringify(chartData.datasets)}
                                        data={chartData}
                                        chartTitle={chartTitle}
                                        chartType={chartType.value === 'cubic' ? 'line' : chartType.value}
                                        height={350}
                                    />
                                }
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default AnalyticsReport
