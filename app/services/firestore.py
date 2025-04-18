from google.cloud import firestore
from google.cloud.firestore_v1.base_query import FieldFilter
from datetime import datetime, timedelta, timezone
from geopy.distance import geodesic
import app.utils.mytime as mytime
import json

def calculate_distance(lat1, lon1, lat2, lon2):
    """Calculate the distance between two lat/lon points in miles."""
    return geodesic((lat1, lon1), (lat2, lon2)).miles

def get_lat_lon_time_values(pos):
    """Extract latitude, longitude, and timestamp from a position dictionary."""
    lat = pos.get('latitude')
    lon = pos.get('longitude')
    tstamp = pos.get('utc_shifted_tstamp')
    tz_offset = pos.get('tz_offset')
    return lat, lon, tstamp, tz_offset

#
# adds to pos object
#
def add_values(prev_pos, pos):
    prev_lat, prev_lon, prev_utc_tstamp, prev_tz_offset = get_lat_lon_time_values(prev_pos)
    lat, lon, utc_tstamp, tz_offset = get_lat_lon_time_values(pos)

    local_tz = mytime.get_timezone(tz_offset)
    local_tstamp = mytime.unshift_timestamp(utc_tstamp, local_tz)
    pos['utc_shifted_time'] = str(datetime.fromtimestamp(utc_tstamp, timezone.utc))
    pos['local_time'] = str(datetime.fromtimestamp(local_tstamp, local_tz))

    # Prevent division by zero
    if utc_tstamp == prev_utc_tstamp:
        pos['mph'] = 0.0
        pos['knots'] = 0.0
        pos['delta_miles'] = 0.0
        pos['delta_secs'] = 0.0
        return

    delta_secs = utc_tstamp - prev_utc_tstamp
    delta_miles = calculate_distance(lat, lon, prev_lat, prev_lon)
    mph = delta_miles / (delta_secs / 3600.0)

    pos['mph'] = mph
    pos['knots'] = (mph * 0.868976)  # Convert to knots
    pos['delta_miles'] = delta_miles
    pos['delta_secs'] = delta_secs
    return 

def has_moved(prev_pos, pos):
    if prev_pos is None:
        return True
    
    prev_lat, prev_lon, prev_utc_tstamp, prev_tz_offset = get_lat_lon_time_values(prev_pos)
    lat, lon, utc_tstamp, tz_offset = get_lat_lon_time_values(pos)

    delta_miles = calculate_distance(lat, lon, prev_lat, prev_lon)
    return delta_miles > 0
    
def process_raw_positionsx(raw_positions):
    positions = []
    prev_pos = None

    for raw in raw_positions:
        pos = raw.to_dict()
        if prev_pos is None:
            prev_pos = pos
        
        add_values(prev_pos, pos)
        print(json.dumps(pos, indent=1))
        positions.append(pos)
        moved = pos.get('moved')
        prev_pos = pos if moved else prev_pos

    return positions
#
# prev_pos points to last collected position or None
# pos points to ignored position at later time
#
def add_duration(pos, prev_pos):
    if prev_pos is None:
        return
    
    data_points = prev_pos.get('data_points', 1) + 1
    start_tstamp = prev_pos.get('utc_shifted_tstamp')
    later_tstamp = pos.get('utc_shifted_tstamp')
    duration_secs = later_tstamp - start_tstamp
    prev_pos['duration_secs'] = duration_secs
    prev_pos['data_points'] = data_points
    print('ds', duration_secs, 'points', data_points)
    

def process_raw_positionsy(raw_positions):
    positions = []

    # raw_positions is a stream, not list
    prev_pos = None
    for raw in raw_positions:
        pos = raw.to_dict()
        if has_moved(prev_pos, pos):
            positions.append(pos)
            prev_pos = pos
        else:
            add_duration(pos, prev_pos)

    look_back = 2
    first_pos = positions[0]
    for idx in range(0, len(positions)):
        pos = positions[idx]
        prev_pos = first_pos if idx < look_back else positions[idx - look_back]
        add_values(prev_pos, pos)

    return positions

async def fs_fetch_positions(db, from_timestamp: int, to_timestamp: int):
    """
    Fetch positions from Firestore based on UNIX timestamp range.

    Args:
        db: Firestore client.
        from_timestamp (int): Start of the range (UNIX timestamp in seconds).
        to_timestamp (int): End of the range (UNIX timestamp in seconds).

    Returns:
        List[Dict]: List of position records from Firestore.
    """

    query = db.collection("gps_data")

    # ✅ Firestore now expects FieldFilter instead of direct where()
    query = query.where(filter=FieldFilter("utc_shifted_tstamp", ">=", from_timestamp))
    query = query.where(filter=FieldFilter("utc_shifted_tstamp", "<=", to_timestamp))
    query = query.order_by("utc_shifted_tstamp")  # Sort by timestamp

    return process_raw_positionsy(query.stream())
