import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export interface ModalTabItem {
  id: string;
  label: string;
  disabled?: boolean;
}

interface ModalTabsOverflowProps {
  tabs: ModalTabItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  tabsClassName?: string;
  disabledClassName?: string;
  isMobile?: boolean;
  id?: string;
}

const OVERFLOW_BUTTON_WIDTH = 44;
const DROPDOWN_Z_INDEX = 100001;

const ModalTabsOverflow: React.FC<ModalTabsOverflowProps> = ({
  tabs,
  activeTab,
  onTabChange,
  tabsClassName = '',
  disabledClassName = '',
  isMobile = false,
  id,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLUListElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(tabs.length);
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });

  const tabsClassNames = `nav nav-tabs ${tabsClassName}`.trim();

  const calculateVisibleCount = useCallback(() => {
    if (isMobile || tabs.length === 0) {
      setVisibleCount(tabs.length);
      return;
    }

    const container = containerRef.current;
    const measureList = measureRef.current;
    if (!container || !measureList) return;

    const items = measureList.querySelectorAll<HTMLElement>('[data-tab-measure]');
    if (items.length === 0) return;

    const containerWidth = container.clientWidth;
    const itemWidths = Array.from(items, (item) => item.offsetWidth);
    const totalWidth = itemWidths.reduce((sum, width) => sum + width, 0);

    if (totalWidth <= containerWidth) {
      setVisibleCount(tabs.length);
      return;
    }

    let usedWidth = 0;
    let count = 0;

    for (let i = 0; i < itemWidths.length; i += 1) {
      const hasMoreAfter = i < itemWidths.length - 1;
      const maxAllowed = containerWidth - (hasMoreAfter ? OVERFLOW_BUTTON_WIDTH : 0);

      if (usedWidth + itemWidths[i] <= maxAllowed) {
        usedWidth += itemWidths[i];
        count = i + 1;
      } else {
        break;
      }
    }

    setVisibleCount(Math.max(1, count));
  }, [isMobile, tabs.length]);

  useLayoutEffect(() => {
    calculateVisibleCount();
  }, [calculateVisibleCount, tabs]);

  useEffect(() => {
    if (isMobile) return undefined;

    const container = containerRef.current;
    if (!container) return undefined;

    const observer = new ResizeObserver(() => {
      calculateVisibleCount();
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [calculateVisibleCount, isMobile]);

  useEffect(() => {
    setShowDropdown(false);
  }, [activeTab]);

  const { visibleTabs, overflowTabs } = useMemo(() => {
    if (isMobile || visibleCount >= tabs.length) {
      return { visibleTabs: tabs, overflowTabs: [] as ModalTabItem[] };
    }

    let visible = tabs.slice(0, visibleCount);
    let overflow = tabs.slice(visibleCount);

    const activeInOverflow = overflow.find((tab) => tab.id === activeTab);
    if (activeInOverflow && visible.length > 0) {
      const lastVisible = visible[visible.length - 1];
      visible = [...visible.slice(0, -1), activeInOverflow];
      overflow = [lastVisible, ...overflow.filter((tab) => tab.id !== activeTab)];
    }

    return { visibleTabs: visible, overflowTabs: overflow };
  }, [activeTab, isMobile, tabs, visibleCount]);

  const hasOverflow = overflowTabs.length > 0;
  const isOverflowActive = overflowTabs.some((tab) => tab.id === activeTab);

  const calculateDropdownPosition = useCallback(() => {
    if (!triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();
    setDropdownPosition({
      top: rect.bottom + 4,
      left: rect.right,
    });
  }, []);

  const handleToggleDropdown = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (!showDropdown) {
      calculateDropdownPosition();
    }
    setShowDropdown((current) => !current);
  };

  useEffect(() => {
    if (!showDropdown) return undefined;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;

      if (
        triggerRef.current?.contains(target) ||
        dropdownRef.current?.contains(target)
      ) {
        return;
      }

      setShowDropdown(false);
    };

    const handleScrollOrResize = () => {
      calculateDropdownPosition();
    };

    const timeoutId = window.setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
      window.addEventListener('scroll', handleScrollOrResize, true);
      window.addEventListener('resize', handleScrollOrResize);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
      document.removeEventListener('click', handleClickOutside);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [calculateDropdownPosition, showDropdown]);

  const handleTabClick = (tab: ModalTabItem) => {
    if (tab.disabled) return;
    onTabChange(tab.id);
    setShowDropdown(false);
  };

  const renderTabButton = (tab: ModalTabItem) => (
    <button
      className={`nav-link modal-tab-hover ${activeTab === tab.id ? 'active' : ''} ${tab.disabled && disabledClassName ? disabledClassName : ''}`}
      type="button"
      onClick={() => handleTabClick(tab)}
      disabled={tab.disabled}
    >
      {tab.label}
    </button>
  );

  const renderMeasureTab = (tab: ModalTabItem) => (
    <li key={tab.id} className="nav-item" role="presentation" data-tab-measure>
      <button type="button" className="nav-link" tabIndex={-1}>
        {tab.label}
      </button>
    </li>
  );

  return (
    <div className="modal-tabs-overflow-container" ref={containerRef}>
      {!isMobile && (
        <ul
          ref={measureRef}
          className={`${tabsClassNames} modal-tabs-overflow-measure`}
          aria-hidden="true"
        >
          {tabs.map(renderMeasureTab)}
        </ul>
      )}

      <ul
        className={tabsClassNames}
        id={id}
        role="tablist"
        style={{
          margin: 0,
          padding: 0,
          borderBottom: 'none',
          backgroundColor: 'transparent',
        }}
      >
        {visibleTabs.map((tab) => (
          <li key={tab.id} className="nav-item" role="presentation">
            {renderTabButton(tab)}
          </li>
        ))}
      </ul>

      {hasOverflow && (
        <div className="modal-tabs-overflow-menu">
          <button
            ref={triggerRef}
            type="button"
            className={`nav-link modal-tab-hover modal-tabs-overflow-trigger ${isOverflowActive ? 'active' : ''} ${showDropdown ? 'open' : ''}`}
            onClick={handleToggleDropdown}
            aria-expanded={showDropdown}
            aria-haspopup="menu"
            aria-label="Mais abas"
          >
            ⋮
          </button>

          {showDropdown && createPortal(
            <div
              ref={dropdownRef}
              className="modal-tabs-overflow-dropdown"
              style={{
                position: 'fixed',
                top: `${dropdownPosition.top}px`,
                left: `${dropdownPosition.left}px`,
                transform: 'translateX(-100%)',
                zIndex: DROPDOWN_Z_INDEX,
              }}
              role="menu"
            >
              {overflowTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`modal-tabs-overflow-dropdown-item ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => handleTabClick(tab)}
                  disabled={tab.disabled}
                  role="menuitem"
                >
                  {tab.label}
                </button>
              ))}
            </div>,
            document.body,
          )}
        </div>
      )}
    </div>
  );
};

export default ModalTabsOverflow;
