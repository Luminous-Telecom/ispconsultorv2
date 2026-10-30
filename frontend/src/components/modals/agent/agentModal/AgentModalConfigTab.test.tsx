import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from 'contexts/I18nContext';
import { NotificationProvider } from 'components/notifications/NotificationProvider';
import type { TranslationKeys } from 'contexts/I18nContext';
import type { Agent } from 'types';
import AgentModalConfigTab from './AgentModalConfigTab';

function t(key: keyof TranslationKeys) {
  return key === 'table.client' ? 'Cliente' : String(key);
}

function renderTab() {
  localStorage.setItem('app-language', 'pt-BR');
  return render(
    <I18nProvider>
      <NotificationProvider>
        <AgentModalConfigTab
          isEditing
          isAdmin
          me={null}
          agentData={{ id: 'ag-1', cliente_id: 4, name: 'Agente', token_hint: 'abc', is_active: true, online: false } as Agent}
          agentFormData={{ name: 'Agente', description: '' }}
          errors={{}}
          adminClienteId={null}
          adminClienteNome=""
          clienteEdicaoLabel="Fenix"
          regeneratePending={false}
          t={t}
          setField={() => () => undefined}
          setErrors={jest.fn()}
          setAdminClienteId={jest.fn()}
          setAdminClienteNome={jest.fn()}
          onShowClientePicker={jest.fn()}
          onFormSubmit={jest.fn()}
          onRegenerate={jest.fn()}
        />
      </NotificationProvider>
    </I18nProvider>,
  );
}

it('mostra o cliente do agente com edição e sem troca do vínculo', () => {
  renderTab();
  const cliente = screen.getByLabelText('Cliente', { exact: false }) as HTMLInputElement;
  expect(cliente.value).toBe('4');
  expect(cliente.readOnly).toBe(true);
  expect(screen.getByDisplayValue('Fenix')).toBeTruthy();
  expect((screen.getByRole('button', { name: 'Editar registro' }) as HTMLButtonElement).disabled).toBe(false);
  expect((screen.getByRole('button', { name: 'Abrir listagem de registros' }) as HTMLButtonElement).disabled).toBe(true);
});
