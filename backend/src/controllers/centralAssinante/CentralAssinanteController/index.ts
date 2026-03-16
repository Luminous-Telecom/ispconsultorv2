import { Request, Response as ExpressResponse } from 'express';
import { Cliente } from '../../../models/clientes/Cliente';
import { Contrato } from '../../../models/contratos/Contrato';
import { Titulo } from '../../../models/financeiro/Titulo';
import { TermoContrato } from '../../../models/contratos/TermoContrato';
import { ClienteService } from '../../../services/clientes/ClienteService';
import { ContratoService } from '../../../services/contratos/ContratoService';
import { TituloService } from '../../../services/financeiro/TituloService';
import { TermoContratoService } from '../../../services/contratos/TermoContratoService';
import { ModeloDocumentoService } from '../../../services/documentos/ModeloDocumentoService';
import { VariaveisDocumentoService } from '../../../services/documentos/VariaveisDocumentoService';
import { PDFGenerationService } from '../../../services/pdf-generation/PDFGenerationService';
import { TituloPDFService } from '../../../services/titulos/TituloPDFService';
import { BancoApiService } from '../../../services/bancos/BancoApiService';
import { logger } from '../../../utils/logger';
import crypto from 'crypto';
import { sendSuccess, sendError, sendValidationError, sendForbidden, sendNotFound } from '../../../utils/responseUtils';
import { Op } from 'sequelize';
import type { TituloComRelacoes } from '../../titulos/TituloHelpers/types';

export class CentralAssinanteController {
  /**
   * Gerar token de acesso público para um cliente (com expiração de 24 horas)
   */
  static gerarToken(clienteId: number): string {
    const secret = process.env.JWT_SECRET || 'default-secret';
    const expiracao = Date.now() + (24 * 60 * 60 * 1000); // 24 horas
    const dados = `${clienteId}:${expiracao}`;
    const hash = crypto.createHmac('sha256', secret).update(dados).digest('hex').substring(0, 16);
    // IMPORTANTE: incluir o clienteId no token para permitir rotas sem expor ID na URL (token vai via header/storage)
    const token = `${clienteId}:${expiracao}:${hash}`;
    return Buffer.from(token).toString('base64url');
  }

  /**
   * Gera link público da central do assinante
   * @param slug Slug da empresa (multiloja) — quando fornecido, inclui o slug na URL
   */
  static gerarLinkCentralAssinante(clienteId: number, baseUrl?: string, slug?: string): string {
    // Não expor clienteId nem token na URL do navegador
    return slug ? `/central-assinante/${slug}` : `/central-assinante`;
  }

  /**
   * Validar token e retornar ID do cliente
   */
  static validarToken(token: string, clienteId: number): boolean {
    try {
      const secret = process.env.JWT_SECRET || 'default-secret';
      const tokenDecodificado = Buffer.from(token, 'base64url').toString('utf-8');
      const parts = tokenDecodificado.split(':');
      const hashRecebido = parts.length === 3 ? parts[2] : parts[0];
      const expiracaoStr = parts.length === 3 ? parts[1] : parts[1];
      
      if (!hashRecebido || !expiracaoStr) {
        return false;
      }

      const expiracao = parseInt(expiracaoStr, 10);
      
      // Verificar se token expirou
      if (Date.now() > expiracao) {
        return false;
      }

      // Verificar hash
      const dados = `${clienteId}:${expiracao}`;
      const expectedHash = crypto.createHmac('sha256', secret).update(dados).digest('hex').substring(0, 16);
      
      return hashRecebido === expectedHash;
    } catch (error) {
      logger.warn('Erro ao validar token da central do assinante', {
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
      return false;
    }
  }

  private static extrairTokenDoHeader(req: Request): string | null {
    const authHeader = req.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.replace('Bearer ', '').trim();
    }
    const tokenHeader = req.get('x-central-assinante-token');
    return tokenHeader ? String(tokenHeader).trim() : null;
  }

  /**
   * Validar token (que contém clienteId) e retornar clienteId
   */
  static validarTokenEGetClienteIdDoToken(token: string): number | null {
    try {
      const secret = process.env.JWT_SECRET || 'default-secret';
      const tokenDecodificado = Buffer.from(token, 'base64url').toString('utf-8');
      const parts = tokenDecodificado.split(':');

      // Formato novo: clienteId:expiracao:hash
      if (parts.length !== 3) {
        return null;
      }

      const [clienteIdStr, expiracaoStr, hashRecebido] = parts;
      const clienteId = parseInt(clienteIdStr, 10);
      if (isNaN(clienteId)) {
        return null;
      }

      const expiracao = parseInt(expiracaoStr, 10);
      if (isNaN(expiracao)) {
        return null;
      }

      if (Date.now() > expiracao) {
        return null;
      }

      const dados = `${clienteId}:${expiracao}`;
      const expectedHash = crypto.createHmac('sha256', secret).update(dados).digest('hex').substring(0, 16);
      if (hashRecebido !== expectedHash) {
        return null;
      }

      return clienteId;
    } catch {
      return null;
    }
  }

  /**
   * Resolver clienteId a partir de params antigos (id/token) ou do token no header (sem expor na URL)
   */
  static getClienteIdFromRequest(req: Request): number | null {
    const { id, token } = req.params as { id?: string; token?: string };

    // Compatibilidade: rotas antigas /central-assinante/:id/:token
    if (id && token) {
      return CentralAssinanteController.validarTokenEGetClienteId(token, id);
    }

    // Novo padrão: token no header (Authorization Bearer)
    const tokenHeader = CentralAssinanteController.extrairTokenDoHeader(req);
    if (!tokenHeader) {
      return null;
    }

    return CentralAssinanteController.validarTokenEGetClienteIdDoToken(tokenHeader);
  }

  /**
   * API para buscar todos os dados do cliente para central do assinante
   */
  static async getDadosCliente(req: Request, res: ExpressResponse): Promise<void> {
    try {
      const clienteId = CentralAssinanteController.getClienteIdFromRequest(req);
      if (!clienteId) {
        sendForbidden(res, 'Token inválido ou expirado');
        return;
      }

      // Buscar cliente
      const cliente = await ClienteService.getById(clienteId);

      if (!cliente) {
        sendNotFound(res, 'Cliente não encontrado');
        return;
      }

      // Buscar contratos do cliente
      const contratos = await Contrato.findAll({
        where: { cliente_id: clienteId },
        include: [
          { association: 'plano', attributes: ['id', 'nome_plano', 'valor_mensal'] },
          { association: 'bancoBoleto', attributes: ['id', 'nome'] }
        ],
        order: [['created_at', 'DESC']]
      });

      // Buscar títulos do cliente
      const titulos = await Titulo.findAll({
        where: { cliente_id: clienteId },
        include: [
          { association: 'plano', attributes: ['id', 'nome_plano'] },
          { association: 'banco', attributes: ['id', 'nome'] },
          { association: 'contrato', attributes: ['id'] }
        ],
        order: [['data_vencimento', 'DESC']]
      });

      // Buscar termos dos contratos do cliente
      const contratoIds = contratos.map(c => c.id);
      const termos = await TermoContrato.findAll({
        where: { contrato_id: { [Op.in]: contratoIds } },
        order: [['created_at', 'DESC']]
      });

      // Converter para JSON para acessar relacionamentos
      const contratosJson = contratos.map(c => {
        const json = c.toJSON() as any;
        return {
          ...json,
          plano: json.plano || null,
          bancoBoleto: json.bancoBoleto || null
        };
      });

      const titulosJson = titulos.map(t => {
        const json = t.toJSON() as any;
        return {
          ...json,
          plano: json.plano || null,
          banco: json.banco || null,
          contrato: json.contrato || null
        };
      });

      const termosJson = termos.map(t => t.toJSON() as any);

      // Classificar títulos (usar JSON convertido)
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      const titulosPagos = titulosJson.filter((t: any) => t.status === 'pago' || t.status === 'pago_atraso');
      const titulosAtrasados = titulosJson.filter((t: any) => {
        const vencimento = new Date(t.data_vencimento);
        vencimento.setHours(0, 0, 0, 0);
        return (t.status === 'pendente' || t.status === 'vencido') && vencimento < hoje;
      });
      const titulosAPagar = titulosJson.filter((t: any) => {
        const vencimento = new Date(t.data_vencimento);
        vencimento.setHours(0, 0, 0, 0);
        return (t.status === 'pendente' || t.status === 'parcial') && vencimento >= hoje;
      });

      // Preparar resposta
      const dadosCliente = {
        cliente: {
          id: cliente.id,
          razao_social: cliente.razao_social,
          nome_fantasia: cliente.nome_fantasia,
          cpf_cnpj: cliente.cnpj,
          email: cliente.email,
          telefone: cliente.telefone,
          endereco: cliente.endereco,
          numero: cliente.numero,
          complemento: cliente.complemento,
          bairro: cliente.bairro,
          cidade: cliente.cidade,
          estado: cliente.estado,
          cep: cliente.cep
        },
        contratos: contratosJson.map((c: any) => ({
          id: c.id,
          plano: c.plano?.nome_plano || null,
          valor_final: c.valor_final,
          data_inicio: c.data_inicio,
          data_fim: c.data_fim,
          status: c.status,
          banco_boleto: c.bancoBoleto?.nome || null
        })),
        titulos: {
          todos: titulosJson.map((t: any) => ({
            id: t.id,
            numero_titulo: t.numero_titulo,
            valor: t.valor,
            valor_final: t.valor_final,
            valor_pago: t.valor_pago,
            valor_aberto: t.valor_aberto,
            data_vencimento: t.data_vencimento,
            data_pagamento: t.data_pagamento,
            status: t.status,
            plano: t.plano?.nome_plano || null,
            contrato_id: t.contrato_id,
            qrcode: t.qrcode || null,
            linha_digitavel: t.linha_digitavel || null,
            descricao: t.descricao || null
          })),
          pagos: titulosJson.filter((t: any) => t.status === 'pago' || t.status === 'pago_atraso').map((t: any) => ({
            id: t.id,
            numero_titulo: t.numero_titulo,
            valor: t.valor,
            valor_final: t.valor_final,
            valor_pago: t.valor_pago,
            data_vencimento: t.data_vencimento,
            data_pagamento: t.data_pagamento,
            status: t.status,
            plano: t.plano?.nome_plano || null,
            qrcode: t.qrcode || null,
            linha_digitavel: t.linha_digitavel || null,
            descricao: t.descricao || null
          })),
          atrasados: titulosJson.filter((t: any) => {
            const vencimento = new Date(t.data_vencimento);
            vencimento.setHours(0, 0, 0, 0);
            return (t.status === 'pendente' || t.status === 'vencido') && vencimento < hoje;
          }).map((t: any) => ({
            id: t.id,
            numero_titulo: t.numero_titulo,
            valor: t.valor,
            valor_final: t.valor_final,
            valor_aberto: t.valor_aberto,
            data_vencimento: t.data_vencimento,
            status: t.status,
            plano: t.plano?.nome_plano || null,
            dias_atraso: Math.floor((hoje.getTime() - new Date(t.data_vencimento).getTime()) / (1000 * 60 * 60 * 24)),
            qrcode: t.qrcode || null,
            linha_digitavel: t.linha_digitavel || null,
            descricao: t.descricao || null
          })),
          a_pagar: titulosJson.filter((t: any) => {
            const vencimento = new Date(t.data_vencimento);
            vencimento.setHours(0, 0, 0, 0);
            return (t.status === 'pendente' || t.status === 'parcial') && vencimento >= hoje;
          }).map((t: any) => ({
            id: t.id,
            numero_titulo: t.numero_titulo,
            valor: t.valor,
            valor_final: t.valor_final,
            valor_aberto: t.valor_aberto,
            data_vencimento: t.data_vencimento,
            status: t.status,
            plano: t.plano?.nome_plano || null,
            qrcode: t.qrcode || null,
            linha_digitavel: t.linha_digitavel || null,
            descricao: t.descricao || null
          }))
        },
        termos: termosJson.map((t: any) => ({
          id: t.id,
          contrato_id: t.contrato_id,
          tipo_termo: t.tipo_termo,
          titulo: null, // TermoContrato não tem campo titulo, apenas tipo_termo
          conteudo: t.conteudo,
          assinado: t.assinado,
          data_aceite: t.data_aceite,
          aceito_por: t.aceito_por,
          created_at: t.created_at
        })),
        resumo: {
          total_contratos: contratosJson.length,
          contratos_ativos: contratosJson.filter((c: any) => c.status === 'ativo').length,
          total_titulos: titulosJson.length,
          titulos_pagos: titulosPagos.length,
          titulos_atrasados: titulosAtrasados.length,
          titulos_a_pagar: titulosAPagar.length,
          valor_total_pago: titulosPagos.reduce((sum: number, t: any) => sum + Number(t.valor_pago || t.valor_final || t.valor || 0), 0),
          valor_total_atrasado: titulosAtrasados.reduce((sum: number, t: any) => sum + Number(t.valor_aberto || t.valor_final || t.valor || 0), 0),
          valor_total_a_pagar: titulosAPagar.reduce((sum: number, t: any) => sum + Number(t.valor_aberto || t.valor_final || t.valor || 0), 0),
          total_termos: termosJson.length,
          termos_assinados: termosJson.filter((t: any) => t.assinado === 'SIM').length
        }
      };

      sendSuccess(res, dadosCliente);
    } catch (error) {
      logger.error('Erro ao buscar dados da central do assinante', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        clienteId: req.params.id
      });
      sendError(res, error, 'Erro interno do servidor', 500, true, {
        context: 'CentralAssinanteController',
        action: 'getDadosCliente'
      });
    }
  }

  /**
   * Validar token e retornar clienteId (método auxiliar)
   */
  static validarTokenEGetClienteId(token: string, clienteIdParam: string): number | null {
    const clienteId = parseInt(clienteIdParam, 10);
    if (isNaN(clienteId)) {
      return null;
    }

    if (!CentralAssinanteController.validarToken(token, clienteId)) {
      return null;
    }

    return clienteId;
  }

  /**
   * Imprimir/Download contrato
   */
  static async imprimirContrato(req: Request, res: ExpressResponse): Promise<void> {
    try {
      const { contratoId } = req.params;

      const clienteId = CentralAssinanteController.getClienteIdFromRequest(req);
      if (!clienteId) {
        sendForbidden(res, 'Token inválido ou expirado');
        return;
      }

      const contratoIdNum = parseInt(contratoId, 10);
      if (isNaN(contratoIdNum)) {
        sendValidationError(res, 'ID do contrato inválido');
        return;
      }

      // Verificar se o contrato pertence ao cliente
      const contrato = await Contrato.findOne({
        where: { id: contratoIdNum, cliente_id: clienteId }
      });

      if (!contrato) {
        sendNotFound(res, 'Contrato não encontrado');
        return;
      }

      // Buscar modelo padrão de contrato
      const empresaId = (contrato as { empresa_id?: number | null }).empresa_id ?? null;
      const modelos = await ModeloDocumentoService.getByType('contrato', true, empresaId);
      if (modelos.length === 0) {
        sendNotFound(res, 'Nenhum modelo de contrato encontrado');
        return;
      }

      const modelo = modelos[0];
      const cliente = await ClienteService.getById(clienteId);

      if (!cliente) {
        sendNotFound(res, 'Cliente não encontrado');
        return;
      }

      const baseUrl = req.get('host') ? `${req.protocol}://${req.get('host')}` : undefined;
      const conteudoProcessado = await VariaveisDocumentoService.processarVariaveis(
        modelo.conteudo,
        {
          cliente,
          contrato
        },
        baseUrl
      );

      const pdfBuffer = await PDFGenerationService.generateFromContent(
        conteudoProcessado,
        {
          format: 'A4',
          margin: { top: '0.5cm', right: '0.5cm', bottom: '0.5cm', left: '0.5cm' },
          printBackground: true
        }
      );

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="contrato-${contratoIdNum}.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      logger.error('Erro ao gerar PDF do contrato na central do assinante', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        contratoId: req.params.contratoId
      });
      sendError(res, error, 'Erro ao gerar PDF do contrato', 500, true);
    }
  }

  /**
   * Imprimir/Download termo
   */
  static async imprimirTermo(req: Request, res: ExpressResponse): Promise<void> {
    try {
      const { termoId } = req.params;

      const clienteId = CentralAssinanteController.getClienteIdFromRequest(req);
      if (!clienteId) {
        sendForbidden(res, 'Token inválido ou expirado');
        return;
      }

      const termoIdNum = parseInt(termoId, 10);
      if (isNaN(termoIdNum)) {
        sendValidationError(res, 'ID do termo inválido');
        return;
      }

      // Buscar termo
      const termo = await TermoContrato.findOne({
        where: { id: termoIdNum }
      });

      if (!termo) {
        sendNotFound(res, 'Termo não encontrado');
        return;
      }

      // Buscar contrato e verificar se pertence ao cliente
      const contrato = await Contrato.findOne({
        where: { id: termo.contrato_id, cliente_id: clienteId }
      });

      if (!contrato) {
        sendNotFound(res, 'Termo não encontrado ou não pertence ao cliente');
        return;
      }

      const cliente = await ClienteService.getById(clienteId);

      if (!cliente || !contrato) {
        sendNotFound(res, 'Dados não encontrados');
        return;
      }

      // Buscar modelo de termo pelo tipo
      const empresaId = (contrato as { empresa_id?: number | null }).empresa_id ?? (cliente as { empresa_id?: number | null }).empresa_id ?? null;
      const modelos = await ModeloDocumentoService.getByType('termo', true, empresaId);
      const modelo = modelos.find(m => m.nome.toLowerCase().includes(termo.tipo_termo.toLowerCase())) || modelos[0];

      if (!modelo) {
        sendNotFound(res, 'Modelo de termo não encontrado');
        return;
      }

      const baseUrl = req.get('host') ? `${req.protocol}://${req.get('host')}` : undefined;
      const conteudoProcessado = await VariaveisDocumentoService.processarVariaveis(
        modelo.conteudo,
        {
          cliente,
          contrato
        },
        baseUrl
      );

      const pdfBuffer = await PDFGenerationService.generateFromContent(
        conteudoProcessado,
        {
          format: 'A4',
          margin: { top: '0.5cm', right: '0.5cm', bottom: '0.5cm', left: '0.5cm' },
          printBackground: true
        }
      );

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="termo-${termoIdNum}.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      logger.error('Erro ao gerar PDF do termo na central do assinante', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        termoId: req.params.termoId
      });
      sendError(res, error, 'Erro ao gerar PDF do termo', 500, true);
    }
  }

  /**
   * Imprimir/Download fatura/título
   */
  static async imprimirFatura(req: Request, res: ExpressResponse): Promise<void> {
    try {
      const { tituloId } = req.params;

      const clienteId = CentralAssinanteController.getClienteIdFromRequest(req);
      if (!clienteId) {
        sendForbidden(res, 'Token inválido ou expirado');
        return;
      }

      const tituloIdNum = parseInt(tituloId, 10);
      if (isNaN(tituloIdNum)) {
        sendValidationError(res, 'ID do título inválido');
        return;
      }

      // Verificar se o título pertence ao cliente
      logger.info('Buscando título para impressão de boleto', {
        tituloId: tituloIdNum,
        clienteId
      });

      // Buscar título com todas as relações necessárias para gerar boleto
      const titulo = await TituloService.getById(tituloIdNum) as TituloComRelacoes | null;

      if (!titulo || titulo.cliente_id !== clienteId) {
        logger.warn('Título não encontrado ou não pertence ao cliente', {
          tituloId: tituloIdNum,
          clienteId,
          tituloEncontrado: !!titulo,
          clienteIdTitulo: titulo?.cliente_id
        });
        sendNotFound(res, 'Fatura não encontrada');
        return;
      }

      // Verificar se tem cliente e banco (necessários para gerar boleto)
      if (!titulo.cliente) {
        logger.warn('Título sem cliente associado', { tituloId: tituloIdNum });
        sendNotFound(res, 'Cliente não encontrado para o título');
        return;
      }

      if (!titulo.banco) {
        logger.warn('Título sem banco associado', { tituloId: tituloIdNum });
        sendNotFound(res, 'Banco não encontrado para o título');
        return;
      }

      // Registrar no banco se não tiver charge_id
      if (!titulo.charge_id) {
        logger.info('Registrando título no banco antes de gerar boleto', { tituloId: tituloIdNum });
        try {
          const resultado = await BancoApiService.gerarTitulo(titulo);
          
          if (!resultado.success || !resultado.data) {
            logger.error('Falha ao registrar título no banco', { 
              titulo_id: titulo.id, 
              message: resultado.message 
            });
            sendError(res, new Error('Não foi possível registrar o título no banco'), 'Não foi possível registrar o título no banco', 500, false);
            return;
          }

          // Atualizar título com dados do banco
          await TituloService.update(titulo.id, {
            charge_id: resultado.data.charge_id,
            url_boleto: resultado.data.url_boleto as string | null,
            qrcode: resultado.data.qrcode as string | null,
            qrcode_image: resultado.data.qrcode_image as string | null,
            codigo_barras: typeof resultado.data.codigo_barras === 'string' ? resultado.data.codigo_barras : null,
            linha_digitavel: resultado.data.linha_digitavel as string | null,
            nosso_numero: resultado.data.nosso_numero as string | null
          });

          // Recarregar título atualizado
          const tituloAtualizado = await TituloService.getById(tituloIdNum) as TituloComRelacoes | null;
          if (tituloAtualizado) {
            Object.assign(titulo, tituloAtualizado);
          }
        } catch (error) {
          logger.error('Erro ao registrar título no banco', {
            titulo_id: titulo.id,
            error: error instanceof Error ? error.message : 'Erro desconhecido'
          });
          sendError(res, error, 'Erro ao registrar título no banco', 500, true);
          return;
        }
      }

      logger.info('Processando HTML do boleto', {
        tituloId: titulo.id,
        temCliente: !!titulo.cliente,
        temBanco: !!titulo.banco,
        temPlano: !!titulo.plano,
        temContrato: !!titulo.contrato
      });
      
      // Verificar se todas as relações necessárias estão presentes
      if (!titulo.cliente) {
        logger.error('Título sem cliente ao tentar gerar boleto', { tituloId: titulo.id });
        sendError(res, new Error('Cliente não encontrado para o título'), 'Cliente não encontrado para o título', 500, false);
        return;
      }

      if (!titulo.banco) {
        logger.error('Título sem banco ao tentar gerar boleto', { tituloId: titulo.id });
        sendError(res, new Error('Banco não encontrado para o título'), 'Banco não encontrado para o título', 500, false);
        return;
      }

      // Gerar HTML do boleto usando o serviço especializado
      let boletoHtml: string;
      try {
        boletoHtml = await TituloPDFService.processarBoletoHtml(titulo);
        logger.info('HTML do boleto processado com sucesso', { 
          tamanhoHtml: boletoHtml.length,
          tituloId: titulo.id 
        });
      } catch (htmlError) {
        logger.error('Erro ao processar HTML do boleto', {
          tituloId: titulo.id,
          error: htmlError instanceof Error ? htmlError.message : 'Erro desconhecido',
          stack: htmlError instanceof Error ? htmlError.stack : undefined
        });
        sendError(res, htmlError, 'Erro ao processar HTML do boleto', 500, true);
        return;
      }

      logger.info('Gerando PDF do boleto');
      
      let pdfBuffer: Buffer;
      try {
        pdfBuffer = await PDFGenerationService.generateFromContent(
          boletoHtml,
          {
            format: 'A4',
            margin: { top: '0.5cm', right: '0.5cm', bottom: '0.5cm', left: '0.5cm' },
            printBackground: true
          }
        );
        logger.info('PDF do boleto gerado com sucesso', { 
          tamanho: pdfBuffer.length,
          tituloId: titulo.id 
        });
      } catch (pdfError) {
        logger.error('Erro ao gerar PDF do boleto', {
          tituloId: titulo.id,
          error: pdfError instanceof Error ? pdfError.message : 'Erro desconhecido',
          stack: pdfError instanceof Error ? pdfError.stack : undefined,
          tamanhoHtml: boletoHtml.length,
          previewHtml: boletoHtml.substring(0, 500) // Primeiros 500 caracteres para debug
        });
        sendError(res, pdfError, 'Erro ao gerar PDF do boleto', 500, true);
        return;
      }

      logger.info('PDF gerado com sucesso', {
        tamanho: pdfBuffer.length,
        tituloId: tituloIdNum
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="boleto-${titulo.numero_titulo || tituloIdNum}.pdf"`);
      res.send(pdfBuffer);
      
      logger.info('PDF do boleto enviado com sucesso para o cliente', { tituloId: tituloIdNum });
    } catch (error) {
      logger.error('Erro ao gerar PDF da fatura na central do assinante', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        stack: error instanceof Error ? error.stack : undefined,
        tituloId: req.params.tituloId,
        clienteId: req.params.id,
        url: req.originalUrl
      });
      sendError(res, error, 'Erro ao gerar PDF da fatura', 500, true);
    }
  }

  /**
   * Imprimir/Download recibo de fatura paga
   */
  static async imprimirRecibo(req: Request, res: ExpressResponse): Promise<void> {
    try {
      const { tituloId } = req.params;
      
      logger.info('Tentativa de imprimir recibo na central do assinante', {
        tituloId,
        url: req.originalUrl,
        method: req.method
      });

      const clienteId = CentralAssinanteController.getClienteIdFromRequest(req);
      if (!clienteId) {
        logger.warn('Token inválido ao tentar imprimir recibo', {
          tituloId
        });
        sendForbidden(res, 'Token inválido ou expirado');
        return;
      }

      const tituloIdNum = parseInt(tituloId, 10);
      if (isNaN(tituloIdNum)) {
        logger.warn('ID do título inválido', { tituloId });
        sendValidationError(res, 'ID do título inválido');
        return;
      }

      // Buscar título
      logger.info('Buscando título para impressão de recibo', {
        tituloId: tituloIdNum,
        clienteId
      });

      const titulo = await TituloService.getById(tituloIdNum) as TituloComRelacoes | null;

      if (!titulo || titulo.cliente_id !== clienteId) {
        logger.warn('Título não encontrado ou não pertence ao cliente', {
          tituloId: tituloIdNum,
          clienteId,
          tituloEncontrado: !!titulo,
          clienteIdTitulo: titulo?.cliente_id
        });
        sendNotFound(res, 'Fatura não encontrada');
        return;
      }

      // Verificar se a fatura está paga
      if (titulo.status !== 'pago' && titulo.status !== 'pago_atraso') {
        logger.warn('Tentativa de gerar recibo para fatura não paga', {
          tituloId: tituloIdNum,
          status: titulo.status
        });
        sendValidationError(res, 'Recibo só pode ser gerado para faturas pagas');
        return;
      }

      const cliente = await ClienteService.getById(clienteId);
      const contrato = titulo.contrato_id ? await ContratoService.getById(titulo.contrato_id) : undefined;

      if (!cliente) {
        logger.warn('Cliente não encontrado', { clienteId });
        sendNotFound(res, 'Cliente não encontrado');
        return;
      }

      // Tentar buscar modelo de recibo
      const empresaId = (titulo as { empresa_id?: number | null }).empresa_id ?? (cliente as { empresa_id?: number | null }).empresa_id ?? null;
      let modelos = await ModeloDocumentoService.getByType('recibo', true, empresaId);
      logger.info('Modelos de recibo encontrados (tipo recibo)', { quantidade: modelos.length });
      
      // Se não encontrar, buscar qualquer modelo de documento que tenha conteudo_recibo
      if (modelos.length === 0) {
        logger.info('Buscando modelos de documento com conteudo_recibo');
        const todosModelos = await ModeloDocumentoService.list({ ativo: true, empresa_id: empresaId ?? undefined });
        modelos = todosModelos.data.filter((m: any) => m.conteudo_recibo && m.conteudo_recibo.trim().length > 0);
        logger.info('Modelos com conteudo_recibo encontrados', { quantidade: modelos.length });
      }

      let conteudoProcessado: string;
      const baseUrl = req.get('host') ? `${req.protocol}://${req.get('host')}` : undefined;

      if (modelos.length > 0) {
        const modelo = modelos[0];
        logger.info('Usando modelo de recibo', { 
          modeloId: modelo.id, 
          modeloNome: modelo.nome,
          temConteudoRecibo: !!(modelo as any).conteudo_recibo
        });
        
        // Usar conteudo_recibo se disponível, senão usar conteudo
        const conteudoTemplate = (modelo as any).conteudo_recibo || modelo.conteudo;
        
        conteudoProcessado = await VariaveisDocumentoService.processarVariaveis(
          conteudoTemplate,
          {
            cliente,
            contrato: contrato || undefined,
            titulo: titulo as any
          },
          baseUrl
        );
      } else {
        // Gerar HTML simples se não houver modelo
        logger.warn('Nenhum modelo encontrado, gerando recibo simples');
        conteudoProcessado = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body { font-family: Arial, sans-serif; padding: 40px; }
              h1 { color: #333; text-align: center; margin-bottom: 30px; }
              .recibo-box { border: 2px solid #333; padding: 30px; margin: 20px 0; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
              th { background-color: #f2f2f2; font-weight: bold; width: 30%; }
              .valor { font-size: 18px; font-weight: bold; color: #10b981; }
              .assinatura { margin-top: 60px; border-top: 1px solid #333; padding-top: 20px; }
            </style>
          </head>
          <body>
            <h1>RECIBO DE PAGAMENTO</h1>
            <div class="recibo-box">
              <table>
                <tr><th>Número do Título:</th><td>${titulo.numero_titulo || tituloIdNum}</td></tr>
                <tr><th>Cliente:</th><td>${cliente.razao_social || cliente.nome_fantasia || '-'}</td></tr>
                <tr><th>CNPJ:</th><td>${cliente.cnpj || '-'}</td></tr>
                <tr><th>Valor Pago:</th><td class="valor">R$ ${Number(titulo.valor_pago || titulo.valor_final || titulo.valor).toFixed(2).replace('.', ',')}</td></tr>
                <tr><th>Data de Vencimento:</th><td>${titulo.data_vencimento ? new Date(titulo.data_vencimento).toLocaleDateString('pt-BR') : '-'}</td></tr>
                <tr><th>Data de Pagamento:</th><td>${titulo.data_pagamento ? new Date(titulo.data_pagamento).toLocaleDateString('pt-BR') : '-'}</td></tr>
                <tr><th>Status:</th><td>${titulo.status === 'pago' ? 'Pago' : 'Pago com Atraso'}</td></tr>
              </table>
              <div class="assinatura">
                <p>Recebido de: ${cliente.razao_social || cliente.nome_fantasia || '-'}</p>
                <p style="margin-top: 40px;">_________________________________</p>
                <p>Assinatura</p>
              </div>
            </div>
          </body>
          </html>
        `;
      }

      logger.info('Gerando PDF do recibo');
      
      const pdfBuffer = await PDFGenerationService.generateFromContent(
        conteudoProcessado,
        {
          format: 'A4',
          margin: { top: '0.5cm', right: '0.5cm', bottom: '0.5cm', left: '0.5cm' },
          printBackground: true
        }
      );

      logger.info('PDF do recibo gerado com sucesso', {
        tamanho: pdfBuffer.length,
        tituloId: tituloIdNum
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="recibo-${titulo.numero_titulo || tituloIdNum}.pdf"`);
      res.send(pdfBuffer);
      
      logger.info('PDF do recibo enviado com sucesso para o cliente', { tituloId: tituloIdNum });
    } catch (error) {
      logger.error('Erro ao gerar PDF do recibo na central do assinante', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        stack: error instanceof Error ? error.stack : undefined,
        tituloId: req.params.tituloId,
        clienteId: req.params.id,
        url: req.originalUrl
      });
      sendError(res, error, 'Erro ao gerar PDF do recibo', 500, true);
    }
  }
}
