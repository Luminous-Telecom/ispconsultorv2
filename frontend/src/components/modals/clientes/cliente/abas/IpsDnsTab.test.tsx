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
  it('mostra a tabela vazia', () => {
    renderTab();
    expect(screen.getByText('Nenhum IP DNS cadastrado')).toBeTruthy();
    expect(screen.queryByRole('textbox', { name: /Faixa de IPs/ })).toBeNull();
  });

  it('lista cada IP em uma linha', () => {
    renderTab({}, '192.168.1.1; 10.0.0.0/24');
    expect(screen.getByText('192.168.1.1')).toBeTruthy();
    expect(screen.getByText('10.0.0.0/24')).toBeTruthy();
  });

  it('mostra o erro de validação do cadastro', () => {
    renderTab({ ips_dns: 'Informe IPv4, IPv6 ou CIDR separados por ;' });
    expect(screen.getByText('Informe IPv4, IPv6 ou CIDR separados por ;')).toBeTruthy();
  });

  it('inclui o IP informado em Novo', () => {
    const { handleInputChange } = renderTab();
    fireEvent.click(screen.getByRole('button', { name: 'Novo' }));
    fireEvent.change(screen.getByRole('textbox', { name: /Faixa de IPs/ }), { target: { value: '10.0.0.1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(handleInputChange).toHaveBeenCalledWith('ips_dns', '10.0.0.1');
  });

  it('recusa IP inválido e duplicado', () => {
    const { handleInputChange } = renderTab({}, '10.0.0.1');
    fireEvent.click(screen.getByRole('button', { name: 'Novo' }));
    fireEvent.change(screen.getByRole('textbox', { name: /Faixa de IPs/ }), { target: { value: 'dns.provedor.net' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(screen.getByText('Informe um IPv4, IPv6 ou CIDR')).toBeTruthy();
    expect(handleInputChange).not.toHaveBeenCalled();

    fireEvent.change(screen.getByRole('textbox', { name: /Faixa de IPs/ }), { target: { value: '10.0.0.1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(screen.getByText('Este IP já está na lista')).toBeTruthy();
    expect(handleInputChange).not.toHaveBeenCalled();
  });

  it('edita e remove a linha selecionada', () => {
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
    const { handleInputChange } = renderTab({}, '10.0.0.1; 10.0.0.2');

    fireEvent.click(screen.getByText('10.0.0.1'));
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
    fireEvent.change(screen.getByRole('textbox', { name: /Faixa de IPs/ }), { target: { value: '10.0.0.9' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(handleInputChange).toHaveBeenCalledWith('ips_dns', '10.0.0.9; 10.0.0.2');

    fireEvent.click(screen.getByText('10.0.0.2'));
    fireEvent.click(screen.getByRole('button', { name: 'Deletar' }));
    expect(confirmSpy).toHaveBeenCalled();
    expect(handleInputChange).toHaveBeenCalledWith('ips_dns', '10.0.0.1');
    confirmSpy.mockRestore();
  });
});
