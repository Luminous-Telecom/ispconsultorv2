import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from 'contexts/I18nContext';
import { NotificationProvider } from 'components/notifications/NotificationProvider';
import type { OrdemServico } from 'services/ordemServicoService';
import OrdemServicoAcaoModal from './OrdemServicoAcaoModal';

jest.mock('components/common/DraggableModal', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('./IxcLookupSelectModal', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('hooks/useOrdensServico', () => ({
  useExecutarAcaoOrdemServico: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

jest.mock('hooks/useIxcLookups', () => ({
  useTecnicos: () => ({ data: { data: [] } }),
  useSetores: () => ({ data: { data: [{ id: '9', nome: 'Suporte' }] } }),
  useAssuntos: () => ({ data: { data: [] } }),
}));

function renderModal() {
  localStorage.setItem('app-language', 'pt-BR');
  return render(
    <I18nProvider>
      <NotificationProvider>
        <OrdemServicoAcaoModal
          show
          onClose={jest.fn()}
          acao="encaminhar"
          ordemServico={{ id: 1, cliente_id: 2, setor: '9', setor_nome: 'Suporte' } as OrdemServico}
        />
      </NotificationProvider>
    </I18nProvider>,
  );
}

it('mantém o setor como campo de pesquisa mesmo sem poder trocar', async () => {
  renderModal();
  const setor = await screen.findByDisplayValue('9');
  expect((setor as HTMLInputElement).readOnly).toBe(true);
  expect(screen.getByDisplayValue('Suporte')).toBeTruthy();
  expect((screen.getByRole('button', { name: 'Buscar setor' }) as HTMLButtonElement).disabled).toBe(true);
});
