import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from 'contexts/I18nContext';
import { translations } from 'i18n/translations';
import { CartaoCnpjButton, NovoButton, SalvarButton, VisualizarButton } from './buttons';
import { getSystemButtonBulkProps, SYSTEM_BUTTON_CONFIG, toBulkVariant } from './config';

function renderButton(ui: React.ReactElement) {
  localStorage.setItem('app-language', 'pt-BR');
  return render(<I18nProvider>{ui}</I18nProvider>);
}

describe('botões do sistema', () => {
  it('cada ação tem chave de tradução nos três idiomas', () => {
    for (const config of Object.values(SYSTEM_BUTTON_CONFIG)) {
      expect(translations['pt-BR'][config.i18nKey]).toEqual(expect.any(String));
      expect(translations['en-US'][config.i18nKey].length).toBeGreaterThan(0);
      expect(translations['es-ES'][config.i18nKey].length).toBeGreaterThan(0);
    }
  });

  it('Salvar continua com o mesmo texto e fica desabilitado enquanto isPending', () => {
    renderButton(<SalvarButton isPending onClick={jest.fn()} />);
    const botao = screen.getByRole('button', { name: 'Salvar' });
    expect((botao as HTMLButtonElement).disabled).toBe(true);
    expect(botao.getAttribute('type')).toBe('submit');
    expect(botao.textContent).toBe('Salvar');
  });

  it('Novo usa a entidade no rótulo e Visualizar mostra o texto da ação', () => {
    renderButton(
      <>
        <NovoButton entity="Cliente" onClick={jest.fn()} />
        <VisualizarButton onClick={jest.fn()} />
      </>
    );
    expect((screen.getByRole('button', { name: 'Novo Cliente' }) as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByRole('button', { name: 'Visualizar' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('Cartão CNPJ mantém o texto da ação', () => {
    renderButton(<CartaoCnpjButton type="button" onClick={jest.fn()} />);
    const botao = screen.getByRole('button', { name: 'Cartão CNPJ' });
    expect((botao as HTMLButtonElement).disabled).toBe(false);
    expect(botao.getAttribute('type')).toBe('button');
  });

  it('variante em massa não usa outline e o rótulo de criar inclui a entidade', () => {
    expect(toBulkVariant('outline-danger')).toBe('danger');
    expect(toBulkVariant('ghost')).toBe('primary');
    const t = (key: string, params?: Record<string, unknown>) => {
      if (key === 'buttons.createEntity') return `Novo ${params?.entity}`;
      return translations['pt-BR'][key as keyof typeof translations['pt-BR']];
    };
    expect(getSystemButtonBulkProps('novo', t, 'Plano').label).toBe('Novo Plano');
    expect(getSystemButtonBulkProps('deletar', t).variant).toBe('danger');
  });
});
