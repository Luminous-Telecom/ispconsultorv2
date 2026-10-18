import React from 'react';
import { render } from '@testing-library/react';
import TechBackground from './TechBackground';

describe('TechBackground', () => {
  const originalGetContext = HTMLCanvasElement.prototype.getContext;

  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      })),
    });
    HTMLCanvasElement.prototype.getContext = jest.fn(() => {
      const ctx = {
        setTransform: jest.fn(),
        createLinearGradient: jest.fn(() => ({ addColorStop: jest.fn() })),
        createRadialGradient: jest.fn(() => ({ addColorStop: jest.fn() })),
        fillRect: jest.fn(),
        beginPath: jest.fn(),
        moveTo: jest.fn(),
        lineTo: jest.fn(),
        arc: jest.fn(),
        stroke: jest.fn(),
        fill: jest.fn(),
        save: jest.fn(),
        restore: jest.fn(),
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 1,
      };
      return ctx as unknown as CanvasRenderingContext2D;
    }) as typeof HTMLCanvasElement.prototype.getContext;
  });

  afterEach(() => {
    HTMLCanvasElement.prototype.getContext = originalGetContext;
  });

  it('renderiza o canvas oculto para leitores de tela', () => {
    const { container } = render(<TechBackground />);
    const canvas = container.querySelector('canvas.tech-background-canvas');
    expect(canvas?.getAttribute('aria-hidden')).toBe('true');
  });

  it('aplica className opcional no canvas', () => {
    const { container } = render(<TechBackground className="login-tech-bg" />);
    expect(container.querySelector('canvas.login-tech-bg')).toBeTruthy();
  });
});
