export const asaasConfig = {
  nome: 'Asaas',
  codigo: '461', // Código do banco Asaas
  api_url: 'https://www.asaas.com/api/v3',
  sandbox_url: 'https://sandbox.asaas.com/api/v3',
  cobranca_base_url: 'https://www.asaas.com/api/v3',
  api_base_url: 'https://www.asaas.com/api/v3',
  
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
  
  api_endpoints: {
    auth: '',
    boleto: '/payments',
    consultar: '/payments/:id',
    cancelar: '/payments/:id',
    liquidar: '/payments/:id/receiveInCash',
    listar_cobrancas: '/payments',
    notification: '/payments/:id'
  },

  api_response_mapping: {
    boleto: {
      id: 'id',
      url: 'bankSlipUrl',
      barcode: 'bankSlipBarcode',
      linha_digitavel: 'identificationField',
      pdf: 'invoiceUrl',
      pix_qrcode: 'pixQrCode',
      pix_qrcode_image: 'pixQrCodeImage',
    },
    status: {
      status: 'status',
    },
  },

  auth_config: {
    grant_type: 'api_key',
    auth_type: 'api_key',
  },

  client_id_field: 'client_id',
  client_secret_field: 'client_secret',
  token: '',
  notification: '/payments/:id',

  auth_type: 'bearer' as const,
};

export default asaasConfig;

