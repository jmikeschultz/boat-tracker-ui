from google.cloud import firestore
from datetime import datetime, timedelta, timezone
import asyncio
from app.services.firestore import fs_fetch_positions
import json
import re
import os
import sys
import traceback
import app.utils.mytime as mytime
from geopy.distance import geodesic

# Initialize Firestore client
db = firestore.Client(project="boat-crumbs")

async def main():
    """
    Test script to fetch positions from Firestore for a date range.
    """
    if len(sys.argv) != 3:
        script = sys.argv[0]
        print(f'usage:{script} <endDate> <numDays>')
        print('<endDate> = MM-DD-YYYY or TODAY')
        print('<numDays> = number of days going backward including endDate')
        sys.exit(-1)

    end_date_arg = sys.argv[1].upper()
    num_days = int(sys.argv[2])

     # Parse end date (normalize to 00:00 UTC start of day)
    if end_date_arg == "TODAY":
        end_dt = datetime.now(tz=timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    else:
        try:
            end_dt = datetime.strptime(end_date_arg, "%m-%d-%Y").replace(tzinfo=timezone.utc)
        except ValueError:
            print("Invalid date format. Use MM-DD-YYYY or TODAY.")
            sys.exit(-1)

    # Start of first day in the range
    start_dt = end_dt - timedelta(days=num_days - 1)
    # End of last day: 23:59:59.999999
    end_of_last_day = end_dt + timedelta(days=1) - timedelta(microseconds=1)

    from_timestamp = int(start_dt.timestamp())
    to_timestamp = int(end_of_last_day.timestamp())

    print(f"Fetching positions from {start_dt} to {end_of_last_day}...")
    print(f"From timestamp: {from_timestamp}, To timestamp: {to_timestamp}")

    # Call the fetch_positions function
    try:
        positions = await fs_fetch_positions(db, from_timestamp, to_timestamp)
        print(f"Fetched {len(positions)} positions")
        for position in positions:
            print(json.dumps(position, indent=2))

    except Exception as e:
        print(f"An error occurred: {e}")
        traceback.print_exc()

# Run the main function
if __name__ == "__main__":
    asyncio.run(main())
