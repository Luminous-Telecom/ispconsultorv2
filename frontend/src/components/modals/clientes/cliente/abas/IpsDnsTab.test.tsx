import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from 'contexts/I18nContext';
import { NotificationProvider } from 'components/notifications/NotificationProvider';
import IpsDnsTab from './IpsDnsTab';
import { ClienteFormData, ClienteFormErrors } from 'types';

const formData = {
  cnpj: '',
  razao_social: '',
  nome_fantasia: '',
  email: '',
  telefone: '',
  whatsapp: '',
  cep: '',
  endereco: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  estado: '',
  ativo: true,
  tipo_cobranca: 'titulo',
  valor_primeiro_titulo: 'total',
  recebe_email: true,
  recebe_whatsapp: true,
  observacoes: '',
  ips_dns: '',
} as ClienteFormData;

function renderTab(errors: ClienteFormErrors = {}, value = '') {
  localStorage.setItem('app-language', 'pt-BR');
  const handleInputChange = jest.fn();
  render(
    <I18nProvider>
      <NotificationProvider>
        <IpsDnsTab
          formData={{ ...formData, ips_dns: value }}
          errors={errors}
          handleInputChange={handleInputChange}
          isSubmitting={false}
          formPrefix="cliente"
        />
      </NotificationProvider>
    </I18nProvider>
  );
  return { handleInputChange };
}

describe('IpsDnsTab', () => {
  it('mostra o campo vazio e a ajuda da API do Blockdomi', () => {
    renderTab();
    const field = screen.getByRole('textbox', { name: /IPs DNS/ }) as HTMLTextAreaElement;
    expect(field.value).toBe('');
    expect(screen.getByRole('img', { name: /API do Blockdomi/ })).toBeTruthy();
  });

  it('mostra erro quando o IP é inválido', () => {
    renderTab({ ips_dns: 'Informe IPv4, IPv6 ou CIDR separados por ;' });
    expect(screen.getByText('Informe IPv4, IPv6 ou CIDR separados por ;')).toBeTruthy();
  });

  it('envia o IP digitado', () => {
    const { handleInputChange } = renderTab();
    fireEvent.change(screen.getByRole('textbox', { name: /IPs DNS/ }), { target: { value: '10.0.0.1' } });
    expect(handleInputChange).toHaveBeenCalledWith('ips_dns', '10.0.0.1');
  });
});
