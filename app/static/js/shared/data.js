// shared/data.js
export function segmentPositions(positions, maxGapSecs, maxGapMiles) {
  const segments = [];
  let currentSegment = [];
  let prev = null;

  for (const pos of positions) {
    if (!prev) {
      currentSegment.push(pos);
      prev = pos;
      continue;
    }

    const timeGap = pos.utc_shifted_tstamp - prev.utc_shifted_tstamp;
    const distGap = calculateDistance(
      pos.latitude, pos.longitude,
      prev.latitude, prev.longitude
    );

    if (timeGap > maxGapSecs || distGap > maxGapMiles) {
      if (currentSegment.length > 0) segments.push(currentSegment);
      currentSegment = [pos];
    } else {
      currentSegment.push(pos);
    }

    prev = pos;
  }

  if (currentSegment.length > 0) segments.push(currentSegment);

  return segments;
}

export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 3958.8; // Earth radius in miles
  const toRad = deg => deg * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function parseLocalTimestamp(localTimeStr) {
  const [datePart, timePart] = localTimeStr.split(" ");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute, secondFraction] = timePart.split(":");
  const [second, ms = "0"] = secondFraction.split(".");
  return new Date(
    year, month - 1, day,
    Number(hour), Number(minute), Number(second), Number(ms.slice(0, 3))
  ).getTime();
}
