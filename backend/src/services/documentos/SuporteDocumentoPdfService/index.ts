import type { Request, Response } from 'express';
import { ModeloDocumentoService } from '../ModeloDocumentoService';
import { VariaveisDocumentoService } from '../VariaveisDocumentoService';
import { PDFGenerationService } from '../../pdf-generation/PDFGenerationService';
import { ClienteService } from '../../clientes/ClienteService';
import { IxcOssChamadoService } from '../../externos/IxcOssChamadoService';
import { IxcAtendimentoService } from '../../externos/IxcAtendimentoService';
import { sendNotFound } from '../../../utils/responseUtils';
import { ATENDIMENTO_PDF_TEMPLATE } from '../../../constants/atendimentoPdfTemplate';
import { getModeloOrdemServicoPadraoById } from '../../../constants/modelosOrdemServicoPadrao';

const PDF_OPTIONS = {
  format: 'A4' as const,
  margin: { top: '0.5cm', right: '0.5cm', bottom: '0.5cm', left: '0.5cm' },
  printBackground: true,
};

type ModeloTipoSuporte = 'ordem_servico' | 'atendimento';

export class SuporteDocumentoPdfService {
  private static async resolveModelo(
    tipo: ModeloTipoSuporte,
    empresaId: number | null,
    modeloId?: number | null,
    modeloPadrao?: string | null
  ): Promise<{ conteudo: string; nome: string } | null> {
    if (modeloPadrao?.trim()) {
      const preset = getModeloOrdemServicoPadraoById(modeloPadrao);
      if (preset?.conteudo?.trim()) {
        return { conteudo: preset.conteudo, nome: preset.nome };
      }
      return null;
    }

    if (modeloId) {
      const modelo = await ModeloDocumentoService.getById(modeloId);
      if (modelo?.ativo && modelo.tipo === tipo) {
        if (empresaId == null || modelo.empresa_id == null || modelo.empresa_id === empresaId) {
          return { conteudo: modelo.conteudo, nome: modelo.nome };
        }
      }
      return null;
    }

    const modelo = await ModeloDocumentoService.getDefaultByType(tipo, empresaId);
    if (modelo?.conteudo?.trim()) {
      return { conteudo: modelo.conteudo, nome: modelo.nome };
    }

    if (tipo === 'ordem_servico') {
      const preset = getModeloOrdemServicoPadraoById('padrao');
      if (preset?.conteudo?.trim()) {
        return { conteudo: preset.conteudo, nome: preset.nome };
      }
    }

    return null;
  }

  private static async enviarPdf(
    res: Response,
    conteudo: string,
    filename: string
  ): Promise<void> {
    const pdfBuffer = await PDFGenerationService.generateFromContent(conteudo, PDF_OPTIONS);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}.pdf"`);
    res.send(pdfBuffer);
  }

  static async gerarOrdemServicoPdf(
    ordemServicoId: string | number,
    empresaId: number | null,
    req: Request,
    res: Response,
    options: {
      modeloId?: number | null;
      modeloPadrao?: string | null;
      clienteId?: number | null;
    } = {}
  ): Promise<void> {
    const ordem = await IxcOssChamadoService.getById(ordemServicoId, empresaId);
    if (!ordem) {
      sendNotFound(res, 'Ordem de serviço não encontrada');
      return;
    }

    const modelo = await this.resolveModelo(
      'ordem_servico',
      empresaId,
      options.modeloId,
      options.modeloPadrao
    );
    if (!modelo?.conteudo?.trim()) {
      sendNotFound(
        res,
        'Nenhum modelo de impressão de ordem de serviço encontrado. Cadastre em Cadastros → Modelos de Documentos → Ordens de serviço ou use um modelo padrão.'
      );
      return;
    }

    const clienteRef = options.clienteId ?? ordem.cliente_id;
    const cliente = clienteRef ? await ClienteService.getById(clienteRef) : null;
    const baseUrl = req.get('host') ? `${req.protocol}://${req.get('host')}` : undefined;

    const conteudo = await VariaveisDocumentoService.processarVariaveis(
      modelo.conteudo,
      {
        cliente: cliente ?? undefined,
        ordemServico: ordem,
        empresaId: empresaId ?? cliente?.empresa_id ?? null,
      },
      baseUrl
    );

    const filename = `ordem-servico-${String(ordem.protocolo || ordem.id).replace(/[^\w.-]+/g, '-')}`;
    await this.enviarPdf(res, conteudo, filename);
  }

  static async gerarAtendimentoPdf(
    atendimentoId: string | number,
    empresaId: number | null,
    req: Request,
    res: Response,
    options: { clienteId?: number | null } = {}
  ): Promise<void> {
    const clienteId = options.clienteId ?? null;
    const atendimento = await IxcAtendimentoService.getById(atendimentoId, empresaId, clienteId);
    if (!atendimento) {
      sendNotFound(res, 'Atendimento não encontrado');
      return;
    }

    const mensagens = await IxcAtendimentoService.listMensagens(atendimentoId, empresaId, clienteId);

    const clienteRef = options.clienteId ?? atendimento.cliente_id;
    const cliente = clienteRef ? await ClienteService.getById(clienteRef) : null;
    const baseUrl = req.get('host') ? `${req.protocol}://${req.get('host')}` : undefined;

    const conteudo = await VariaveisDocumentoService.processarVariaveis(
      ATENDIMENTO_PDF_TEMPLATE,
      {
        cliente: cliente ?? undefined,
        atendimento,
        atendimentoMensagens: mensagens.map((item) => ({
          data: item.data,
          operador: item.operador,
          mensagem: item.mensagem,
        })),
        empresaId: empresaId ?? cliente?.empresa_id ?? null,
      },
      baseUrl
    );

    const filename = `atendimento-${String(atendimento.protocolo || atendimento.id).replace(/[^\w.-]+/g, '-')}`;
    await this.enviarPdf(res, conteudo, filename);
  }
}
