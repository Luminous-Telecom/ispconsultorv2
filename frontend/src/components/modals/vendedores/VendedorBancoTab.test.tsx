import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import VendedorBancoTab from './VendedorBancoTab';
import { initialVendedorForm } from './vendedorForm';

jest.mock('components/notifications/NotificationProvider', () => ({
  useNotificationContext: () => ({ success: jest.fn(), error: jest.fn() }),
}));

jest.mock('contexts/I18nContext', () => ({
  useI18n: () => ({
    t: (key: string) => ({
      'form.preferredPayment': 'Forma de recebimento',
      'form.accountKind': 'Tipo de conta',
      'vendedor.pay.boleto': 'Boleto',
      'vendedor.pay.pix': 'PIX',
      'vendedor.account.checking': 'Conta corrente',
      'vendedor.account.savings': 'Poupança',
    }[key] ?? key),
  }),
}));

describe('VendedorBancoTab', () => {
  it('mostra as formas de recebimento e avisa a escolha', async () => {
    const onChange = jest.fn();
    render(<VendedorBancoTab form={initialVendedorForm} onChange={onChange} />);
    const recebimento = screen.getByRole('combobox', { name: 'Forma de recebimento' });
    expect(screen.getByRole('option', { name: 'Boleto' })).toBeTruthy();
    expect(screen.getByRole('option', { name: 'PIX' })).toBeTruthy();
    expect(screen.getByRole('option', { name: 'Conta corrente' })).toBeTruthy();
    expect(Array.from(recebimento.querySelectorAll('option')).some((option) => option.textContent === '')).toBe(false);
    fireEvent.change(recebimento, { target: { value: 'PIX' } });
    expect(onChange).toHaveBeenCalledWith('forma_recebimento', 'PIX');
  });
});
