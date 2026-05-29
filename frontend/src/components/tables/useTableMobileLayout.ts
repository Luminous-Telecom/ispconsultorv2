import { RefObject, useEffect } from 'react';

export function useTableMobileFabPosition(
  isMobile: boolean,
  fabContainerRef: RefObject<HTMLDivElement | null>
) {
  useEffect(() => {
    if (!isMobile || !fabContainerRef.current) return;

    const updateFabPosition = () => {
      const fabContainer = fabContainerRef.current;
      if (!fabContainer) return;

      const tableContainer =
        fabContainer.closest('.table-container, .table-mobile-container') || fabContainer.parentElement;
      const paginationEl = tableContainer
        ? tableContainer.querySelector('.table-mobile-pagination')
        : null;

      let baseBottom = 16;
      if (paginationEl && paginationEl.clientHeight > 0) {
        baseBottom = Math.max(paginationEl.clientHeight, 56) + 8;
      }

      let bottomValue = baseBottom;
      const contextContainer =
        fabContainer.closest('.modal-content, .responsive-dialog-mobile-content, .main-content, .card') ||
        document.body;
      const legendas = contextContainer.querySelectorAll('.financeiro-resumo, .contrato-totais-resumo');
      const viewportHeight = window.innerHeight;
      const fabMargin = 12;

      legendas.forEach((legenda) => {
        const rect = legenda.getBoundingClientRect();
        if (
          rect.height > 0 &&
          rect.width > 0 &&
          rect.top > viewportHeight / 2 &&
          rect.top < viewportHeight
        ) {
          const distFromBottom = viewportHeight - rect.top;
          const neededBottom = distFromBottom + fabMargin;
          if (neededBottom > bottomValue) bottomValue = neededBottom;
        }
      });

      fabContainer.style.bottom = `${bottomValue}px`;
    };

    updateFabPosition();
    const initialTimeout = setTimeout(updateFabPosition, 50);
    const observer = new MutationObserver(updateFabPosition);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class'],
    });

    let scrollTimeout: ReturnType<typeof setTimeout>;
    const handleScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(updateFabPosition, 50);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', updateFabPosition);
    window.addEventListener('orientationchange', updateFabPosition);
    const intervalId = setInterval(updateFabPosition, 1000);

    return () => {
      clearTimeout(initialTimeout);
      observer.disconnect();
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', updateFabPosition);
      window.removeEventListener('orientationchange', updateFabPosition);
      clearInterval(intervalId);
      clearTimeout(scrollTimeout);
    };
  }, [isMobile, fabContainerRef]);
}

export function useTableMobileActionDropdownPosition(
  isMobile: boolean,
  openActionDropdown: number | string | null,
  buttonRefs: RefObject<Map<number | string, HTMLButtonElement>>,
  dropdownRefs: RefObject<Map<number | string, HTMLDivElement>>
) {
  useEffect(() => {
    if (!isMobile || openActionDropdown === null) return;

    const buttonElement = buttonRefs.current?.get(openActionDropdown);
    const dropdownElement = dropdownRefs.current?.get(openActionDropdown);
    if (!buttonElement || !dropdownElement) return;

    const updatePosition = () => {
      const buttonRect = buttonElement.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const paginationElement = document.querySelector('.table-mobile-pagination');
      const paginationRect = paginationElement ? paginationElement.getBoundingClientRect() : null;
      const limitBottom = paginationRect ? paginationRect.top : window.innerHeight;
      const gap = 4;
      const marginScreen = 8;
      const marginTop = 8;
      const spaceBelow = Math.max(0, limitBottom - buttonRect.bottom);
      const spaceAbove = Math.max(0, buttonRect.top - marginTop);

      dropdownElement.style.display = 'block';
      dropdownElement.style.visibility = 'hidden';
      dropdownElement.style.maxHeight = '';
      dropdownElement.style.position = 'static';
      const realDropdownHeight = Math.max(dropdownElement.offsetHeight || 160, 160);
      dropdownElement.style.visibility = '';

      const shouldOpenUp =
        (spaceBelow < realDropdownHeight && spaceAbove >= realDropdownHeight) || spaceBelow < 120;

      dropdownElement.style.setProperty('position', 'fixed', 'important');
      dropdownElement.style.setProperty('z-index', '99999', 'important');
      dropdownElement.style.left = 'auto';
      dropdownElement.style.right = `${Math.max(marginScreen, viewportWidth - buttonRect.right)}px`;
      dropdownElement.style.overflowY = 'auto';
      dropdownElement.style.display = 'block';

      if (shouldOpenUp) {
        dropdownElement.style.bottom = '';
        dropdownElement.style.top = 'auto';
        dropdownElement.style.maxHeight = `${Math.max(Math.min(realDropdownHeight, spaceAbove), 160)}px`;
        dropdownElement.classList.add('opens-up');
      } else {
        dropdownElement.style.top = `${buttonRect.bottom + gap}px`;
        dropdownElement.style.bottom = 'auto';
        dropdownElement.style.maxHeight = `${Math.max(Math.min(realDropdownHeight, spaceBelow), 160)}px`;
        dropdownElement.classList.remove('opens-up');
      }
    };

    updatePosition();
    requestAnimationFrame(updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isMobile, openActionDropdown, buttonRefs, dropdownRefs]);
}

export function useTableMobileFabDropdownPosition(
  isMobile: boolean,
  isFabOpen: boolean,
  fabDropdownRef: RefObject<HTMLDivElement | null>,
  fabContainerRef: RefObject<HTMLDivElement | null>
) {
  useEffect(() => {
    if (!isMobile || !isFabOpen || !fabDropdownRef.current || !fabContainerRef.current) return;

    const updateDropdownPosition = () => {
      const dropdownElement = fabDropdownRef.current;
      const fabContainer = fabContainerRef.current;
      if (!dropdownElement || !fabContainer) return;

      const fabRect = fabContainer.getBoundingClientRect();
      const bottomPosition = window.innerHeight - fabRect.top + 8;
      dropdownElement.style.setProperty('position', 'fixed', 'important');
      dropdownElement.style.setProperty('bottom', `${bottomPosition}px`, 'important');
      dropdownElement.style.setProperty('right', '1rem', 'important');
      dropdownElement.style.setProperty('z-index', '1001', 'important');
      dropdownElement.style.setProperty('max-height', `${Math.max(100, fabRect.top - 20)}px`, 'important');
    };

    updateDropdownPosition();
    window.addEventListener('resize', updateDropdownPosition);
    window.addEventListener('scroll', updateDropdownPosition, true);
    return () => {
      window.removeEventListener('resize', updateDropdownPosition);
      window.removeEventListener('scroll', updateDropdownPosition, true);
    };
  }, [isMobile, isFabOpen, fabDropdownRef, fabContainerRef]);
}

export function useCloseFabOnClickOutside(
  isMobile: boolean,
  isFabOpen: boolean,
  fabContainerRef: RefObject<HTMLDivElement | null>,
  onClose: () => void
) {
  useEffect(() => {
    if (!isMobile || !isFabOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (fabContainerRef.current && !fabContainerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobile, isFabOpen, fabContainerRef, onClose]);
}
