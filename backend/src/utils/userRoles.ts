export const ERP_ROLES = ['admin', 'financeiro', 'user'] as const;

export type ErpRole = (typeof ERP_ROLES)[number];

const ADMIN_ONLY_PREFIXES = [
  '/api/usuarios',
  '/api/dados-empresa',
  '/api/atualizacoes',
  '/api/backups',
  '/api/parametros',
  '/api/empresas',
];

const FINANCE_PREFIXES = [
  '/api/titulos',
  '/api/contas-pagar',
  '/api/notas-fiscais',
  '/api/bancos',
  '/api/tipos-cobranca-contrato',
  '/api/dias-vencimento',
  '/api/nfse-config',
  '/api/recibo',
  '/boleto',
  '/recibo',
];

const BLOCKED_FOR_FINANCEIRO = [
  '/api/dominios',
  '/api/ipv4',
  '/api/ipv6',
  '/api/blockdomi',
  '/api/blockdomi-publico',
  '/api/ips-permitidos',
  '/api/pdf-extract',
  '/api/rpki',
  '/api/servidores-email',
  '/api/servidores-whatsapp',
  '/api/mensagens-whatsapp',
  '/api/templates-whatsapp',
  '/api/mensagens-email',
  '/api/mensagens-historico',
  '/api/assinatura-digital',
  '/api/assinatura-digital-providers',
  '/api/integracao-ixc-provedor',
  '/api/ixc',
  '/api/auditoria',
  '/api/ssh-manager',
  '/api/agents',
  '/api/scheduler',
  '/api/workers',
  '/api/dashboard/backup-status-detalhe',
];

function matchesPrefix(path: string, prefixes: readonly string[]): boolean {
  return prefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

export function canAccessApiPath(role: unknown, rawPath: string): boolean {
  const path = String(rawPath || '').split('?')[0];
  const value = String(role ?? '');

  if (value === 'admin') return true;
  if (value !== 'financeiro' && value !== 'user') return true;

  if (matchesPrefix(path, ADMIN_ONLY_PREFIXES)) return false;

  if (value === 'financeiro') {
    return !matchesPrefix(path, BLOCKED_FOR_FINANCEIRO);
  }

  return !matchesPrefix(path, FINANCE_PREFIXES);
}
