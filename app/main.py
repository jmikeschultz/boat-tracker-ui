import os
import json
import time
from fastapi import FastAPI, Query, HTTPException
from fastapi import Depends, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials
import secrets
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from datetime import datetime, timezone
from google.cloud import firestore
from .services.firestore import fs_fetch_positions, segment_positions

app = FastAPI()
security = HTTPBasic()

USERNAME = os.getenv("TRACKER_UI_USERNAME")
PASSWORD = os.getenv("TRACKER_UI_PASSWORD")

def verify_credentials(credentials: HTTPBasicCredentials = Depends(security)):
    correct_username = secrets.compare_digest(credentials.username, USERNAME)
    correct_password = secrets.compare_digest(credentials.password, PASSWORD)
    if not (correct_username and correct_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Basic"},
        )
    return credentials.username

# Mount static files with caching disabled for development reload sync
class NoCacheStaticFiles(StaticFiles):
    def file_response(self, *args, **kwargs):
        response = super().file_response(*args, **kwargs)
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        return response

app.mount("/static", NoCacheStaticFiles(directory="app/static"), name="static")


@app.get("/", response_class=HTMLResponse)
async def home(user: str = Depends(verify_credentials)):
    """
    Serve the main page for the boat tracker app.
    """
    try:
        with open("app/templates/index.html") as f:
            return HTMLResponse(content=f.read(), status_code=200)
    except FileNotFoundError:
        return HTMLResponse(content="Error: index.html not found in templates directory.", status_code=500)

@app.get("/positions")
async def get_positions(
    from_date: str = Query(..., regex="^\d{8}$", description="Start date in YYYYMMDD format"),
    to_date: str = Query(..., regex="^\d{8}$", description="End date in YYYYMMDD format"),
    user: str = Depends(verify_credentials)
):
    """
    Fetch positions within the specified date range.
    """
    try:
        print(f"main.py: from_date={from_date}, to_date={to_date}")

        # Convert YYYYMMDD to UNIX timestamps
        fdate = f'{from_date} 0001 +0000'
        tdate = f'{to_date} 2359 +0000'
        from_datetime = datetime.strptime(fdate, "%Y%m%d %H%M %z")
        to_datetime = datetime.strptime(tdate, "%Y%m%d %H%M %z")
        from_timestamp = int(from_datetime.timestamp())
        to_timestamp = int(to_datetime.timestamp())

        print(f"main.py: from_timestamp={from_timestamp}, to_timestamp={to_timestamp}")

        db = firestore.Client(project="boat-crumbs")
        positions = await fs_fetch_positions(db, from_timestamp, to_timestamp)
        segments = segment_positions(positions)

        if positions:
            print(f"✅ main.py: Fetched {len(positions)} records, grouped into {len(segments)} segments.")
            print(f"📌 First position: {positions[0]}")
        else:
            print("No positions found, returning default data.")

        return {
            "positions": positions,
            "segments": segments,
            "from_timestamp": from_timestamp,
            "to_timestamp": to_timestamp
        }

    except ValueError as e:
        print(f"Error: Invalid date format: {e}")
        raise HTTPException(status_code=400, detail=f"Invalid date format: {e}")


CACHE_DIR = "app/cache"
os.makedirs(CACHE_DIR, exist_ok=True)

async def get_segment_offset_for_year(year: int, db) -> int:
    offset = 0
    # Data begins in 2025
    for past_year in range(2025, year):
        cache_path = os.path.join(CACHE_DIR, f"year_{past_year}.json")
        if not os.path.exists(cache_path):
            print(f"main.py: Cache missing for past year {past_year}, building it...")
            await get_positions_for_year_internal(past_year, db)
            
        try:
            with open(cache_path, "r") as f:
                cached_data = json.load(f)
                offset += len(cached_data.get("segments", []))
        except Exception as e:
            print(f"Error reading cache for year {past_year}: {e}")
    return offset

async def get_positions_for_year_internal(year: int, db) -> dict:
    from_datetime = datetime(year, 1, 1, 0, 0, 0, tzinfo=timezone.utc)
    to_datetime = datetime(year, 12, 31, 23, 59, 59, tzinfo=timezone.utc)
    
    from_timestamp = int(from_datetime.timestamp())
    to_timestamp = int(to_datetime.timestamp())

    print(f"main.py: fetching Firestore data for year {year} with 5-day boundary buffer")
    buffer_timestamp = from_timestamp - 5 * 86400
    positions = await fs_fetch_positions(db, buffer_timestamp, to_timestamp)
    segments = segment_positions(positions)

    # Filter out segments that start in the previous year (already counted there)
    segments = [seg for seg in segments if seg[0]["utc_shifted_tstamp"] >= from_timestamp]
    # Rebuild positions list from the filtered segments
    positions = [pos for seg in segments for pos in seg]

    # Calculate global segment offset from past years
    offset = await get_segment_offset_for_year(year, db)

    # Assign 1-indexed global segment numbers to position objects
    for s_idx, segment in enumerate(segments, 1):
        global_idx = offset + s_idx
        for pos in segment:
            pos["global_segment_index"] = global_idx

    payload = {
        "positions": positions,
        "segments": segments,
        "from_timestamp": from_timestamp,
        "to_timestamp": to_timestamp
    }

    cache_path = os.path.join(CACHE_DIR, f"year_{year}.json")
    try:
        with open(cache_path, "w") as f:
            json.dump(payload, f)
        print(f"💾 Saved year {year} data to local cache: {cache_path} (offset: {offset}, segments: {len(segments)})")
    except Exception as e:
        print(f"Error writing cache for year {year}: {e}")

    return payload

@app.get("/positions/year")
async def get_positions_for_year(
    year: int = Query(..., ge=2000, le=2100, description="Year to fetch"),
    user: str = Depends(verify_credentials)
):
    """
    Fetch positions and segments for an entire year with local file-based JSON caching and global segment numbers.
    """
    try:
        print(f"main.py: year={year}")
        cache_path = os.path.join(CACHE_DIR, f"year_{year}.json")
        current_year = datetime.now(timezone.utc).year
        
        use_cache = False
        if os.path.exists(cache_path):
            if year < current_year:
                # Past years are static, cache is always valid
                use_cache = True
            else:
                # Current year: check if cache is fresh (less than 30 minutes old)
                cache_age = time.time() - os.path.getmtime(cache_path)
                if cache_age < 1800:
                    use_cache = True
        
        if use_cache:
            print(f"⚡ Loading year {year} from local cache: {cache_path}")
            try:
                with open(cache_path, "r") as f:
                    return json.load(f)
            except Exception as e:
                print(f"Error reading cache for year {year}: {e}. Falling back to Firestore.")

        # Cache miss or stale: build and cache using internal logic
        db = firestore.Client(project="boat-crumbs")
        return await get_positions_for_year_internal(year, db)

    except Exception as e:
        print(f"Error fetching year data: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/engine-hours/latest")
async def get_latest_engine_hours(user: str = Depends(verify_credentials)):
    """Fetch the latest recorded engine hours from Firestore."""
    #db = firestore.Client()

    #query = db.collection("gps_data").where("engine_hours", ">", 0).order_by("utc_shifted_tstamp", direction=firestore.Query.DESCENDING).limit(1)
    #docs = query.stream()

    #latest_position = next(docs, None)
    #if not latest_position:
    #    return {"engine_hours": None}  # No data found

    #data = latest_position.to_dict()
    #return {"engine_hours": data.get("engine_hours", None)}
    return {"engine_hours": '?'}
    
