jest.mock('../../../db/prisma', () => ({
  prisma: {
    comunicacao_mensagens_whatsapp: { findMany: jest.fn(), findFirst: jest.fn() },
    financeiro_titulos: { findMany: jest.fn() },
  },
}));

jest.mock('../../../utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

jest.mock('../../../utils/comunicacaoEmpresaWhere', () => ({
  whereComunicacaoEmpresaEstrito: jest.fn(() => ({ empresa_id: 1, ativo: true })),
}));

jest.mock('../resolverServidorCobranca', () => ({
  resolverServidorWhatsAppCobranca: jest.fn(),
}));

jest.mock('../WhatsAppSenderService', () => ({
  WhatsAppSenderService: {
    enviarTexto: jest.fn(),
    enviarPdfBase64: jest.fn(),
    delayInteracao: jest.fn(),
  },
}));

jest.mock('../../../controllers/titulos/TituloPDFController', () => ({
  TituloPDFController: { gerarPdfBase64: jest.fn() },
}));

jest.mock('../../documentos/VariaveisDocumentoService', () => ({
  VariaveisDocumentoService: { processarVariaveis: jest.fn(async () => 'Olá') },
}));

jest.mock('../WhatsAppTemplateService', () => ({ WhatsAppTemplateService: {} }));
jest.mock('../WhatsAppCloudService', () => ({ WhatsAppCloudService: {} }));
jest.mock('../TemplateWhatsAppService', () => ({ TemplateWhatsAppService: {} }));
jest.mock('../RegistroMensagemHistoricoService', () => ({ registrarMensagemHistorico: jest.fn() }));
jest.mock('../ReenviarNotificacoesCobrancaService/selecao', () => ({ escolherMensagemCobranca: jest.fn() }));
jest.mock('../../titulos/ReciboPDFService/messages', () => ({ RECIBO_MODELO_NAO_CONFIGURADO: 'sem-modelo' }));

import { prisma } from '../../../db/prisma';
import { TituloPDFController } from '../../../controllers/titulos/TituloPDFController';
import { resolverServidorWhatsAppCobranca } from '../resolverServidorCobranca';
import { WhatsAppSenderService } from '../WhatsAppSenderService';
import { WhatsAppBoletoService } from './index';

const mensagens = prisma.comunicacao_mensagens_whatsapp.findMany as jest.Mock;
const titulos = prisma.financeiro_titulos.findMany as jest.Mock;
const resolver = resolverServidorWhatsAppCobranca as jest.Mock;
const enviarPdf = WhatsAppSenderService.enviarPdfBase64 as jest.Mock;
const gerarPdf = TituloPDFController.gerarPdfBase64 as jest.Mock;

const servidor = { id: 9, tipo_api: 'evolution', ativo: true };

function tituloDoCliente(recebeWhatsapp: boolean) {
  return {
    id: 44,
    numero_titulo: 'T1',
    valor: 10,
    data_vencimento: new Date(),
    empresa_id: 1,
    contrato_id: null,
    clientes: {
      id: 3,
      razao_social: 'Cliente',
      telefone: '84999716171',
      recebe_whatsapp: recebeWhatsapp,
      empresa_id: 1,
    },
    contratos: null,
    cadastros_bancos: null,
    cadastros_planos: null,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  resolver.mockResolvedValue(servidor);
  mensagens.mockResolvedValue([
    {
      id: 1,
      tipo: 'mesmo_dia_vencimento',
      tipo_envio: 'pdf',
      ativo: true,
      servidor_whatsapp_id: 9,
      mensagem_padrao: 'Olá',
      interacao1: null,
      interacao2: null,
      interacao3: null,
    },
  ]);
  gerarPdf.mockResolvedValue('cGRm');
  enviarPdf.mockResolvedValue(true);
});

describe('WhatsAppBoletoService', () => {
  it('não envia aviso de boleto quando o cliente desativou WhatsApp', async () => {
    titulos.mockResolvedValue([tituloDoCliente(false)]);

    const resultado = await WhatsAppBoletoService.enviarBoletos(
      { mesmoDia: true },
      { empresa_id: 1 }
    );

    expect(resultado.mensagensEnviadas).toBe(0);
    expect(enviarPdf).not.toHaveBeenCalled();
  });

  it('envia aviso de boleto quando o cliente recebe WhatsApp', async () => {
    titulos.mockResolvedValue([tituloDoCliente(true)]);

    const resultado = await WhatsAppBoletoService.enviarBoletos(
      { mesmoDia: true },
      { empresa_id: 1 }
    );

    expect(resultado.mensagensEnviadas).toBe(1);
    expect(enviarPdf).toHaveBeenCalledTimes(1);
  });

  it('não envia recibo quando o cliente desativou WhatsApp', async () => {
    const enviou = await WhatsAppBoletoService.enviarReciboPagamento(
      { id: 44 } as never,
      { id: 3, telefone: '84999716171', recebe_whatsapp: false } as never
    );

    expect(enviou).toBe(false);
    expect(resolver).not.toHaveBeenCalled();
    expect(enviarPdf).not.toHaveBeenCalled();
  });

  it('segue o recibo quando o cliente recebe WhatsApp e tem telefone', async () => {
    const enviou = await WhatsAppBoletoService.enviarReciboPagamento(
      { id: 44, empresa_id: 1 } as never,
      { id: 3, razao_social: 'Cliente', telefone: '84999716171', recebe_whatsapp: true, empresa_id: 1 } as never
    );

    expect(enviou).toBe(false);
    expect(resolver).toHaveBeenCalled();
  });
});
