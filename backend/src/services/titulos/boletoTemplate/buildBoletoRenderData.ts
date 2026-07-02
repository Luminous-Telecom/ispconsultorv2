import { logger } from '../../../utils/logger';
import { DadosEmpresaService } from '../../sistema/DadosEmpresaService';
import { BarcodeService } from '../../bancos/BarcodeService';
import { parseDateFromDb, formatDate } from '../../../utils/dateUtils';
import type { TituloComRelacoes } from '../../../controllers/titulos/TituloHelpers/types';
import { converterLogoParaBase64, getLogoBancoPadrao, processarInstrucao } from '../../../controllers/titulos/TituloHelpers';
import type { BoletoRenderData } from './types';

const PERIODICIDADE_LABELS: Record<string, string> = {
  mensal: 'Mensal',
  bimestral: 'Bimestral',
  trimestral: 'Trimestral',
  semestral: 'Semestral',
  anual: 'Anual',
  quinzenal: 'Quinzenal',
  semanal: 'Semanal',
};

function resolvePeriodicidade(periodicidade?: string | null): string {
  if (!periodicidade) {
    return 'Mensal';
  }
  return PERIODICIDADE_LABELS[periodicidade] || periodicidade;
}

function processarInstrucaoSegura(
  instrucao: string | null | undefined,
  titulo: TituloComRelacoes,
): string {
  try {
    return processarInstrucao(instrucao || '', titulo);
  } catch (error) {
    logger.warn('Erro ao processar instrução do boleto', {
      titulo_id: titulo.id,
      instrucao,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    });
    return instrucao || '';
  }
}

export async function buildBoletoRenderData(titulo: TituloComRelacoes): Promise<BoletoRenderData> {
  if (!titulo.cliente) {
    throw new Error('Cliente não encontrado para o título');
  }

  if (!titulo.banco) {
    throw new Error('Banco não encontrado para o título');
  }

  const empresaId = (titulo as { empresa_id?: number | null }).empresa_id ?? undefined;
  const dadosEmpresa = await DadosEmpresaService.findOne(empresaId);
  if (!dadosEmpresa) {
    throw new Error('Dados da empresa não configurados');
  }

  const dataVencimento = formatDate(parseDateFromDb(titulo.data_vencimento)) || '';
  const dataProcessamento = formatDate(new Date()) || '';
  const valorBoleto = Number(titulo.valor || 0).toFixed(2).replace('.', ',');

  let logoBanco = '';
  let logoEmpresa = '';

  try {
    if (titulo.banco.tipo_banco) {
      logoBanco = getLogoBancoPadrao(titulo.banco.tipo_banco);
    }
    logoEmpresa = converterLogoParaBase64(dadosEmpresa.logo || '');
  } catch (error) {
    logger.error('Erro ao processar logos do boleto', {
      titulo_id: titulo.id,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  }

  let codigoBancoComDv = '364-9';
  try {
    if (titulo.banco.codigo) {
      const dv = BarcodeService.calcularDVCodigoBanco(titulo.banco.codigo);
      codigoBancoComDv = `${titulo.banco.codigo}-${dv}`;
    }
  } catch (error) {
    logger.warn('Erro ao calcular DV do código do banco', {
      titulo_id: titulo.id,
      codigo_banco: titulo.banco.codigo,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  }

  const barcodeHtml =
    titulo.codigo_barras?.trim() || titulo.linha_digitavel?.trim()
      ? BarcodeService.generateFebrabanBarcodeSvg(titulo.codigo_barras || '', titulo.linha_digitavel)
      : '';

  const cliente = titulo.cliente;
  const cedente = dadosEmpresa.razao_social || dadosEmpresa.nome_fantasia || 'Empresa não configurada';
  const textoMultaMora =
    titulo.banco.percentual_multa || titulo.banco.percentual_juros
      ? `Multa de ${titulo.banco.percentual_multa || 2}% + Juros de ${titulo.banco.percentual_juros || 0.033}% ao dia após o vencimento`
      : '';

  return {
    empresa: {
      logo: logoEmpresa,
      cedente,
      cnpj: dadosEmpresa.cnpj || '',
      endereco: `${dadosEmpresa.endereco || ''} ${dadosEmpresa.numero || ''}`.trim(),
      bairro: dadosEmpresa.bairro || '',
      cep: dadosEmpresa.cep || '',
      cidade: dadosEmpresa.cidade || '',
      estado: dadosEmpresa.estado || '',
    },
    sacado: {
      nome: cliente.razao_social || cliente.nome || '',
      tipoDocumento: cliente.cnpj ? 'CNPJ' : 'CPF',
      documento: cliente.cnpj || cliente.cpf || '',
      endereco: `${cliente.endereco || ''} ${cliente.numero || ''}`.trim(),
      bairro: cliente.bairro || '',
      complemento: cliente.complemento || '',
      cidade: cliente.cidade || '',
      estado: cliente.estado || '',
      cep: cliente.cep || '',
    },
    plano: {
      nome: titulo.plano?.nome_plano || '',
      descricao: titulo.plano?.descricao || '',
      tipoServico: titulo.plano?.tipo_servico || '',
      quantidadeUsuarios: String(titulo.plano?.quantidade_usuarios || '1'),
      valor: valorBoleto,
      periodicidade: resolvePeriodicidade(titulo.plano?.periodicidade),
    },
    ficha: {
      logoBanco,
      codigoBancoComDv,
      linhaDigitavel: titulo.linha_digitavel || titulo.codigo_barras || '',
      localPagamento: 'Pagável em qualquer banco até o vencimento',
      agenciaCodigo: titulo.banco.codigo || 'Não configurado',
      dataVencimento,
      dataDocumento: dataProcessamento,
      numeroDocumento: titulo.nosso_numero || titulo.numero_titulo || titulo.id?.toString() || '',
      especieDoc: 'DM',
      dataProcessamento,
      nossoNumero: titulo.nosso_numero || titulo.charge_id || '',
      carteira: 'SR',
      varCarteira: '',
      especie: 'R$',
      valorBoleto,
      textoMultaMora,
      instrucoes: [
        processarInstrucaoSegura(titulo.banco.instrucao_linha_1, titulo),
        processarInstrucaoSegura(titulo.banco.instrucao_linha_2, titulo),
        processarInstrucaoSegura(titulo.banco.instrucao_linha_3, titulo),
        processarInstrucaoSegura(titulo.banco.instrucao_linha_4, titulo),
        processarInstrucaoSegura(titulo.banco.instrucao_linha_5, titulo),
      ],
      qrcodeImage: titulo.qrcode_image || '',
      barcodeHtml,
    },
  };
}
