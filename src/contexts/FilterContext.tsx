import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface FilterValue {
  type: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
  startDate: Date | null;
  endDate: Date | null;
}

interface FilterContextType {
  filterValue: FilterValue;
  setFilterValue: (value: FilterValue) => void;
  getDateRange: () => { startDate: Date; endDate: Date } | null;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export const useFilter = () => {
  const context = useContext(FilterContext);
  if (context === undefined) {
    throw new Error('useFilter must be used within a FilterProvider');
  }
  return context;
};

interface FilterProviderProps {
  children: ReactNode;
}

export const FilterProvider: React.FC<FilterProviderProps> = ({ children }) => {
  const getIndianDate = () => {
    const now = new Date();
    const indianTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
    return indianTime;
  };

  const initializeFilter = (): FilterValue => {
    const indianNow = getIndianDate();
    const startDate = new Date(indianNow);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(indianNow);
    endDate.setHours(23, 59, 59, 999);
    
    return {
      type: 'today',
      startDate,
      endDate
    };
  };

  const [filterValue, setFilterValue] = useState<FilterValue>(initializeFilter());

  const getDateRange = (): { startDate: Date; endDate: Date } | null => {
    if (!filterValue.startDate || !filterValue.endDate) return null;
    
    return {
      startDate: filterValue.startDate,
      endDate: filterValue.endDate
    };
  };

  const value = {
    filterValue,
    setFilterValue,
    getDateRange
  };

  return (
    <FilterContext.Provider value={value}>
      {children}
    </FilterContext.Provider>
  );
};
