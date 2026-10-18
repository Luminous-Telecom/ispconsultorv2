import React, { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

export type FontSize = 'sm' | 'md' | 'lg';

const STORAGE_KEY = 'font-size-system';

interface FontSizeContextType {
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
}

const FontSizeContext = createContext<FontSizeContextType | undefined>(undefined);

function readStoredFontSize(): FontSize {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === 'sm' || saved === 'md' || saved === 'lg' ? saved : 'md';
  } catch {
    return 'md';
  }
}

function persistFontSize(size: FontSize): void {
  try {
    localStorage.setItem(STORAGE_KEY, size);
  } catch {
    // ignore quota / private mode
  }
}

function applyFontSizeToDocument(size: FontSize): void {
  document.documentElement.setAttribute('data-font-size', size);
}

export const FontSizeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [fontSize, setFontSizeState] = useState<FontSize>(() => {
    const size = readStoredFontSize();
    applyFontSizeToDocument(size);
    return size;
  });

  useEffect(() => {
    persistFontSize(fontSize);
    applyFontSizeToDocument(fontSize);
  }, [fontSize]);

  const setFontSize = useCallback((size: FontSize) => {
    setFontSizeState(size);
  }, []);

  return (
    <FontSizeContext.Provider value={{ fontSize, setFontSize }}>
      {children}
    </FontSizeContext.Provider>
  );
};

export const useFontSize = (): FontSizeContextType => {
  const context = useContext(FontSizeContext);
  if (context === undefined) {
    throw new Error('useFontSize must be used within a FontSizeProvider');
  }
  return context;
};
