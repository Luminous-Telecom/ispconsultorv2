export const ERP_ROLES = ['admin', 'financeiro', 'user'] as const;

export type ErpRole = (typeof ERP_ROLES)[number];

export type DashboardSection = 'financeiro' | 'operacional' | 'cadastros';

const ALWAYS_VISIBLE_MODALS = new Set(['conf-usuario', 'seguranca-usuario']);

const FINANCEIRO_MODALS = new Set([
  'clientes',
  'cliente-modal',
  'contratos',
  'planos',
  'fornecedores',
  'documentos-sistema',
  'nfse',
  'bancos',
  'tipos-cobranca-contrato',
  'contas-receber',
  'contas-pagar',
  'notas-fiscais',
  'dias-vencimento',
]);

const USER_DENIED_MODALS = new Set([
  'bancos',
  'tipos-cobranca-contrato',
  'contas-receber',
  'contas-pagar',
  'notas-fiscais',
  'dias-vencimento',
  'nfse',
  'dados-empresa',
  'usuarios',
  'recursos-sistema',
  'atualizacoes',
  'backups',
]);

export function isErpRole(role: string | null | undefined): role is ErpRole {
  return role === 'admin' || role === 'financeiro' || role === 'user';
}

export function canSeeFinanceAreas(role: string | null | undefined): boolean {
  if (!role) return false;
  return role !== 'user';
}

export function canSeeModal(role: string | null | undefined, modalId: string): boolean {
  if (!role) return false;
  if (ALWAYS_VISIBLE_MODALS.has(modalId)) return true;
  if (role === 'admin') return true;
  if (role === 'financeiro') return FINANCEIRO_MODALS.has(modalId);
  return !USER_DENIED_MODALS.has(modalId);
}

export function canSeeDashboardSection(
  role: string | null | undefined,
  section: DashboardSection
): boolean {
  if (!role) return false;
  if (role === 'admin') return true;
  if (role === 'financeiro') return section === 'financeiro' || section === 'cadastros';
  return section === 'operacional';
}

export function userRoleLabelKey(role: string | null | undefined): 'user.admin' | 'user.financeiro' | 'user.user' {
  if (role === 'admin') return 'user.admin';
  if (role === 'financeiro') return 'user.financeiro';
  return 'user.user';
}

export function userRoleBadgeClass(role: string | null | undefined): string {
  if (role === 'admin') return 'bg-info';
  if (role === 'financeiro') return 'bg-success';
  return 'bg-secondary';
}
