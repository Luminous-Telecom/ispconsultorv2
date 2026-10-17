import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from 'contexts/I18nContext';
import { NotificationProvider } from 'components/notifications/NotificationProvider';
import IntegracaoIxcProvedorFormFields from './IntegracaoIxcProvedorFormFields';

jest.mock('components/ui/EntitySelectField', () => ({
  __esModule: true,
  default: () => <div />,
}));

function renderForm(ui: React.ReactElement) {
  localStorage.setItem('app-language', 'pt-BR');
  return render(
    <I18nProvider>
      <NotificationProvider>{ui}</NotificationProvider>
    </I18nProvider>
  );
}

const form = {
  nome: '',
  cliente_id: 0,
  contrato_id: 0,
  api_url: '',
  api_token: '',
  ativo: true,
};

describe('IntegracaoIxcProvedorFormFields', () => {
  it('não exibe o token já gravado e mostra o erro do nome', () => {
    renderForm(
      <IntegracaoIxcProvedorFormFields
        form={form}
        errors={{ nome: 'Informe o nome' }}
        onChange={jest.fn()}
        hasApiToken
        onShowClienteModal={jest.fn()}
        onShowContratoModal={jest.fn()}
      />
    );
    expect(screen.getByText('Informe o nome')).toBeTruthy();
    const token = screen.getByLabelText('Token da API') as HTMLInputElement;
    expect(token.type).toBe('password');
    expect(token.value).toBe('');
    expect(token.placeholder).toBe('••••••••••••••••');
  });
});
