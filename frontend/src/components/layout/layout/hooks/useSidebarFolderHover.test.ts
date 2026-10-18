import { act, renderHook } from '@testing-library/react';
import { usePrefersRealHover } from 'hooks/usePrefersRealHover';
import {
  SIDEBAR_FOLDER_CLOSE_DELAY_MS,
  SIDEBAR_FOLDER_OPEN_DELAY_MS,
  useSidebarFolderHover,
} from './useSidebarFolderHover';

jest.mock('hooks/usePrefersRealHover', () => ({
  usePrefersRealHover: jest.fn(),
}));

const mockPrefersHover = usePrefersRealHover as jest.MockedFunction<typeof usePrefersRealHover>;

describe('useSidebarFolderHover', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('abre a pasta após o atraso de hover', () => {
    mockPrefersHover.mockReturnValue(true);
    const { result } = renderHook(() => useSidebarFolderHover());

    act(() => {
      result.current.scheduleFolderOpen('cadastros');
    });
    expect(result.current.isFolderOpen('cadastros')).toBe(false);

    act(() => {
      jest.advanceTimersByTime(SIDEBAR_FOLDER_OPEN_DELAY_MS - 1);
    });
    expect(result.current.isFolderOpen('cadastros')).toBe(false);

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(result.current.isFolderOpen('cadastros')).toBe(true);
  });

  it('não abre a pasta se o mouse saiu antes do atraso', () => {
    mockPrefersHover.mockReturnValue(true);
    const { result } = renderHook(() => useSidebarFolderHover());

    act(() => {
      result.current.scheduleFolderOpen('cadastros');
      result.current.scheduleFolderOpen('financeiro');
      result.current.cancelFolderOpen('cadastros');
      jest.advanceTimersByTime(SIDEBAR_FOLDER_OPEN_DELAY_MS);
    });

    expect(result.current.isFolderOpen('cadastros')).toBe(false);
    expect(result.current.isFolderOpen('financeiro')).toBe(true);
  });

  it('não fecha ao trocar de pasta; só fecha ao sair do menu lateral', () => {
    mockPrefersHover.mockReturnValue(true);
    const { result } = renderHook(() => useSidebarFolderHover());

    act(() => {
      result.current.scheduleFolderOpen('cadastros');
      jest.advanceTimersByTime(SIDEBAR_FOLDER_OPEN_DELAY_MS);
    });
    act(() => {
      result.current.scheduleFolderOpen('financeiro');
      jest.advanceTimersByTime(SIDEBAR_FOLDER_OPEN_DELAY_MS);
    });

    expect(result.current.isFolderOpen('cadastros')).toBe(true);
    expect(result.current.isFolderOpen('financeiro')).toBe(true);

    act(() => {
      result.current.handleSidebarMouseLeave();
      jest.advanceTimersByTime(SIDEBAR_FOLDER_CLOSE_DELAY_MS - 1);
    });
    expect(result.current.isFolderOpen('cadastros')).toBe(true);

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(result.current.isFolderOpen('cadastros')).toBe(false);
    expect(result.current.isFolderOpen('financeiro')).toBe(false);
  });

  it('mantém aberta a pasta da opção selecionada após sair do menu', () => {
    mockPrefersHover.mockReturnValue(true);
    const { result } = renderHook(() => useSidebarFolderHover());

    act(() => {
      result.current.scheduleFolderOpen('cadastros');
      jest.advanceTimersByTime(SIDEBAR_FOLDER_OPEN_DELAY_MS);
    });
    act(() => {
      result.current.selectItem('clientes', 'clientes', ['cadastros']);
    });
    expect(result.current.selectedItemId).toBe('clientes');
    expect(result.current.selectedModalId).toBe('clientes');

    act(() => {
      result.current.handleSidebarMouseLeave();
      jest.advanceTimersByTime(SIDEBAR_FOLDER_CLOSE_DELAY_MS);
    });

    expect(result.current.isFolderOpen('cadastros')).toBe(true);
  });

  it('fecha a pasta pinada ao limpar a seleção (modal fechado)', () => {
    mockPrefersHover.mockReturnValue(true);
    const { result } = renderHook(() => useSidebarFolderHover());

    act(() => {
      result.current.selectItem('clientes', 'clientes', ['cadastros']);
    });
    expect(result.current.isFolderOpen('cadastros')).toBe(true);

    act(() => {
      result.current.clearSelection();
    });

    expect(result.current.selectedItemId).toBeNull();
    expect(result.current.selectedModalId).toBeNull();
    expect(result.current.isFolderOpen('cadastros')).toBe(false);
  });

  it('cancela o fechamento se o mouse voltar ao menu lateral', () => {
    mockPrefersHover.mockReturnValue(true);
    const { result } = renderHook(() => useSidebarFolderHover());

    act(() => {
      result.current.scheduleFolderOpen('cadastros');
      jest.advanceTimersByTime(SIDEBAR_FOLDER_OPEN_DELAY_MS);
    });
    act(() => {
      result.current.handleSidebarMouseLeave();
      jest.advanceTimersByTime(500);
      result.current.handleSidebarMouseEnter();
      jest.advanceTimersByTime(SIDEBAR_FOLDER_CLOSE_DELAY_MS);
    });

    expect(result.current.isFolderOpen('cadastros')).toBe(true);
  });

  it('abre e fecha por clique quando não há hover real', () => {
    mockPrefersHover.mockReturnValue(false);
    const { result } = renderHook(() => useSidebarFolderHover());

    act(() => {
      result.current.toggleFolder('cadastros');
    });
    expect(result.current.isFolderOpen('cadastros')).toBe(true);

    act(() => {
      result.current.toggleFolder('cadastros');
    });
    expect(result.current.isFolderOpen('cadastros')).toBe(false);
  });

  it('abre e fecha na hora no clique mesmo com hover real', () => {
    mockPrefersHover.mockReturnValue(true);
    const { result } = renderHook(() => useSidebarFolderHover());

    act(() => {
      result.current.toggleFolder('cadastros');
    });
    expect(result.current.isFolderOpen('cadastros')).toBe(true);

    act(() => {
      result.current.toggleFolder('cadastros');
    });
    expect(result.current.isFolderOpen('cadastros')).toBe(false);
  });

  it('clique durante o atraso de hover abre na hora', () => {
    mockPrefersHover.mockReturnValue(true);
    const { result } = renderHook(() => useSidebarFolderHover());

    act(() => {
      result.current.scheduleFolderOpen('cadastros');
    });
    expect(result.current.isFolderOpen('cadastros')).toBe(false);

    act(() => {
      result.current.toggleFolder('cadastros');
    });
    expect(result.current.isFolderOpen('cadastros')).toBe(true);

    act(() => {
      jest.advanceTimersByTime(SIDEBAR_FOLDER_OPEN_DELAY_MS);
    });
    expect(result.current.isFolderOpen('cadastros')).toBe(true);
  });
});
