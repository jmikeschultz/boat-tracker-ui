// api.js
import { updateSpeedGraph } from "./graph.js";
import { updateMap, clearGraphAndMap } from "./map.js";
import { SEGMENT_COLORS } from "./constants.js";

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

let yearlyData = null;
let currentYearStartTs = 0;
let currentYearEndTs = 0;
let timelineChart = null;

function renderTimelineChart(positions, startTs, endTs) {
  const canvas = document.getElementById("timeline-chart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  
  if (timelineChart) {
    timelineChart.destroy();
  }

  // Create 365 daily bins
  const dailySpeeds = new Array(365).fill(0);
  for (const pos of positions) {
    const dayIdx = Math.floor((pos.utc_shifted_tstamp - startTs) / 86400);
    if (dayIdx >= 0 && dayIdx < 365) {
      const speedKnots = pos.knots || 0;
      const cappedSpeed = Math.min(speedKnots, 6.0);
      dailySpeeds[dayIdx] = Math.max(dailySpeeds[dayIdx], cappedSpeed);
    }
  }

  const labels = new Array(365).fill("");

  timelineChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          data: dailySpeeds,
          borderColor: "#0074d9",
          borderWidth: 1.5,
          fill: true,
          backgroundColor: "rgba(0, 116, 217, 0.08)",
          pointRadius: 0,
          tension: 0.3,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false },
      },
      scales: {
        x: { display: false },
        y: { display: false, min: 0 },
      },
    },
  });
}

function findDefaultActiveWindow(positions, segments, startTs, endTs) {
  // Find the latest position with speed >= 3.0 mph
  const activePositions = positions.filter(p => (p.mph || 0) >= 3.0);
  
  let targetTs;
  if (activePositions.length > 0) {
    const latestActive = activePositions[activePositions.length - 1];
    targetTs = latestActive.utc_shifted_tstamp;
  } else {
    // Fallback: use the latest recorded position
    const lastPos = positions[positions.length - 1];
    targetTs = lastPos ? lastPos.utc_shifted_tstamp : endTs;
  }

  // Focus window is 7 days
  let focusEnd = targetTs;
  let focusStart = targetTs - 7 * 86400;

  // Clip within year boundaries
  if (focusStart < startTs) {
    focusStart = startTs;
    focusEnd = startTs + 7 * 86400;
  }
  if (focusEnd > endTs) {
    focusEnd = endTs;
    focusStart = endTs - 7 * 86400;
  }

  return { focusStart, focusEnd };
}

export async function loadYearData(year, customStartTs = null, customEndTs = null) {
  try {
    console.log(`Fetching year data for ${year}...`);
    const response = await fetch(`/positions/year?year=${year}`);
    const data = await response.json();

    if (data.segments && data.segments.length > 0) {
      data.segments.forEach((segment) => {
        const globalIdx = segment[0].global_segment_index || 1;
        const colorIdx = globalIdx - 1;
        const color = SEGMENT_COLORS[colorIdx % SEGMENT_COLORS.length];
        segment.forEach(pos => {
          pos._segmentIndex = globalIdx;
          pos._segmentColor = color;
        });
      });
    }

    yearlyData = data;
    currentYearStartTs = data.from_timestamp;
    currentYearEndTs = data.to_timestamp;

    if (data.positions && data.positions.length > 0) {
      renderTimelineChart(data.positions, currentYearStartTs, currentYearEndTs);

      let focusStart, focusEnd;
      if (customStartTs !== null && customEndTs !== null) {
        focusStart = customStartTs;
        focusEnd = customEndTs;
      } else {
        const defaultWindow = findDefaultActiveWindow(
          data.positions,
          data.segments,
          currentYearStartTs,
          currentYearEndTs
        );
        focusStart = defaultWindow.focusStart;
        focusEnd = defaultWindow.focusEnd;
      }

      // Call global window initialization provided by script.js
      if (typeof window.initBrushWindow === "function") {
        window.initBrushWindow(focusStart, focusEnd, currentYearStartTs, currentYearEndTs);
      } else {
        updateFocusedWindow(focusStart, focusEnd);
      }
    } else {
      console.warn("No positions available for the selected year.");
      clearGraphAndMap();
      if (timelineChart) {
        timelineChart.destroy();
        timelineChart = null;
      }
      if (typeof window.resetBrushWindow === "function") {
        window.resetBrushWindow();
      }
      const rangeDisplay = document.getElementById("date-range-display");
      if (rangeDisplay) {
        rangeDisplay.textContent = "--";
      }
    }
  } catch (error) {
    console.error(`Error loading year data:`, error);
  }
}

export function updateFocusedWindow(startTs, endTs) {
  if (!yearlyData || !yearlyData.segments) return;

  const filteredSegments = [];
  yearlyData.segments.forEach(seg => {
    const inRange = seg.filter(p => p.utc_shifted_tstamp >= startTs && p.utc_shifted_tstamp <= endTs);
    if (inRange.length > 0) {
      filteredSegments.push(inRange);
    }
  });

  const flattened = filteredSegments.flat();

  updateMap(flattened);
  updateSpeedGraph(flattened, filteredSegments);

  // Update date range display
  const rangeDisplay = document.getElementById("date-range-display");
  if (rangeDisplay) {
    const formatDate = (ts) => {
      const d = new Date(ts * 1000);
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const month = months[d.getUTCMonth()];
      const day = d.getUTCDate();
      const year = d.getUTCFullYear();
      return `${month} ${day}, ${year}`;
    };
    rangeDisplay.textContent = `${formatDate(startTs)} - ${formatDate(endTs)}`;
  }
}
