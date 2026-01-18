import { useEffect, useRef } from 'react';

interface UseFaviconOptions {
  defaultFavicon?: string;
}

/**
 * Hook para gerenciar a favicon dinamicamente
 * @param logoUrl - URL da logo da empresa (opcional)
 * @param options - Opções do hook
 */
export const useFavicon = (logoUrl?: string, options: UseFaviconOptions = {}) => {
  const { defaultFavicon = '/favicon.ico' } = options;
  const currentFaviconRef = useRef<string | null>(null);

  useEffect(() => {
    // Função para atualizar a favicon
    const updateFavicon = (url: string) => {
      // Verificar se já está usando esta favicon
      if (currentFaviconRef.current === url) {
        return; // Já está correta, não fazer nada
      }

      // Remover favicons existentes
      const existingFavicons = document.querySelectorAll('link[rel*="icon"]');
      existingFavicons.forEach(favicon => favicon.remove());

      // Criar novo link de favicon
      const link = document.createElement('link');
      link.rel = 'icon';
      link.type = 'image/png';
      link.href = url;

      // Adicionar ao head
      document.head.appendChild(link);

      // Atualizar referência
      currentFaviconRef.current = url;
    };

    // Determinar qual favicon usar
    const faviconToUse = logoUrl
      ? (logoUrl.startsWith('http') ? logoUrl : `${window.location.origin}${logoUrl}`)
      : defaultFavicon;

    // Atualizar imediatamente
    updateFavicon(faviconToUse);

  }, [logoUrl, defaultFavicon]);
};