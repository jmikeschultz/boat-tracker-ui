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

    // Clear all existing layers (e.g., markers, polylines)
    map.eachLayer(layer => {
        if (layer instanceof L.Marker || layer instanceof L.Polyline) {
            map.removeLayer(layer);
        }
    });

    // Add new markers and paths for the current positions
    positions.forEach(pos => {
        L.marker([pos.latitude, pos.longitude]).addTo(map)
            .bindPopup(`Speed: ${pos.speed || "N/A"} knots`);
    });

    const latLngs = positions.map(pos => [pos.latitude, pos.longitude]);
    if (latLngs.length > 1) {
        L.polyline(latLngs, { color: "blue" }).addTo(map);
        map.fitBounds(latLngs, { padding: [50, 50] });
    }
}

export function clearGraphAndMap() {
    const ctx = document.getElementById("speed-graph").getContext("2d");
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    if (map) {
        map.eachLayer(layer => {
            if (layer instanceof L.Marker || layer instanceof L.Polyline) {
                map.removeLayer(layer);
            }
        });
    }
}
