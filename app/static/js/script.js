import { loadYearData, updateFocusedWindow } from "./api.js";

function tsToYYYYMMDD(ts) {
  const d = new Date(ts * 1000);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function yyyymmddToTs(str, isEndOfDay = false) {
  if (!str || str.length !== 8) return null;
  const year = parseInt(str.substring(0, 4));
  const month = parseInt(str.substring(4, 6)) - 1;
  const day = parseInt(str.substring(6, 8));
  const d = new Date(Date.UTC(year, month, day, isEndOfDay ? 23 : 0, isEndOfDay ? 59 : 0, isEndOfDay ? 59 : 0));
  return Math.round(d.getTime() / 1000);
}


document.addEventListener("DOMContentLoaded", () => {
  const yearSelect = document.getElementById("year-select");
  const timelineContainer = document.getElementById("timeline-container");
  const brushWindow = document.getElementById("brush-window");
  const leftHandle = document.querySelector(".left-handle");
  const rightHandle = document.querySelector(".right-handle");

  if (!yearSelect || !timelineContainer || !brushWindow) {
    console.error("Missing timeline elements in DOM");
    return;
  }

  // Drag state
  let isDragging = false;
  let isResizingLeft = false;
  let isResizingRight = false;
  let startX = 0;
  let startLeft = 0;
  let startWidth = 0;

  // Slider coordinates in percentages (0 to 100)
  let brushLeft = 0;
  let brushWidth = 0;

  // Active year timestamps
  let currentYearStart = 0;
  let currentYearEnd = 0;

  // Helper to extract X position across Mouse/Touch events
  function getClientX(e) {
    if (e.touches && e.touches.length > 0) {
      return e.touches[0].clientX;
    }
    return e.clientX;
  }

  // Global hooks for api.js to initialize/update the slider
  window.initBrushWindow = (focusStart, focusEnd, yearStart, yearEnd) => {
    currentYearStart = yearStart;
    currentYearEnd = yearEnd;

    const range = yearEnd - yearStart;
    brushLeft = ((focusStart - yearStart) / range) * 100;
    brushWidth = ((focusEnd - focusStart) / range) * 100;

    brushWindow.style.left = brushLeft + "%";
    brushWindow.style.width = brushWidth + "%";
    brushWindow.style.display = "block";

    // Set URL query parameters
    const url = new URL(window.location);
    url.searchParams.set("year", yearSelect.value);
    url.searchParams.set("start", tsToYYYYMMDD(focusStart));
    url.searchParams.set("end", tsToYYYYMMDD(focusEnd));
    window.history.replaceState({}, "", url);

    updateFocusedWindow(focusStart, focusEnd);
  };

  window.resetBrushWindow = () => {
    brushWindow.style.display = "none";
    brushLeft = 0;
    brushWidth = 0;
  };

  // 1. Dragging the whole window
  const onDragStart = (e) => {
    if (e.target.classList.contains("brush-handle")) return;
    isDragging = true;
    startX = getClientX(e);
    startLeft = brushLeft;
    // Don't call preventDefault for touchstart as it can block scrolling on mobile
    if (e.type === "mousedown") e.preventDefault();
  };

  brushWindow.addEventListener("mousedown", onDragStart);
  brushWindow.addEventListener("touchstart", onDragStart, { passive: true });

  // 2. Resizing Left Handle
  const onLeftResizeStart = (e) => {
    isResizingLeft = true;
    startX = getClientX(e);
    startLeft = brushLeft;
    startWidth = brushWidth;
    if (e.type === "mousedown") e.preventDefault();
    e.stopPropagation();
  };

  leftHandle.addEventListener("mousedown", onLeftResizeStart);
  leftHandle.addEventListener("touchstart", onLeftResizeStart, { passive: true });

  // 3. Resizing Right Handle
  const onRightResizeStart = (e) => {
    isResizingRight = true;
    startX = getClientX(e);
    startWidth = brushWidth;
    if (e.type === "mousedown") e.preventDefault();
    e.stopPropagation();
  };

  rightHandle.addEventListener("mousedown", onRightResizeStart);
  rightHandle.addEventListener("touchstart", onRightResizeStart, { passive: true });

  // 4. Drag & Resize Movements
  const onMove = (e) => {
    if (!isDragging && !isResizingLeft && !isResizingRight) return;

    const containerWidth = timelineContainer.clientWidth;
    const deltaX = getClientX(e) - startX;
    const deltaPercent = (deltaX / containerWidth) * 100;

    if (isDragging) {
      let newLeft = startLeft + deltaPercent;
      if (newLeft < 0) newLeft = 0;
      if (newLeft + brushWidth > 100) newLeft = 100 - brushWidth;

      brushLeft = newLeft;
      brushWindow.style.left = brushLeft + "%";
      updateDateDisplayOnly();
    } else if (isResizingLeft) {
      let newLeft = startLeft + deltaPercent;
      let newWidth = startWidth - deltaPercent;

      const minWidth = 0.8; // ~3 days limit
      if (newLeft < 0) {
        newWidth += newLeft;
        newLeft = 0;
      }
      if (newWidth < minWidth) {
        const diff = minWidth - newWidth;
        newLeft -= diff;
        newWidth = minWidth;
      }

      brushLeft = newLeft;
      brushWidth = newWidth;
      brushWindow.style.left = brushLeft + "%";
      brushWindow.style.width = brushWidth + "%";
      updateDateDisplayOnly();
    } else if (isResizingRight) {
      let newWidth = startWidth + deltaPercent;

      const minWidth = 0.8; // ~3 days limit
      if (brushLeft + newWidth > 100) {
        newWidth = 100 - brushLeft;
      }
      if (newWidth < minWidth) {
        newWidth = minWidth;
      }

      brushWidth = newWidth;
      brushWindow.style.width = brushWidth + "%";
      updateDateDisplayOnly();
    }
  };

  window.addEventListener("mousemove", onMove);
  window.addEventListener("touchmove", onMove, { passive: true });

  // 5. Release handlers
  const onRelease = () => {
    if (isDragging || isResizingLeft || isResizingRight) {
      triggerUpdate();
    }
    isDragging = false;
    isResizingLeft = false;
    isResizingRight = false;
  };

  window.addEventListener("mouseup", onRelease);
  window.addEventListener("touchend", onRelease);

  function updateDateDisplayOnly() {
    if (currentYearStart === 0 || currentYearEnd === 0) return;
    const range = currentYearEnd - currentYearStart;
    const startTs = currentYearStart + (brushLeft / 100) * range;
    const endTs = currentYearStart + ((brushLeft + brushWidth) / 100) * range;

    const rangeDisplay = document.getElementById("date-range-display");
    if (rangeDisplay) {
      const formatDate = (ts) => {
        const d = new Date(ts * 1000);
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const month = months[d.getUTCMonth()];
        const day = d.getUTCDate();
        const year = d.getUTCFullYear();
        return `${month} ${day}, ${year}`;
      };
      rangeDisplay.textContent = `${formatDate(startTs)} - ${formatDate(endTs)}`;
    }
  }

  // Helper to convert percentages to timestamps and call backend slicer
  function triggerUpdate() {
    if (currentYearStart === 0 || currentYearEnd === 0) return;
    const range = currentYearEnd - currentYearStart;
    const startTs = currentYearStart + (brushLeft / 100) * range;
    const endTs = currentYearStart + ((brushLeft + brushWidth) / 100) * range;

    // Update URL query parameters on drag end
    const url = new URL(window.location);
    url.searchParams.set("year", yearSelect.value);
    url.searchParams.set("start", tsToYYYYMMDD(startTs));
    url.searchParams.set("end", tsToYYYYMMDD(endTs));
    window.history.replaceState({}, "", url);

    updateFocusedWindow(startTs, endTs);
  }

  // Bind Year dropdown selection changes
  yearSelect.addEventListener("change", () => {
    // Clear URL start/end params so it defaults to the latest active week of the new year
    const url = new URL(window.location);
    url.searchParams.set("year", yearSelect.value);
    url.searchParams.delete("start");
    url.searchParams.delete("end");
    window.history.replaceState({}, "", url);

    loadYearData(parseInt(yearSelect.value));
  });

  // Parse URL query parameters to check if year/start/end exist on load
  const params = new URLSearchParams(window.location.search);
  const urlYear = params.get("year");
  const urlStartStr = params.get("start");
  const urlEndStr = params.get("end");

  if (urlYear) {
    yearSelect.value = urlYear;
  }

  const initialYear = urlYear ? parseInt(urlYear) : parseInt(yearSelect.value);
  const initialStart = urlStartStr ? yyyymmddToTs(urlStartStr, false) : null;
  const initialEnd = urlEndStr ? yyyymmddToTs(urlEndStr, true) : null;

  loadYearData(initialYear, initialStart, initialEnd);
});
