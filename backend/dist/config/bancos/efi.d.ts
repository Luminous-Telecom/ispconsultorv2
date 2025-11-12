export declare const efiConfig: {
    nome: string;
    codigo: string;
    api_url: string;
    sandbox_url: string;
    campos_obrigatorios: string[];
    campos_opcionais: string[];
    configuracoes_padrao: {
        percentual_multa: number;
        percentual_juros: number;
        desconto_tipo: string;
        desconto_valor: number;
        contra_apresentacao: boolean;
        recalcular_segunda_via: boolean;
        maximo_dias_recalcular: number;
        layout_web: string;
        layout_pdf: string;
        exibir_mes_referente: boolean;
        taxa_cobranca: number;
        incluir_taxa: boolean;
        instrucao_linha_1: string;
    };
    placeholders: {
        cedente: string;
        identificador_conta: string;
        client_id_producao: string;
        client_secret_producao: string;
        url_retorno: string;
        local_pagamento: string;
        dados_avalista: string;
        documento_cpf_cnpj: string;
    };
    validacoes: {
        cedente: string;
        identificador_conta: string;
        client_id_producao: string;
        client_secret_producao: string;
        url_retorno: string;
        repassar_email_cliente: string;
    };
    instrucoes: {
        identificador_conta: string;
        client_id_producao: string;
        client_secret_producao: string;
        url_retorno: string;
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
    };
    api_base_url: string;
    cobranca_base_url: string;
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
    auth_type: "basic";
    client_id_field: string;
    client_secret_field: string;
    token: string;
    notification: string;
};
//# sourceMappingURL=efi.d.ts.map