import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { FontSizeProvider, useFontSize } from './FontSizeContext';

function Probe() {
  const { fontSize, setFontSize } = useFontSize();
  return (
    <div>
      <span data-testid="size">{fontSize}</span>
      <button type="button" onClick={() => setFontSize('lg')}>
        grande
      </button>
      <button type="button" onClick={() => setFontSize('sm')}>
        pequeno
      </button>
    </div>
  );
}

describe('FontSizeContext', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-font-size');
  });

  it('aplica tamanho médio por padrão e altera para grande', () => {
    render(
      <FontSizeProvider>
        <Probe />
      </FontSizeProvider>
    );

    expect(screen.getByTestId('size').textContent).toBe('md');
    expect(document.documentElement.getAttribute('data-font-size')).toBe('md');

    act(() => {
      screen.getByRole('button', { name: 'grande' }).click();
    });

    expect(screen.getByTestId('size').textContent).toBe('lg');
    expect(document.documentElement.getAttribute('data-font-size')).toBe('lg');
    expect(localStorage.getItem('font-size-system')).toBe('lg');
  });

  it('aplica tamanho pequeno em todas as fontes via data-font-size', () => {
    render(
      <FontSizeProvider>
        <Probe />
      </FontSizeProvider>
    );

    act(() => {
      screen.getByRole('button', { name: 'pequeno' }).click();
    });

    expect(document.documentElement.getAttribute('data-font-size')).toBe('sm');
  });
});
