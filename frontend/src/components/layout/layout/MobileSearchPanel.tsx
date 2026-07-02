import React from 'react';
import { IconOnlyButton } from 'components/ui';
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
      <IconOnlyButton
        className="navbar-mobile-search-close"
        onClick={onClose}
        label={t('layout.closeSearch')}
        iconClassName="bi bi-x"
      />
    </div>
  </div>
);

export default MobileSearchPanel;
