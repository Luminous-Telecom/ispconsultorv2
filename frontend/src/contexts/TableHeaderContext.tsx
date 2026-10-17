/* eslint-disable no-console */
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface SearchField {
  id: string;
  label: string;
}

interface TableHeaderContextType {
  title: string | null;
  setTitle: (title: string | null) => void;
  showSearch: boolean;
  setShowSearch: (show: boolean) => void;
  showReload: boolean;
  setShowReload: (show: boolean) => void;
  onSearchClick: ((value?: string) => void) | null;
  setOnSearchClick: (callback: ((value?: string) => void) | null) => void;
  onReloadClick: (() => void) | null;
  setOnReloadClick: (callback: (() => void) | null) => void;
  searchPlaceholder: string;
  setSearchPlaceholder: (placeholder: string) => void;
  searchValue: string;
  setSearchValue: (value: string) => void;
  searchField: string;
  setSearchField: (field: string) => void;
  availableSearchFields: SearchField[];
  setAvailableSearchFields: (fields: SearchField[]) => void;
  showMobileSearch: boolean;
  setShowMobileSearch: (show: boolean) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

const TableHeaderContext = createContext<TableHeaderContextType | undefined>(undefined);

export const TableHeaderProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [title, setTitle] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(true);
  const [showReload, setShowReload] = useState(false);
  const [onSearchClick, setOnSearchClick] = useState<((value?: string) => void) | null>(null);
  const [onReloadClick, setOnReloadClick] = useState<(() => void) | null>(null);
  const [searchPlaceholder, setSearchPlaceholder] = useState('Buscar...');
  const [searchValue, setSearchValue] = useState('');
  const [searchField, setSearchField] = useState('todos');
  const [availableSearchFields, setAvailableSearchFields] = useState<SearchField[]>([
    { id: 'todos', label: 'Todos' },
    { id: 'status', label: 'Status' },
    { id: 'id', label: 'ID' },
    { id: 'cnpj', label: 'CNPJ' },
    { id: 'razao_social', label: 'Razão Social' },
    { id: 'nome_fantasia', label: 'Nome Fantasia' },
    { id: 'email', label: 'Email' },
  ]);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [loading, setLoading] = useState(false);

  const value = React.useMemo(() => {
    return {
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
      searchField,
      setSearchField,
      availableSearchFields,
      setAvailableSearchFields,
      showMobileSearch,
      setShowMobileSearch,
      loading,
      setLoading,
    };
  }, [
    title,
    showSearch,
    showReload,
    onSearchClick,
    onReloadClick,
    searchPlaceholder,
    searchValue,
    searchField,
    availableSearchFields,
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
      searchField: 'todos',
      setSearchField: () => {},
      availableSearchFields: [
        { id: 'todos', label: 'Todos' },
        { id: 'status', label: 'Status' },
        { id: 'id', label: 'ID' },
        { id: 'cnpj', label: 'CNPJ' },
        { id: 'razao_social', label: 'Razão Social' },
        { id: 'nome_fantasia', label: 'Nome Fantasia' },
        { id: 'email', label: 'Email' },
      ],
      setAvailableSearchFields: () => {},
      showMobileSearch: false,
      setShowMobileSearch: () => {},
      loading: false,
      setLoading: () => {},
    };
  }
  return context;
};

