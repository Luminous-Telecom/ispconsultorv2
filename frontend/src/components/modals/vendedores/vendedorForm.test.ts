import { validateVendedorForm, vendedorFormToPayload, initialVendedorForm } from './vendedorForm';

describe('vendedorForm', () => {
  it('aceita nome e converte comissão vazia em nulo', () => {
    const errors = validateVendedorForm(
      { ...initialVendedorForm, nome: 'Ana Vendas', comissao_percentual: '10' },
      { nomeRequired: 'Nome é obrigatório', commissionRange: 'faixa', emailInvalid: 'email' }
    );
    expect(errors).toEqual({});
    const payload = vendedorFormToPayload({ ...initialVendedorForm, nome: 'Ana Vendas', comissao_percentual: '10' });
    expect(payload.nome).toBe('Ana Vendas');
    expect(payload.comissao_percentual).toBe(10);
    expect(payload.comissao_valor).toBeNull();
    expect('empresa_id' in payload).toBe(false);
  });

  it('recusa nome vazio, comissão acima de 100 e e-mail inválido', () => {
    const errors = validateVendedorForm(
      { ...initialVendedorForm, nome: ' ', comissao_percentual: '150', email: 'sem-arroba' },
      { nomeRequired: 'Nome é obrigatório', commissionRange: 'faixa', emailInvalid: 'email' }
    );
    expect(errors.nome).toBe('Nome é obrigatório');
    expect(errors.comissao_percentual).toBe('faixa');
    expect(errors.email).toBe('email');
  });
});
