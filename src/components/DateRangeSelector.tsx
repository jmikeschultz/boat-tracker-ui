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
    <div className="flex items-center justify-center gap-6">
      <div className="flex flex-col">
        <label 
          className="block text-sm font-medium text-gray-700 mb-1 w-20"
          htmlFor="from-date"
        >
          From Date
        </label>
        <input
          id="from-date"
          type="date"
          value={fromDate}
          max={toDate}
          onChange={(e) => handleDateChange(true, e.target.value)}
          className="block w-44 rounded-md border-gray-300 shadow-sm 
                   focus:border-blue-500 focus:ring-blue-500 
                   px-3 py-2 text-sm border"
        />
      </div>
      <div className="flex flex-col">
        <label 
          className="block text-sm font-medium text-gray-700 mb-1 w-20"
          htmlFor="to-date"
        >
          To Date
        </label>
        <input
          id="to-date"
          type="date"
          value={toDate}
          min={fromDate}
          onChange={(e) => handleDateChange(false, e.target.value)}
          className="block w-44 rounded-md border-gray-300 shadow-sm 
                   focus:border-blue-500 focus:ring-blue-500 
                   px-3 py-2 text-sm border"
        />
      </div>
    </div>
  );
};
