export const asaasConfig = {
  nome: 'Asaas',
  codigo: '461', // Código do banco Asaas
  api_url: 'https://www.asaas.com/api/v3',
  sandbox_url: 'https://sandbox.asaas.com/api/v3',
  
  campos_obrigatorios: [
    'api_key',
  ],
  
  campos_opcionais: [
    'taxa_cobranca',
    'incluir_taxa',
  ],
  
  configuracoes_padrao: {
    percentual_multa: 2.00,
    percentual_juros: 0.03,
    desconto_tipo: 'fixo',
    desconto_valor: 0,
    taxa_cobranca: 0,
    incluir_taxa: false,
  },
  
  placeholders: {
    api_key: 'Token da API Asaas disponível no painel administrativo',
  },
  
  validacoes: {
    api_key: 'required|string|max:255',
    taxa_cobranca: 'numeric|min:0',
  },
  
  instrucoes: {
    api_key: 'Acesse o painel Asaas > Configurações > Integrações > API Key',
  },
  
  logo: 'asaas',
  cor: '#00A8E8',
  
  auth_type: 'bearer' as const,
};

export default asaasConfig;

