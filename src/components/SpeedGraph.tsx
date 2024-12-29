import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Position } from '../types';

interface SpeedGraphProps {
  positions: Position[];
  dateRange: {
    from: Date;
    to: Date;
  };
}

export const SpeedGraph: React.FC<SpeedGraphProps> = ({ positions, dateRange }) => {
  if (positions.length === 0) {
    return null;
  }

  const formatTimestamp = (timestamp: number, timeZone: string | undefined): string => {
    if (!timeZone) {
      return "Unknown";
    }
    try {
      const date = new Date(timestamp);
      const utcDate = new Date(Date.UTC(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        date.getHours(),
        date.getMinutes(),
        date.getSeconds(),
        date.getMilliseconds()
      ));
      
      return new Intl.DateTimeFormat('en-US', {
        timeZone,
        month: 'numeric',
        day: 'numeric',
      }).format(utcDate);
    }
    catch (error) {
      console.error("Error formatting timestamp:", error);
      return "Invalid Date";
    }
  };

  const expandedData = positions.flatMap((pos, index) => {
    const points = [];
    if (index > 0) {
      points.push({
        timestamp: pos.timestamp - 1,
        speed: 0,
        time_zone: pos.time_zone
      });
    }
    points.push(pos);
    points.push({
      timestamp: pos.timestamp + 1,
      speed: 0,
      time_zone: pos.time_zone
    });
    return points;
  });

  const maxSpeed = Math.max(...positions.map(p => p.speed));
  const timeZone = positions[0]?.time_zone;

  // Use the dateRange props for the domain
  const startMidnight = Date.UTC(
    dateRange.from.getUTCFullYear(),
    dateRange.from.getUTCMonth(),
    dateRange.from.getUTCDate()
  );
  const endMidnight = Date.UTC(
    dateRange.to.getUTCFullYear(),
    dateRange.to.getUTCMonth(),
    dateRange.to.getUTCDate() + 1
  );

  const ticks = [];
  let currentDate = new Date(startMidnight);
  while (currentDate.getTime() <= endMidnight) {
    ticks.push(currentDate.getTime());
    currentDate = new Date(Date.UTC(
      currentDate.getUTCFullYear(),
      currentDate.getUTCMonth(),
      currentDate.getUTCDate() + 1
    ));
  }

  return (
    <div style={{ width: '100%', height: '100%', backgroundColor: 'white' }}>
      <ResponsiveContainer>
        <LineChart data={expandedData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="timestamp"
            domain={[startMidnight, endMidnight]}
            tickFormatter={(timestamp) => formatTimestamp(timestamp, timeZone)}
            ticks={ticks}
            type="number"
          />
          <YAxis 
            domain={[0, maxSpeed * 1.1]}
          />
          <Tooltip 
            labelFormatter={(timestamp) => {
              const date = new Date(timestamp);
              const utcDate = new Date(Date.UTC(
                date.getFullYear(),
                date.getMonth(),
                date.getDate(),
                date.getHours(),
                date.getMinutes(),
                date.getSeconds(),
                date.getMilliseconds()
              ));
              return new Intl.DateTimeFormat('en-US', {
                timeZone: timeZone,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
              }).format(utcDate);
            }}
            formatter={(value) => [`${Number(value).toFixed(1)} kts`, 'Speed']}
          />
          <Line 
            type="monotone" 
            dataKey="speed" 
            stroke="#8884d8" 
            dot={false}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
