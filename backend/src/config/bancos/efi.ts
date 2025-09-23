export const efiConfig = {
  cobranca_base_url: 'https://api-pix.efipay.com.br',
  api_endpoints: {
    boleto: '/v1/charges',
    carnets: '/v1/carnets',
    consultar: '/v1/charges',
    token: '/oauth/token',
    notification: '/v1/notifications'
  },
  api_response_mapping: {
    boleto: {
      id: 'data.charge_id',
      barcode: 'data.barcode',
      url: 'data.url',
      linha_digitavel: 'data.line'
    },
    carnets: {
      id: 'data.carnet_id',
      charges: 'data.charges'
    },
    status: {
      status: 'data.status'
    }
  },
  suporta_carne: true,
  auth_type: 'basic' as const,
  client_id_field: 'client_id',
  client_secret_field: 'client_secret'
};
