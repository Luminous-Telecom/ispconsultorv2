import { useState, useEffect } from 'react';

/**
 * Hook para detectar breakpoints de media query
 * @param query - Media query string (ex: '(max-width: 767px)')
 * @returns boolean - true se a media query corresponder
 */
export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return window.matchMedia(query).matches;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let mediaQuery: MediaQueryList;
    
    try {
      mediaQuery = window.matchMedia(query);
    } catch {
      return;
    }
    
    // Atualizar estado inicial imediatamente
    const updateMatches = () => {
      setMatches(mediaQuery.matches);
    };
    
    updateMatches();

    // Handler para mudanças na media query
    const handleChange = (event: MediaQueryListEvent | MediaQueryList) => {
      setMatches(event.matches);
    };

    // Adicionar listener (suporta addEventListener e addListener para compatibilidade)
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      // Fallback para navegadores antigos (MediaQueryList.addListener usa uma assinatura diferente)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mediaQuery as any).addListener(handleChange);
    }

    // Verificar também em resize para garantir sincronização
    window.addEventListener('resize', updateMatches);

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (mediaQuery as any).removeListener(handleChange);
      }
      window.removeEventListener('resize', updateMatches);
    };
  }, [query]);

  return matches;
};

/**
 * Hook específico para detectar dispositivos mobile
 * Usa breakpoint Bootstrap padrão: < 768px
 * Combina window.innerWidth com media query para máxima confiabilidade
 */
export const useIsMobile = (): boolean => {
  // Usar media query como fonte primária (mais confiável)
  const mediaQueryMatch = useMediaQuery('(max-width: 767.98px)');
  
  const [windowWidthMatch, setWindowWidthMatch] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768;
  });

  useEffect(() => {
    const checkMobile = () => {
      setWindowWidthMatch(window.innerWidth < 768);
    };

    // Verificar imediatamente
    checkMobile();

    // Adicionar listener de resize
    window.addEventListener('resize', checkMobile);
    window.addEventListener('orientationchange', checkMobile);

    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('orientationchange', checkMobile);
    };
  }, []);

  // Retornar true se qualquer um dos dois detectar mobile
  return mediaQueryMatch || windowWidthMatch;
};

