export function updateSpeedGraph(positions) {
    const ctx = document.getElementById("speed-graph").getContext("2d");

    const labels = positions.map(pos => new Date(pos.gmt_timestamp * 1000).toISOString().split("T")[0]);
    const speeds = positions.map(pos => pos.speed);

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
                    title: {
                        display: true,
                        text: "Speed (knots)",
                    },
                },
            },
        },
    });
}
