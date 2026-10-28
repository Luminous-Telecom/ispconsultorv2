import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from 'contexts/I18nContext';
import BackupRunPanel from './BackupRunPanel';

function renderPanel(active: boolean) {
  localStorage.setItem('app-language', 'pt-BR');
  return render(
    <I18nProvider>
      <BackupRunPanel
        active={active}
        progress={40}
        message="Exportando banco de dados"
        logs={['Iniciando backup...', 'Exportando tabela clientes', '✗ falha ao gravar']}
      />
    </I18nProvider>
  );
}

describe('BackupRunPanel', () => {
  it('mostra progresso e o registro enquanto o backup roda', () => {
    renderPanel(true);
    expect(screen.getByText('Backup em andamento').textContent).toBe('Backup em andamento');
    expect(screen.getByText('Exportando banco de dados').textContent).toBe('Exportando banco de dados');
    expect(screen.getByText('Exportando tabela clientes').textContent).toBe('Exportando tabela clientes');
    expect(screen.getByRole('progressbar', { name: 'Backup em andamento' }).getAttribute('aria-valuenow')).toBe('40');
    expect(screen.getByText('40%').textContent).toBe('40%');
    expect(screen.getByRole('log').textContent).toContain('Iniciando backup...');
    expect(screen.getByText('✗ falha ao gravar').className).toContain('terminal-log-line--danger');
  });

  it('marca o painel como concluído quando o backup termina', () => {
    renderPanel(false);
    expect(screen.getByText('Backup concluído').textContent).toBe('Backup concluído');
    expect(screen.getByRole('progressbar', { name: 'Backup concluído' }).getAttribute('aria-valuenow')).toBe('40');
  });
});