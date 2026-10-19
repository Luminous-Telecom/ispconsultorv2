import { canSeeDashboardSection, canSeeFinanceAreas, canSeeModal, userRoleLabelKey } from './userRoles';

describe('perfis do ERP', () => {
  it('financeiro vê só a parte financeira da dashboard e os menus financeiros', () => {
    expect(canSeeDashboardSection('financeiro', 'financeiro')).toBe(true);
    expect(canSeeDashboardSection('financeiro', 'operacional')).toBe(false);
    expect(canSeeModal('financeiro', 'contas-receber')).toBe(true);
    expect(canSeeModal('financeiro', 'bancos')).toBe(true);
    expect(canSeeModal('financeiro', 'clientes')).toBe(true);
    expect(canSeeModal('financeiro', 'contratos')).toBe(true);
    expect(canSeeModal('financeiro', 'nfse')).toBe(true);
    expect(canSeeModal('financeiro', 'fornecedores')).toBe(true);
    expect(canSeeModal('financeiro', 'notas-fiscais')).toBe(true);
    expect(canSeeDashboardSection('financeiro', 'cadastros')).toBe(true);
    expect(canSeeModal('financeiro', 'blockdomi-dominios')).toBe(false);
    expect(canSeeModal('financeiro', 'rpki-roas')).toBe(false);
    expect(canSeeModal('financeiro', 'servidor-email')).toBe(false);
    expect(canSeeModal('financeiro', 'atendimentos')).toBe(false);
    expect(canSeeModal('financeiro', 'auditoria')).toBe(false);
    expect(canSeeModal('financeiro', 'ssh-devices')).toBe(false);
  });

  it('usuário vê cadastros, contratos, equipamentos e rpki, sem financeiro nem bancos', () => {
    expect(canSeeDashboardSection('user', 'operacional')).toBe(true);
    expect(canSeeDashboardSection('user', 'financeiro')).toBe(false);
    expect(canSeeModal('user', 'clientes')).toBe(true);
    expect(canSeeModal('user', 'contratos')).toBe(true);
    expect(canSeeModal('user', 'ssh-devices')).toBe(true);
    expect(canSeeModal('user', 'rpki-cas')).toBe(true);
    expect(canSeeModal('user', 'blockdomi-dominios')).toBe(true);
    expect(canSeeModal('user', 'atendimentos')).toBe(true);
    expect(canSeeModal('user', 'auditoria')).toBe(true);
    expect(canSeeModal('user', 'contas-receber')).toBe(false);
    expect(canSeeModal('user', 'bancos')).toBe(false);
    expect(canSeeModal('user', 'nfse')).toBe(false);
    expect(canSeeModal('user', 'usuarios')).toBe(false);
    expect(canSeeFinanceAreas('user')).toBe(false);
    expect(canSeeFinanceAreas('financeiro')).toBe(true);
    expect(canSeeFinanceAreas('admin')).toBe(true);
  });

  it('administrador vê dashboard e menus, e o perfil padrão do funcionário é usuário', () => {
    expect(canSeeDashboardSection('admin', 'financeiro')).toBe(true);
    expect(canSeeDashboardSection('admin', 'operacional')).toBe(true);
    expect(canSeeModal('admin', 'usuarios')).toBe(true);
    expect(canSeeModal('admin', 'backups')).toBe(true);
    expect(userRoleLabelKey('user')).toBe('user.user');
    expect(userRoleLabelKey('financeiro')).toBe('user.financeiro');
    expect(canSeeModal(null, 'clientes')).toBe(false);
    expect(canSeeModal('financeiro', 'conf-usuario')).toBe(true);
  });
});
