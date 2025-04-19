// graph/index.js
import { buildGraph } from "./engine.js";
import { setupGraphHover } from "./events.js";

let chart = null;

export function updateSpeedGraph(_, segments) {
  requestAnimationFrame(() => {
    const canvasEl = document.getElementById("speed-graph");
    if (!canvasEl) {
      console.error("Canvas element not found.");
      return;
    }

    const ctx = canvasEl.getContext("2d");

    if (chart) {
      chart.destroy();
    }

    const { chart: newChart, graphPositions } = buildGraph(ctx, segments);
    chart = newChart;
    chart.canvas = canvasEl;

    setTimeout(() => {
      setupGraphHover(chart, graphPositions);
    }, 0);

    window.speedChart = chart;
  });
}

export function updateSpeedGraphFromMap(filteredPositions) {
  if (!filteredPositions.length) return;

  const grouped = new Map();
  filteredPositions.forEach(pos => {
    if (!grouped.has(pos._segmentIndex)) {
      grouped.set(pos._segmentIndex, []);
    }
    grouped.get(pos._segmentIndex).push(pos);
  });

  const segments = [...grouped.values()];
  updateSpeedGraph(filteredPositions, segments);
}

export function highlightGraphPoint(timestampSec) {
  if (!chart) return;

  const datasets = chart.data.datasets;
  const speedDatasetCount = datasets.length - 1;

  let targetIndex = -1;
  let targetDatasetIndex = -1;
  let minDiff = Infinity;

  for (let d = 0; d < speedDatasetCount; d++) {
    const data = datasets[d].data;
    for (let i = 0; i < data.length; i++) {
      const ts = data[i]?.meta?.timestamp;
      if (ts != null) {
        const diff = Math.abs(ts - timestampSec);
        if (diff < minDiff) {
          minDiff = diff;
          targetIndex = i;
          targetDatasetIndex = d;
        }
      }
    }
  }

  if (targetIndex === -1) return;

  const elements = [{ datasetIndex: targetDatasetIndex, index: targetIndex }];
  chart.setActiveElements(elements);
  chart.tooltip.setActiveElements(elements, { x: 0, y: 0 });
  chart.update();
}
