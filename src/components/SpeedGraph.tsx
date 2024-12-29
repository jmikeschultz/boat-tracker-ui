import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Position } from '../types';
import { formatDateOnly, formatTimestampWithZone, getMidnightUTC, getNextMidnightUTC } from '../utils/time';

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

  const startMidnight = getMidnightUTC(dateRange.from);
  const endMidnight = getNextMidnightUTC(dateRange.to);

  const ticks = [];
  let currentDate = new Date(startMidnight);
  while (currentDate.getTime() <= endMidnight) {
    ticks.push(currentDate.getTime());
    currentDate = new Date(getMidnightUTC(new Date(currentDate.getTime() + 24 * 60 * 60 * 1000)));
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: 'white',
        padding: '10px',
        boxSizing: 'border-box', // Ensure padding is included in container size
        overflow: 'hidden', // Prevent overflow beyond container
      }}
    >
      <ResponsiveContainer>
        <LineChart
          data={expandedData}
          margin={{
            top: 10,
            right: 30, // Increased margin on the right
            left: 10,
            bottom: 10,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="timestamp"
            domain={[startMidnight, endMidnight]}
            tickFormatter={(timestamp) => formatDateOnly(timestamp, timeZone)}
            ticks={ticks}
            type="number"
          />
          <YAxis
            domain={[0, maxSpeed * 1.1]}
            tickFormatter={(value) => value.toFixed(2)} // Two significant digits
          />
          <Tooltip
            labelFormatter={(timestamp) => formatTimestampWithZone(timestamp, timeZone)}
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
