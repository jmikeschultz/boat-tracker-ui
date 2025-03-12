export function updateSpeedGraph(positions, from_timestamp, to_timestamp) {
    const ctx = document.getElementById("speed-graph").getContext("2d");

    console.log("graph.js fromTimestamp (GMT):", from_timestamp);
    console.log("graph.js toTimestamp (GMT):", to_timestamp);

    // Ensure timestamps are included even if there's no data at the edges
    const adjustedPositions = [
        { utc_shifted_tstamp: from_timestamp, knots: 0, rpm: 0 },
        ...positions,
        { utc_shifted_tstamp: to_timestamp, knots: 0, rpm: 0 },
    ];

    // Extract data points
    const speedData = adjustedPositions.map(pos => ({
        x: pos.utc_shifted_tstamp * 1000,  // Convert to milliseconds
        y: pos.knots,
    }));

    const rpmData = adjustedPositions.map(pos => ({
        x: pos.utc_shifted_tstamp * 1000,
        y: pos.rpm,
    }));

    console.log("RPM Data:", rpmData);

    // Determine y-axis limits
    const maxSpeed = Math.max(...positions.map(pos => pos.knots), 10);
    const maxRPM = Math.max(...positions.map(pos => pos.rpm), 2000);  // Ensure RPM is visible

    // Destroy previous chart if it exists
    if (window.speedChart) {
        window.speedChart.destroy();
    }

    // Create the new graph with dual y-axes
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
                },
                {
                    label: "RPM",
                    data: rpmData,
                    borderColor: "red",
                    borderWidth: 2,
                    fill: false,
                    yAxisID: "yRpm",
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
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
                yRpm: {  // ✅ Fixed: This now matches the dataset ID
                    type: "linear",
                    position: "right",
                    title: { display: true, text: "RPM" },
                    min: 500, 
                    max: maxRPM,
                    grid: { drawOnChartArea: false },
                },
            },
            plugins: {
                legend: { display: true },
            },
        },
    });
}
