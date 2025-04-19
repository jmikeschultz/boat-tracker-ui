// graph/events.js
import { highlightMapPoint } from "../map.js";

export function setupGraphHover(chart, positions) {
  const canvas = document.getElementById("speed-graph");

  if (!canvas) {
    console.error("Canvas element not found.");
    return;
  }

  canvas.addEventListener("mousemove", (event) => {
    if (!chart || typeof chart.getElementsAtEventForMode !== "function") {
      console.error("Chart not ready or missing hover API.");
      return;
    }

    let points;
    try {
      points = chart.getElementsAtEventForMode(
        event,
        "nearest",
        { intersect: false },
        false
      );
    } catch (err) {
      console.error("Chart.js internal hover failure:", err);
      return;
    }

    if (!points || points.length === 0) return;

    const { datasetIndex, index } = points[0];
    const dataset = chart.data.datasets[datasetIndex];
    const point = dataset?.data?.[index];

    console.log("[hover] datasetIndex:", datasetIndex, "index:", index, "point:", point);

    const timestamp = point?.meta?.timestamp;
    if (!timestamp) return;

    const match = positions.find(p =>
      Math.abs(p.utc_shifted_tstamp - timestamp) < 1
    );

    if (match) {
      highlightMapPoint(match.latitude, match.longitude);
    }
  });

  canvas.addEventListener("mouseleave", () => {
    import("../map.js").then(({ clearHighlightMarker }) => {
      clearHighlightMarker();
    });
  });
}
