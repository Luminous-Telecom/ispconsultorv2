export const HISTORICO_ORIGEM_ERP = 'erp' as const;
export const HISTORICO_ORIGEM_SAAS = 'saas' as const;

export type HistoricoOrigem = typeof HISTORICO_ORIGEM_ERP | typeof HISTORICO_ORIGEM_SAAS;
