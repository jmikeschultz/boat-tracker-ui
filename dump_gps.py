from google.cloud import firestore
from datetime import datetime, timedelta, timezone
import asyncio
from app.services.firestore import fetch_positions
import json
import re
import traceback
import app.utils.mytime as mytime
from geopy.distance import geodesic

# Initialize Firestore client
db = firestore.Client(project="boat-crumbs")

def calculate_distance(lat1, lon1, lat2, lon2):
    """Calculate the distance between two lat/lon points in miles."""
    return geodesic((lat1, lon1), (lat2, lon2)).miles

def get_values(position):
    lat = position.get('latitude')
    lon = position.get('longitude')
    utc_shifted_tstamp = position.get('utc_shifted_tstamp')
    tz_offset = position.get('tz_offset')
    return lat, lon, utc_shifted_tstamp, tz_offset

def process_record(position, last_position):
    lat, lon, utc_shifted_tstamp, tz_offset = get_values(position)
    last_position = position if not last_position else last_position
    last_lat, last_lon, last_utc_shifted_tstamp, last_tz_offset = get_values(last_position)

    delta_miles = calculate_distance(last_lat, last_lon, lat, lon)
    delta_secs = (float) (utc_shifted_tstamp - last_utc_shifted_tstamp)
    delta_hrs = delta_secs / 3600.0
    my_speed = (delta_miles / delta_hrs) if delta_hrs else 0.0

    local_tz = mytime.get_timezone(tz_offset)
    local_tstamp = mytime.unshift_timestamp(utc_shifted_tstamp, local_tz)

    position['delta_miles'] = delta_miles
    position['delta_secs'] = delta_secs
    position['miles_per_hour'] = my_speed

    position['utc_shifted_time'] = str(datetime.fromtimestamp(utc_shifted_tstamp, timezone.utc))
    position['local_time'] = str(datetime.fromtimestamp(local_tstamp, local_tz))
    print(json.dumps(position, indent=2))



async def main():
    """
    Test script to fetch positions from Firestore for a date range.
    """
    # Calculate today's date and a week ago
    today = datetime.now(tz=timezone.utc)
    a_week_ago = today - timedelta(days=10)

    print(today)

    # Convert to UNIX timestamps (seconds)
    from_timestamp = int(a_week_ago.timestamp())
    to_timestamp = int(today.timestamp())

    print(f"Fetching positions from {a_week_ago} to {today}...")
    print(f"From timestamp: {from_timestamp}, To timestamp: {to_timestamp}")

    # Call the fetch_positions function
    try:
        last_position = None

        positions = await fetch_positions(db, from_timestamp, to_timestamp)
        print(f"Fetched {len(positions)} positions")
        for position in positions:
            process_record(position, last_position)
            last_position = position

    except Exception as e:
        print(f"An error occurred: {e}")
        traceback.print_exc()

# Run the main function
if __name__ == "__main__":
    asyncio.run(main())
