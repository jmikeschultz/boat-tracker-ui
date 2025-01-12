export function formatDateToYYYYMMDD(date) {
    return date.toISOString().split("T")[0].replace(/-/g, "");
}
