import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { DynamicStyledElement } from 'components/ui/DynamicStyleElements';
import { NavLinkButton } from 'components/ui';

const OPEN_DELAY_MS = 200;
const CLOSE_DELAY_MS = 200;

export interface UserMenuFlyoutOption {
  id: string;
  label: string;
  icon?: string;
  active?: boolean;
  onSelect: () => void;
}

interface UserMenuFlyoutProps {
  label: string;
  iconClassName: string;
  options: UserMenuFlyoutOption[];
  ariaLabel: string;
}

/** Item do menu do usuário com submenu em flyout (fora do dropdown, como o menu superior). */
const UserMenuFlyout: React.FC<UserMenuFlyoutProps> = ({
  label,
  iconClassName,
  options,
  ariaLabel,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [pos, setPos] = useState({ left: 0, top: 0 });
  const itemRef = useRef<HTMLLIElement>(null);
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearOpenTimer = () => {
    if (openTimerRef.current !== null) {
      clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
  };

  const clearCloseTimer = () => {
    if (closeTimerRef.current !== null) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  useEffect(
    () => () => {
      clearOpenTimer();
      clearCloseTimer();
    },
    []
  );

  const updatePosition = useCallback(() => {
    const el = itemRef.current;
    if (!el) {
      return;
    }
    const rect = el.getBoundingClientRect();
    const flyoutWidth = 180;
    const gap = 6;
    const openLeft = rect.left - flyoutWidth - gap;
    const left = openLeft >= 8 ? openLeft : Math.round(rect.right + gap);
    setPos({
      left: Math.round(left),
      top: Math.round(rect.top),
    });
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) {
      return;
    }
    updatePosition();
  }, [isOpen, updatePosition]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const onReposition = () => updatePosition();
    window.addEventListener('resize', onReposition);
    window.addEventListener('scroll', onReposition, true);
    return () => {
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
    };
  }, [isOpen, updatePosition]);

  const scheduleOpen = () => {
    clearCloseTimer();
    if (isOpen) {
      return;
    }
    clearOpenTimer();
    openTimerRef.current = setTimeout(() => {
      openTimerRef.current = null;
      setIsOpen(true);
    }, OPEN_DELAY_MS);
  };

  const scheduleClose = () => {
    clearOpenTimer();
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null;
      setIsOpen(false);
    }, CLOSE_DELAY_MS);
  };

  const keepOpen = () => {
    clearCloseTimer();
    clearOpenTimer();
    setIsOpen(true);
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    clearOpenTimer();
    clearCloseTimer();
    setIsOpen((open) => !open);
  };

  return (
    <li
      ref={itemRef}
      className={`layout-user-dropdown__flyout-item${isOpen ? ' layout-user-dropdown__flyout-item--open' : ''}`}
      onMouseEnter={scheduleOpen}
      onMouseLeave={scheduleClose}
    >
      <NavLinkButton
        className="layout-user-dropdown__row"
        onClick={handleToggle}
        aria-expanded={isOpen}
        aria-haspopup="true"
        ariaLabel={ariaLabel}
      >
        <i className={iconClassName} aria-hidden />
        <span>{label}</span>
        <i className="bi bi-chevron-right layout-user-dropdown__chevron" aria-hidden />
      </NavLinkButton>

      {isOpen &&
        createPortal(
          <DynamicStyledElement
            className="layout-user-menu-flyout"
            data-user-menu-flyout
            role="menu"
            properties={{
              position: 'fixed',
              left: `${pos.left}px`,
              top: `${pos.top}px`,
              zIndex: 1080,
            }}
            deps={[pos.left, pos.top]}
            onMouseEnter={keepOpen}
            onMouseLeave={scheduleClose}
          >
            {options.map((option) => (
              <NavLinkButton
                key={option.id}
                className={`layout-user-menu-flyout__option${option.active ? ' active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  option.onSelect();
                  setIsOpen(false);
                }}
                ariaLabel={option.label}
              >
                {option.icon && <span className="me-2">{option.icon}</span>}
                <span className="text-truncate">{option.label}</span>
                {option.active && <i className="bi bi-check-lg ms-auto" aria-hidden />}
              </NavLinkButton>
            ))}
          </DynamicStyledElement>,
          document.body
        )}
    </li>
  );
};

export default UserMenuFlyout;
