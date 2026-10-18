import React, {
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactElement,
} from 'react';
import { createPortal } from 'react-dom';
import { PositionedFixed } from 'components/ui/DynamicStyleElements';
import {
  computeFixedDropdownPosition,
  type FixedDropdownAlign,
} from 'utils/fixedDropdownPosition';

export type AppMenuDropdownItem = {
  key: string;
  label: string;
  onClick: (event: React.MouseEvent) => void;
  disabled?: boolean;
};

export type AppMenuDropdownProps = {
  /** Botão ou elemento que abre o menu (recebe aria e onClick). */
  trigger: ReactElement;
  items: AppMenuDropdownItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  align?: FixedDropdownAlign;
  className?: string;
  menuClassName?: string;
};

/**
 * Menu em portal no padrão visual do menu superior (cantos arredondados + hover).
 * Evita clip de overflow de modais.
 */
export function AppMenuDropdown({
  trigger,
  items,
  open,
  onOpenChange,
  align = 'start',
  className = '',
  menuClassName = '',
}: AppMenuDropdownProps): React.ReactElement {
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: 0, top: 0 });

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const menuRect = menuRef.current?.getBoundingClientRect();
    setPosition(
      computeFixedDropdownPosition(triggerRect, {
        align,
        menuWidth: menuRect?.width ?? 200,
        menuHeight: menuRect?.height,
      })
    );
  }, [align]);

  useEffect(() => {
    if (!open) return undefined;

    updatePosition();

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      onOpenChange(false);
    };

    const handleScrollOrResize = () => {
      updatePosition();
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
  }, [onOpenChange, open, updatePosition]);

  const handleToggle = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (open) {
      onOpenChange(false);
      return;
    }
    updatePosition();
    onOpenChange(true);
  };

  const triggerNode = isValidElement(trigger)
    ? cloneElement(trigger as ReactElement<Record<string, unknown>>, {
        onClick: (event: React.MouseEvent) => {
          const originalOnClick = (trigger.props as { onClick?: (e: React.MouseEvent) => void })
            .onClick;
          originalOnClick?.(event);
          if (!event.defaultPrevented) {
            handleToggle(event);
          }
        },
        'aria-expanded': open,
        'aria-haspopup': 'menu',
      })
    : trigger;

  return (
    <div
      className={['app-menu-dropdown', className].filter(Boolean).join(' ')}
      ref={triggerRef}
    >
      {triggerNode}
      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <PositionedFixed
            left={position.left}
            top={position.top}
            className={['app-menu-dropdown__host', menuClassName].filter(Boolean).join(' ')}
          >
            <div ref={menuRef} className="app-menu-dropdown__panel" role="menu">
              {items.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  role="menuitem"
                  className="app-menu-dropdown__item"
                  disabled={item.disabled}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    if (item.disabled) return;
                    item.onClick(event);
                    onOpenChange(false);
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </PositionedFixed>,
          document.body
        )}
    </div>
  );
}

export default AppMenuDropdown;
