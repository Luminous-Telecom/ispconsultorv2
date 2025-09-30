export const efiConfig = {
  nome: 'Efi (Gerencianet)',
  codigo: '364',
  api_url: 'https://cobrancas.api.efipay.com.br',
  sandbox_url: 'https://cobrancas-h.api.efipay.com.br',
  
  campos_obrigatorios: [
    'cedente',
    'identificador_conta',
    'client_id_producao',
    'client_secret_producao',
    'url_retorno',
  ],
  
  campos_opcionais: [
    'repassar_email_cliente',
  ],
  
  configuracoes_padrao: {
    percentual_multa: 2.00,
    percentual_juros: 0.03,
    desconto_tipo: 'fixo',
    desconto_valor: 0,
    contra_apresentacao: false,
    recalcular_segunda_via: false,
    maximo_dias_recalcular: 0,
    layout_web: 'normal',
    layout_pdf: 'normal',
    layout_carne: '3folhas',
    exibir_mes_referente: false,
    taxa_cobranca: 0,
    incluir_taxa: false,
    instrucao_linha_1: 'Plano: %nome_plano% - Serviço: %tipo_servico% - %quantidade_usuarios%',
  },
  
  placeholders: {
    cedente: 'Nome do cedente conforme cadastrado na Efi',
    identificador_conta: 'Disponibilizado no menu configurações da API',
    client_id_producao: 'Disponibilizado nas configurações da API / produção',
    client_secret_producao: 'Disponibilizado nas configurações da API / produção',
    url_retorno: 'https://seudominio.com.br/webhook/efi',
    local_pagamento: 'Local onde o boleto deve ser pago antes do vencimento e depois de vencido',
    dados_avalista: 'Nome e CPF/CNPJ do avalista do boleto',
    documento_cpf_cnpj: 'CPF ou CNPJ usado pelo titular da conta',
  },
  
  validacoes: {
    cedente: 'required|string|max:255',
    identificador_conta: 'required|string|max:255',
    client_id_producao: 'required|string|max:255',
    client_secret_producao: 'required|string|max:255',
    url_retorno: 'required|url|max:255',
    repassar_email_cliente: 'boolean',
  },
  
  instrucoes: {
    identificador_conta: 'Acesse o painel da Efi > Configurações > API e copie o identificador da conta',
    client_id_producao: 'No painel da Efi, vá em Configurações > API > Produção e copie o Client ID',
    client_secret_producao: 'No painel da Efi, vá em Configurações > API > Produção e copie o Client Secret',
    url_retorno: 'URL pública para receber webhooks da Efi quando houver atualizações no status do boleto. Deve ser acessível externamente.',
  },
  
  logo: 'efi',
  cor: '#FF8000',
  
  api_endpoints: {
    auth: '/v1/authorize',
    
    // Títulos individuais (nova API)
    boleto: '/v1/charge/one-step',
    consultar: '/v1/charge/:id',
    cancelar: '/v1/charge/:id',
    
    // Listagem
    listar_cobrancas: '/v1/charges',
    
    // Notificações
    notification: '/v1/notification',
  },
  
  api_base_url: 'https://api.efipay.com.br',
  cobranca_base_url: 'https://cobrancas.api.efipay.com.br',
  
  api_response_mapping: {
    boleto: {
      id: 'data.charge_id',
      url: 'data.link',
      barcode: 'data.barcode',
      linha_digitavel: 'data.pix.qrcode', // A EFI retorna a linha digitável no campo pix.qrcode
      pdf: 'data.pdf.charge',
      pix_qrcode: 'data.pix.qrcode',
      pix_qrcode_image: 'data.pix.qrcode_image',
    },
    status: {
      status: 'data.status',
    },
  },
  
  auth_config: {
    grant_type: 'client_credentials',
    auth_type: 'basic',
  },
  
  // ===== LÓGICA ESPECÍFICA DA EFÍ MIGRADA DO BancoApiService =====
  
  /**
   * Verificar se o banco suporta operações de carnê
   */
  suporta_carne: false,
  
  /**
   * Verificar se o banco suporta operações específicas
   */
  operacoes_suportadas: {
    gerar_carne: true,
    cancelar_carne: true,
    cancelar_parcela_carne: true,
    alterar_vencimento_carne: true,
    alterar_vencimento_parcela_carne: true,
    liquidar_carne: true,
    liquidar_parcela_carne: true,
  },
  
  // Configurações para compatibilidade com BancoApiService
  auth_type: 'basic' as const,
  client_id_field: 'client_id',
  client_secret_field: 'client_secret',
  
  // Endpoints para BancoApiService
  carnets: '/v1/carnet',
  token: '/v1/authorize',
  notification: '/v1/notification',
};
