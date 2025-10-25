import React, { useEffect } from 'react';

interface ProtectionLayerProps {
  children: React.ReactNode;
}

const ProtectionLayer: React.FC<ProtectionLayerProps> = ({ children }) => {
  useEffect(() => {
    // Proteção contra seleção de texto (exceto em formulários)
    const preventSelection = (e: Event) => {
      const target = e.target as HTMLElement;
      
      // Função para verificar se o elemento permite seleção
      const isSelectableElement = (element: HTMLElement): boolean => {
        if (!element || !element.tagName) return false;
        
        // Permitir seleção em elementos de formulário diretos
        if (element.tagName === 'INPUT' ||
            element.tagName === 'TEXTAREA' ||
            element.tagName === 'SELECT' ||
            element.tagName === 'OPTION' ||
            (element.hasAttribute && element.hasAttribute('contenteditable'))) {
          return true;
        }
        
        // Permitir seleção em labels e textos de formulário
        if ((element.classList && element.classList.contains('form-label')) ||
            (element.classList && element.classList.contains('form-text')) ||
            (element.classList && element.classList.contains('form-check-label')) ||
            (element.classList && element.classList.contains('invalid-feedback')) ||
            (element.classList && element.classList.contains('valid-feedback')) ||
            (element.classList && element.classList.contains('help-text')) ||
            (element.classList && element.classList.contains('form-help'))) {
          return true;
        }
        
        // Permitir seleção em elementos dentro de formulários
        let parent = element.parentElement;
        while (parent) {
          // Se está dentro de um formulário, permitir seleção
          if (parent.tagName === 'FORM' ||
              (parent.classList && parent.classList.contains('form-group')) ||
              (parent.classList && parent.classList.contains('form-control')) ||
              (parent.classList && parent.classList.contains('input-group')) ||
              (parent.classList && parent.classList.contains('form-row'))) {
            return true;
          }
          parent = parent.parentElement;
        }
        
        return false;
      };
      
      if (!isSelectableElement(target)) {
        e.preventDefault();
        return false;
      }
    };

    // Proteção contra clique direito
    const preventContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    // Teclas de atalho sempre permitidas

    // Proteção contra drag and drop
    const preventDrag = (e: DragEvent) => {
      e.preventDefault();
      return false;
    };

    // Proteção contra impressão
    const preventPrint = (e: Event) => {
      e.preventDefault();
      return false;
    };

    // Adicionar event listeners
    document.addEventListener('selectstart', preventSelection);
    document.addEventListener('contextmenu', preventContextMenu);
    document.addEventListener('dragstart', preventDrag);
    document.addEventListener('beforeprint', preventPrint);

    // DevTools sempre permitidos

    // Limpeza dos event listeners
    return () => {
      document.removeEventListener('selectstart', preventSelection);
      document.removeEventListener('contextmenu', preventContextMenu);
      document.removeEventListener('dragstart', preventDrag);
      document.removeEventListener('beforeprint', preventPrint);
    };
  }, []);

  return (
    <div 
      style={{
        userSelect: 'none',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none',
        WebkitTouchCallout: 'none',
        WebkitTapHighlightColor: 'transparent',
        pointerEvents: 'auto'
      }}
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
    >
      {children}
    </div>
  );
};

export default ProtectionLayer;
