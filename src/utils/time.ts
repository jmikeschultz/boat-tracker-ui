/**
 * Converts a tz_offset string (e.g., "UTC-05:00") into total offset in seconds.
 * @param tz_offset - The time zone offset string (e.g., "UTC-05:00").
 * @returns The total offset in seconds.
 */
export const calculateTotalOffsetSecs = (tz_offset: string): number => {
  const match = tz_offset.match(/UTC([+-])(\d{2}):(\d{2})/);
  if (!match) {
    throw new Error(`Invalid tz_offset format: ${tz_offset}`);
  }

  const sign = match[1] === "+" ? 1 : -1;
  const hours = parseInt(match[2], 10);
  const minutes = parseInt(match[3], 10);

  return sign * (hours * 3600 + minutes * 60); // Convert to seconds
};

/**
 * Formats a timestamp with a tz_offset into a human-readable string.
 * @param timestamp - The timestamp in seconds (UTC).
 * @param tz_offset - The time zone offset string (e.g., "UTC-05:00").
 * @returns The formatted timestamp string.
 */
export const formatTimestamp = (timestamp: number, tz_offset: string | undefined): string => {
  if (!tz_offset) {
    return "Unknown";
  }

  try {
    const offsetSecs = calculateTotalOffsetSecs(tz_offset);
    const localTimestamp = timestamp + offsetSecs;
    const localDate = new Date(localTimestamp * 1000); // Convert to milliseconds

    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }).format(localDate);
  } catch (error) {
    console.error("Error formatting timestamp:", error);
    return "Invalid Time";
  }
};

/**
 * Formats a timestamp with a tz_offset into a date-only string.
 * @param timestamp - The timestamp in seconds (UTC).
 * @param tz_offset - The time zone offset string (e.g., "UTC-05:00").
 * @returns The formatted date string.
 */
export const formatDateOnly = (timestamp: number, tz_offset: string | undefined): string => {
  if (!tz_offset) {
    return "Unknown";
  }

  try {
    const offsetSecs = calculateTotalOffsetSecs(tz_offset);
    const localTimestamp = timestamp + offsetSecs;
    const localDate = new Date(localTimestamp * 1000); // Convert to milliseconds

    return new Intl.DateTimeFormat('en-US', {
      month: 'numeric',
      day: 'numeric',
    }).format(localDate);
  } catch (error) {
    console.error("Error formatting date:", error);
    return "Invalid Date";
  }
};

/**
 * Returns midnight (start of the day) in UTC for the given date, in seconds.
 * @param date - The Date object.
 * @returns The midnight timestamp in seconds (UTC).
 */
export const getMidnightUTC = (date: Date): number => {
  return Math.floor(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate()
  ) / 1000); // Convert to seconds
};

/**
 * Returns the next midnight (start of the next day) in UTC for the given date, in seconds.
 * @param date - The Date object.
 * @returns The next midnight timestamp in seconds (UTC).
 */
export const getNextMidnightUTC = (date: Date): number => {
  return Math.floor(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate() + 1
  ) / 1000); // Convert to seconds
};
