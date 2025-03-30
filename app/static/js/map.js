import { highlightGraphPoint } from "./graph.js";

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

    // Build polyline segments
    const MAX_TIME_GAP = 300; // seconds
    const MAX_DISTANCE_GAP = 1.0; // miles

    const SEGMENT_COLORS = [
	"#0074D9", // blue
	"#2ECC40", // green
	"#B10DC9", // purple
	"#FF851B", // orange
	"#FF4136", // red
    ];

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

    for (let i = 0; i < positions.length; i++) {
	const pos = positions[i];
	const latLng = [pos.latitude, pos.longitude];

	if (i === 0) {
            currentSegment.push(latLng);
            continue;
	}

	const prev = positions[i - 1];
	const timeGap = pos.utc_shifted_tstamp - prev.utc_shifted_tstamp;
	const distanceGap = calculateDistance(
            pos.latitude, pos.longitude,
            prev.latitude, prev.longitude
	);

	if (timeGap > MAX_TIME_GAP || distanceGap > MAX_DISTANCE_GAP) {
            if (currentSegment.length > 1) {
		segments.push(currentSegment);
            }
            currentSegment = [latLng];
	} else {
            currentSegment.push(latLng);
	}
    }

    if (currentSegment.length > 1) {
	segments.push(currentSegment);
    }

    // Draw each segment with a rotating color
    segments.forEach((segment, index) => {
	const color = SEGMENT_COLORS[index % SEGMENT_COLORS.length];
	L.polyline(segment, { color, weight: 4 }).addTo(map);
    });

    // Fit the map to all visible points
    if (segments.length > 0) {
	const allPoints = segments.flat();
	const bounds = L.latLngBounds(allPoints);
	map.fitBounds(bounds, { padding: [50, 50] });
    }

    // Idle point grouping
    const minDuration = 900;
    let groupedPoints = [];
    let currentGroup = null;

    positions.forEach((pos) => {
        const { latitude: lat, longitude: lon, utc_shifted_tstamp: timestamp } = pos;

        if (currentGroup && lat === currentGroup.lat && lon === currentGroup.lon) {
            currentGroup.endTime = timestamp;
        } else {
            if (currentGroup) groupedPoints.push(currentGroup);
            currentGroup = { lat, lon, startTime: timestamp, endTime: timestamp };
        }
    });

    if (currentGroup) groupedPoints.push(currentGroup);

    groupedPoints.forEach(group => {
        const duration = group.endTime - group.startTime;
        if (duration >= minDuration) {
            const durationText = `${Math.round(duration / 60)} min`;
            L.marker([group.lat, group.lon])
                .bindPopup(
                    `Time Spent: ${durationText}<br>First: ${new Date(group.startTime * 1000).toLocaleString()}<br>Last: ${new Date(group.endTime * 1000).toLocaleString()}`
                )
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
