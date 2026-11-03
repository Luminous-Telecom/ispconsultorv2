import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import VendedorModal from './VendedorModal';

jest.mock('components/notifications/NotificationProvider', () => ({
  useNotificationContext: () => ({ success: jest.fn(), error: mockNotifyError }),
}));

const mockMutateAsync = jest.fn();
const mockNotifyError = jest.fn();
let mockCreatePending = false;

jest.mock('contexts/I18nContext', () => ({
  useI18n: () => ({
    t: (key: string) => ({
      'buttons.save': 'Salvar',
      'buttons.cancel': 'Cancelar',
      'messages.sellerNameRequired': 'Nome é obrigatório',
      'messages.sellerCommissionRange': 'Comissão percentual deve ficar entre 0 e 100',
      'form.invalidEmail': 'E-mail inválido',
      'modal.sellers': 'Vendedores',
      'vendedor.tabMain': 'Dados',
      'vendedor.tabBank': 'Dados bancários',
      'form.name': 'Nome',
    }[key] ?? key),
  }),
}));

jest.mock('hooks/useMediaQuery', () => ({
  useIsMobile: () => false,
}));

jest.mock('hooks/useVendedores', () => ({
  useVendedor: () => ({ data: undefined, isLoading: false }),
  useCreateVendedor: () => ({ mutateAsync: mockMutateAsync, isPending: mockCreatePending }),
  useUpdateVendedor: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

jest.mock('components/forms/AddressFields', () => () => <div>endereco</div>);
jest.mock('components/forms/ContactFields', () => () => <div>contato</div>);

describe('VendedorModal', () => {
  beforeEach(() => {
    mockMutateAsync.mockReset();
    mockNotifyError.mockReset();
    mockCreatePending = false;
    (global as unknown as { ResizeObserver: unknown }).ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  });

  it('não grava sem nome e mantém o texto Salvar', async () => {
    render(<VendedorModal show onClose={jest.fn()} />);
    const salvar = screen.getByRole('button', { name: 'Salvar' });
    expect((salvar as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(salvar);
    expect(mockNotifyError).toHaveBeenCalledWith('Nome é obrigatório');
    expect(mockMutateAsync).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Salvar' }).textContent).toContain('Salvar');
  });

  it('desabilita Salvar enquanto grava e mantém o texto', () => {
    mockCreatePending = true;
    render(<VendedorModal show onClose={jest.fn()} />);
    const salvar = screen.getByRole('button', { name: 'Salvar' });
    expect((salvar as HTMLButtonElement).disabled).toBe(true);
    expect(salvar.textContent).toContain('Salvar');
  });

  it('grava o nome informado', async () => {
    mockMutateAsync.mockResolvedValue({ id: 1 });
    render(<VendedorModal show onClose={jest.fn()} onSuccess={jest.fn()} />);
    fireEvent.change(screen.getByRole('textbox', { name: /Nome/ }), { target: { value: 'Ana Vendas' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(mockMutateAsync).toHaveBeenCalledWith(expect.objectContaining({ nome: 'Ana Vendas', ativo: true }));
  });
});
