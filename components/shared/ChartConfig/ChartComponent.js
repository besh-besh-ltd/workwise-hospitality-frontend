import React from 'react';
import {
    Chart as ChartJS,
    LineController,
    BarController,
    PieController,
    LineElement,
    BarElement,
    PointElement,
    ArcElement,
    LinearScale,
    CategoryScale,
    Title,
    Legend,
} from 'chart.js';
import { Line, Bar, Pie } from 'react-chartjs-2';

// Register necessary components and plugins
ChartJS.register(
    LineController,
    BarController,
    PieController,
    LineElement,
    BarElement,
    PointElement,
    ArcElement,
    LinearScale,
    CategoryScale,
    Title,
    Legend
);

const ChartComponent = ({ data, chartTitle, chartType = 'line', height = 400 }) => {
    const ChartMap = {
        line: Line,
        bar: Bar,
        pie: Pie,
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
        scales: chartType !== 'pie' && {
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
                suggestedMin: 0,
                suggestedMax: 200,
            },
        },
    };

    return (
        <div style={{ width: '80%', height: `${height}px`, margin: '0 auto' }}>
            <ChartToRender data={data} options={options} height={height} />
        </div>
    );
};

export default ChartComponent;
