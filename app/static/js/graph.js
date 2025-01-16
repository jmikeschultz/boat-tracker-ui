export function updateSpeedGraph(positions) {
    const ctx = document.getElementById("speed-graph").getContext("2d");

    const labels = positions.map(pos => new Date(pos.utc_shifted_tstamp * 1000).toISOString().split("T")[0]);
    const speeds = positions.map(pos => pos.knots);

    const maxSpeed = Math.max(...speeds); // Find the maximum speed in the dataset
    const yAxisMax = Math.max(10, maxSpeed); // Use 10 if maxSpeed is less than 10

    if (window.speedChart) {
        window.speedChart.destroy();
    }

    window.speedChart = new Chart(ctx, {
        type: "line",
        data: {
            labels,
            datasets: [
                {
                    label: "Speed (knots)",
                    data: speeds,
                    borderColor: "blue",
                    fill: false,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: true, // Keeps graph proportions consistent
            scales: {
                x: {
                    ticks: {
                        maxTicksLimit: Math.min(labels.length, 7), // Limits ticks to 7 (one per day)
                        autoSkip: true,
                    },
                    title: {
                        display: true,
                        text: "Date",
                    },
                },
                y: {
                    max:yAxisMax,
                    title: {
                        display: true,
                        text: "Speed (knots)",
                    },
                },
            },
        },
    });
}
