// src/App.tsx
import React, { useEffect, useState } from "react";
import { Position } from "./types";
import { subscribeToPositions } from "./services/firebase";
import { BoatMap } from "./components/BoatMap";
import { Header } from "./components/Header";
import { ErrorMessage } from "./components/ErrorMessage";
import "leaflet/dist/leaflet.css";
import "./App.css";

function App() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);

  const setupSubscription = (fromDate: Date, toDate: Date) => {
    return subscribeToPositions(
      fromDate,
      toDate,
      (newPositions) => {
        setPositions(newPositions);
        if (!initialDataLoaded) {
          setInitialDataLoaded(true);
        }
      },
      (error) => setError(`Firestore fetch failed: ${error.message}`)
    );
  };

  useEffect(() => {
    const today = new Date();
    const unsubscribe = setupSubscription(today, today);
    return () => unsubscribe();
  }, []);

  const handleDateRangeChange = (fromDate: Date, toDate: Date) => {
    try {
      setupSubscription(fromDate, toDate);
    } catch (err) {
      console.error("Date change error:", err);
      setError("Failed to update date range.");
    }
  };

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <Header onDateRangeChange={handleDateRangeChange} />
      {error && <ErrorMessage message={error} />}
      {initialDataLoaded && <BoatMap positions={positions} />}
    </div>
  );
}

export default App;
