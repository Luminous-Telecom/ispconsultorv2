import { buildListFilters } from './contratoListUtils';

it('abre a lista de contratos só com ativos', () => {
  expect(buildListFilters(undefined).status).toBe('ativo');
});

it('mostra os demais status quando o filtro de inativos está marcado', () => {
  expect(buildListFilters(undefined, true).status).toBeUndefined();
});

it('mantém o status pedido pela tela que abriu a lista', () => {
  expect(buildListFilters({ status: 'suspenso' }).status).toBe('suspenso');
  expect(buildListFilters({ status: 'inativo' }, true).status).toBeUndefined();
});
