import { useEffect, useRef, useState } from 'react';

export const useLayoutMenus = () => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showTableMenu, setShowTableMenu] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const tableMenuRef = useRef<HTMLDivElement>(null);
  const languageTriggerRef = useRef<HTMLButtonElement>(null);
  const languageDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (userMenuRef.current?.contains(target)) {
        return;
      }

      const languageDropdown = document.querySelector('[data-language-dropdown]');
      if (languageDropdown?.contains(target)) {
        return;
      }

      const userMenuFlyout = (target as Element).closest?.('[data-user-menu-flyout]');
      if (userMenuFlyout) {
        return;
      }

      setShowUserMenu(false);
      setShowLanguageDropdown(false);
    };

    if (showUserMenu) {
      const timeoutId = setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
      }, 0);

      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [showUserMenu, showLanguageDropdown]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tableMenuRef.current && !tableMenuRef.current.contains(event.target as Node)) {
        setShowTableMenu(false);
      }
    };

    if (showTableMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showTableMenu]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (languageTriggerRef.current?.contains(target)) {
        return;
      }
      if (languageDropdownRef.current?.contains(target)) {
        return;
      }
      setShowLanguageDropdown(false);
    };

    if (showLanguageDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showLanguageDropdown]);

  return {
    showUserMenu,
    setShowUserMenu,
    showTableMenu,
    setShowTableMenu,
    showLanguageDropdown,
    setShowLanguageDropdown,
    userMenuRef,
    tableMenuRef,
    languageTriggerRef,
    languageDropdownRef,
  };
};
