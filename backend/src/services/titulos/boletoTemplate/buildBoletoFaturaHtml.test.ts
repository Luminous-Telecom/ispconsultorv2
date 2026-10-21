import { buildBoletoFaturaHtml } from './buildBoletoFaturaHtml';
import type { BoletoRenderData } from './types';

function renderData(plano: BoletoRenderData['plano']): BoletoRenderData {
  return {
    empresa: {
      logo: '',
      cedente: 'Provedor',
      cnpj: '00.000.000/0001-00',
      endereco: 'Rua A 1',
      bairro: 'Centro',
      cep: '00000-000',
      cidade: 'Cidade',
      estado: 'SP',
    },
    sacado: {
      nome: 'Cliente',
      tipoDocumento: 'CNPJ',
      documento: '00.000.000/0001-00',
      endereco: 'Rua B 2',
      bairro: 'Centro',
      complemento: '',
      cidade: 'Cidade',
      estado: 'SP',
      cep: '00000-000',
    },
    plano,
    ficha: {
      logoBanco: '',
      codigoBancoComDv: '364-9',
      linhaDigitavel: '',
      localPagamento: '',
      agenciaCodigo: '',
      dataVencimento: '21/10/2026',
      dataDocumento: '21/10/2026',
      numeroDocumento: '1',
      especieDoc: 'DM',
      dataProcessamento: '21/10/2026',
      nossoNumero: '1',
      carteira: 'SR',
      varCarteira: '',
      especie: 'R$',
      valorBoleto: '100,00',
      textoMultaMora: '',
      instrucoes: [],
      qrcodeImage: '',
      barcodeHtml: '',
    },
  };
}

describe('buildBoletoFaturaHtml', () => {
  const plano = {
    nome: 'Fibra 500',
    descricao: 'Internet residencial',
    tipoServico: 'Internet',
    valor: '100,00',
    periodicidade: 'Mensal',
  };

  it('não imprime a quantidade de usuários do plano', () => {
    const html = buildBoletoFaturaHtml(renderData(plano));

    expect(html).not.toMatch(/Usuários/i);
  });

  it('mantém os demais dados do plano na capa', () => {
    const html = buildBoletoFaturaHtml(renderData(plano));

    expect(html).toContain('Fibra 500');
    expect(html).toContain('Internet residencial');
    expect(html).toContain('Internet');
    expect(html).toContain('R$ 100,00');
    expect(html).toContain('Mensal');
  });
});
