import { tabHasError, withInvalidTabs } from './tabValidation';

describe('withInvalidTabs', () => {
  const tabs = [
    { id: 'contrato', label: 'Dados' },
    { id: 'endereco', label: 'Endereço' },
  ];

  const fieldsByTab = {
    contrato: ['plano_id'],
    endereco: ['endereco', 'estado'],
  };

  it('marca só a aba que tem campo com erro', () => {
    const marked = withInvalidTabs(tabs, { endereco: 'Endereço é obrigatório', plano_id: '' }, fieldsByTab);

    expect(marked.find((tab) => tab.id === 'contrato')?.invalid).toBe(false);
    expect(marked.find((tab) => tab.id === 'endereco')?.invalid).toBe(true);
  });

  it('não marca aba quando não há erro', () => {
    expect(tabHasError({}, ['endereco'])).toBe(false);
    expect(withInvalidTabs(tabs, null, fieldsByTab).every((tab) => !tab.invalid)).toBe(true);
  });
});
