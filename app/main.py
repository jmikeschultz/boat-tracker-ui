from fastapi import FastAPI, Query, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from datetime import datetime
from google.cloud import firestore
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
        # Parse YYYYMMDD into utc timezone aware datetime objects
        fdate = f'{from_date}0001 +0000'
        tdate = f'{to_date}2359 +0000'
        from_datetime = datetime.strptime(fdate, "%Y%m%d%H%M %z")
        to_datetime = datetime.strptime(tdate, "%Y%m%d%H%M %z")
        db = firestore.Client()

        # Debugging print statements
        print(f"Main: from_date={from_date}, to_date={to_date}")

        # Fetch positions
        positions = await fetch_positions(db, from_datetime, to_datetime)
        #print(f"Main: Fetched positions: {positions}")

        return {"positions": positions}

    except ValueError as e:
        print(f"Error: Invalid date format: {e}")
        raise HTTPException(status_code=400, detail=f"Invalid date format: {e}")
