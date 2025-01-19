from google.cloud import firestore
from datetime import datetime
from geopy.distance import geodesic

def calculate_distance(lat1, lon1, lat2, lon2):
    """Calculate the distance between two lat/lon points in miles."""
    return geodesic((lat1, lon1), (lat2, lon2)).miles

def get_lat_lon_tstamp(pos):
    lat = pos.get('latitude')
    lon = pos.get('longitude')
    tstamp = pos.get('utc_shifted_tstamp')
    return lat, lon, tstamp

def get_knots(prev_pos, pos):
    if prev_pos is None:
        return 0.0

    prev_lat, prev_lon, prev_tstamp = get_lat_lon_tstamp(prev_pos)
    lat, lon, tstamp = get_lat_lon_tstamp(pos)

    secs = tstamp - prev_tstamp
    miles = calculate_distance(lat, lon, prev_lat, prev_lon)
    mph = miles / (secs / 3600.0)

    return (mph * 0.868976) # 

async def fs_fetch_positions(db, from_timestamp: int, to_timestamp: int):
    """
    Fetch positions from Firestore based on UNIX timestamp range.

    Args:
        from_timestamp (int): Start of the range (UNIX timestamp in seconds).
        to_timestamp (int): End of the range (UNIX timestamp in seconds).

    Returns:
        List[Dict]: List of position records from Firestore.
    """

    query = db.collection("gps_data1")
    query = query.where("utc_shifted_tstamp", ">=", from_timestamp)  # Filter start
    query = query.where("utc_shifted_tstamp", "<=", to_timestamp)    # Filter end
    query = query.order_by("utc_shifted_tstamp")  # Sort by timestamp

    docs = query.stream()
    positions = []
    prev_pos = None
    for doc in docs:
        pos = doc.to_dict()  # Call to_dict()
        pos["knots"] = get_knots(prev_pos, pos)
        positions.append(pos)
        prev_pos = pos

    return positions
