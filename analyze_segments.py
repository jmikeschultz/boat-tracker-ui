#!/usr/bin/env python
import time
from datetime import datetime, timezone
from google.cloud import firestore
import argparse
from app.services.firestore import process_raw_positions, calculate_distance, segment_positions

MAX_REALISTIC_SPEED = 60.0      # mph (above this is flagged as spurious)

def format_duration(seconds):
    """Convert seconds to H:M:S string."""
    hours, remainder = divmod(int(seconds), 3600)
    minutes, secs = divmod(remainder, 60)
    if hours > 0:
        return f"{hours}h {minutes}m {secs}s"
    elif minutes > 0:
        return f"{minutes}m {secs}s"
    else:
        return f"{secs}s"

def fetch_and_analyze(filter_spurious):
    db = firestore.Client(project="boat-crumbs")
    print("Fetching all GPS documents from Firestore (this may take a few seconds)...")
    
    start_time = time.time()
    docs = db.collection("gps_data").stream()
    
    raw_positions = []
    for doc in docs:
        raw_positions.append(doc.to_dict())
        
    fetch_time = time.time() - start_time
    print(f"Fetched {len(raw_positions)} documents in {fetch_time:.2f} seconds.")
    
    positions = process_raw_positions(raw_positions, filter_spurious=filter_spurious)
    segments = segment_positions(positions, filter_stationary=False)
    print(f"Identified {len(segments)} segments.\n")
    
    # Print table header
    print(f"{'Seg #':<6} | {'Start Time (UTC)':<19} | {'End Time (UTC)':<19} | {'Pts':<5} | {'Distance':<10} | {'Duration':<12} | {'Max Speed':<10} | {'Spurious Likelihood / Warnings'}")
    print("-" * 140)
    
    skipped_segments = 0
    printed_count = 0
    for i, seg in enumerate(segments, 1):
        pts_count = len(seg)
        start_ts = seg[0]["utc_shifted_tstamp"]
        end_ts = seg[-1]["utc_shifted_tstamp"]
        duration = end_ts - start_ts
        if pts_count == 1 and "duration_secs" in seg[0]:
            duration = seg[0]["duration_secs"]
            end_ts = start_ts + duration
            
        start_date = datetime.fromtimestamp(start_ts, tz=timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
        end_date = datetime.fromtimestamp(end_ts, tz=timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
        
        # Calculate total distance and max speed within the segment
        total_dist = 0.0
        max_speed = 0.0
        spurious_warnings = []
        has_null_island = False
        
        seg_prev = None
        for p in seg:
            if p["latitude"] == 0.0 or p["longitude"] == 0.0:
                has_null_island = True
                
            if not seg_prev:
                seg_prev = p
                continue
                
            d = calculate_distance(p["latitude"], p["longitude"], seg_prev["latitude"], seg_prev["longitude"])
            t_diff = p["utc_shifted_tstamp"] - seg_prev["utc_shifted_tstamp"]
            
            total_dist += d
            if t_diff > 0:
                speed = d / (t_diff / 3600.0)
                if speed > max_speed:
                    max_speed = speed
            seg_prev = p
            
        # Ignore stationary/idle segments (<= 2 points and < 0.1 miles)
        # unless they represent a significant stationary stay (>= 30 minutes)
        is_stationary = pts_count <= 2 and total_dist < 0.1
        if is_stationary and duration < 1800:
            skipped_segments += 1
            continue

        printed_count += 1
        
        # Determine spurious likelihood / stationary status
        likelihood = "Low"
        if is_stationary:
            likelihood = "STATIONARY"
            spurious_warnings.append("Stationary stay / dock drift")
            
        if has_null_island:
            likelihood = "HIGH"
            spurious_warnings.append("Contains Null Island (0,0)")
            
        if max_speed > MAX_REALISTIC_SPEED:
            likelihood = "HIGH"
            spurious_warnings.append(f"Unrealistic Max Speed: {max_speed:.1f} mph")
            
        if pts_count <= 2 and total_dist > 5.0:
            likelihood = "HIGH"
            spurious_warnings.append(f"Too few points ({pts_count}) for distance ({total_dist:.1f} mi)")
            
        if likelihood == "Low" and max_speed > 25.0:
            likelihood = "Medium"
            spurious_warnings.append(f"Moderate high speed: {max_speed:.1f} mph")

        warning_str = ", ".join(spurious_warnings) if spurious_warnings else "None"
        likelihood_str = f"{likelihood} ({warning_str})" if likelihood != "Low" else "Low"
        
        print(f"{printed_count:<6} | {start_date:<19} | {end_date:<19} | {pts_count:<5} | {total_dist:>7.2f} mi | {format_duration(duration):<12} | {max_speed:>7.1f} mph | {likelihood_str}")

    print(f"\nSkipped {skipped_segments} short stationary/idle segments (<= 2 points, < 0.1 miles, and < 30 minutes duration).")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Analyze GPS segments from Firestore.")
    parser.add_argument("--raw", action="store_true", help="Do not filter out Null Island points first (show raw data problems).")
    args = parser.parse_args()
    
    fetch_and_analyze(filter_spurious=not args.raw)
