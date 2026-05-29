import React from 'react';
import SearchBar, { type SearchFieldOption } from '../../ui/SearchBar';

export type { SearchFieldOption };
import type { TranslateFn } from './types';

interface TableHeaderSearchProps {
  id: string;
  variant: 'navbar' | 'inline';
  searchValue: string;
  setSearchValue: (value: string) => void;
  onSearch: (value: string) => void;
  searchPlaceholder?: string;
  searchField?: string;
  setSearchField?: (field: string) => void;
  availableSearchFields?: SearchFieldOption[];
  t: TranslateFn;
}

const LayoutSearchBar: React.FC<TableHeaderSearchProps> = ({
  id,
  variant,
  searchValue,
  setSearchValue,
  onSearch,
  searchPlaceholder,
  searchField,
  setSearchField,
  availableSearchFields,
  t,
}) => (
  <SearchBar
    id={id}
    variant={variant}
    value={searchValue}
    onChange={setSearchValue}
    onSearch={onSearch}
    placeholder={searchPlaceholder || t('layout.searchPlaceholder')}
    searchField={searchField}
    onSearchFieldChange={setSearchField}
    searchFields={availableSearchFields}
    autoComplete="off"
  />
);

export default LayoutSearchBar;
