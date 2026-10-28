import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from 'contexts/I18nContext';
import { NotificationProvider } from 'components/notifications/NotificationProvider';
import DadosBasicosTab from './DadosBasicosTab';
import type { DadosEmpresaForm } from '../types';

const dados: DadosEmpresaForm = {
  id: 1,
  razao_social: 'Empresa',
  nome_fantasia: 'Fantasia',
  cnpj: '00.000.000/0001-00',
  inscricao_estadual: '',
  inscricao_municipal: '',
  cep: '',
  endereco: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  estado: '',
  telefone: '',
  celular: '',
  email: '',
  site: '',
  responsavel_nome: '',
  responsavel_cpf: '',
  responsavel_cargo: '',
};

function renderTab() {
  localStorage.setItem('app-language', 'pt-BR');
  return render(
    <I18nProvider>
      <NotificationProvider>
        <DadosBasicosTab dados={dados} onChange={jest.fn()} isPending={false} onLogoChange={jest.fn()} />
      </NotificationProvider>
    </I18nProvider>,
  );
}

it('coloca Logo da Empresa antes do ficheiro, na mesma linha dos outros campos', () => {
  renderTab();

  const input = document.getElementById('logo');
  const label = screen.getByText('Logo da Empresa');
  expect(input).not.toBeNull();
  expect(label.compareDocumentPosition(input as Node) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(label.closest('.form-field')).toBe(input?.closest('.form-field'));
  expect(input?.closest('.form-field-control')).not.toBeNull();
  expect(input?.classList.contains('form-control')).toBe(true);
});
