// map.js
import { highlightGraphPoint } from "./graph/index.js";
import { SEGMENT_COLORS, IDLE_MIN_SECS, ANIMATION_SPEED_FACTOR } from "./constants.js";

let map;
let highlightMarker = null;

export function updateMap(positions) {
  const segmentGroups = new Map();
  positions.forEach(pos => {
    if (!segmentGroups.has(pos._segmentIndex)) {
      segmentGroups.set(pos._segmentIndex, []);
    }
    segmentGroups.get(pos._segmentIndex).push(pos);
  });

  const mapContainer = document.getElementById("map");

  if (!map) {
    map = L.map("map").setView([positions[0].latitude, positions[0].longitude], 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(map);
  }

  map.eachLayer(layer => {
    if (
      layer instanceof L.Marker ||
      layer instanceof L.Polyline ||
      layer instanceof L.CircleMarker
    ) {
      map.removeLayer(layer);
    }
  });

  [...segmentGroups.entries()].forEach(([segmentIndex, segment]) => {
    const color = SEGMENT_COLORS[segmentIndex % SEGMENT_COLORS.length];
    const latLngs = segment.map(pos => [pos.latitude, pos.longitude]);
    L.polyline(latLngs, { color, weight: 4 }).addTo(map);

    const startCoord = latLngs[0];

    const playDiv = document.createElement("div");
    playDiv.className = "play-button-icon";
    playDiv.innerText = "▶️";

    const playIcon = L.divIcon({
      html: playDiv,
      className: "",
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });

    const playMarker = L.marker(startCoord, { icon: playIcon }).addTo(map);
    playMarker.on("click", () => animateSegment(`segment-${segmentIndex}`, segment, playDiv, segmentIndex));
  });

  if (positions.length > 0) {
    const allPoints = positions.map(p => [p.latitude, p.longitude]);
    const bounds = L.latLngBounds(allPoints);
    map.fitBounds(bounds, { padding: [50, 50] });
  }

  positions.forEach((pos) => {
    const { latitude: lat, longitude: lon, duration_secs, local_time } = pos;
    if (duration_secs >= IDLE_MIN_SECS) {
      const [year, month, day] = local_time.slice(0, 10).split("-");
      const dateOnly = `${month.padStart(2, "0")}/${day.padStart(2, "0")}/${year}`;
      const timeOnly = local_time.slice(11, 19);
      const durationStr = `${String(Math.floor(duration_secs / 3600)).padStart(2, "0")}:${String(Math.floor((duration_secs % 3600) / 60)).padStart(2, "0")}:${String(Math.floor(duration_secs % 60)).padStart(2, "0")}`;

      L.marker([lat, lon])
        .bindPopup(`${dateOnly} ${timeOnly}<br>duration: ${durationStr}`)
        .addTo(map);
    }
  });

  map.on("moveend", () => {
    const bounds = map.getBounds();
    const visiblePositions = positions.filter(pos =>
      bounds.contains([pos.latitude, pos.longitude])
    );

    import("./graph/index.js").then(({ updateSpeedGraphFromMap }) => {
      updateSpeedGraphFromMap(visiblePositions);
    });
  });

  positions.forEach((pos) => {
    const marker = L.circleMarker([pos.latitude, pos.longitude], {
      radius: 8,
      color: "transparent",
      fillColor: "transparent",
      fillOpacity: 0,
      weight: 0,
    }).addTo(map);

    marker.on("mouseover", () => {
      highlightGraphPoint(pos.utc_shifted_tstamp);
      highlightMapPoint(pos.latitude, pos.longitude);
    });

    marker.on("mouseout", () => {
      clearHighlightMarker();
    });
  });
}

export function highlightMapPoint(lat, lon) {
  if (highlightMarker) {
    highlightMarker.remove();
  }
  highlightMarker = L.circleMarker([lat, lon], {
    radius: 8,
    color: "orange",
    fillColor: "orange",
    fillOpacity: 0.7,
  }).addTo(map);
}

export function clearHighlightMarker() {
  if (highlightMarker) {
    highlightMarker.remove();
    highlightMarker = null;
  }
}

export function clearGraphAndMap() {
  const ctx = document.getElementById("speed-graph").getContext("2d");
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  if (map) {
    map.eachLayer(layer => {
      if (
        layer instanceof L.Marker ||
        layer instanceof L.Polyline ||
        layer instanceof L.CircleMarker
      ) {
        map.removeLayer(layer);
      }
    });
  }
}

const segmentAnimations = new Map();

function animateSegment(segmentId, positions, playButton, segmentIndex) {
  if (segmentAnimations.has(segmentId)) {
    const { marker, frame } = segmentAnimations.get(segmentId);
    cancelAnimationFrame(frame);
    map.removeLayer(marker);
    segmentAnimations.delete(segmentId);
    playButton.innerText = "▶️";
    return;
  }

  const marker = L.circleMarker([positions[0].latitude, positions[0].longitude], {
    radius: 6,
    color: 'orange',
    fillColor: 'orange',
    fillOpacity: 1,
  }).addTo(map);

  playButton.innerText = "⏸️";

  let i = 0;
  let frame;

  function moveNext() {
    if (i >= positions.length - 1) {
      map.removeLayer(marker);
      segmentAnimations.delete(segmentId);
      playButton.innerText = "▶️";
      return;
    }

    const start = positions[i];
    const end = positions[i + 1];

    const realDuration = (end.utc_shifted_tstamp - start.utc_shifted_tstamp) * 1000;
    const duration = realDuration / ANIMATION_SPEED_FACTOR;
    const startTime = performance.now();

    function step(now) {
      const progress = Math.min((now - startTime) / duration, 1);
      const lat = start.latitude + (end.latitude - start.latitude) * progress;
      const lng = start.longitude + (end.longitude - start.longitude) * progress;
      const tstamp = start.utc_shifted_tstamp + (end.utc_shifted_tstamp - start.utc_shifted_tstamp) * progress;

      marker.setLatLng([lat, lng]);
      highlightGraphPoint(tstamp);

      if (progress < 1) {
        frame = requestAnimationFrame(step);
        segmentAnimations.set(segmentId, { marker, frame });
      } else {
        i++;
        moveNext();
      }
    }

    frame = requestAnimationFrame(step);
    segmentAnimations.set(segmentId, { marker, frame });
  }

  moveNext();
}
