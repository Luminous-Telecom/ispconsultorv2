import React from 'react';
import SearchBar, { type SearchFieldOption } from '../../ui/SearchBar';
import type { TranslateFn } from './types';

interface MobileSearchPanelProps {
  searchValue: string;
  setSearchValue: (value: string) => void;
  onSearch?: (value: string) => void;
  searchPlaceholder?: string;
  searchField?: string;
  setSearchField?: (field: string) => void;
  availableSearchFields?: SearchFieldOption[];
  onClose: () => void;
  t: TranslateFn;
}

const MobileSearchPanel: React.FC<MobileSearchPanelProps> = ({
  searchValue,
  setSearchValue,
  onSearch,
  searchPlaceholder,
  searchField,
  setSearchField,
  availableSearchFields,
  onClose,
  t,
}) => (
  <div className="navbar-mobile-search-container">
    <div className="navbar-mobile-search-wrapper">
      <SearchBar
        id="mobile-search"
        variant="mobile"
        value={searchValue}
        onChange={setSearchValue}
        onSearch={(value) => onSearch?.(value)}
        placeholder={searchPlaceholder || t('layout.searchPlaceholder')}
        searchField={searchField}
        onSearchFieldChange={setSearchField}
        searchFields={availableSearchFields}
        className="flex-grow-1"
      />
      <button
        type="button"
        className="navbar-mobile-search-close"
        onClick={onClose}
        aria-label={t('layout.closeSearch')}
      >
        <i className="bi bi-x"></i>
      </button>
    </div>
  </div>
);

export default MobileSearchPanel;
