import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Position } from '../types';
import { formatDateOnly, formatTimestamp, getMidnightUTC, getNextMidnightUTC } from '../utils/time';

interface SpeedGraphProps {
  positions: Position[];
  dateRange: {
    from: Date;
    to: Date;
  };
}

export const SpeedGraph: React.FC<SpeedGraphProps> = ({ positions, dateRange }) => {
  if (!Array.isArray(positions) || positions.length === 0) {
    console.warn("No positions data available for graphing.");
    return null;
  }

  // Expand data for graph points
  const expandedData = positions.flatMap((pos, index) => {
    const points = [];
    if (index > 0 && positions[index - 1].gmt_timestamp < pos.gmt_timestamp) {
      points.push({
        gmt_timestamp: pos.gmt_timestamp - 1,
        speed: 0,
        tz_offset: pos.tz_offset,
      });
    }
    points.push(pos);
    points.push({
      gmt_timestamp: pos.gmt_timestamp + 1,
      speed: 0,
      tz_offset: pos.tz_offset,
    });
    return points;
  });

  // Ensure expandedData has valid length
  if (!Array.isArray(expandedData) || expandedData.length === 0) {
    console.error("Expanded data for graph is invalid.");
    return null;
  }

  // Calculate max speed and timezone offset
  const maxSpeed = Math.max(...positions.map((p) => p.speed));
  const tz_offset = positions[0]?.tz_offset || "UTC";

  // Define start and end range for ticks
  const startMidnight = getMidnightUTC(dateRange.from);
  const endMidnight = getNextMidnightUTC(dateRange.to);

  // Generate ticks for X-Axis
  const ticks = [];
  let currentDate = new Date(startMidnight * 1000); // Convert to milliseconds
  const endDate = new Date(endMidnight * 1000);

  while (currentDate <= endDate) {
    ticks.push(Math.floor(currentDate.getTime() / 1000)); // Store ticks in seconds
    currentDate.setUTCDate(currentDate.getUTCDate() + 1);
  }

  if (ticks.length === 0) {
    console.error("Ticks array is empty or invalid.");
    return null;
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: 'white',
        padding: '10px',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      <ResponsiveContainer>
        <LineChart
          data={expandedData}
          margin={{
            top: 10,
            right: 30,
            left: 10,
            bottom: 10,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="gmt_timestamp" // Use gmt_timestamp for the X-axis
            domain={[startMidnight, endMidnight]}
            tickFormatter={(gmt_timestamp) => formatDateOnly(gmt_timestamp, tz_offset)}
            ticks={ticks}
            type="number"
          />
          <YAxis
            domain={[0, maxSpeed * 1.1]}
            tickFormatter={(value) => value.toFixed(2)}
          />
          <Tooltip
            labelFormatter={(gmt_timestamp) => formatTimestamp(gmt_timestamp, tz_offset)}
            formatter={(value) => [`${Number(value).toFixed(2)} kts`, 'Speed']}
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
