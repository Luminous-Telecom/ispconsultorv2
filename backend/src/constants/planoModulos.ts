/**
 * Módulos disponíveis nos planos SaaS.
 * Cada módulo controla um conjunto de funcionalidades no sistema.
 * Quando o plano do cliente não inclui um módulo, ele não terá acesso a ele.
 */
export const PLANO_MODULOS = [
  'cadastros',
  'financeiro',
  'blockdomi',
  'equipamentos',
  'rpki',
  'ixc_provedor',
  'envio_notificacoes',
  'assinatura_digital',
  'nfse',
] as const;

export type PlanoModuloId = (typeof PLANO_MODULOS)[number];

/** Mapeamento: módulo -> rotas/prefixos que requerem esse módulo */
export const MODULO_ROTAS: Record<PlanoModuloId, string[]> = {
  cadastros: ['/api/clientes', '/api/contratos', '/api/planos', '/api/bancos', '/api/tipos-cobranca-contrato', '/api/fornecedores'],
  financeiro: ['/api/titulos', '/api/contas-pagar', '/api/notas-fiscais', '/boleto'],
  blockdomi: ['/api/dominios', '/api/ipv4', '/api/ipv6', '/api/blockdomi', '/api/ips-permitidos', '/api/logs-acesso', '/api/blockdomi-listas', '/api/pdf-extract'],
  equipamentos: ['/api/agents', '/api/ssh-manager'],
  rpki: ['/api/rpki'],
  ixc_provedor: ['/api/integracao-ixc-provedor', '/api/ixc/ordens-servico'],
  envio_notificacoes: ['/api/servidores-whatsapp', '/api/servidores-email', '/api/mensagens-whatsapp', '/api/mensagens-email', '/api/mensagens-historico', '/api/templates-whatsapp'],
  assinatura_digital: ['/api/assinatura-digital', '/api/assinatura-digital-providers'],
  nfse: ['/api/notas-fiscais', '/api/nfse-config'],
};
