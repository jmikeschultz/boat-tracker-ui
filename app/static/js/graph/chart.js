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
              const meta = item.raw?.meta;
              if (!meta) return "";
              const segIndex = meta.segmentIndex !== undefined ? `(${meta.segmentIndex}) ` : "";
              const timeStr = meta.localTime ? meta.localTime.substring(0, 19) : "";
              return `${segIndex}${timeStr}`;
            },
            label(context) {
              const meta = context.raw?.meta;
              const distStr = meta && meta.cumulativeDistance !== undefined ? `${meta.cumulativeDistance.toFixed(2)} mi` : "";

              if (context.dataset.label === "RPM") {
                return `${context.formattedValue} RPM ${distStr}`;
              }
              return `${context.formattedValue} knots ${distStr}`;
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
