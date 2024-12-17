import React from 'react';
import {
    Chart as ChartJS,
    LineController,
    BarController,
    PieController,
    RadarController,
    PolarAreaController,
    LineElement,
    BarElement,
    PointElement,
    ArcElement,
    LinearScale,
    RadialLinearScale,
    CategoryScale,
    Filler,
    Title,
    Legend,
} from 'chart.js';
import { Line, Bar, Pie, Radar, PolarArea } from 'react-chartjs-2';

// Register necessary components and plugins
ChartJS.register(
    LineController,
    BarController,
    PieController,
    RadarController,
    PolarAreaController,
    LineElement,
    BarElement,
    PointElement,
    ArcElement,
    LinearScale,
    RadialLinearScale,
    CategoryScale,
    Filler,
    Title,
    Legend
);

const transformDataForChartType = (chartType, originalData) => {
    if (chartType === 'pie' || chartType === 'polarArea') {
        return {
            labels: originalData.labels,
            datasets: [
                {
                    data: originalData.datasets[0].data, 
                    backgroundColor: originalData.datasets[0].backgroundColor,
                },
            ],
        };
    } else if (chartType === 'radar') {
        return {
            labels: originalData.labels,
            datasets: originalData.datasets.map((dataset) => ({
                ...dataset,
                fill: true, 
            })),
        };
    }
    return originalData; 
};

const ChartComponent = ({ data, chartTitle, min = 0, max = 10, chartType = 'line', height = 400 }) => {
    const ChartMap = {
        line: Line,
        bar: Bar,
        pie: Pie,
        radar: Radar,
        polarArea: PolarArea,
    };

    const ChartToRender = ChartMap[chartType] || Line;

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: true,
                position: 'top',
            },
            title: {
                display: true,
                text: chartTitle,
            },
        },
        interaction: {
            intersect: false,
        },
        scales: chartType === 'radar' || chartType === 'polarArea'
            ? {
                r: {
                    suggestedMin: min,
                    suggestedMax: max,
                },
            }
            : chartType !== 'pie' && {
                x: {
                    display: true,
                    title: {
                        display: true,
                    },
                },
                y: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Value',
                    },
                    suggestedMin: min,
                    suggestedMax: max,
                },
            },
    };

    const transformedData = transformDataForChartType(chartType, data);

    return (
        <div style={{ width: '80%', height: `${height}px`, margin: '0 auto' }}>
            <ChartToRender data={transformedData} options={options} height={height} />
        </div>
    );
};

export default ChartComponent;
