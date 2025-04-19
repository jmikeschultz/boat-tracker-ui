// graph/chart.js
export function createChart(ctx, speedDatasets, rpmData, maxSpeed, maxRPM, graphPositions) {
  const rpmDataset = {
    label: "RPM",
    data: rpmData,
    borderColor: "red",
    borderWidth: 2,
    fill: false,
    yAxisID: "yRpm",
    pointRadius: 0,
    spanGaps: false,
    elements: {
      point: {
        radius: 0,
        hitRadius: 10,
        hoverRadius: 4
      }
    }
  };

  const finalDatasets = [...speedDatasets, rpmDataset];
  console.log("[chart] final datasets: ", finalDatasets);

  const chart = new Chart(ctx, {
    type: "line",
    data: {
      datasets: finalDatasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      devicePixelRatio: window.devicePixelRatio || 1,
      interaction: {
        mode: "nearest",
        intersect: false,
      },
      plugins: {
        tooltip: {
          mode: "nearest",
          intersect: false,
          position: "nearest",
          callbacks: {
            title(tooltipItems) {
              const item = tooltipItems[0];
              const rawTime = item.raw?.meta?.localTime;
              if (!rawTime) return "";
              return rawTime.split(".")[0];
            },
            label(context) {
              if (context.dataset.label === "RPM") {
                return `RPM: ${context.formattedValue}`;
              }
              return `Speed: ${context.formattedValue}`;
            },
          },
        },
        legend: { display: false },
      },
      elements: {
        point: {
          radius: 0,
          hoverRadius: 4,
          hitRadius: 10
        }
      },
      scales: {
        x: {
          type: "linear",
          min: 0,
          max: 1,
          title: { display: true, text: "Segment-relative time" },
          ticks: { display: false },
          grid: { display: false },
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

  console.log("[chart] chart built");
  return {
    chart,
    graphPositions
  };
}
