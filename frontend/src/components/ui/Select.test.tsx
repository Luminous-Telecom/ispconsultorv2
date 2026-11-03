import React from 'react';
import { render, screen } from '@testing-library/react';
import Select from './Select';

jest.mock('contexts/I18nContext', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

describe('Select', () => {
  it('mostra o aviso uma vez quando nenhuma opção foi escolhida', () => {
    render(
      <Select
        options={[
          { value: 'BOLETO', label: 'Boleto' },
          { value: 'PIX', label: 'PIX' },
        ]}
        value=""
      />
    );

    const options = screen.getAllByRole('option');
    expect(options.filter((option) => option.textContent === 'ui.selectOption')).toHaveLength(1);
    expect(options.some((option) => option.textContent === '')).toBe(false);
  });

  it('não repete o aviso quando a lista já tem a opção vazia', () => {
    render(
      <Select
        options={[
          { value: '', label: 'Todas' },
          { value: 'create', label: 'Novo' },
        ]}
        value=""
      />
    );

    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['Todas', 'Novo']);
  });
});
