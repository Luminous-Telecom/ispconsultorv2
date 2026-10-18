import { act, renderHook } from '@testing-library/react';
import { usePrefersRealHover } from 'hooks/usePrefersRealHover';
import {
  TOP_NAV_CLOSE_DELAY_MS,
  TOP_NAV_OPEN_DELAY_MS,
  useTopNavMenu,
} from './useTopNavMenu';

jest.mock('hooks/usePrefersRealHover', () => ({
  usePrefersRealHover: jest.fn(),
}));

const mockPrefersHover = usePrefersRealHover as jest.MockedFunction<typeof usePrefersRealHover>;

describe('useTopNavMenu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('abre o menu após o atraso de hover e cancela se sair antes', () => {
    mockPrefersHover.mockReturnValue(true);
    const { result } = renderHook(() => useTopNavMenu());

    act(() => {
      result.current.scheduleFolderOpen('cadastros');
    });
    expect(result.current.isFolderOpen('cadastros')).toBe(false);

    act(() => {
      result.current.cancelFolderOpen('cadastros');
      jest.advanceTimersByTime(TOP_NAV_OPEN_DELAY_MS);
    });
    expect(result.current.isFolderOpen('cadastros')).toBe(false);

    act(() => {
      result.current.scheduleFolderOpen('cadastros');
      jest.advanceTimersByTime(TOP_NAV_OPEN_DELAY_MS);
    });
    expect(result.current.isFolderOpen('cadastros')).toBe(true);
  });

  it('fecha o dropdown ao sair da barra após o atraso', () => {
    mockPrefersHover.mockReturnValue(true);
    const { result } = renderHook(() => useTopNavMenu());

    act(() => {
      result.current.toggleFolder('cadastros');
    });
    expect(result.current.isFolderOpen('cadastros')).toBe(true);

    act(() => {
      result.current.handleMenuMouseLeave();
      jest.advanceTimersByTime(TOP_NAV_CLOSE_DELAY_MS);
    });
    expect(result.current.isFolderOpen('cadastros')).toBe(false);
  });

  it('fecha o dropdown ao selecionar uma opção', () => {
    mockPrefersHover.mockReturnValue(true);
    const { result } = renderHook(() => useTopNavMenu());

    act(() => {
      result.current.toggleFolder('cadastros');
      result.current.selectItem('clientes', 'clientes');
    });

    expect(result.current.selectedItemId).toBe('clientes');
    expect(result.current.isFolderOpen('cadastros')).toBe(false);
  });

  it('limpa a seleção ao fechar o modal', () => {
    mockPrefersHover.mockReturnValue(true);
    const { result } = renderHook(() => useTopNavMenu());

    act(() => {
      result.current.selectItem('clientes', 'clientes');
      result.current.clearSelection();
    });

    expect(result.current.selectedItemId).toBeNull();
    expect(result.current.selectedModalId).toBeNull();
  });

  it('abre subpasta no hover e fecha ao sair, sem deixar aberta', () => {
    mockPrefersHover.mockReturnValue(true);
    const { result } = renderHook(() => useTopNavMenu());

    act(() => {
      result.current.toggleFolder('logs');
      result.current.scheduleNestedFolderOpen('logsComunicacao');
      jest.advanceTimersByTime(TOP_NAV_OPEN_DELAY_MS);
    });
    expect(result.current.isNestedFolderOpen('logsComunicacao')).toBe(true);

    act(() => {
      result.current.scheduleNestedFolderClose('logsComunicacao');
      jest.advanceTimersByTime(TOP_NAV_OPEN_DELAY_MS);
    });
    expect(result.current.isNestedFolderOpen('logsComunicacao')).toBe(false);
  });

  it('mantém o flyout aberto ao entrar nele após sair da pasta', () => {
    mockPrefersHover.mockReturnValue(true);
    const { result } = renderHook(() => useTopNavMenu());

    act(() => {
      result.current.toggleFolder('logs');
      result.current.keepNestedFolderOpen('logsComunicacao');
      result.current.scheduleNestedFolderClose('logsComunicacao');
      result.current.keepNestedFolderOpen('logsComunicacao');
      jest.advanceTimersByTime(TOP_NAV_OPEN_DELAY_MS);
    });

    expect(result.current.isNestedFolderOpen('logsComunicacao')).toBe(true);
  });
});
