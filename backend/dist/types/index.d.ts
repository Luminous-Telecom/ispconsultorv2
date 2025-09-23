export interface BaseEntity {
    id: number;
    created_at: Date;
    updated_at: Date;
}
export interface Cliente extends BaseEntity {
    cnpj: string;
    razao_social: string;
    nome_fantasia?: string;
    email: string;
    telefone?: string;
    whatsapp?: string;
    cep?: string;
    endereco?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    cidade?: string;
    estado?: string;
    observacoes?: string;
    ativo: boolean;
    tipo_cobranca?: string;
    valor_primeiro_titulo?: number;
    isento_mensalidade: boolean;
    recebe_email: boolean;
    recebe_sms: boolean;
    recebe_whatsapp: boolean;
    dia_vencimento?: number;
    conta_boleto?: number;
    data_validade_desconto?: Date;
    planos?: Plano[];
    contratos?: ClientePlano[];
    carnes?: Carne[];
    banco_boleto?: Banco;
}
export interface Plano extends BaseEntity {
    nome_plano: string;
    descricao?: string;
    tipo_servico?: string;
    servicos_inclusos?: string[];
    quantidade_usuarios?: number;
    valor_mensal: number;
    desconto_percentual?: number;
    desconto_valor?: number;
    desconto_ativo: boolean;
    periodicidade?: string;
    renovacao_automatica: boolean;
    data_inicio?: Date;
    data_fim?: Date;
    status: 'ativo' | 'inativo' | 'suspenso';
    observacoes?: string;
    clientes?: Cliente[];
    contratos?: ClientePlano[];
    carnes?: Carne[];
}
export interface Banco extends BaseEntity {
    nome: string;
    codigo?: string;
    descricao?: string;
    ativo: boolean;
    tipo_banco: 'efi' | 'asaas' | 'bancario' | 'outros';
    api_url?: string;
    api_key?: string;
    api_secret?: string;
    sandbox: boolean;
    identificador_conta?: string;
    client_id_producao?: string;
    client_secret_producao?: string;
    url_retorno?: string;
    repassar_email_cliente: boolean;
    percentual_multa?: number;
    percentual_juros?: number;
    desconto_tipo?: string;
    desconto_valor?: number;
    contra_apresentacao: boolean;
    recalcular_segunda_via: boolean;
    maximo_dias_recalcular?: number;
    layout_web?: string;
    layout_pdf?: string;
    layout_carne?: string;
    local_pagamento?: string;
    dados_avalista?: string;
    exibir_mes_referente: boolean;
    documento_cpf_cnpj?: string;
    taxa_cobranca?: number;
    incluir_taxa: boolean;
    observacao_linha_1?: string;
    observacao_linha_2?: string;
    observacao_linha_3?: string;
    observacao_linha_4?: string;
    instrucao_linha_1?: string;
    instrucao_linha_2?: string;
    instrucao_linha_3?: string;
    instrucao_linha_4?: string;
    instrucao_linha_5?: string;
    configuracoes_json?: Record<string, any>;
    clientes?: Cliente[];
    carnes?: Carne[];
    banco_configuracoes?: BancoConfiguracao[];
    configuracao_principal?: BancoConfiguracao;
}
export interface BancoConfiguracao extends BaseEntity {
    banco_id: number;
    tipo_banco: string;
    configuracao: Record<string, any>;
    ativo: boolean;
    observacoes?: string;
    banco?: Banco;
}
export interface Carne extends BaseEntity {
    cliente_id: number;
    plano_id: number;
    banco_id: number;
    numero_carne: string;
    carnet_id?: string;
    valor_total: number;
    quantidade_parcelas: number;
    data_vencimento_primeira: Date;
    status: 'ativo' | 'pago' | 'cancelado' | 'parcial' | 'pendente';
    observacoes?: string;
    codigo_barras?: string;
    linha_digitavel?: string;
    valor_parcela?: number;
    parcelas_pagas_count?: number;
    valor_total_carne?: number;
    cliente?: Cliente;
    plano?: Plano;
    banco?: Banco;
    parcelas?: CarneParcela[];
}
export interface CarneParcela extends BaseEntity {
    carne_id: number;
    numero_parcela: number;
    valor_parcela: number;
    tipo?: string;
    data_vencimento: Date;
    pago: boolean;
    data_pagamento?: Date;
    valor_pago?: number;
    status: 'pendente' | 'pago' | 'vencido' | 'cancelado';
    codigo_barras?: string;
    linha_digitavel?: string;
    qrcode?: string;
    qrcode_image?: string;
    observacoes?: string;
    charge_id?: string;
    url_boleto?: string;
    carne?: Carne;
}
export interface ClientePlano extends BaseEntity {
    cliente_id: number;
    plano_id: number;
    desconto_percentual?: number;
    desconto_valor?: number;
    valor_final?: number;
    data_inicio?: Date;
    data_fim?: Date;
    status: 'ativo' | 'inativo' | 'suspenso';
    observacoes?: string;
    cliente?: Cliente;
    plano?: Plano;
}
export interface DadosEmpresa extends BaseEntity {
    razao_social: string;
    nome_fantasia?: string;
    cnpj: string;
    inscricao_estadual?: string;
    inscricao_municipal?: string;
    email?: string;
    telefone?: string;
    whatsapp?: string;
    cep?: string;
    endereco?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    cidade?: string;
    estado?: string;
    logo?: string;
    observacoes?: string;
}
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
    errors?: Record<string, string[]>;
}
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
    pagination: {
        current_page: number;
        per_page: number;
        total: number;
        last_page: number;
        from: number;
        to: number;
    };
}
export interface ClienteFilters {
    search?: string;
    ativo?: boolean;
    tipo_cobranca?: string;
    cidade?: string;
    estado?: string;
}
export interface PlanoFilters {
    search?: string;
    status?: string;
    tipo_servico?: string;
    valor_min?: number;
    valor_max?: number;
}
export interface BancoFilters {
    search?: string;
    ativo?: boolean;
    tipo_banco?: string;
    sandbox?: boolean;
}
export interface CarneFilters {
    search?: string;
    status?: string;
    cliente_id?: number;
    plano_id?: number;
    banco_id?: number;
    data_vencimento_inicio?: string;
    data_vencimento_fim?: string;
}
export type CreateCliente = Omit<Cliente, 'id' | 'created_at' | 'updated_at'>;
export type UpdateCliente = Partial<CreateCliente>;
export type CreatePlano = Omit<Plano, 'id' | 'created_at' | 'updated_at'>;
export type UpdatePlano = Partial<CreatePlano>;
export type CreateBanco = Omit<Banco, 'id' | 'created_at' | 'updated_at'>;
export type UpdateBanco = Partial<CreateBanco>;
export type CreateCarne = Omit<Carne, 'id' | 'created_at' | 'updated_at'>;
export type UpdateCarne = Partial<CreateCarne>;
export type CreateCarneParcela = Omit<CarneParcela, 'id' | 'created_at' | 'updated_at'>;
export type UpdateCarneParcela = Partial<CreateCarneParcela>;
export interface DashboardStats {
    total_clientes: number;
    clientes_ativos: number;
    total_planos: number;
    planos_ativos: number;
    total_bancos: number;
    bancos_ativos: number;
    total_carnes: number;
    carnes_ativos: number;
    carnes_pagos: number;
    carnes_pendentes: number;
    valor_total_carnes: number;
    valor_total_pago: number;
    valor_total_pendente: number;
}
export interface EfiConfig {
    client_id: string;
    client_secret: string;
    sandbox: boolean;
    certificado?: string;
    url_webhook?: string;
}
export interface AsaasConfig {
    access_token: string;
    webhook_token: string;
    sandbox: boolean;
    url_webhook?: string;
}
export interface BancoConfig {
    efi?: EfiConfig;
    asaas?: AsaasConfig;
}
//# sourceMappingURL=index.d.ts.map