import { computeFixedDropdownPosition } from './fixedDropdownPosition';

function rect(partial: Partial<DOMRect>): DOMRect {
  return {
    x: 0,
    y: 0,
    width: 80,
    height: 32,
    top: 40,
    right: 120,
    bottom: 72,
    left: 40,
    toJSON: () => ({}),
    ...partial,
  } as DOMRect;
}

describe('computeFixedDropdownPosition', () => {
  const originalInnerWidth = window.innerWidth;
  const originalInnerHeight = window.innerHeight;

  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 400 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 400 });
  });

  afterAll(() => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalInnerWidth });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: originalInnerHeight });
  });

  it('alinha ao início do botão sem sair da viewport', () => {
    const pos = computeFixedDropdownPosition(rect({ left: 10, right: 90 }), {
      align: 'start',
      menuWidth: 200,
    });
    expect(pos.left).toBe(10);
    expect(pos.top).toBe(76);
  });

  it('não deixa o menu end escapar pela esquerda', () => {
    const pos = computeFixedDropdownPosition(rect({ left: 20, right: 80 }), {
      align: 'end',
      menuWidth: 200,
    });
    expect(pos.left).toBe(8);
  });
});
