import ChartComponent from '@/components/shared/ChartConfig/ChartComponent';
import Utils from '@/components/shared/ChartConfig/utils';
import React from 'react'
import Select from 'react-select';

const AnalyticsReport = () => {

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

    const labels = Utils.months({ count: 7 });
    const datapoint1 = [0, 20, 20, 60, 60, 120, 150];
    const datapoint2 = [0, 50, 35, 15, 90, 100, 120];
    const datapoint3 = [0, 100, 74, 60, 35, 20, NaN];

    const rfqData = {
        labels: labels,
        datasets: [
            {
                label: 'New RFQs',
                data: datapoint1,
                fill: true,
                backgroundColor: Utils.CHART_COLORS.green,
                borderColor: Utils.CHART_COLORS.green,
                cubicInterpolationMode: 'monotone',
                tension: 0.4,
            },
            {
                label: 'Pending RFQs',
                data: datapoint2,
                fill: true,
                backgroundColor: Utils.CHART_COLORS.blue,
                borderColor: Utils.CHART_COLORS.blue,
                tension: 0.4,
            },
            {
                label: 'Completed RFQs',
                data: datapoint3,
                fill: true,
                backgroundColor: Utils.CHART_COLORS.red,
                borderColor: Utils.CHART_COLORS.red,
            },
        ]
    };


    return (
        <section className='hasFullloader mb-3'>
            <div className="row mb-3">
                <div className="Analytics-container col-md-12">
                    <div className="rounded-2 shadow p-4">
                        <div className="d-flex justify-content-between align-items-center">
                            <h2 className="fs-4 fw-medium mb-0">Analytics and Reports</h2>
                            <div className="col-md-2">
                                <Select
                                    options={[
                                        { label: 'Today', value: 'today' },
                                        { label: 'Last 7 days', value: 'cur_week' },
                                        { label: 'This Month', value: 'cur_month' },
                                        { label: 'Choose Range', value: 'custom' }
                                    ]}
                                    // onChange={handleFilterChange}
                                    name="analytics_range"
                                    className="text-sm"
                                    placeholder="Choose Range"
                                    isClearable
                                />
                            </div>
                        </div>

                        <div className="row">
                            <div className="col-md-4 my-4">
                                <ChartComponent data={pieData} chartTitle={'RFQ Analysis'} chartType='pie' height={350} />
                            </div>
                            <div className="col-md-8 my-4">
                                <ChartComponent data={rfqData} chartTitle={'Cost Analysis'} chartType='bar' height={350} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default AnalyticsReport
