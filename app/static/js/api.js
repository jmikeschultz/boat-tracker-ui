import { updateSpeedGraph } from "./graph.js";
import { updateMap, clearGraphAndMap } from "./map.js";

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
        console.log("Received positions:", data.positions);

        if (data.positions && data.positions.length > 0) {
            updateSpeedGraph(data.positions);
            updateMap(data.positions);
        } else {
            console.warn("No positions available for the selected range.");
            clearGraphAndMap();
        }
    } catch (error) {
        console.error("Error fetching positions:", error);
    }
}
