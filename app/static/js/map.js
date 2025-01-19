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

    // Clear all existing polylines from the map
    map.eachLayer(layer => {
        if (layer instanceof L.Polyline) {
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
