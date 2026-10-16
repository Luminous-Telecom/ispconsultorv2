import { buildListPagination, buildPagination, buildSaasPagination } from './pagination';

describe('paginação de listagem', () => {
  it('calcula faixa da página e última página', () => {
    expect(buildPagination(2, 10, 25)).toEqual({
      current_page: 2,
      per_page: 10,
      total: 25,
      last_page: 3,
      from: 11,
      to: 20,
    });
  });

  it('lista vazia não inventa intervalo', () => {
    const vazio = buildPagination(1, 15, 0);
    expect(vazio.from).toBe(0);
    expect(vazio.to).toBe(0);
    expect(vazio.last_page).toBe(0);
  });

  it('expõe aliases de página e o formato enxuto do SaaS', () => {
    const lista = buildListPagination(1, 10, 5);
    expect(lista.hasNext).toBe(false);
    expect(lista.hasPrev).toBe(false);
    expect(lista.totalPages).toBe(1);
    expect(buildSaasPagination(1, 10, 0).totalPages).toBe(0);
  });
});
