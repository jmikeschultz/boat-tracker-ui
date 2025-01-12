from datetime import datetime, timedelta

def calculate_total_offset_secs(tz_offset: str) -> int:
    sign = 1 if tz_offset.startswith("UTC+") else -1
    hours, minutes = map(int, tz_offset[4:].split(":"))
    return sign * (hours * 3600 + minutes * 60)

def format_timestamp_with_offset(timestamp: int, tz_offset: str) -> str:
    offset_secs = calculate_total_offset_secs(tz_offset)
    local_timestamp = timestamp + offset_secs
    return datetime.utcfromtimestamp(local_timestamp).strftime("%Y-%m-%d %H:%M:%S")
