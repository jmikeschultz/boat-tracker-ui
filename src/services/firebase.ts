import { collection, query, orderBy, onSnapshot, where } from "firebase/firestore";
import { db } from "../firebase";
import { Position } from "../types";

export const subscribeToPositions = (
  fromDate: Date,
  toDate: Date,
  onData: (positions: Position[]) => void,
  onError: (error: Error) => void
): () => void => {
  // Start at midnight of the `fromDate` in UTC
  const start = Date.UTC(fromDate.getUTCFullYear(), fromDate.getUTCMonth(), fromDate.getUTCDate(), 0, 0, 0);
  // End at the last millisecond of the `toDate` in UTC
  const end = Date.UTC(toDate.getUTCFullYear(), toDate.getUTCMonth(), toDate.getUTCDate(), 23, 59, 59, 999);

  // Debug logs
  console.log("[subscribeToPositions] Firestore query range:");
  console.log(`  Start (UTC timestamp): ${start}, UTC: ${new Date(start).toISOString()}`);
  console.log(`  End (UTC timestamp): ${end}, UTC: ${new Date(end).toISOString()}`);

  // Firestore query
  const q = query(
    collection(db, "gps_data"),
    where("timestamp", ">=", start),
    where("timestamp", "<=", end),
    orderBy("timestamp", "asc")
  );

  return onSnapshot(
    q,
    (snapshot) => {
      console.log("[subscribeToPositions] Query successful. Snapshot size:", snapshot.size);
      const positions = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          latitude: data.latitude,
          longitude: data.longitude,
          timestamp: data.timestamp,
          time_zone: data.time_zone || "Unknown",
          speed: data.speed || 0  // Add speed field with default of 0
        };
      });
      onData(positions);
    },
    (error) => {
      console.error("[subscribeToPositions] Firestore query failed:", error);
      onError(error);
    }
  );
};
