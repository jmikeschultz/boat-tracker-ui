import { loadData } from "./api.js";

document.addEventListener("DOMContentLoaded", () => {
    const button = document.getElementById("load-button");
    const fromDateInput = document.getElementById("from-date");
    const toDateInput = document.getElementById("to-date");

    if (!fromDateInput || !toDateInput) {
        console.error("Date inputs not found!");
        return;
    }

    // Set default values to today's date in local time
    const today = new Date();
    const localDate = today.toLocaleDateString("en-CA"); // Format: YYYY-MM-DD
    fromDateInput.value = localDate;
    toDateInput.value = localDate;

    // Automatically load data for today's date range on page load
    loadData();

    if (button) {
        button.addEventListener("click", loadData);
        console.log("Load button event listener attached.");
    } else {
        console.error("Load button not found");
    }
});
