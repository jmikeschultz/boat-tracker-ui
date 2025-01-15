const positions = JSON.parse(document.getElementById("positions-data").dataset.positions);

const graphCtx = document.createElement('canvas');
document.getElementById("graph-container").appendChild(graphCtx);

const speedData = positions.map(pos => ({
    x: new Date(pos.utc_shifted_tstamp * 1000),
    y: pos.speed,
}));

new Chart(graphCtx, {
    type: 'line',
    data: {
        datasets: [{
            label: "Speed (knots)",
            data: speedData,
            borderColor: "blue",
            fill: false,
        }],
    },
    options: {
        scales: {
            x: {
                type: 'time',
                time: {
                    unit: 'hour',
                },
            },
            y: {
                beginAtZero: true,
            },
        },
    },
});
