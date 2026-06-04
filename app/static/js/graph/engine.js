// graph/engine.js
import { SEGMENT_COLORS } from "../constants.js";
import { createChart } from "./chart.js";

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 3958.8; // Radius of the Earth in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function getSegmentDayKey(seg) {
  const d = new Date(seg[0].utc_shifted_tstamp * 1000);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

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
 
     let cumulativeDist = 0.0;
 
     for (let idx = 0; idx < segment.length; idx++) {
       const pos = segment[idx];
       if (idx > 0) {
         const prev = segment[idx - 1];
         cumulativeDist += haversineDistance(prev.latitude, prev.longitude, pos.latitude, pos.longitude);
       }
 
       const relX = offset + ((pos.utc_shifted_tstamp - segStart) / segDuration) * width;
       const meta = {
         timestamp: pos.utc_shifted_tstamp,
         localTime: pos.local_time,
         segmentIndex: pos._segmentIndex || segment[0]._segmentIndex,
         cumulativeDistance: cumulativeDist
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
