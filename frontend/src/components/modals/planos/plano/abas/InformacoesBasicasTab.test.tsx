import React from 'react';
import { render, screen } from '@testing-library/react';
import InformacoesBasicasTab from './InformacoesBasicasTab';
import type { PlanoForm } from '../types';

jest.mock('contexts/I18nContext', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('hooks/usePlanoModulos', () => ({
  usePlanoModulos: () => ({
    hasModulo: () => true,
    modulos: null,
  }),
}));

jest.mock('components/notifications/NotificationProvider', () => ({
  useNotificationContext: () => ({ success: jest.fn(), error: jest.fn() }),
}));

const formData: PlanoForm = {
  nome_plano: '',
  tipo_servico: 'consultoria',
  descricao: '',
  valor_mensal: 0,
  quantidade_usuarios: 0,
  data_inicio: '',
  data_fim: '',
  status: 'ativo',
  servicos_inclusos: [],
  observacoes: '',
};

it('lista Blockdomi no tipo de serviço quando não há restrição de módulo', () => {
  render(
    <InformacoesBasicasTab
      formData={formData}
      errors={{}}
      handleInputChange={jest.fn()}
      handleServiceToggle={jest.fn()}
      servicosDisponiveis={[]}
      isSubmitting={false}
    />
  );

  expect(screen.getByRole('option', { name: 'form.serviceTypeBlockdomi' })).toBeTruthy();
});
