import React from 'react';

interface SidebarMenuSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  id?: string;
}

const SidebarMenuSearch: React.FC<SidebarMenuSearchProps> = ({
  value,
  onChange,
  placeholder,
  id = 'sidebar-menu-search',
}) => (
  <div className="sidebar-menu-search">
    <div className="sidebar-menu-search-input-wrap">
      <i className="bi bi-search sidebar-menu-search-icon" aria-hidden />
      <input
        type="search"
        id={id}
        name="sidebarMenuSearch"
        className="sidebar-menu-search-input"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
        aria-label={placeholder}
      />
    </div>
  </div>
);

export default SidebarMenuSearch;
