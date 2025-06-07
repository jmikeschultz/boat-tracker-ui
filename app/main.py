import os
from fastapi import FastAPI, Query, HTTPException
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials
import secrets
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from datetime import datetime
from google.cloud import firestore
from .services.firestore import fs_fetch_positions

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

# Mount static files
app.mount("/static", StaticFiles(directory="app/static"), name="static")


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

        if positions:
            print(f"✅ main.py: Fetched {len(positions)} records.")
            print(f"📌 First position: {positions[0]}")
        else:
            print("No positions found, returning default data.")

        return {
            "positions": positions,
            "from_timestamp": from_timestamp,
            "to_timestamp": to_timestamp
        }

    except ValueError as e:
        print(f"Error: Invalid date format: {e}")
        raise HTTPException(status_code=400, detail=f"Invalid date format: {e}")


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
    
