import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nProvider } from 'contexts/I18nContext';
import { NotificationProvider } from 'components/notifications/NotificationProvider';
import { ClienteService } from 'services/clienteService';
import IpsDnsTab from './IpsDnsTab';
import { ClienteFormData, ClienteFormErrors } from 'types';

jest.mock('services/clienteService', () => ({
  ClienteService: { update: jest.fn() },
}));

jest.mock('hooks/useApiError', () => ({
  useApiError: () => ({ showApiError: jest.fn() }),
}));

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

function renderTab(errors: ClienteFormErrors = {}, value = '', entityId?: number) {
  localStorage.setItem('app-language', 'pt-BR');
  const handleInputChange = jest.fn();
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <NotificationProvider>
          <IpsDnsTab
            formData={{ ...formData, ips_dns: value }}
            errors={errors}
            handleInputChange={handleInputChange}
            isSubmitting={false}
            formPrefix="cliente"
            entityId={entityId}
          />
        </NotificationProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
  return { handleInputChange };
}

describe('IpsDnsTab', () => {
  beforeEach(() => {
    jest.mocked(ClienteService.update).mockReset();
  });

  it('mostra uma única faixa com todos os IPs', () => {
    renderTab({}, '192.168.1.1; 10.0.0.0/24');
    const campo = screen.getByRole('textbox', { name: /Faixa de IPs/ }) as HTMLTextAreaElement;
    expect(campo.value).toBe('192.168.1.1; 10.0.0.0/24');
    expect(screen.queryByText('Nenhum IP DNS cadastrado')).toBeNull();
  });

  it('mostra o erro de validação do cadastro', () => {
    renderTab({ ips_dns: 'Informe IPv4, IPv6 ou CIDR separados por ;' });
    expect(screen.getByText('Informe IPv4, IPv6 ou CIDR separados por ;')).toBeTruthy();
  });

  it('recusa IP inválido e não grava', () => {
    const { handleInputChange } = renderTab({}, '10.0.0.1');
    const campo = screen.getByRole('textbox', { name: /Faixa de IPs/ });
    fireEvent.focus(campo);
    fireEvent.change(campo, { target: { value: 'dns.provedor.net' } });
    fireEvent.blur(campo);
    expect(screen.getByText('Informe um IPv4, IPv6 ou CIDR')).toBeTruthy();
    expect(ClienteService.update).not.toHaveBeenCalled();
    expect(handleInputChange).toHaveBeenCalledWith('ips_dns', 'dns.provedor.net');
  });

  it('junta os IPs numa faixa e grava uma vez no cliente salvo', async () => {
    jest.mocked(ClienteService.update).mockResolvedValue({ id: 8, ips_dns: '10.0.0.1; 10.0.0.0/24' } as never);
    const { handleInputChange } = renderTab({}, '', 8);
    const campo = screen.getByRole('textbox', { name: /Faixa de IPs/ });
    fireEvent.focus(campo);
    fireEvent.change(campo, { target: { value: '10.0.0.1\n10.0.0.0/24' } });
    fireEvent.blur(campo);
    await waitFor(() => {
      expect(ClienteService.update).toHaveBeenCalledWith(8, { ips_dns: '10.0.0.1; 10.0.0.0/24' });
    });
    expect(handleInputChange).toHaveBeenCalledWith('ips_dns', '10.0.0.1; 10.0.0.0/24');
  });
});
