export function updateSpeedGraph(positions, from_timestamp, to_timestamp) {
    const ctx = document.getElementById("speed-graph").getContext("2d");

    //const fromDateInput = document.getElementById("from-date").value;
    //const toDateInput = document.getElementById("to-date").value;

    //console.log("fromDateInput (raw):", fromDateInput);
    //console.log("toDateInput (raw):", toDateInput);

    // gmt shifted time
    //const fromDate = new Date(${fromDateInput}T00:00:00+0000);
    //const toDate = new Date(${toDateInput}T23:59:59+0000);

    //const fromTimestamp = fromDate.getTime() / 1000;
    //const toTimestamp = toDate.getTime() / 1000;

    console.log("fromTimestamp (GMT):", from_timestamp);
    console.log("toTimestamp (GMT):", to_timestamp);

    const adjustedPositions = [
        { utc_shifted_tstamp: from_timestamp, knots: 0 },
        ...positions,
        { utc_shifted_tstamp: to_timestamp, knots: 0 },
    ];

    const data = adjustedPositions.map(pos => ({
        x: pos.utc_shifted_tstamp * 1000,
        y: pos.knots,
    }));

    const maxSpeed = Math.max(...positions.map(pos => pos.knots));
    const yAxisMax = Math.max(10, maxSpeed);

    if (window.speedChart) {
        window.speedChart.destroy();
    }

    window.speedChart = new Chart(ctx, {
        type: "line",
        data: {
            datasets: [
                {
                    label: "Speed (knots)",
                    data: data,
                    borderColor: "blue",
                    fill: false,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                x: {
                    type: "time", // Use time scale for the x-axis
                    time: {
                        unit: "day", // Display one tick per day
                        stepSize: 1,
                        displayFormats: {
                            day: "MMM d", // Format ticks as "Jan 1"
                        },
                        tooltipFormat: "MMM d, yyyy HH:mm", // Tooltip format
                    },
                    title: {
                        display: true,
                        text: "Date (GMT)",
                    },
                },
                y: {
                    max: yAxisMax,
                    title: {
                        display: true,
                        text: "Speed (knots)",
                    },
                },
            },
        },
    });
}
