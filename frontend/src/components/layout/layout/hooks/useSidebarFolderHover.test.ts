import { act, renderHook } from '@testing-library/react';
import { useSidebarFolderHover } from './useSidebarFolderHover';

describe('useSidebarFolderHover', () => {
  it('abre e fecha a pasta só no clique', () => {
    const { result } = renderHook(() => useSidebarFolderHover());

    expect(result.current.isFolderOpen('cadastros')).toBe(false);

    act(() => {
      result.current.toggleFolder('cadastros');
    });
    expect(result.current.isFolderOpen('cadastros')).toBe(true);

    act(() => {
      result.current.toggleFolder('cadastros');
    });
    expect(result.current.isFolderOpen('cadastros')).toBe(false);
  });

  it('mantém aberta a pasta da opção selecionada', () => {
    const { result } = renderHook(() => useSidebarFolderHover());

    act(() => {
      result.current.selectItem('clientes', 'clientes', ['cadastros']);
    });

    expect(result.current.selectedItemId).toBe('clientes');
    expect(result.current.selectedModalId).toBe('clientes');
    expect(result.current.isFolderOpen('cadastros')).toBe(true);
  });

  it('fecha a pasta pinada ao limpar a seleção (modal fechado)', () => {
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

  it('fecha a pasta pinada no clique', () => {
    const { result } = renderHook(() => useSidebarFolderHover());

    act(() => {
      result.current.selectItem('clientes', 'clientes', ['cadastros']);
    });
    act(() => {
      result.current.toggleFolder('cadastros');
    });

    expect(result.current.isFolderOpen('cadastros')).toBe(false);
  });
});
