export const formatTimestampWithZone = (timestamp: number, timeZone: string | undefined): string => {
  if (!timeZone) {
    return "Unknown";
  }
  try {
    const date = new Date(timestamp);
    const utcDate = getUTCDate(date);
    
    return new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }).format(utcDate);
  }
  catch (error) {
    console.error("Error formatting timestamp:", error);
    return "Invalid Time";
  }
};

export const formatDateOnly = (timestamp: number, timeZone: string | undefined): string => {
  if (!timeZone) {
    return "Unknown";
  }
  try {
    const date = new Date(timestamp);
    const utcDate = getUTCDate(date);
    
    return new Intl.DateTimeFormat('en-US', {
      timeZone,
      month: 'numeric',
      day: 'numeric',
    }).format(utcDate);
  }
  catch (error) {
    console.error("Error formatting date:", error);
    return "Invalid Date";
  }
};

export const getUTCDate = (date: Date): Date => {
  return new Date(Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
    date.getMilliseconds()
  ));
};

export const getMidnightUTC = (date: Date): number => {
  return Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate()
  );
};

export const getNextMidnightUTC = (date: Date): number => {
  return Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate() + 1
  );
};
