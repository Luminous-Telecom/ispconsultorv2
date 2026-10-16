import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from 'contexts/I18nContext';
import PortalNacionalConfigFields, { type PortalNacionalFormSlice } from './PortalNacionalConfigFields';

jest.mock('components/notifications/NotificationProvider', () => ({
  useNotificationContext: () => ({ success: jest.fn(), error: jest.fn(), warning: jest.fn(), info: jest.fn() }),
}));

const base: PortalNacionalFormSlice = {
  portal_nacional_ambiente: 'HOMOLOGACAO',
  certificado_senha: '',
  certificado_nome_arquivo: '',
  has_certificado: false,
  certificado_titular: '',
  certificado_cnpj: '',
  certificado_validade: '',
  op_simples_nacional: '1',
  regime_especial_tributacao: '0',
  regime_apuracao_sn: '',
  tp_ret_issqn: '1',
};

function renderCampos(formData: PortalNacionalFormSlice, onChange = jest.fn()) {
  localStorage.setItem('app-language', 'pt-BR');
  render(
    <I18nProvider>
      <PortalNacionalConfigFields formData={formData} disabled={false} onChange={onChange} />
    </I18nProvider>
  );
  return onChange;
}

describe('PortalNacionalConfigFields', () => {
  it('mostra o certificado e esconde a apuração do Simples para não optante', () => {
    renderCampos(base);
    expect(screen.getByText('Certificado A1')).toBeTruthy();
    expect(screen.queryByText('Regime de apuração do SN')).toBeNull();
  });

  it('mostra a apuração do Simples para ME/EPP e avisa a troca de ambiente', async () => {
    const onChange = renderCampos({ ...base, op_simples_nacional: '3', regime_apuracao_sn: '1' });
    expect(screen.getByText('Regime de apuração do SN')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Ambiente'), { target: { value: 'PRODUCAO' } });
    expect(onChange).toHaveBeenCalledWith('portal_nacional_ambiente', 'PRODUCAO');
  });
});
