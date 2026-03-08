/**
 * Módulos disponíveis nos planos SaaS.
 * Usado para filtrar menu e habilitar/desabilitar funcionalidades por plano.
 */
export const PLANO_MODULOS = [
  { id: 'cadastros', label: 'Cadastros' },
  { id: 'financeiro', label: 'Módulo Financeiro' },
  { id: 'blockdomi', label: 'Blockdomi' },
  { id: 'envio_notificacoes', label: 'Envio de Notificações' },
  { id: 'historico_notificacoes', label: 'Histórico de Notificações' },
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
  'blockdomi-logs-acesso': 'blockdomi',
  'servidor-whatsapp': 'envio_notificacoes',
  'servidor-email': 'envio_notificacoes',
  'historico-whatsapp': 'historico_notificacoes',
  'historico-email': 'historico_notificacoes',
  'assinatura-digital': 'assinatura_digital',
  nfse: 'nfse',
};
