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
  onSearchClick: (() => void) | null;
  setOnSearchClick: (callback: (() => void) | null) => void;
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
  const [onSearchClick, setOnSearchClick] = useState<(() => void) | null>(null);
  const [onReloadClick, setOnReloadClick] = useState<(() => void) | null>(null);
  const [searchPlaceholder, setSearchPlaceholder] = useState('Buscar...');
  const [searchValue, setSearchValue] = useState('');
  const [searchField, setSearchField] = useState('razao_social');
  const [availableSearchFields, setAvailableSearchFields] = useState<SearchField[]>([
    { id: 'id', label: 'ID' },
    { id: 'cnpj', label: 'CNPJ' },
    { id: 'razao_social', label: 'Razão Social' },
    { id: 'nome_fantasia', label: 'Nome Fantasia' },
    { id: 'email', label: 'Email' },
    { id: 'status', label: 'Status' }
  ]);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [loading, setLoading] = useState(false);

  const value = React.useMemo(() => {
    return {
      title,
      setTitle: (v: string | null) => {
        if (v !== title) {
          setTitle(v);
        }
      },
      showSearch,
      setShowSearch: (v: boolean) => {
        if (v !== showSearch) {
          setShowSearch(v);
        }
      },
      showReload,
      setShowReload: (v: boolean) => {
        if (v !== showReload) {
          setShowReload(v);
        }
      },
      onSearchClick,
      setOnSearchClick: (v: (() => void) | null) => {
        if (v !== onSearchClick) {
          setOnSearchClick(v);
        }
      },
      onReloadClick,
      setOnReloadClick: (v: (() => void) | null) => {
        if (v !== onReloadClick) {
          setOnReloadClick(v);
        }
      },
      searchPlaceholder,
      setSearchPlaceholder: (v: string) => {
        if (v !== searchPlaceholder) {
          setSearchPlaceholder(v);
        }
      },
      searchValue,
      setSearchValue: (v: string) => {
        if (v !== searchValue) {
          setSearchValue(v);
        }
      },
      searchField,
      setSearchField: (v: string) => {
        if (v !== searchField) {
          setSearchField(v);
        }
      },
      availableSearchFields,
      setAvailableSearchFields: (v: SearchField[]) => {
        if (JSON.stringify(availableSearchFields) !== JSON.stringify(v)) {
          setAvailableSearchFields(v);
        }
      },
      showMobileSearch,
      setShowMobileSearch: (v: boolean) => {
        if (v !== showMobileSearch) {
          setShowMobileSearch(v);
        }
      },
      loading,
      setLoading: (v: boolean) => {
        if (v !== loading) {
          setLoading(v);
        }
      },
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
      searchField: 'razao_social',
      setSearchField: () => {},
      availableSearchFields: [
        { id: 'id', label: 'ID' },
        { id: 'cnpj', label: 'CNPJ' },
        { id: 'razao_social', label: 'Razão Social' },
        { id: 'nome_fantasia', label: 'Nome Fantasia' },
        { id: 'email', label: 'Email' },
        { id: 'status', label: 'Status' }
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

