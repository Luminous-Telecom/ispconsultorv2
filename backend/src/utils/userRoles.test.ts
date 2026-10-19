import { canAccessApiPath } from './userRoles';

describe('canAccessApiPath', () => {
  it('administrador acessa financeiro e operação', () => {
    expect(canAccessApiPath('admin', '/api/titulos')).toBe(true);
    expect(canAccessApiPath('admin', '/api/blockdomi/dominios')).toBe(true);
    expect(canAccessApiPath('admin', '/api/usuarios')).toBe(true);
  });

  it('financeiro acessa títulos e bancos e não acessa blockdomi, rpki, integrações, suporte nem logs', () => {
    expect(canAccessApiPath('financeiro', '/api/titulos/1')).toBe(true);
    expect(canAccessApiPath('financeiro', '/api/bancos')).toBe(true);
    expect(canAccessApiPath('financeiro', '/api/contas-pagar')).toBe(true);
    expect(canAccessApiPath('financeiro', '/api/notas-fiscais')).toBe(true);
    expect(canAccessApiPath('financeiro', '/api/notas-fiscais/gerar')).toBe(true);
    expect(canAccessApiPath('financeiro', '/api/nfse-config')).toBe(true);
    expect(canAccessApiPath('financeiro', '/api/fornecedores')).toBe(true);
    expect(canAccessApiPath('financeiro', '/api/dashboard')).toBe(true);
    expect(canAccessApiPath('financeiro', '/api/clientes')).toBe(true);
    expect(canAccessApiPath('financeiro', '/api/contratos/2')).toBe(true);
    expect(canAccessApiPath('financeiro', '/api/planos')).toBe(true);

    expect(canAccessApiPath('financeiro', '/api/blockdomi/dominios')).toBe(false);
    expect(canAccessApiPath('financeiro', '/api/rpki/roas')).toBe(false);
    expect(canAccessApiPath('financeiro', '/api/servidores-email')).toBe(false);
    expect(canAccessApiPath('financeiro', '/api/ixc/atendimentos')).toBe(false);
    expect(canAccessApiPath('financeiro', '/api/auditoria')).toBe(false);
    expect(canAccessApiPath('financeiro', '/api/ssh-manager/devices')).toBe(false);
    expect(canAccessApiPath('financeiro', '/api/dashboard/backup-status-detalhe')).toBe(false);
  });

  it('usuário acessa cadastros, contratos, equipamentos e rpki e não acessa financeiro nem bancos', () => {
    expect(canAccessApiPath('user', '/api/clientes')).toBe(true);
    expect(canAccessApiPath('user', '/api/contratos/3')).toBe(true);
    expect(canAccessApiPath('user', '/api/ssh-manager/devices')).toBe(true);
    expect(canAccessApiPath('user', '/api/rpki/roas')).toBe(true);
    expect(canAccessApiPath('user', '/api/blockdomi/dominios')).toBe(true);
    expect(canAccessApiPath('user', '/api/servidores-email')).toBe(true);

    expect(canAccessApiPath('user', '/api/titulos')).toBe(false);
    expect(canAccessApiPath('user', '/api/bancos/1')).toBe(false);
    expect(canAccessApiPath('user', '/api/contas-pagar')).toBe(false);
    expect(canAccessApiPath('user', '/api/notas-fiscais')).toBe(false);
    expect(canAccessApiPath('user', '/api/nfse-config')).toBe(false);
    expect(canAccessApiPath('user', '/api/usuarios')).toBe(false);
  });

  it('não confunde blockdomi com a rota pública', () => {
    expect(canAccessApiPath('user', '/api/blockdomi-publico/consulta')).toBe(true);
    expect(canAccessApiPath('financeiro', '/api/blockdomi-publico/consulta')).toBe(false);
  });
});
