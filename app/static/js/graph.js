import { highlightMapPoint } from "./map.js";

let graphPositions = [];

const MAX_TIME_GAP = 300; // seconds
const MAX_DISTANCE_GAP = 1.0; // miles

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 3958.8; // Earth radius in miles
    const toRad = deg => deg * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function updateSpeedGraph(positions, from_timestamp, to_timestamp) {
    const ctx = document.getElementById("speed-graph").getContext("2d");

    graphPositions = positions;

    let speedData = [];
    let rpmData = [];

    for (let i = 0; i < positions.length; i++) {
        const pos = positions[i];
        const timestampMs = pos.utc_shifted_tstamp * 1000;

        if (i > 0) {
            const prev = positions[i - 1];
            const timeGap = pos.utc_shifted_tstamp - prev.utc_shifted_tstamp;
            const distGap = calculateDistance(
                pos.latitude, pos.longitude,
                prev.latitude, prev.longitude
            );

            if (timeGap > MAX_TIME_GAP || distGap > MAX_DISTANCE_GAP) {
                speedData.push({ x: timestampMs, y: null });
                rpmData.push({ x: timestampMs, y: null });
            }
        }

        speedData.push({ x: timestampMs, y: pos.knots });
        rpmData.push({ x: timestampMs, y: pos.rpm });
    }

    const maxSpeed = Math.max(...positions.map(p => p.knots || 0), 10);
    const maxRPM = Math.max(...positions.map(p => p.rpm || 0), 2000);

    if (window.speedChart) {
        window.speedChart.destroy();
    }

    window.speedChart = new Chart(ctx, {
        type: "line",
        data: {
            datasets: [
                {
                    label: "Speed (knots)",
                    data: speedData,
                    borderColor: "blue",
                    borderWidth: 2,
                    fill: false,
                    yAxisID: "ySpeed",
                    pointRadius: 0,
                    spanGaps: false,
                },
                {
                    label: "RPM",
                    data: rpmData,
                    borderColor: "red",
                    borderWidth: 2,
                    fill: false,
                    yAxisID: "yRpm",
                    pointRadius: 0,
                    spanGaps: false,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            interaction: {
                mode: "index",
                intersect: false,
            },
            plugins: {
                tooltip: {
                    mode: "index",
                    intersect: false,
                    position: "nearest",
                },
                legend: { display: true },
            },
            scales: {
                x: {
                    type: "time",
                    time: {
                        unit: "day",
                        displayFormats: { day: "MMM d" },
                        tooltipFormat: "MMM d, yyyy HH:mm",
                    },
                    title: { display: true, text: "Date (GMT)" },
                },
                ySpeed: {
                    type: "linear",
                    position: "left",
                    title: { display: true, text: "Speed (knots)" },
                    min: 0,
                    max: maxSpeed,
                    grid: { drawOnChartArea: false },
                },
                yRpm: {
                    type: "linear",
                    position: "right",
                    title: { display: true, text: "RPM" },
                    min: 500,
                    max: maxRPM,
                    grid: { drawOnChartArea: false },
                },
            },
        },
    });

    // Hover from graph → highlight on map
    ctx.canvas.addEventListener("mousemove", function (event) {
        const points = window.speedChart.getElementsAtEventForMode(
            event,
            "nearest",
            { intersect: false },
            false
        );

        if (points.length) {
            const index = points[0].index;
            const point = window.speedChart.data.datasets[0].data[index];
            const timestampMs = point.x;

            const match = graphPositions.find(p => p.utc_shifted_tstamp * 1000 === timestampMs);
            if (match) {
                highlightMapPoint(match.latitude, match.longitude);
            }
        }
    });

    ctx.canvas.addEventListener("mouseleave", () => {
        import("./map.js").then(({ clearHighlightMarker }) => {
            clearHighlightMarker();
        });
    });
}

export function updateSpeedGraphFromMap(filteredPositions) {
    if (!filteredPositions.length) return;

    const from_timestamp = filteredPositions[0].utc_shifted_tstamp;
    const to_timestamp = filteredPositions[filteredPositions.length - 1].utc_shifted_tstamp;

    updateSpeedGraph(filteredPositions, from_timestamp, to_timestamp);
}

export function highlightGraphPoint(timestampSec) {
    const chart = window.speedChart;
    if (!chart) return;

    const timestampMs = timestampSec * 1000;
    const dataset = chart.data.datasets[0].data;

    // Find the closest index in the dataset
    let closestIndex = -1;
    let minDiff = Infinity;

    for (let i = 0; i < dataset.length; i++) {
        const dp = dataset[i];
        if (dp && dp.x != null && dp.y != null) {
            const diff = Math.abs(dp.x - timestampMs);
            if (diff < minDiff) {
                minDiff = diff;
                closestIndex = i;
            }
        }
    }

    if (closestIndex === -1) return;

    const elements = [
        { datasetIndex: 0, index: closestIndex },
        { datasetIndex: 1, index: closestIndex },
    ];

    chart.setActiveElements(elements);
    chart.tooltip.setActiveElements(elements, { x: 0, y: 0 });
    chart.update();
}

export function clearHighlightMarker() {
    // Just a stub so map.js can import this safely
}
