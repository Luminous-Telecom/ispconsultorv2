import type { ReactNode } from 'react';
import { renderHook } from '@testing-library/react';
import { I18nProvider } from 'contexts/I18nContext';
import { NotificationProvider } from 'components/notifications/NotificationProvider';
import { useEntityListModal } from './useEntityListModal';

function wrapper({ children }: { children: ReactNode }) {
  localStorage.setItem('app-language', 'pt-BR');
  return (
    <I18nProvider>
      <NotificationProvider>{children}</NotificationProvider>
    </I18nProvider>
  );
}

describe('useEntityListModal', () => {
  it('na seleção mantém Novo, Editar e Deletar e acrescenta Selecionar', () => {
    const { result } = renderHook(
      () => useEntityListModal<{ id: number }>({ onClose: jest.fn(), onSelect: jest.fn() }),
      { wrapper },
    );

    const crud = result.current.buildCrudBulkActions({
      onNew: jest.fn(),
      onEdit: jest.fn(),
      onDelete: jest.fn(),
    });
    const select = result.current.appendSelectInsert(crud);

    expect(select.map((action) => action.label)).toEqual(['Novo', 'Editar', 'Deletar', 'Selecionar']);
    expect(crud.map((action) => action.label)).toEqual(['Novo', 'Editar', 'Deletar']);
  });
});
