export declare const asaasConfig: {
    nome: string;
    codigo: string;
    api_url: string;
    sandbox_url: string;
    cobranca_base_url: string;
    api_base_url: string;
    campos_obrigatorios: string[];
    campos_opcionais: string[];
    configuracoes_padrao: {
        percentual_multa: number;
        percentual_juros: number;
        desconto_tipo: string;
        desconto_valor: number;
        taxa_cobranca: number;
        incluir_taxa: boolean;
    };
    placeholders: {
        api_key: string;
    };
    validacoes: {
        api_key: string;
        taxa_cobranca: string;
    };
    instrucoes: {
        api_key: string;
    };
    logo: string;
    cor: string;
    api_endpoints: {
        auth: string;
        boleto: string;
        consultar: string;
        cancelar: string;
        liquidar: string;
        listar_cobrancas: string;
        notification: string;
        webhook: string;
    };
    api_response_mapping: {
        boleto: {
            id: string;
            url: string;
            barcode: string;
            linha_digitavel: string;
            pdf: string;
            pix_qrcode: string;
            pix_qrcode_image: string;
        };
        status: {
            status: string;
        };
    };
    auth_config: {
        grant_type: string;
        auth_type: string;
    };
    client_id_field: string;
    client_secret_field: string;
    token: string;
    notification: string;
    auth_type: "bearer";
};
export default asaasConfig;
//# sourceMappingURL=asaas.d.ts.map