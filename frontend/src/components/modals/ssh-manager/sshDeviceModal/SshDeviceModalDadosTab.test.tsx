import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from 'contexts/I18nContext';
import { NotificationProvider } from 'components/notifications/NotificationProvider';
import SshDeviceModalDadosTab from './SshDeviceModalDadosTab';
import type { SshDeviceFormData } from './types';

const formData: SshDeviceFormData = {
  agent_id: '',
  name: 'Router',
  host: '10.0.0.1',
  port: '22',
  username: 'admin',
  password: '',
  private_key: '',
  device_type: 'mikrotik',
  description: '',
  is_active: true,
  backup_enabled: false,
};

function renderTab() {
  localStorage.setItem('app-language', 'pt-BR');
  return render(
    <I18nProvider>
      <NotificationProvider>
        <SshDeviceModalDadosTab
          isEditing
          isAdmin={false}
          me={{ role: 'user' }}
          adminClienteId={null}
          adminClienteNome=""
          clienteEdicaoLabel="Fenix"
          clienteIdEdicao={6}
          dadosEmpresaTenant={null}
          agentEntities={[]}
          formData={formData}
          errors={{}}
          agendamentoBackup={undefined}
          onFieldChange={() => () => undefined}
          onDeviceTypeChange={jest.fn()}
          onAdminClienteChange={jest.fn()}
          onShowClientePicker={jest.fn()}
          onShowAgentPicker={jest.fn()}
        />
      </NotificationProvider>
    </I18nProvider>,
  );
}

it('mostra o cliente do equipamento com edição e sem troca do vínculo', () => {
  renderTab();
  const cliente = screen.getByLabelText('Cliente', { exact: false }) as HTMLInputElement;
  expect(cliente.value).toBe('6');
  expect(cliente.readOnly).toBe(true);
  expect(screen.getByDisplayValue('Fenix')).toBeTruthy();
  expect((screen.getByRole('button', { name: 'Editar registro' }) as HTMLButtonElement).disabled).toBe(false);
  const searches = screen.getAllByRole('button', { name: 'Abrir listagem de registros' });
  expect((searches[0] as HTMLButtonElement).disabled).toBe(true);
});
