import { highlightGraphPoint } from "./graph.js";
import { SEGMENT_MAX_GAP_SECS, SEGMENT_MAX_GAP_MILES, SEGMENT_COLORS, IDLE_MIN_SECS, ANIMATION_SPEED_FACTOR } from "./constants.js";
let map;
let highlightMarker = null;

export function updateMap(positions) {
    console.log("Loaded", positions.length, "positions");
    const mapContainer = document.getElementById("map");

    if (!map) {
        map = L.map("map").setView([positions[0].latitude, positions[0].longitude], 13);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "© OpenStreetMap contributors",
        }).addTo(map);
    }

    // Clear old markers and polylines
    map.eachLayer(layer => {
        if (
            layer instanceof L.Marker ||
            layer instanceof L.Polyline ||
            layer instanceof L.CircleMarker
        ) {
            map.removeLayer(layer);
        }
    });

    // Reuse the haversine distance function from your Python backend
    function calculateDistance(lat1, lon1, lat2, lon2) {
	const R = 3958.8; // miles
	const toRad = (deg) => deg * (Math.PI / 180);
	const dLat = toRad(lat2 - lat1);
	const dLon = toRad(lon2 - lon1);
	const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
              Math.sin(dLon / 2) ** 2;
	return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    let segments = [];
    let currentSegment = [];
    let prev = null;

    for (let i = 0; i < positions.length; i++) {
	const pos = positions[i];
	const latLng = [pos.latitude, pos.longitude];

	if (!prev) {
            // First point
            currentSegment.push(latLng);
            prev = pos;
            continue;
	}

	const timeGap = pos.utc_shifted_tstamp - prev.utc_shifted_tstamp;
	const distanceGap = calculateDistance(
            pos.latitude, pos.longitude,
            prev.latitude, prev.longitude
	);

	if (timeGap > SEGMENT_MAX_GAP_SECS || distanceGap > SEGMENT_MAX_GAP_MILES) {
            if (currentSegment.length > 1) {
		segments.push(currentSegment);
            }
            currentSegment = [latLng];
	} else {
            currentSegment.push(latLng);
	}

	prev = pos;
    }

    if (currentSegment.length > 0) {
	segments.push(currentSegment);
    }

    // Draw each segment with a rotating color
    segments.forEach((segment, index) => {
	const color = SEGMENT_COLORS[index % SEGMENT_COLORS.length];
	L.polyline(segment, { color, weight: 4 }).addTo(map);

	const segmentId = `segment-${index}`;

	// Use the first and last points to find matching full-position objects
	const startCoord = segment[0];
	const segmentPositions = positions.filter(pos =>
            segment.some(coord =>
		Math.abs(coord[0] - pos.latitude) < 0.00001 &&
		    Math.abs(coord[1] - pos.longitude) < 0.00001
            )
	);

	// Create a custom button
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
	playMarker.on("click", () => animateSegment(segmentId, segmentPositions, playDiv));
    });

    // Fit the map to all visible points
    if (segments.length > 0) {
	const allPoints = segments.flat();
	const bounds = L.latLngBounds(allPoints);
	map.fitBounds(bounds, { padding: [50, 50] });
    }


    // Set pins at idle positions
    positions.forEach((pos) => {
	const { latitude: lat, longitude: lon, duration_secs, local_time } = pos;

	if (duration_secs >= 900) {
            const [year, month, day] = local_time.slice(0, 10).split("-");
	    const dateOnly = `${month.padStart(2, "0")}/${day.padStart(2, "0")}/${year}`; // MM/DD/YYYY
            const timeOnly = local_time.slice(11, 19); // HH:MM:SS
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

        import("./graph.js").then(({ updateSpeedGraphFromMap }) => {
            updateSpeedGraphFromMap(visiblePositions);
        });
    });

    // Add invisible hover markers for map → graph sync
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

// Highlight circle from graph hover
export function highlightMapPoint(lat, lon) {
    if (highlightMarker) {
        highlightMarker.remove();
    }

    highlightMarker = L.circleMarker([lat, lon], {
        radius: 8,
        color: 'orange',
        fillColor: 'orange',
        fillOpacity: 0.7,
    }).addTo(map);
}

// Remove the orange highlight
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


const segmentAnimations = new Map(); // Track active animations per segment

function animateSegment(segmentId, positions, playButton) {
    // Cancel existing animation if running
    if (segmentAnimations.has(segmentId)) {
        const { marker, frame } = segmentAnimations.get(segmentId);
        cancelAnimationFrame(frame);
        map.removeLayer(marker);
        segmentAnimations.delete(segmentId);
        playButton.innerText = "▶️";
        return;
    }

    // Create the marker
    const marker = L.circleMarker([positions[0].latitude, positions[0].longitude], {
        radius: 6,
        color: 'orange',
        fillColor: 'orange',
        fillOpacity: 1,
    }).addTo(map);

    playButton.innerText = "⏸️"; // Switch to pause icon

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

        const realDuration = (end.utc_shifted_tstamp - start.utc_shifted_tstamp) * 1000; // ms
        const duration = realDuration / ANIMATION_SPEED_FACTOR;

        const startTime = performance.now();

        function step(now) {
            const progress = Math.min((now - startTime) / duration, 1);
            const lat = start.latitude + (end.latitude - start.latitude) * progress;
            const lng = start.longitude + (end.longitude - start.longitude) * progress;
            const tstamp = start.utc_shifted_tstamp + (end.utc_shifted_tstamp - start.utc_shifted_tstamp) * progress;

            marker.setLatLng([lat, lng]);

            // Trigger graph highlight
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
