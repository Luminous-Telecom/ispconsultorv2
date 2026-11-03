import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from 'contexts/I18nContext';
import { NotificationProvider } from 'components/notifications/NotificationProvider';
import { useUsuarios } from 'hooks/useUsuarios';
import UsuariosModal from './UsuariosModal';
import type { Usuario } from 'types';
import type { ListModalProps } from 'types/modal';

const usuario: Usuario = {
  id: 7,
  nome: 'Ana',
  email: 'ana@isp.test',
  role: 'user',
  ativo: true,
  precisa_trocar_senha: false,
  ultimo_login: '2026-11-03T15:04:05.000Z',
};

jest.mock('hooks/useUsuarios', () => ({
  useUsuarios: jest.fn(),
  useDeleteUsuario: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

jest.mock('components/common/ListModal', () => ({
  __esModule: true,
  default: (props: ListModalProps<Usuario>) => {
    const logs = props.bulkActions?.find((action) => action.label === 'Logs');
    const ultimoAcesso = props.config.columns.find((column) => column.key === 'ultimo_login');
    const linha = props.data[0];
    return (
      <div>
        <span data-testid="loading">{String(props.loading)}</span>
        <span data-testid="coluna-ultimo-acesso">{ultimoAcesso?.label}</span>
        <span data-testid="ultimo-acesso-valor">{linha && ultimoAcesso ? ultimoAcesso.render(linha) : ''}</span>
        <span data-testid="ultimo-acesso-vazio">
          {ultimoAcesso ? ultimoAcesso.render({ ...usuario, ultimo_login: null }) : ''}
        </span>
        <button type="button" disabled={Boolean(logs?.disabled?.([]))}>
          logs-sem-selecao
        </button>
        <button type="button" onClick={() => logs?.action?.(props.data)}>
          Logs
        </button>
      </div>
    );
  },
}));

jest.mock('./UsuarioFormModal', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('components/common/ImprimirModal', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('components/common/DraggableModal', () => ({
  __esModule: true,
  default: ({
    show,
    title,
    children,
  }: {
    show: boolean;
    title: string;
    children: React.ReactNode;
  }) => (show ? <div data-testid="usuario-logs-modal" data-title={title}>{children}</div> : null),
}));

jest.mock('components/modals/logs/LogsModal', () => ({
  __esModule: true,
  default: ({ usuarioId, logType }: { usuarioId?: number; logType?: string }) => (
    <div data-testid="logs-content" data-usuario-id={usuarioId} data-log-type={logType} />
  ),
}));

function renderModal() {
  localStorage.setItem('app-language', 'pt-BR');
  return render(
    <I18nProvider>
      <NotificationProvider>
        <UsuariosModal show onClose={jest.fn()} />
      </NotificationProvider>
    </I18nProvider>
  );
}

describe('UsuariosModal', () => {
  beforeEach(() => {
    (useUsuarios as jest.Mock).mockReturnValue({
      data: {
        data: [usuario],
        pagination: { current_page: 1, last_page: 1, per_page: 15, total: 1 },
      },
      isLoading: false,
      refetch: jest.fn(),
    });
  });

  it('mostra o último acesso e deixa a coluna vazia quando o usuário nunca entrou', () => {
    renderModal();

    expect(screen.getByTestId('coluna-ultimo-acesso').textContent).toBe('Último acesso');
    expect(screen.getByTestId('ultimo-acesso-valor').textContent).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    expect(screen.getByTestId('ultimo-acesso-vazio').textContent).toBe('-');
    expect(screen.getByTestId('loading').textContent).toBe('false');
  });

  it('lista vazia mantém a coluna de último acesso', () => {
    (useUsuarios as jest.Mock).mockReturnValue({
      data: { data: [], pagination: { current_page: 1, last_page: 1, per_page: 15, total: 0 } },
      isLoading: true,
      refetch: jest.fn(),
    });

    renderModal();

    expect(screen.getByTestId('coluna-ultimo-acesso').textContent).toBe('Último acesso');
    expect(screen.getByTestId('ultimo-acesso-valor').textContent).toBe('');
    expect(screen.getByTestId('loading').textContent).toBe('true');
  });

  it('abre os logs só do usuário selecionado', () => {
    renderModal();

    expect((screen.getByRole('button', { name: 'logs-sem-selecao' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByTestId('usuario-logs-modal')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Logs' }));

    const modal = screen.getByTestId('usuario-logs-modal');
    expect(modal.getAttribute('data-title')).toBe('Logs — Ana');
    expect(screen.getByTestId('logs-content').getAttribute('data-usuario-id')).toBe('7');
    expect(screen.getByTestId('logs-content').getAttribute('data-log-type')).toBe('usuarios');
  });
});
