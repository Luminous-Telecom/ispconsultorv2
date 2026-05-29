import { useEffect, useRef, useState } from 'react';

export const useSaasUserMenu = () => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      const id = setTimeout(() => document.addEventListener('click', handleClickOutside), 0);
      return () => {
        clearTimeout(id);
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [showUserMenu]);

  return {
    showUserMenu,
    setShowUserMenu,
    userMenuRef,
  };
};
