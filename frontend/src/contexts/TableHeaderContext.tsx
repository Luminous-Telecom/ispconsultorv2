import React, { createContext, useContext, useState, ReactNode } from 'react';

interface TableHeaderContextType {
  title: string | null;
  setTitle: (title: string | null) => void;
  showSearch: boolean;
  setShowSearch: (show: boolean) => void;
  showReload: boolean;
  setShowReload: (show: boolean) => void;
  onSearchClick: (() => void) | null;
  setOnSearchClick: (callback: (() => void) | null) => void;
  onReloadClick: (() => void) | null;
  setOnReloadClick: (callback: (() => void) | null) => void;
  searchPlaceholder: string;
  setSearchPlaceholder: (placeholder: string) => void;
  searchValue: string;
  setSearchValue: (value: string) => void;
  showMobileSearch: boolean;
  setShowMobileSearch: (show: boolean) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

const TableHeaderContext = createContext<TableHeaderContextType | undefined>(undefined);

export const TableHeaderProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [title, setTitle] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [showReload, setShowReload] = useState(false);
  const [onSearchClick, setOnSearchClick] = useState<(() => void) | null>(null);
  const [onReloadClick, setOnReloadClick] = useState<(() => void) | null>(null);
  const [searchPlaceholder, setSearchPlaceholder] = useState('Buscar...');
  const [searchValue, setSearchValue] = useState('');
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [loading, setLoading] = useState(false);

  const value = React.useMemo(() => ({
    title,
    setTitle,
    showSearch,
    setShowSearch,
    showReload,
    setShowReload,
    onSearchClick,
    setOnSearchClick,
    onReloadClick,
    setOnReloadClick,
    searchPlaceholder,
    setSearchPlaceholder,
    searchValue,
    setSearchValue,
    showMobileSearch,
    setShowMobileSearch,
    loading,
    setLoading,
  }), [
    title,
    showSearch,
    showReload,
    onSearchClick,
    onReloadClick,
    searchPlaceholder,
    searchValue,
    showMobileSearch,
    loading
  ]);

  return (
    <TableHeaderContext.Provider value={value}>
      {children}
    </TableHeaderContext.Provider>
  );
};

export const useTableHeader = () => {
  const context = useContext(TableHeaderContext);
  if (!context) {
    // Retornar objeto vazio em vez de lançar erro para permitir uso opcional
    return {
      title: null,
      setTitle: () => {},
      showSearch: false,
      setShowSearch: () => {},
      showReload: false,
      setShowReload: () => {},
      onSearchClick: null,
      setOnSearchClick: () => {},
      onReloadClick: null,
      setOnReloadClick: () => {},
      searchPlaceholder: 'Buscar...',
      setSearchPlaceholder: () => {},
      searchValue: '',
      setSearchValue: () => {},
      showMobileSearch: false,
      setShowMobileSearch: () => {},
      loading: false,
      setLoading: () => {},
    };
  }
  return context;
};

