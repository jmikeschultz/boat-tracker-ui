import { loadData } from "./api.js";

document.addEventListener("DOMContentLoaded", () => {
    const button = document.getElementById("load-button");

    if (!button) {
        console.error("Load button not found!");
        return;
    }

    button.addEventListener("click", loadData);
    console.log("Load button event listener added.");
});
