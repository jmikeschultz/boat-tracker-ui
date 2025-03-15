let map; // Store the map instance globally

export function updateMap(positions) {
    const mapContainer = document.getElementById("map");

    // Initialize the map only once
    if (!map) {
        map = L.map("map").setView([positions[0].latitude, positions[0].longitude], 13);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "© OpenStreetMap contributors",
        }).addTo(map);
    }

    // Clear all existing polylines and markers
    map.eachLayer(layer => {
        if (layer instanceof L.Marker || layer instanceof L.Polyline) {
            map.removeLayer(layer);
        }
    });

    // Extract latitude and longitude from positions
    const latLngs = positions.map(pos => [pos.latitude, pos.longitude]);

    // Add a single polyline for the route
    if (latLngs.length > 1) {
        const polyline = L.polyline(latLngs, { color: "blue", weight: 4 }).addTo(map);
        map.fitBounds(polyline.getBounds(), { padding: [50, 50] });
    } else {
        console.warn("Not enough points to draw a route.");
    }

    // ✅ Find locations where boat stayed for more than 15 minutes
    const minDuration = 900; // 900 seconds (15 minutes)
    let groupedPoints = [];
    let currentGroup = null;

    positions.forEach((pos, index) => {
        const lat = pos.latitude;
        const lon = pos.longitude;
        const timestamp = pos.utc_shifted_tstamp;

        if (
            currentGroup &&
            lat === currentGroup.lat &&
            lon === currentGroup.lon
        ) {
            // Update the group's end time
            currentGroup.endTime = timestamp;
        } else {
            // If we have a previous group, save it before starting a new one
            if (currentGroup) {
                groupedPoints.push(currentGroup);
            }

            // Start a new group
            currentGroup = {
                lat,
                lon,
                startTime: timestamp,
                endTime: timestamp
            };
        }
    });

    // Save the last group
    if (currentGroup) {
        groupedPoints.push(currentGroup);
    }

    // ✅ Add markers for locations where time spent is ≥ 15 minutes
    groupedPoints.forEach(group => {
        const duration = group.endTime - group.startTime; // Duration in seconds

        if (duration >= minDuration) {
            const durationText = `${Math.round(duration / 60)} min`;

            L.marker([group.lat, group.lon])
                .bindPopup(
                    `Time Spent: ${durationText}<br>First: ${new Date(group.startTime * 1000).toLocaleString()}<br>Last: ${new Date(group.endTime * 1000).toLocaleString()}`
                )
                .addTo(map);
        }
    });
}

export function clearGraphAndMap() {
    const ctx = document.getElementById("speed-graph").getContext("2d");
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    if (map) {
        // Clear all markers and polylines from the map
        map.eachLayer(layer => {
            if (layer instanceof L.Marker || layer instanceof L.Polyline) {
                map.removeLayer(layer);
            }
        });
    }
}
