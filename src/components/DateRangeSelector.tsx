// src/components/DateRangeSelector.tsx
import React, { useState } from 'react';

interface DateRangeSelectorProps {
  onRangeChange: (fromDate: Date, toDate: Date) => void;
}

export const DateRangeSelector: React.FC<DateRangeSelectorProps> = ({
  onRangeChange
}) => {
  const [fromDate, setFromDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [toDate, setToDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const handleDateChange = (isFromDate: boolean, newDate: string) => {
    if (isFromDate) {
      setFromDate(newDate);
      onRangeChange(new Date(newDate), new Date(toDate));
    } else {
      setToDate(newDate);
      onRangeChange(new Date(fromDate), new Date(newDate));
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
        padding: '4mm 4mm', // Spacing for top, bottom, and left
        borderBottom: '1px solid #ccc', // Optional separator for header
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <label
          htmlFor="from-date"
          style={{
            fontSize: '14px',
            fontWeight: 'bold',
            textAlign: 'right',
          }}
        >
          From:
        </label>
        <input
          id="from-date"
          type="date"
          value={fromDate}
          max={toDate}
          onChange={(e) => handleDateChange(true, e.target.value)}
          style={{
            padding: '5px',
            borderRadius: '4px',
            border: '1px solid #ccc',
            fontSize: '14px',
            width: '150px',
          }}
        />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <label
          htmlFor="to-date"
          style={{
            fontSize: '14px',
            fontWeight: 'bold',
            textAlign: 'right',
          }}
        >
          To:
        </label>
        <input
          id="to-date"
          type="date"
          value={toDate}
          min={fromDate}
          onChange={(e) => handleDateChange(false, e.target.value)}
          style={{
            padding: '5px',
            borderRadius: '4px',
            border: '1px solid #ccc',
            fontSize: '14px',
            width: '150px',
          }}
        />
      </div>
    </div>
  );
};
