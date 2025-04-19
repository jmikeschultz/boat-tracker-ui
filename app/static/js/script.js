import { loadData } from "./api.js";

function formatDate(yyyymmdd) {
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6)}`;
}

document.addEventListener("DOMContentLoaded", () => {
  const fromInput = document.getElementById("from-date");
  const toInput = document.getElementById("to-date");
  const loadButton = document.getElementById("load-button");

  const params = new URLSearchParams(window.location.search);
  const fromParam = params.get("from");
  const toParam = params.get("to");

  if (fromInput && toInput) {
    if (fromParam && toParam) {
      // If URL params exist, use them
      fromInput.value = formatDate(fromParam);
      toInput.value = formatDate(toParam);
    } else {
      // Fallback to default range: past 7 days
      const today = new Date();
      const toDate = today.toLocaleDateString("en-CA"); // YYYY-MM-DD

      const weekAgo = new Date(today);
      weekAgo.setDate(today.getDate() - 7);
      const fromDate = weekAgo.toLocaleDateString("en-CA");

      fromInput.value = fromDate;
      toInput.value = toDate;
    }

    // Always call loadData after values are set
    loadData();
  }

  if (loadButton) {
    loadButton.addEventListener("click", loadData);
    console.log("Load button event listener attached.");
  }
});
