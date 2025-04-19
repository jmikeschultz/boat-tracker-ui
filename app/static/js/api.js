// api.js
import { updateSpeedGraph } from "./graph.js";
import { updateMap, clearGraphAndMap } from "./map.js";
import { segmentPositions } from "./shared/data.js";
import { SEGMENT_MAX_GAP_SECS, SEGMENT_MAX_GAP_MILES, SEGMENT_COLORS } from "./constants.js";

export async function updateEngineHours() {
  try {
    console.log("Fetching latest engine hours...");
    const response = await fetch("/engine-hours/latest");
    const data = await response.json();
    console.log("API response:", data);

    if (data.engine_hours !== null && data.engine_hours !== undefined) {
      document.getElementById("engine-hours").textContent = data.engine_hours;
    } else {
      console.warn("No engine hours data available.");
    }
  } catch (error) {
    console.error("Failed to fetch engine hours:", error);
  }
}

export async function loadData() {
  console.log("loadData function triggered");

  const fromDateInput = document.getElementById("from-date").value;
  const toDateInput = document.getElementById("to-date").value;

  if (!fromDateInput || !toDateInput) {
    console.error("Missing from_date or to_date");
    return;
  }

  const fromDate = fromDateInput.replace(/-/g, "");
  const toDate = toDateInput.replace(/-/g, "");

  console.log("From Date (YYYYMMDD):", fromDate);
  console.log("To Date (YYYYMMDD):", toDate);

  try {
    const response = await fetch(`/positions?from_date=${fromDate}&to_date=${toDate}`);
    const data = await response.json();
    console.log("from_timestamp:", data.from_timestamp);
    console.log("to_timestamp:", data.to_timestamp);

    if (data.positions && data.positions.length > 0) {
      const segments = segmentPositions(data.positions, SEGMENT_MAX_GAP_SECS, SEGMENT_MAX_GAP_MILES);
      segments.forEach((segment, index) => {
        const color = SEGMENT_COLORS[index % SEGMENT_COLORS.length];
        segment.forEach(pos => {
          pos._segmentIndex = index;
          pos._segmentColor = color;
        });
      });

      const flattened = segments.flat();

      updateMap(flattened);
      updateSpeedGraph(flattened, segments);
    } else {
      console.warn("No positions available for the selected range.");
      clearGraphAndMap();
    }
  } catch (error) {
    console.error("Error fetching positions:", error);
  }
}
