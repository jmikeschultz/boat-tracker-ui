from fastapi import FastAPI, Query, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from datetime import datetime
from .services.firestore import fetch_positions

app = FastAPI()

# Mount static files
app.mount("/static", StaticFiles(directory="app/static"), name="static")


@app.get("/", response_class=HTMLResponse)
async def home():
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
):
    """
    Fetch positions within the specified date range.
    """
    try:
        # Parse YYYYMMDD into datetime objects
        from_datetime = datetime.strptime(from_date, "%Y%m%d")
        to_datetime = datetime.strptime(to_date, "%Y%m%d")

        # Convert to UNIX timestamps in seconds
        from_timestamp = int(from_datetime.timestamp())
        to_timestamp = int(to_datetime.timestamp())

        # Debugging print statements
        print(f"Debug: from_date={from_date}, to_date={to_date}")
        print(f"Debug: from_datetime={from_datetime}, to_datetime={to_datetime}")
        print(f"Debug: from_timestamp={from_timestamp}, to_timestamp={to_timestamp}")

        # Ensure the date range is valid
        if from_timestamp > to_timestamp:
            print("Debug: Invalid date range")
            raise HTTPException(status_code=400, detail="from_date must be less than or equal to to_date")

        # Fetch positions
        positions = await fetch_positions(from_timestamp, to_timestamp)
        #print(f"Debug: Fetched positions: {positions}")

        return {"positions": positions}

    except ValueError as e:
        print(f"Error: Invalid date format: {e}")
        raise HTTPException(status_code=400, detail=f"Invalid date format: {e}")
