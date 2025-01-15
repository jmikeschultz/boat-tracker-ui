from google.cloud import firestore
from datetime import datetime

async def fetch_positions(db, from_datetime: datetime, to_datetime: datetime):
    """
    Fetch positions from Firestore based on UNIX timestamp range.

    Args:
        from_timestamp (int): Start of the range (UNIX timestamp in seconds).
        to_timestamp (int): End of the range (UNIX timestamp in seconds).

    Returns:
        List[Dict]: List of position records from Firestore.
    """

    # these are timezone aware and shifted to utc
    print(f'firestore.py {from_datetime} {to_datetime}')

     # Convert to UNIX timestamps in seconds
    from_timestamp = int(from_datetime.timestamp())
    to_timestamp = int(to_datetime.timestamp())

    query = db.collection("gps_data1")
    query = query.where("utc_shifted_tstamp", ">=", from_timestamp)  # Filter start
    query = query.where("utc_shifted_tstamp", "<=", to_timestamp)    # Filter end
    query = query.order_by("utc_shifted_tstamp")  # Sort by timestamp

    docs = query.stream()
    positions = []
    for doc in docs:
        doc_data = doc.to_dict()  # Call to_dict() once
        position = {
            "latitude": doc_data.get("latitude"),
            "longitude": doc_data.get("longitude"),
            "utc_shifted_tstamp": doc_data.get("utc_shifted_tstamp"),
            "tz_offset": doc_data.get("tz_offset"),
        }
        # Add additional fields if needed
        position["speed"] = 15  # Example

        positions.append(position)

    print(f"services/Firestore.py: Fetched positions: {positions}")  # Debugging
    return positions
