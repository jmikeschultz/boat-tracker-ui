from google.cloud import firestore

db = firestore.Client()

async def fetch_positions(from_timestamp: int, to_timestamp: int):
    """
    Fetch positions from Firestore based on UNIX timestamp range.

    Args:
        from_timestamp (int): Start of the range (UNIX timestamp in seconds).
        to_timestamp (int): End of the range (UNIX timestamp in seconds).

    Returns:
        List[Dict]: List of position records from Firestore.
    """
    query = db.collection("gps_data")
    query = query.where("gmt_timestamp", ">=", from_timestamp)  # Filter start
    query = query.where("gmt_timestamp", "<=", to_timestamp)    # Filter end
    query = query.order_by("gmt_timestamp")  # Sort by timestamp

    docs = query.stream()
    positions = [
        {
            "latitude": doc.to_dict().get("latitude"),
            "longitude": doc.to_dict().get("longitude"),
            "speed": doc.to_dict().get("speed"),
            "gmt_timestamp": doc.to_dict().get("gmt_timestamp"),
            "tz_offset": doc.to_dict().get("tz_offset"),
        }
        for doc in docs
    ]
    #print(f"Debug: Fetched positions: {positions}")  # Debugging
    return positions
