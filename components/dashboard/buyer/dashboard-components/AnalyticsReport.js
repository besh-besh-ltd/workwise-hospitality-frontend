import ChartComponent from '@/components/shared/ChartConfig/ChartComponent';
import Utils from '@/components/shared/ChartConfig/utils';
import FullLoader from '@/components/shared/FullLoader';
import { getAnalyticsChartData } from '@/services/rfq';
import React, { useEffect, useState } from 'react'
import Select from 'react-select';
import { toast } from 'react-toastify';

const AnalyticsReport = () => {
    const [chartData, setChartData] = useState(null);
    const [chartTitle, setChartTitle] = useState('');
    const [filter, setFilter] = useState({ label: 'Last 7 days', value: 'past7days' });
    const [chartType, setChartType] = useState({ label: 'Bar Chart', value: 'bar' });
    const [dataType, setDataType] = useState({ label: 'Finalized Quotes', value: 'quotes' });
    const [loading, setLoading] = useState(false);

    const getChartData = async () => {
        setLoading(true);
        try {
            const res = await getAnalyticsChartData(filter.value, dataType.value);
            generateChartData(res.data);
        } catch (error) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    }

    const handleChange = (selectedOption, actionMeta) => {
        const { name } = actionMeta;
        if (name == 'date_range')
            setFilter(selectedOption);
        else if (name == 'chart_type')
            setChartType(selectedOption);
        else
            setDataType(selectedOption);
    }

    const generateChartData = (api_data) => {
        const title = Utils.CHART_TITLE({ labelType: filter.value });
        const { result: actualDates, labels: fullDateRange } = Utils.DATE_RANGE({ rangeType: filter.value });

        const dateDataMap = actualDates.reduce((acc, date) => {
            acc[date] = {
                data_point: 0
            };
            return acc;
        }, {});

        if (filter.value === 'past3months' || filter.value === 'past6months' || filter.value === 'wholeYear') {
            // Monthly data
            api_data.forEach(item => {
                const formattedMonth = new Date(`${item.month}-01`).toLocaleDateString('en-IN');
                if (dateDataMap[formattedMonth]) {
                    dateDataMap[formattedMonth] = {
                        data_point: parseInt(item.quotes_count || item.total_quote_amount, 10)
                    };
                }
            });
        } else {
            // Date Wise data
            api_data.forEach(item => {
                const formattedDate = new Date(item.date).toLocaleDateString('en-IN');
                if (dateDataMap[formattedDate]) {
                    dateDataMap[formattedDate] = {
                        data_point: parseInt(item.quotes_count || item.total_quote_amount, 10)
                    };
                }
            });
        }

        const labels = Object.keys(dateDataMap);
        const preparedData = {
            data_point: labels.map(label => dateDataMap[label].data_point),
        };

        let dataSets = [
            {
                label: dataType.value === 'quotes'
                    ? 'Quotes Finalized'
                    : dataType.value === 'quote_costing'
                        ? 'Quotes Costing'
                        : 'Product Costing',
                data: preparedData.data_point,
                backgroundColor: Utils.CHART_COLORS.blue,
                borderColor: Utils.CHART_COLORS.blue,
                fill: false,
            }
        ]

        if (chartType.value === 'cubic') {
            dataSets = dataSets.map((item) => (
                { ...item, tension: 0.4 }
            ))
        }

        setChartTitle(title);
        setChartData({
            labels: fullDateRange,
            datasets: dataSets
        });
    };

    useEffect(() => {
        getChartData();
    }, [filter, dataType])

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

    const DATA_COUNT = 5;
    const NUMBER_CFG = { count: DATA_COUNT, min: 0, max: 100 };

    const pieData = {
        labels: ['Red', 'Orange', 'Yellow', 'Green', 'Blue'],
        datasets: [
            {
                label: 'Dataset 1',
                data: Utils.numbers(NUMBER_CFG),
                backgroundColor: Object.values(Utils.CHART_COLORS),
            }
        ]
    };


    return (
        <section className='hasFullloader mb-3'>
            <div className="row mb-3">
                <div className="Analytics-container col-md-12">
                    <div className="rounded-2 shadow p-4">
                        <div className="d-flex justify-content-between align-items-center">
                            <h2 className="fs-4 fw-medium mb-0">Analytics and Reports</h2>

                            <div className="col-md-6 d-flex justify-content-between gap-2">
                                <Select
                                    options={[
                                        { label: 'Finalized Quotes', value: 'quotes' },
                                        { label: 'Quotes Costing', value: 'quote_costing' },
                                        // { label: 'Product Costing', value: 'product_costing' }
                                    ]}
                                    onChange={handleChange}
                                    value={dataType}
                                    defaultValue={{ label: 'Finalized Quotes', value: 'quotes' }}
                                    name="cost_type"
                                    className="text-sm w-100"
                                    placeholder="Choose Range"
                                    isClearable={false}
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
                            <div className="col-md-4 my-4">
                                <ChartComponent data={pieData} chartTitle={'RFQ Analysis'} chartType='pie' height={350} />
                            </div>
                            <div className="col-md-8 my-4 hasFullLoader">
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
