import React, { createContext, useContext, useState, ReactNode } from 'react';

interface DashboardFiltersContextType {
  startDate: string;
  endDate: string;
  setStartDate: (date: string) => void;
  setEndDate: (date: string) => void;
  handleResetPeriod: () => void;
  periodoInicioLabel: string;
  periodoFimLabel: string;
}

const DashboardFiltersContext = createContext<DashboardFiltersContextType | undefined>(undefined);

export const useDashboardFilters = () => {
  const context = useContext(DashboardFiltersContext);
  if (!context) {
    // Retornar valores padrão se não estiver no provider
    const { start: defaultStartDate, end: defaultEndDate } = getCurrentMonthRange();
    const defaultStart = formatDateToInput(defaultStartDate);
    const defaultEnd = formatDateToInput(defaultEndDate);
    return {
      startDate: defaultStart,
      endDate: defaultEnd,
      setStartDate: () => {},
      setEndDate: () => {},
      handleResetPeriod: () => {},
      periodoInicioLabel: formatDateLabel(defaultStart),
      periodoFimLabel: formatDateLabel(defaultEnd),
    };
  }
  return context;
};

interface DashboardFiltersProviderProps {
  children: ReactNode;
}

const formatDateToInput = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDateLabel = (value?: string): string => {
  if (!value) return '';
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
};

const getCurrentMonthRange = () => {
  const today = new Date();
  return {
    start: new Date(today.getFullYear(), today.getMonth(), 1),
    end: new Date(today.getFullYear(), today.getMonth() + 1, 0),
  };
};

export const DashboardFiltersProvider: React.FC<DashboardFiltersProviderProps> = ({ children }) => {
  const { start: defaultStartDate, end: defaultEndDate } = getCurrentMonthRange();
  const defaultStart = formatDateToInput(defaultStartDate);
  const defaultEnd = formatDateToInput(defaultEndDate);

  const [startDate, setStartDate] = useState<string>(defaultStart);
  const [endDate, setEndDate] = useState<string>(defaultEnd);

  const handleResetPeriod = () => {
    setStartDate(defaultStart);
    setEndDate(defaultEnd);
  };

  const periodoInicioLabel = formatDateLabel(startDate);
  const periodoFimLabel = formatDateLabel(endDate);

  return (
    <DashboardFiltersContext.Provider
      value={{
        startDate,
        endDate,
        setStartDate,
        setEndDate,
        handleResetPeriod,
        periodoInicioLabel,
        periodoFimLabel,
      }}
    >
      {children}
    </DashboardFiltersContext.Provider>
  );
};

