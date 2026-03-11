import { Request } from 'express';
import { ModeloDocumentoService } from '../ModeloDocumentoService';
import { ClienteService } from '../../clientes/ClienteService';
import { ContratoService } from '../../contratos/ContratoService';
import { VariaveisDocumentoService } from '../VariaveisDocumentoService';
import { PDFGenerationService } from '../../pdf-generation/PDFGenerationService';
import { Contrato } from '../../../models/contratos/Contrato';
import type { Response } from 'express';
import { sendNotFound, sendValidationError } from '../../../utils/responseUtils';
import { getEmpresaIdOrNull } from '../../../utils/tenantUtils';

export class ModeloDocumentoPdfService {
  /**
   * Gera PDF de um documento
   */
  static async gerarPdf(
    documentoId: number,
    res: Response
  ): Promise<void> {
    const documento = await ModeloDocumentoService.getById(documentoId);

    if (!documento) {
      sendNotFound(res, 'Documento não encontrado');
      return;
    }

    const pdfBuffer = await PDFGenerationService.generateFromContent(
      documento.conteudo,
      'html-pdf-node',
      {
        format: 'A4',
        margin: { top: '0.5cm', right: '0.5cm', bottom: '0.5cm', left: '0.5cm' },
        printBackground: true
      }
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${documento.nome}.pdf"`);
    res.send(pdfBuffer);
  }

  /**
   * Gera PDF de teste com dados de cliente/contrato
   */
  static async gerarTestPdf(
    documentoId: number,
    clienteId: string | undefined,
    contratoId: string | undefined,
    req: Request,
    res: Response
  ): Promise<void> {
    const documento = await ModeloDocumentoService.getById(documentoId);

    if (!documento) {
      sendNotFound(res, 'Documento não encontrado');
      return;
    }

    let conteudoProcessado = documento.conteudo;

    if (clienteId) {
      const cliente = await ClienteService.getById(clienteId);

      if (!cliente) {
        sendNotFound(res, 'Cliente não encontrado');
        return;
      }

      let contrato: Contrato | null = null;

      if (contratoId) {
        contrato = await ContratoService.getById(contratoId);

        if (!contrato) {
          sendNotFound(res, 'Contrato não encontrado');
          return;
        }

        if (contrato.cliente_id !== cliente.id) {
          sendValidationError(res, 'Contrato não pertence ao cliente informado');
          return;
        }
      } else {
        contrato = await ContratoService.findAtivoByCliente(cliente.id);
      }

      const baseUrl = req.get('host') ? `${req.protocol}://${req.get('host')}` : undefined;
      const empresaId = getEmpresaIdOrNull(req) ?? cliente.empresa_id ?? contrato?.empresa_id;
      conteudoProcessado = await VariaveisDocumentoService.processarVariaveis(
        documento.conteudo,
        {
          cliente,
          contrato: contrato || undefined,
          empresaId
        },
        baseUrl
      );
    }

    const pdfBuffer = await PDFGenerationService.generateFromContent(
      conteudoProcessado,
      'html-pdf-node',
      {
        format: 'A4',
        margin: { top: '0.5cm', right: '0.5cm', bottom: '0.5cm', left: '0.5cm' },
        printBackground: true
      }
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${documento.nome}-teste.pdf"`);
    res.send(pdfBuffer);
  }
}
