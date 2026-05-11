/**
 * Módulos disponíveis nos planos SaaS.
 * Usado para filtrar menu e habilitar/desabilitar funcionalidades por plano.
 */
export const PLANO_MODULOS = [
  { id: 'cadastros', label: 'Cadastros' },
  { id: 'financeiro', label: 'Módulo Financeiro' },
  { id: 'blockdomi', label: 'Blockdomi' },
  { id: 'equipamentos', label: 'Equipamentos e Túneis' },
  { id: 'rpki', label: 'RPKI' },
  { id: 'envio_notificacoes', label: 'Envio de Notificações' },
  { id: 'assinatura_digital', label: 'Assinatura Digital' },
  { id: 'nfse', label: 'NFS-e' },
] as const;

export type PlanoModuloId = (typeof PLANO_MODULOS)[number]['id'];

/** Mapeamento: modal/folder -> módulo requerido */
export const MODAL_MODULO_MAP: Record<string, PlanoModuloId> = {
  clientes: 'cadastros',
  contratos: 'cadastros',
  planos: 'cadastros',
  bancos: 'cadastros',
  'tipos-cobranca-contrato': 'cadastros',
  fornecedores: 'cadastros',
  'contas-receber': 'financeiro',
  'contas-pagar': 'financeiro',
  'notas-fiscais': 'financeiro',
  'blockdomi-dominios': 'blockdomi',
  'blockdomi-ipv4': 'blockdomi',
  'blockdomi-ipv6': 'blockdomi',
  'blockdomi-importar-lista': 'blockdomi',
  'blockdomi-ips-permitidos': 'blockdomi',
  'logs-blockdomi-api': 'blockdomi',
  'logs-equipamentos': 'equipamentos',
  'logs-agentes': 'equipamentos',
  'agents': 'equipamentos',
  'ssh-devices': 'equipamentos',
  'rpki-cas': 'rpki',
  'rpki-cas-pai': 'rpki',
  'rpki-repositorios': 'rpki',
  'rpki-roas': 'rpki',
  'rpki-aspas': 'rpki',
  'rpki-validar-rota': 'rpki',
  'rpki-logs-validacao': 'rpki',
  'rpki-logs-ca-pai': 'rpki',
  'rpki-logs-repositorios': 'rpki',
  'servidor-whatsapp': 'envio_notificacoes',
  'servidor-email': 'envio_notificacoes',
  'logs-email': 'envio_notificacoes',
  'logs-whatsapp': 'envio_notificacoes',
  'assinatura-digital': 'assinatura_digital',
  nfse: 'nfse',
};
