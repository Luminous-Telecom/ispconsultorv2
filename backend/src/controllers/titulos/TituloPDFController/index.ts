import { Request, Response } from 'express';
import { Titulo } from '../../../models/financeiro/Titulo';
import { TituloService } from '../../../services/financeiro/TituloService';
import { TituloPDFService } from '../../../services/titulos/TituloPDFService';
import { BancoApiService } from '../../../services/bancos/BancoApiService';
import { logger } from '../../../utils/logger';
import { TituloComRelacoes } from '../TituloHelpers/types';
import { sendError, sendNotFound, sendValidationError } from '../../../utils/responseUtils';

export class TituloPDFController {
  
  /**
   * Gera PDF em base64 para um título
   */
  public static async gerarPdfBase64(titulo: TituloComRelacoes | Titulo): Promise<string | null> {
    return await TituloPDFService.gerarPdfBase64(titulo as TituloComRelacoes);
  }

  /**
   * Processa HTML do boleto substituindo variáveis do template (delegado para service)
   */
  private static async processarBoletoHtml(titulo: TituloComRelacoes): Promise<string> {
    return await TituloPDFService.processarBoletoHtml(titulo);
  }

  /**
   * Imprime boleto único (retorna HTML)
   */
  public static async imprimirBoleto(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const titulo = await TituloService.getById(id) as TituloComRelacoes | null;

      if (!titulo) {
        sendNotFound(res, 'Título não encontrado');
        return;
      }

      // Registrar no banco se não tiver charge_id
      if (!titulo.charge_id) {

        const resultado = await BancoApiService.gerarTitulo(titulo as TituloComRelacoes);
        
        if (!resultado.success || !resultado.data) {
          logger.error('Falha ao registrar título no banco', { titulo_id: titulo.id, message: resultado.message });
          sendError(res, new Error('Não foi possível registrar o título no banco: ' + (resultado.message || 'Erro desconhecido')), 'Não foi possível registrar o título no banco: ' + (resultado.message || 'Erro desconhecido'), 500, false, { error: 'ERRO_REGISTRO_BANCO' });
          return;
        }

        const codigoBarrasFinal = typeof resultado.data.codigo_barras === 'string' ? resultado.data.codigo_barras : null;
        const codigoBarrasParaSalvar = codigoBarrasFinal !== null ? codigoBarrasFinal : null;

        const tituloModel = titulo as unknown as Titulo;
        await TituloService.update(tituloModel.id, {
          charge_id: resultado.data.charge_id,
          url_boleto: resultado.data.url_boleto as string | null,
          qrcode: resultado.data.qrcode as string | null,
          qrcode_image: resultado.data.qrcode_image as string | null,
          codigo_barras: codigoBarrasParaSalvar,
          linha_digitavel: resultado.data.linha_digitavel as string | null,
          nosso_numero: resultado.data.nosso_numero as string | null
        });
      }

      // Processar HTML
        const template = await TituloPDFController.processarBoletoHtml(titulo);

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Boleto - ${titulo.numero_titulo}</title>
          <style> body { margin: 0; padding: 0; } </style>
        </head>
        <body>
          ${template}
        </body>
        </html>
      `);
    } catch (error: unknown) {
      sendError(res, error, 'Erro interno do servidor', 500, true, {
        context: 'TituloPDFController',
        action: 'imprimir'
      });
    }
  }

  /**
   * Imprime múltiplos boletos (retorna HTML)
   */
  public static async imprimirBoletosMultiplos(req: Request, res: Response): Promise<void> {
    try {
      let ids = req.body.ids || req.query.ids;
      
      if (typeof ids === 'string') {
        try {
          ids = JSON.parse(ids);
        } catch {
          ids = ids.split(',').map((id: string) => parseInt(id.trim())).filter((id: number) => !isNaN(id));
        }
      }
      if (typeof ids === 'number') ids = [ids];

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        sendValidationError(res, 'IDs dos títulos não fornecidos');
        return;
      }

      const titulos = await TituloService.findAllWithFilters(
        { id: ids },
        {
          include: [
            { association: 'cliente' },
            { association: 'plano' },
            { association: 'banco' }
          ]
        }
      );
      if (titulos.length === 0) {
        sendNotFound(res, 'Nenhum título encontrado');
        return;
      }

      const boletosHtml: string[] = [];

      for (const titulo of titulos) {
        try {
          let tituloComRelacoes: TituloComRelacoes = titulo as unknown as TituloComRelacoes;

          if (!titulo.charge_id) {
            try {
              const resultado = await BancoApiService.gerarTitulo(titulo as unknown as TituloComRelacoes);
              
              if (resultado.success && resultado.data) {
                const codigoBarrasParaSalvar = typeof resultado.data.codigo_barras === 'string' ? resultado.data.codigo_barras : null;
                await TituloService.update(titulo.id, { charge_id: resultado.data.charge_id, codigo_barras: codigoBarrasParaSalvar, linha_digitavel: resultado.data.linha_digitavel as string | null });
                const tituloAtualizado = await TituloService.getById(titulo.id);
                if (tituloAtualizado) {
                  tituloComRelacoes = tituloAtualizado as unknown as TituloComRelacoes;
                }
              } else {
                logger.error('Falha ao registrar título', { titulo_id: titulo.id, message: resultado.message });
              }
            } catch (error: unknown) {
              const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
              logger.error('Erro ao registrar título no banco', {
                titulo_id: titulo.id,
                error: errorMsg,
                stack: error instanceof Error ? error.stack : undefined
              });
            }
          }

          const boletoHtml = await TituloPDFController.processarBoletoHtml(titulo as unknown as TituloComRelacoes);
          
          boletosHtml.push(`<div style="page-break-after: always;">${boletoHtml}</div>`);
        } catch (error: unknown) {
          const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
          const errorStack = error instanceof Error ? error.stack : undefined;
          
          const tituloComRelacoesErro = titulo as unknown as TituloComRelacoes;
          const detalhesErroTitulo = {
            titulo_id: titulo.id,
            error_message: errorMsg,
            error_name: error instanceof Error ? error.name : 'Unknown',
            has_cliente: !!tituloComRelacoesErro.cliente,
            has_banco: !!tituloComRelacoesErro.banco,
            cliente_id: tituloComRelacoesErro.cliente?.id,
            banco_id: tituloComRelacoesErro.banco?.id
          };
          
          logger.error(`=== ERRO AO PROCESSAR TÍTULO === ${JSON.stringify(detalhesErroTitulo, null, 2)}`);
          logger.error('Stack trace:', errorStack || 'Não disponível');
          
          // Continuar processando outros títulos
        }
      }

      const autoPrint = req.query.print === 'true';
      const template = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Boletos - ${titulos.length} título(s)</title>
          <style>
            @media print { .page-break { page-break-after: always; } }
            body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
            .boleto { margin-bottom: 0; }
          </style>
          ${autoPrint ? '<script>window.onload = function() { setTimeout(function() { window.print(); }, 500); };</script>' : ''}
        </head>
        <body>
          ${boletosHtml.join('\n')}
        </body>
        </html>
      `;

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(template);
    } catch (error: unknown) {
      sendError(res, error, 'Erro ao imprimir boletos múltiplos', 500, true);
    }
  }

  /**
   * Gera PDF de múltiplos boletos
   */
  public static async gerarPdfBoletosMultiplos(req: Request, res: Response): Promise<void> {
    let ids: number[] = [];
    try {
      const idsParam = req.query.ids as string;
      
      if (idsParam) {
        try {
          const parsed = JSON.parse(idsParam);
          ids = Array.isArray(parsed) ? parsed : [parsed];
        } catch {
          ids = idsParam.split(',').map((id: string) => parseInt(id.trim())).filter((id: number) => !isNaN(id));
        }
      }

      if (!ids || ids.length === 0) {
        sendValidationError(res, 'IDs dos títulos não fornecidos');
        return;
      }

      // Otimização N+1: Carregar todas as relações de uma vez na query inicial
      // Usar required: false para garantir que relações sejam sempre carregadas (mesmo que null)
      let titulos: Titulo[] = [];
      try {
        titulos = await TituloService.getByIds(ids);
      } catch (getByIdsError: unknown) {
        logger.error('Erro ao carregar títulos do banco', {
          error: getByIdsError instanceof Error ? getByIdsError.message : 'Erro desconhecido',
          ids: ids
        });
        throw getByIdsError;
      }
      
      if (titulos.length === 0) {
        logger.warn('Nenhum título encontrado para os IDs fornecidos', { ids_solicitados: ids });
        sendNotFound(res, 'Nenhum título encontrado');
        return;
      }

      const boletosHtml: string[] = [];
      let titulosProcessados = 0;
      let titulosComErro = 0;
      const errosDetalhados: Array<{ titulo_id: number; motivo: string }> = [];

      for (const titulo of titulos) {
        try {
          logger.debug('Processando título para PDF', {
            titulo_id: titulo.id,
            numero_titulo: titulo.numero_titulo,
            banco_id: (titulo as any).banco_id,
            contrato_id: titulo.contrato_id,
            is_avulso: (titulo as any).is_avulso
          });
          
          // Usar título já carregado com relações (otimização N+1)
          let tituloComRelacoes: TituloComRelacoes = titulo as unknown as TituloComRelacoes;
          
          // Validar relações essenciais antes de continuar
          if (!tituloComRelacoes.cliente) {
            logger.warn('Título sem cliente associado', { 
              titulo_id: titulo.id,
              numero_titulo: titulo.numero_titulo,
              cliente_id: titulo.cliente_id
            });
            titulosComErro++;
            errosDetalhados.push({ titulo_id: titulo.id, motivo: 'Título sem cliente associado' });
            continue;
          }
          
          if (!tituloComRelacoes.banco) {
            logger.warn('Título sem banco associado', { 
              titulo_id: titulo.id,
              numero_titulo: titulo.numero_titulo,
              banco_id: (titulo as any).banco_id,
              contrato_id: titulo.contrato_id,
              has_contrato: !!tituloComRelacoes.contrato,
              has_bancoBoleto: !!(tituloComRelacoes.contrato as any)?.bancoBoleto,
              is_avulso: (titulo as any).is_avulso
            });
            titulosComErro++;
            errosDetalhados.push({ titulo_id: titulo.id, motivo: 'Título sem banco associado' });
            continue;
          }
          
          // Registrar no banco se não tiver charge_id
          if (!tituloComRelacoes.charge_id) {
            try {
              const resultado = await BancoApiService.gerarTitulo(tituloComRelacoes);
              
              const chargeId = resultado.data?.charge_id;
              const tituloFoiCriado = !!chargeId;
              
              if (tituloFoiCriado && resultado.data) {
                try {
                  const codigoBarrasParaSalvar = typeof resultado.data.codigo_barras === 'string' ? resultado.data.codigo_barras : null;
                  const linhaDigitavelParaSalvar = typeof resultado.data.linha_digitavel === 'string' ? resultado.data.linha_digitavel : null;
                  const urlBoletoParaSalvar = typeof resultado.data.url_boleto === 'string' ? resultado.data.url_boleto : null;
                  const qrcodeParaSalvar = typeof resultado.data.qrcode === 'string' ? resultado.data.qrcode : null;
                  const qrcodeImageParaSalvar = typeof resultado.data.qrcode_image === 'string' ? resultado.data.qrcode_image : null;
                  
                  await TituloService.update(titulo.id, {
                    charge_id: chargeId,
                    codigo_barras: codigoBarrasParaSalvar,
                    linha_digitavel: linhaDigitavelParaSalvar,
                    url_boleto: urlBoletoParaSalvar,
                    qrcode: qrcodeParaSalvar,
                    qrcode_image: qrcodeImageParaSalvar
                  });
                  
                  // Atualizar o objeto tituloComRelacoes em memória com os novos dados
                  (tituloComRelacoes as any).charge_id = chargeId;
                  (tituloComRelacoes as any).codigo_barras = codigoBarrasParaSalvar;
                  (tituloComRelacoes as any).linha_digitavel = linhaDigitavelParaSalvar;
                  (tituloComRelacoes as any).url_boleto = urlBoletoParaSalvar;
                  (tituloComRelacoes as any).qrcode = qrcodeParaSalvar;
                  (tituloComRelacoes as any).qrcode_image = qrcodeImageParaSalvar;
                  
                  // Tentar recarregar título após atualização
                  try {
                    const tituloAtualizado = await TituloService.getById(titulo.id) as TituloComRelacoes | null;
                    if (tituloAtualizado) {
                      tituloComRelacoes = tituloAtualizado as TituloComRelacoes;
                    }
                  } catch (reloadError: unknown) {
                    // Erro ao recarregar não é crítico, continuar com dados em memória
                  }
                } catch (updateError: unknown) {
                  logger.error('Erro ao atualizar título no banco de dados local', {
                    titulo_id: titulo.id,
                    error: updateError instanceof Error ? updateError.message : 'Erro desconhecido'
                  });
                  // Atualizar em memória mesmo se falhar ao salvar
                  (tituloComRelacoes as any).charge_id = chargeId;
                  (tituloComRelacoes as any).codigo_barras = typeof resultado.data.codigo_barras === 'string' ? resultado.data.codigo_barras : null;
                  (tituloComRelacoes as any).linha_digitavel = typeof resultado.data.linha_digitavel === 'string' ? resultado.data.linha_digitavel : null;
                }
              }
            } catch (error: unknown) {
              logger.error('Erro ao registrar título no banco', {
                titulo_id: titulo.id,
                error: error instanceof Error ? error.message : 'Erro desconhecido'
              });
            }
          }
          
          // Processar HTML do boleto
          try {
            const boletoHtml = await TituloPDFController.processarBoletoHtml(tituloComRelacoes);
            
            if (!boletoHtml || typeof boletoHtml !== 'string' || boletoHtml.trim().length === 0) {
              titulosComErro++;
              errosDetalhados.push({ titulo_id: titulo.id, motivo: 'HTML do boleto está vazio ou inválido' });
              continue;
            }
            
            boletosHtml.push(`<div style="page-break-after: always;">${boletoHtml}</div>`);
            titulosProcessados++;
          } catch (htmlError: unknown) {
            const htmlErrorMessage = htmlError instanceof Error ? htmlError.message : 'Erro desconhecido';
            const htmlErrorStack = htmlError instanceof Error ? htmlError.stack : undefined;
            
            const detalhesErroHtml = {
              titulo_id: titulo.id,
              error_message: htmlErrorMessage,
              error_name: htmlError instanceof Error ? htmlError.name : 'Unknown',
              has_cliente: !!tituloComRelacoes.cliente,
              has_banco: !!tituloComRelacoes.banco,
              has_charge_id: !!tituloComRelacoes.charge_id,
              cliente_id: tituloComRelacoes.cliente?.id,
              banco_id: tituloComRelacoes.banco?.id,
              banco_tipo: tituloComRelacoes.banco?.tipo_banco,
              is_avulso: (titulo as any).is_avulso,
              contrato_id: titulo.contrato_id
            };
            
            logger.error(`=== ERRO AO PROCESSAR HTML DO BOLETO === ${JSON.stringify(detalhesErroHtml, null, 2)}`);
            logger.error('Stack trace:', htmlErrorStack || 'Não disponível');
            
            titulosComErro++;
            errosDetalhados.push({ titulo_id: titulo.id, motivo: `Erro ao processar HTML: ${htmlErrorMessage}` });
            // Continuar processando outros títulos mesmo se um falhar
          }
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
          const errorStack = error instanceof Error ? error.stack : undefined;
          
          logger.error('Erro ao processar boleto para PDF múltiplo', {
            titulo_id: titulo.id,
            numero_titulo: titulo.numero_titulo,
            error: errorMessage,
            error_name: error instanceof Error ? error.name : 'Unknown',
            stack: errorStack,
            is_avulso: (titulo as any).is_avulso,
            banco_id: (titulo as any).banco_id,
            contrato_id: titulo.contrato_id
          });
          titulosComErro++;
          errosDetalhados.push({ titulo_id: titulo.id, motivo: `Erro geral: ${errorMessage}` });
          // Continuar processando outros títulos mesmo se um falhar
        }
      }
      


      const template = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Boletos - ${titulos.length} título(s)</title>
          <style>
            @media print { .page-break { page-break-after: always; } }
            body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
            .boleto { margin-bottom: 0; }
          </style>
        </head>
        <body>
          ${boletosHtml.join('')}
        </body>
        </html>
      `;

      // Verificar se há boletos para processar
      if (boletosHtml.length === 0) {
        logger.error('Nenhum boleto foi processado com sucesso', {
          total_titulos: titulos.length,
          ids_solicitados: ids,
          titulos_processados: titulosProcessados,
          titulos_com_erro: titulosComErro,
          erros_detalhados: errosDetalhados,
          detalhes_titulos: titulos.map(t => ({
            id: t.id,
            numero_titulo: t.numero_titulo,
            banco_id: (t as any).banco_id,
            contrato_id: t.contrato_id,
            is_avulso: (t as any).is_avulso,
            has_banco: !!(t as any).banco,
            has_cliente: !!(t as any).cliente
          }))
        });
        const errorsByField: Record<string, string[]> = {
          total_titulos: [String(titulos.length)],
          boletos_processados: ['0'],
          titulos_com_erro: [String(titulosComErro)]
        };
        
        if (errosDetalhados.length > 0) {
          errorsByField.erros = [JSON.stringify(errosDetalhados)];
        }
        
        sendValidationError(res, 'Nenhum boleto válido para gerar PDF. Verifique se os títulos têm cliente e banco associados.', errorsByField);
        return;
      }
      
      

      // Limpar variáveis não processadas (remover placeholders handlebars não substituídos)
      const templateLimpo = template.replace(/\{\{[^}]+\}\}/g, '');

      // Converter HTML para PDF usando html-pdf-node
      let pdfBuffer: Buffer;
      try {
        logger.debug('Iniciando conversão HTML para PDF', {
          template_length: templateLimpo.length,
          quantidade_boletos: boletosHtml.length
        });
        
        const htmlPdfModule = await import('html-pdf-node');
        const file = { content: templateLimpo };
        const options: any = {
          format: 'A4',
          margin: { top: '0.5cm', right: '0.5cm', bottom: '0.5cm', left: '0.5cm' },
          printBackground: true,
          displayHeaderFooter: false
        };
        
        logger.debug('Chamando html-pdf-node.generatePdf', {
          template_length: templateLimpo.length
        });
        
        // html-pdf-node usa callback, então precisamos promisificar
        pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
          htmlPdfModule.generatePdf(file, options, (err: Error | null, buffer: Buffer) => {
            if (err) {
              logger.error('Erro no callback do html-pdf-node', {
                error: err.message,
                stack: err.stack
              });
              reject(err);
            } else {
              resolve(buffer);
            }
          });
        });
        
      } catch (pdfError: unknown) {
        logger.error('Erro ao gerar PDF', {
          error: pdfError instanceof Error ? pdfError.message : 'Erro desconhecido'
        });
        throw new Error(`Erro ao gerar PDF: ${pdfError instanceof Error ? pdfError.message : 'Erro desconhecido'}`);
      }
      
      // Verificar se a resposta já foi enviada antes de tentar enviar
      if (!res.headersSent) {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="boletos-${titulos.length}-titulos.pdf"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        res.send(pdfBuffer);
      }
    } catch (error: unknown) {
      if (!res.headersSent) {
        sendError(res, error, 'Erro interno do servidor ao gerar PDF de múltiplos boletos', 500, true, {
          context: 'TituloPDFController',
          action: 'imprimirBoletosMultiplos',
          ids: ids
        });
      }
    }
  }
}

