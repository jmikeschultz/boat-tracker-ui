// src/components/Header.tsx
import React from 'react';
import { DateRangeSelector } from './DateRangeSelector';

interface HeaderProps {
  onDateRangeChange: (fromDate: Date, toDate: Date) => void;
}

export const Header: React.FC<HeaderProps> = ({ onDateRangeChange }) => {
  return (
    <div className="bg-white shadow-sm py-3 px-4">
      <DateRangeSelector onRangeChange={onDateRangeChange} />
    </div>
  );
};
