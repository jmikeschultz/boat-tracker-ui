// graph/engine.js
import { SEGMENT_COLORS } from "../constants.js";
import { createChart } from "./chart.js";

export function buildGraph(chartContext, segments) {
  console.log("[engine] received segments:", segments.length);

  const speedDatasets = [];
  const rpmData = [];

  const totalDuration = segments.reduce((acc, seg) => {
    const start = seg[0].utc_shifted_tstamp;
    const end = seg[seg.length - 1].utc_shifted_tstamp;
    return acc + (end - start);
  }, 0);

  let offset = 0;

  segments.forEach((segment, index) => {
    const segStart = segment[0].utc_shifted_tstamp;
    const segEnd = segment[segment.length - 1].utc_shifted_tstamp;
    const segDuration = segEnd - segStart;
    const width = segDuration / totalDuration;

    const segmentSpeedData = [];
    const segmentColor = segment[0]._segmentColor || SEGMENT_COLORS[segment[0]._segmentIndex % SEGMENT_COLORS.length] || "blue";

    for (const pos of segment) {
      const relX = offset + ((pos.utc_shifted_tstamp - segStart) / segDuration) * width;
      const meta = {
        timestamp: pos.utc_shifted_tstamp,
        localTime: pos.local_time,
      };
      if (typeof relX === "number" && typeof pos.knots === "number") {
        segmentSpeedData.push({ x: relX, y: pos.knots, meta });
      }
      if (typeof relX === "number" && typeof pos.rpm === "number") {
        rpmData.push({ x: relX, y: pos.rpm, meta });
      }
    }

    if (segment !== segments[segments.length - 1]) {
      const gapX = offset + width;
      segmentSpeedData.push({ x: gapX, y: null });
      rpmData.push({ x: gapX, y: null });
    }

    offset += width;

    if (segmentSpeedData.some(p => p && typeof p.x === "number" && typeof p.y === "number")) {
      console.log(`[engine] segment ${index} color:`, segmentColor, "points:", segmentSpeedData.length);
      speedDatasets.push({
        label: "Speed",
        data: segmentSpeedData,
        borderColor: segmentColor,
        borderWidth: 2,
        fill: false,
        yAxisID: "ySpeed",
        pointRadius: 0,
        spanGaps: false,
        elements: {
          point: {
            radius: 0,
            hitRadius: 10,
            hoverRadius: 4
          }
        }
      });
    }
  });

  const maxSpeed = Math.max(...segments.flat().map(p => p.knots || 0), 10);
  const maxRPM = Math.max(...segments.flat().map(p => p.rpm || 0), 2000);

  return createChart(chartContext, speedDatasets, rpmData, maxSpeed, maxRPM, segments.flat());
}
