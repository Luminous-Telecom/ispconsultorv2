import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { PositionedFixed, NavLinkButton } from 'components/ui';
import { usePrefersRealHover } from 'hooks/usePrefersRealHover';
import { computeFixedDropdownPosition } from 'utils/fixedDropdownPosition';

export interface ModalTabItem<T extends string = string> {
  id: T;
  label: string;
  disabled?: boolean;
}

interface ModalTabsOverflowProps<T extends string = string> {
  tabs: ModalTabItem<T>[];
  activeTab: T;
  onTabChange: (tabId: T) => void;
  tabsClassName?: string;
  disabledClassName?: string;
  isMobile?: boolean;
  id?: string;
}

const OVERFLOW_BUTTON_WIDTH = 44;

/** Mesmo atraso do menu superior (~0,25 s) ao passar o mouse nas abas. */
export const MODAL_TAB_HOVER_DELAY_MS = 250;

function ModalTabsOverflow<T extends string = string>({
  tabs,
  activeTab,
  onTabChange,
  tabsClassName = '',
  disabledClassName = '',
  isMobile = false,
  id,
}: ModalTabsOverflowProps<T>) {
  const prefersHover = usePrefersRealHover();
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLUListElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [visibleCount, setVisibleCount] = useState(tabs.length);
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });

  const tabsClassNames = `nav nav-tabs ${tabsClassName}`.trim();

  const clearHoverTimer = useCallback(() => {
    if (hoverTimerRef.current !== null) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  }, []);

  useEffect(() => () => clearHoverTimer(), [clearHoverTimer]);

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
      return { visibleTabs: tabs, overflowTabs: [] as ModalTabItem<T>[] };
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

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const menuRect = dropdownRef.current?.getBoundingClientRect();
    setDropdownPosition(
      computeFixedDropdownPosition(triggerRect, {
        align: 'end',
        menuWidth: menuRect?.width ?? 180,
        menuHeight: menuRect?.height,
      })
    );
  }, []);

  const openDropdown = useCallback(() => {
    calculateDropdownPosition();
    setShowDropdown(true);
  }, [calculateDropdownPosition]);

  const handleToggleDropdown = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (!showDropdown) {
      openDropdown();
      return;
    }
    setShowDropdown(false);
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

  const handleTabChange = useCallback(
    (tab: ModalTabItem<T>) => {
      if (tab.disabled) return;
      clearHoverTimer();
      onTabChange(tab.id);
      setShowDropdown(false);
    },
    [clearHoverTimer, onTabChange]
  );

  const scheduleTabChange = useCallback(
    (tab: ModalTabItem<T>) => {
      if (!prefersHover || isMobile || tab.disabled || tab.id === activeTab) {
        return;
      }
      clearHoverTimer();
      hoverTimerRef.current = setTimeout(() => {
        hoverTimerRef.current = null;
        onTabChange(tab.id);
        setShowDropdown(false);
      }, MODAL_TAB_HOVER_DELAY_MS);
    },
    [activeTab, clearHoverTimer, isMobile, onTabChange, prefersHover]
  );

  const scheduleOverflowOpen = useCallback(() => {
    if (!prefersHover || isMobile) {
      return;
    }
    clearHoverTimer();
    hoverTimerRef.current = setTimeout(() => {
      hoverTimerRef.current = null;
      openDropdown();
    }, MODAL_TAB_HOVER_DELAY_MS);
  }, [clearHoverTimer, isMobile, openDropdown, prefersHover]);

  const renderTabButton = (tab: ModalTabItem<T>) => (
    <NavLinkButton
      className={`nav-link modal-tab-hover ${activeTab === tab.id ? 'active' : ''} ${tab.disabled && disabledClassName ? disabledClassName : ''}`}
      onClick={() => handleTabChange(tab)}
      onMouseEnter={() => scheduleTabChange(tab)}
      onMouseLeave={clearHoverTimer}
      disabled={tab.disabled}
      ariaLabel={tab.label}
    >
      {tab.label}
    </NavLinkButton>
  );

  const renderMeasureTab = (tab: ModalTabItem<T>) => (
    <li key={tab.id} className="nav-item" role="presentation" data-tab-measure>
      <NavLinkButton className="nav-link" tabIndex={-1} ariaLabel={tab.label}>
        {tab.label}
      </NavLinkButton>
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
        className={`${tabsClassNames} modal-tabs-overflow-list`}
        id={id}
        role="tablist"
      >
        {visibleTabs.map((tab) => (
          <li key={tab.id} className="nav-item" role="presentation">
            {renderTabButton(tab)}
          </li>
        ))}
      </ul>

      {hasOverflow && (
        <div
          className="modal-tabs-overflow-menu"
          onMouseEnter={scheduleOverflowOpen}
          onMouseLeave={clearHoverTimer}
        >
          <NavLinkButton
            ref={triggerRef}
            className={`nav-link modal-tab-hover modal-tabs-overflow-trigger ${isOverflowActive ? 'active' : ''} ${showDropdown ? 'open' : ''}`}
            onClick={handleToggleDropdown}
            aria-expanded={showDropdown}
            aria-haspopup="menu"
            ariaLabel="Mais abas"
          >
            ⋮
          </NavLinkButton>

          {showDropdown && createPortal(
            <PositionedFixed
              left={dropdownPosition.left}
              top={dropdownPosition.top}
              className="app-menu-dropdown__host"
            >
              <div
                ref={dropdownRef}
                className="app-menu-dropdown__panel modal-tabs-overflow-dropdown"
                role="menu"
                onMouseEnter={clearHoverTimer}
                onMouseLeave={() => {
                  if (prefersHover) {
                    setShowDropdown(false);
                  }
                }}
              >
                {overflowTabs.map((tab) => (
                  <NavLinkButton
                    key={tab.id}
                    className={`app-menu-dropdown__item ${activeTab === tab.id ? 'active' : ''}`}
                    onClick={() => handleTabChange(tab)}
                    onMouseEnter={() => scheduleTabChange(tab)}
                    onMouseLeave={clearHoverTimer}
                    disabled={tab.disabled}
                    role="menuitem"
                    ariaLabel={tab.label}
                  >
                    {tab.label}
                  </NavLinkButton>
                ))}
              </div>
            </PositionedFixed>,
            document.body,
          )}
        </div>
      )}
    </div>
  );
}

export default ModalTabsOverflow;
