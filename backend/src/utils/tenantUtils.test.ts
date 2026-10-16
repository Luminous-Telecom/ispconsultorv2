import { Request } from 'express';
import { DadosEmpresa } from '../models/sistema/DadosEmpresa';
import { Cliente } from '../models/clientes/Cliente';
import {
  getEmpresaId,
  getEmpresaIdOrNull,
  getUsuarioIdOrNull,
  isAdminRequest,
  parseEmpresaIdQuery,
  resolveEmpresaIdForScopedCreate,
  resolveEmpresaIdOnCreate,
  resolveEmpresaScopeForList,
  resolveListEmpresaId,
} from './tenantUtils';

jest.mock('../models/sistema/DadosEmpresa', () => ({
  DadosEmpresa: { findByPk: jest.fn() },
}));

jest.mock('../models/clientes/Cliente', () => ({
  Cliente: { findByPk: jest.fn() },
}));

function asRequest(user?: object, query: Record<string, string> = {}): Request {
  return { user, query } as unknown as Request;
}

describe('tenant — sessão e empresa', () => {
  it('lê empresa_id do token e recusa requisição sem empresa', () => {
    expect(getEmpresaId(asRequest({ empresa_id: 4 }))).toBe(4);
    expect(() => getEmpresaId(asRequest({}))).toThrow('empresa_id não encontrado');
    expect(getEmpresaIdOrNull(asRequest({}))).toBeNull();
  });

  it('lê usuario por id ou sub e ignora token string', () => {
    expect(getUsuarioIdOrNull(asRequest({ id: 9 }))).toBe(9);
    expect(getUsuarioIdOrNull(asRequest({ sub: '15' }))).toBe(15);
    expect(getUsuarioIdOrNull(asRequest('token-cru' as unknown as object))).toBeNull();
  });

  it('reconhece admin só quando role é admin', () => {
    expect(isAdminRequest(asRequest({ role: 'admin', empresa_id: 1 }))).toBe(true);
    expect(isAdminRequest(asRequest({ role: 'usuario', empresa_id: 1 }))).toBe(false);
  });

  it('parseEmpresaIdQuery ignora vazio, zero e texto', () => {
    expect(parseEmpresaIdQuery(undefined)).toBeNull();
    expect(parseEmpresaIdQuery('0')).toBeNull();
    expect(parseEmpresaIdQuery('abc')).toBeNull();
    expect(parseEmpresaIdQuery('12')).toBe(12);
  });
});

describe('tenant — visualização', () => {
  it('usuário comum vê só a empresa do token, mesmo com query de outro tenant', () => {
    const req = asRequest({ role: 'usuario', empresa_id: 3 }, { empresa_id: '99' });
    expect(resolveEmpresaScopeForList(req, 99)).toBe(3);
    expect(resolveListEmpresaId(req)).toBe(3);
  });

  it('admin pode filtrar a listagem pela query e, sem filtro, vê todos', () => {
    const comFiltro = asRequest({ role: 'admin', empresa_id: 1 }, { empresa_id: '8' });
    expect(resolveListEmpresaId(comFiltro)).toBe(8);
    const semFiltro = asRequest({ role: 'admin' });
    expect(resolveListEmpresaId(semFiltro)).toBeNull();
  });

  it('sem empresa e sem perfil admin a listagem fica sem acesso', () => {
    expect(resolveListEmpresaId(asRequest({ role: 'usuario' }))).toBe(false);
  });
});

describe('tenant — cadastro', () => {
  const findEmpresa = DadosEmpresa.findByPk as jest.Mock;
  const findCliente = Cliente.findByPk as jest.Mock;

  beforeEach(() => {
    findEmpresa.mockReset();
    findCliente.mockReset();
  });

  it('usuário comum grava a empresa do token e ignora o body', async () => {
    const result = await resolveEmpresaIdOnCreate(asRequest({ role: 'usuario', empresa_id: 5 }), 99);
    expect(result).toEqual({ ok: true, empresa_id: 5 });
    expect(findEmpresa).not.toHaveBeenCalled();
  });

  it('admin só grava empresa que existe', async () => {
    findEmpresa.mockResolvedValueOnce(null);
    const invalida = await resolveEmpresaIdOnCreate(asRequest({ role: 'admin', empresa_id: 1 }), 40);
    expect(invalida).toEqual({ ok: false, message: 'Empresa inválida ou não encontrada' });

    findEmpresa.mockResolvedValueOnce({ id: 40 });
    const valida = await resolveEmpresaIdOnCreate(asRequest({ role: 'admin', empresa_id: 1 }), 40);
    expect(valida).toEqual({ ok: true, empresa_id: 40 });
  });

  it('admin no cadastro vinculado exige cliente da própria empresa', async () => {
    const admin = asRequest({ role: 'admin', empresa_id: 1 });
    expect(await resolveEmpresaIdForScopedCreate(admin, {})).toEqual({
      ok: false,
      message: 'Selecione o cliente',
    });

    findCliente.mockResolvedValueOnce(null);
    expect(await resolveEmpresaIdForScopedCreate(admin, { cliente_id: 3 })).toEqual({
      ok: false,
      message: 'Cliente não encontrado',
    });

    findCliente.mockResolvedValueOnce({ empresa_id: null });
    expect(await resolveEmpresaIdForScopedCreate(admin, { cliente_id: 3 })).toEqual({
      ok: false,
      message: 'Cliente sem empresa vinculada',
    });

    findCliente.mockResolvedValueOnce({ empresa_id: 6 });
    expect(await resolveEmpresaIdForScopedCreate(admin, { cliente_id: 3 })).toEqual({
      ok: true,
      empresa_id: 6,
    });
  });
});
