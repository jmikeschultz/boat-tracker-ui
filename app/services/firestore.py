from google.cloud import firestore
from google.cloud.firestore_v1.base_query import FieldFilter
from datetime import datetime, timedelta, timezone
from geopy.distance import geodesic
import app.utils.mytime as mytime
import json

def calculate_distance(lat1, lon1, lat2, lon2):
    """Calculate the distance between two lat/lon points in miles safely."""
    try:
        if not (-90 <= lat1 <= 90) or not (-90 <= lat2 <= 90):
            return 0.0
        if not (-180 <= lon1 <= 180) or not (-180 <= lon2 <= 180):
            return 0.0
        return geodesic((lat1, lon1), (lat2, lon2)).miles
    except Exception:
        return 0.0

def normalize_position(raw_pos):
    """Normalize position document based on key-swap pattern for historical data."""
    tstamp_val = raw_pos.get("utc_shifted_tstamp")
    
    if isinstance(tstamp_val, str):
        # Swapped format (older docs)
        return {
            "tz_offset": raw_pos.get("utc_shifted_tstamp"),          # e.g., "UTC-04:00"
            "utc_shifted_tstamp": raw_pos.get("latitude"),           # Float, UNIX timestamp
            "latitude": raw_pos.get("longitude"),                    # Float, Latitude
            "longitude": raw_pos.get("altitude"),                    # Float, Longitude
            "altitude": raw_pos.get("tz_offset"),                    # Float, Altitude
            "engine_hours": raw_pos.get("rpm"),                      # Float, Engine hours
            "rpm": raw_pos.get("alternator_voltage"),                # Float, RPM
            "coolant_temp": raw_pos.get("engine_hours"),             # Float, Coolant temp
            "alternator_voltage": raw_pos.get("coolant_temp"),       # Float, Alternator voltage
            "is_delta": raw_pos.get("is_delta")
        }
    else:
        # Correct format (newer docs)
        return {
            "tz_offset": raw_pos.get("tz_offset"),
            "utc_shifted_tstamp": raw_pos.get("utc_shifted_tstamp"),
            "latitude": raw_pos.get("latitude"),
            "longitude": raw_pos.get("longitude"),
            "altitude": raw_pos.get("altitude"),
            "engine_hours": raw_pos.get("engine_hours"),
            "rpm": raw_pos.get("rpm"),
            "coolant_temp": raw_pos.get("coolant_temp"),
            "alternator_voltage": raw_pos.get("alternator_voltage"),
            "is_delta": raw_pos.get("is_delta")
        }

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
def add_speed(prev_pos, pos):
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
        return

    delta_secs = utc_tstamp - prev_utc_tstamp
    delta_miles = calculate_distance(lat, lon, prev_lat, prev_lon)
    mph = delta_miles / (delta_secs / 3600.0)

    pos['mph'] = mph
    pos['knots'] = (mph * 0.868976)  # Convert to knots
    pos['delta_miles'] = delta_miles
    return 

#
# prev_pos points to last collected position or None
# pos points to ignored position at later time
#
def add_duration_2prev(pos, prev_pos):
    if prev_pos is None:
        return
    
    data_points = prev_pos.get('data_points', 1) + 1
    start_tstamp = prev_pos.get('utc_shifted_tstamp')
    later_tstamp = pos.get('utc_shifted_tstamp')
    duration_secs = (later_tstamp + pos.get('duration_secs', 0)) - start_tstamp
    prev_pos['duration_secs'] = duration_secs
    

def process_raw_positions(raw_positions, filter_spurious=True):
    # 1. Normalize and filter out Null Island (0,0) coordinates
    normalized_positions = []
    for raw in raw_positions:
        p = normalize_position(raw)
        if p["utc_shifted_tstamp"] is not None:
            if not filter_spurious or (p["latitude"] != 0.0 and p["longitude"] != 0.0):
                normalized_positions.append(p)
            
    # 2. Sort chronologically
    normalized_positions.sort(key=lambda x: x["utc_shifted_tstamp"])
    
    if not normalized_positions:
        return []

    # 3. Collapse contiguous duplicate coordinates (dock/drift points with 0 distance)
    # This collapses consecutive identical points (like the hills/Pennsylvania glitches) into a single point.
    if filter_spurious:
        collapsed = []
        for p in normalized_positions:
            if not collapsed:
                collapsed.append(p)
            else:
                prev = collapsed[-1]
                dist = calculate_distance(p["latitude"], p["longitude"], prev["latitude"], prev["longitude"])
                # If coordinates are identical (within a micro-threshold of 0.0001 miles / 0.5 feet)
                if dist < 0.0001:
                    # Fold into previous
                    prev['duration_secs'] = p["utc_shifted_tstamp"] - prev["utc_shifted_tstamp"]
                else:
                    collapsed.append(p)
        normalized_positions = collapsed

    # 4. Filter out trajectory stay spikes (GPS jumps with immediate return)
    # Since stay glitches are now collapsed to a single point, they will be discarded here.
    if filter_spurious:
        spike_filtered = []
        n = len(normalized_positions)
        for i in range(n):
            p = normalized_positions[i]
            if i == 0 or i == n - 1:
                spike_filtered.append(p)
                continue
                
            prev_p = normalized_positions[i - 1]
            next_p = normalized_positions[i + 1]
            
            d_prev = calculate_distance(p["latitude"], p["longitude"], prev_p["latitude"], prev_p["longitude"])
            d_next = calculate_distance(p["latitude"], p["longitude"], next_p["latitude"], next_p["longitude"])
            d_across = calculate_distance(prev_p["latitude"], prev_p["longitude"], next_p["latitude"], next_p["longitude"])
            
            # If the point is more than 0.15 miles from both neighbors, but neighbors are within 0.15 miles
            if d_prev > 0.15 and d_next > 0.15 and d_across < 0.15:
                # Discard this stay spike!
                # Fold its duration into the previous anchor so we do not lose track of time
                if len(spike_filtered) > 0:
                    prev_anchor = spike_filtered[-1]
                    prev_anchor['duration_secs'] = (p["utc_shifted_tstamp"] + p.get('duration_secs', 0)) - prev_anchor["utc_shifted_tstamp"]
                continue
                
            spike_filtered.append(p)
        normalized_positions = spike_filtered

    # 5. Group stationary points using Centroid-Based Reference-Anchor Algorithm
    positions = []
    if not filter_spurious:
        for pos in normalized_positions:
            pos['is_delta'] = True
        positions = normalized_positions
    else:
        anchor = None
        stationary_points = []
        i = 0
        n = len(normalized_positions)
        while i < n:
            pos = normalized_positions[i]
            if anchor is None:
                pos['is_delta'] = True
                anchor = pos
                stationary_points = [pos]
                positions.append(pos)
                i += 1
            else:
                # Look ahead to see if this is a temporary bounce that returns to the current anchor
                bounce_found = False
                bounce_end_idx = -1
                
                # We look ahead up to 15 points or 20 minutes (1200 seconds).
                # We also allow up to 5 points of look-ahead regardless of time to catch jump-and-sleep bounces.
                look_ahead_limit = min(i + 15, n)
                for j in range(i, look_ahead_limit):
                    p_ahead = normalized_positions[j]
                    time_diff = p_ahead["utc_shifted_tstamp"] - anchor["utc_shifted_tstamp"]
                    if time_diff > 1200 and (j - i) >= 5:
                        break
                        
                    dist_to_anchor = calculate_distance(p_ahead["latitude"], p_ahead["longitude"], anchor["latitude"], anchor["longitude"])
                    
                    # If it returns to the anchor
                    if dist_to_anchor <= 0.15:
                        # Verify that all intermediate points (from i to j) are within 5.0 miles of the anchor
                        all_within_limit = True
                        for k in range(i, j + 1):
                            pk = normalized_positions[k]
                            dk = calculate_distance(pk["latitude"], pk["longitude"], anchor["latitude"], anchor["longitude"])
                            if dk > 5.0:
                                all_within_limit = False
                                break
                        
                        if all_within_limit:
                            bounce_found = True
                            bounce_end_idx = j
                        break  # Found the return point, stop looking ahead
                
                if bounce_found:
                    # Absorb all points from i to bounce_end_idx into the current anchor
                    for k in range(i, bounce_end_idx + 1):
                        pk = normalized_positions[k]
                        stationary_points.append(pk)
                        add_duration_2prev(pk, anchor)
                    
                    # Update anchor's coordinates to be the running average centroid
                    lats = [p["latitude"] for p in stationary_points]
                    lons = [p["longitude"] for p in stationary_points]
                    anchor["latitude"] = sum(lats) / len(lats)
                    anchor["longitude"] = sum(lons) / len(lons)
                    
                    # Advance index past the absorbed bounce
                    i = bounce_end_idx + 1
                    continue
                
                # Normal processing if it's not a bounce
                dist = calculate_distance(pos["latitude"], pos["longitude"], anchor["latitude"], anchor["longitude"])
                
                # Check if this point represents a sudden impossible teleportation speed spike (>60 mph)
                time_diff = pos["utc_shifted_tstamp"] - anchor["utc_shifted_tstamp"]
                is_spurious = False
                if time_diff > 0:
                    speed = dist / (time_diff / 3600.0)
                    if speed > 60.0 and dist > 0.05:
                        is_spurious = True
                
                if is_spurious:
                    # Skip this spurious jump entirely
                    i += 1
                    continue
                    
                pos['is_delta'] = dist > 0.15
                
                if pos['is_delta']:
                    anchor = pos
                    stationary_points = [pos]
                    positions.append(pos)
                else:
                    stationary_points.append(pos)
                    add_duration_2prev(pos, anchor)
                    
                    # Update anchor's coordinates to be the running average centroid
                    lats = [p["latitude"] for p in stationary_points]
                    lons = [p["longitude"] for p in stationary_points]
                    anchor["latitude"] = sum(lats) / len(lats)
                    anchor["longitude"] = sum(lons) / len(lons)
                
                i += 1

    if not positions:
        return []

    # 6. Calculate speed and local time metrics relative to look-back
    look_back = 2
    first_pos = positions[0]
    for idx in range(0, len(positions)):
        pos = positions[idx]
        prev_pos = first_pos if idx < look_back else positions[idx - look_back]
        add_speed(prev_pos, pos)

    return positions

async def fs_fetch_positions(db, from_timestamp: int, to_timestamp: int):
    """
    Fetch positions from Firestore based on UNIX timestamp range, supporting
    both swapped and correct schemas dynamically.

    Args:
        db: Firestore client.
        from_timestamp (int): Start of the range (UNIX timestamp in seconds).
        to_timestamp (int): End of the range (UNIX timestamp in seconds).

    Returns:
        List[Dict]: List of position records from Firestore.
    """
    # Query both fields in parallel to capture older (swapped) and newer (correct) schemas
    query_correct = db.collection("gps_data") \
                      .where(filter=FieldFilter("utc_shifted_tstamp", ">=", from_timestamp)) \
                      .where(filter=FieldFilter("utc_shifted_tstamp", "<=", to_timestamp))

    query_swapped = db.collection("gps_data") \
                      .where(filter=FieldFilter("latitude", ">=", from_timestamp)) \
                      .where(filter=FieldFilter("latitude", "<=", to_timestamp))

    # stream() fetches documents synchronously
    docs_correct = query_correct.stream()
    docs_swapped = query_swapped.stream()

    # Merge and deduplicate by document ID
    unique_docs = {}
    for doc in docs_correct:
        unique_docs[doc.id] = doc.to_dict()
        
    for doc in docs_swapped:
        if doc.id not in unique_docs:
            unique_docs[doc.id] = doc.to_dict()

    raw_positions = list(unique_docs.values())
    
    return process_raw_positions(raw_positions)


# Centralized Segmentation Constants
SEGMENT_MAX_GAP_SECS = 1800     # 30 minutes
SEGMENT_MAX_GAP_MILES = 1.0     # 1.0 mile

def segment_positions(positions, max_gap_secs=SEGMENT_MAX_GAP_SECS, max_gap_miles=SEGMENT_MAX_GAP_MILES):
    """Segment a list of positions into trips based on time and distance gaps."""
    segments = []
    current_segment = []
    prev = None
    
    for pos in positions:
        if not prev:
            current_segment.append(pos)
            prev = pos
            continue
            
        time_gap = pos["utc_shifted_tstamp"] - prev["utc_shifted_tstamp"]
        dist_gap = calculate_distance(
            pos["latitude"], pos["longitude"],
            prev["latitude"], prev["longitude"]
        )
        
        if time_gap > max_gap_secs or dist_gap > max_gap_miles:
            if len(current_segment) > 0:
                segments.append(current_segment)
            current_segment = [pos]
        else:
            current_segment.append(pos)
            
        prev = pos
        
    if len(current_segment) > 0:
        segments.append(current_segment)
        
    return segments
