import { Request, Response } from 'express';
import { Parametro } from '../../../models/sistema/Parametro';
import { ParametroService } from '../../../services/sistema/ParametroService';
import { logger } from '../../../utils/logger';
import { registrarCriacao, registrarAtualizacao } from '../../../services/sistema/AuditoriaService/index';
import type { AuthenticatedRequest } from '../../../types/auth';

export class ParametroController {
  
  // Listar todos os parâmetros
  public async index(req: Request, res: Response): Promise<void> {
    try {
      const { categoria, ativo } = req.query;
      
      const whereClause: { categoria?: string; ativo?: boolean } = {};
      
      if (categoria && typeof categoria === 'string') {
        whereClause.categoria = categoria;
      }
      
      if (ativo !== undefined) {
        const ativoValue = Array.isArray(ativo) ? ativo[0] : ativo;
        if (typeof ativoValue === 'string') {
          whereClause.ativo = ativoValue === 'true';
        } else if (typeof ativoValue === 'boolean') {
          whereClause.ativo = ativoValue;
        }
      }

      const result = await ParametroService.list({
        categoria: categoria as string,
        ativo: whereClause.ativo
      });

      res.json(result);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Erro ao listar parâmetros', {
        context: 'ParametroController',
        action: 'index',
        error: errorMessage,
        stack: errorStack,
        query: req.query
      });
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: errorMessage
      });
    }
  }

  // Obter parâmetro por chave
  public async getByChave(req: Request, res: Response): Promise<void> {
    try {
      const { chave } = req.params;
      
      const parametro = await ParametroService.getByChave(chave);

      if (!parametro) {
        // Retornar 200 com success: false ao invés de 404 para evitar redirecionamento
        res.status(200).json({
          success: false,
          message: 'Parâmetro não encontrado',
          data: null
        });
        return;
      }

      res.json({
        success: true,
        data: parametro
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Erro ao obter parâmetro', {
        context: 'ParametroController',
        action: 'getByChave',
        error: errorMessage,
        stack: errorStack,
        chave: req.params.chave
      });
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: errorMessage
      });
    }
  }

  // Atualizar parâmetro
  public async update(req: Request, res: Response): Promise<void> {
    try {
      const { chave } = req.params;
      const { valor, ativo, tipo, descricao, categoria } = req.body;

      let parametro = await ParametroService.getByChave(chave);

      // Se não existir, criar com valores padrão
      if (!parametro) {
        parametro = await ParametroService.create({
          chave,
          valor: valor?.toString() || '',
          tipo: tipo || 'string',
          descricao: descricao || `Parâmetro ${chave}`,
          categoria: categoria || 'geral',
          ativo: ativo !== undefined ? ativo : true
        });

        await registrarCriacao(
          req as AuthenticatedRequest,
          'Parametro',
          parametro.id,
          parametro.toJSON() as unknown as Record<string, unknown>
        );

        res.json({
          success: true,
          message: 'Parâmetro criado com sucesso',
          data: parametro
        });
        return;
      }

      // Converter valor baseado no tipo
      let valorConvertido = valor;
      if (parametro.tipo === 'boolean') {
        valorConvertido = valor === 'true' || valor === true;
      } else if (parametro.tipo === 'number') {
        valorConvertido = parseFloat(valor);
      } else if (parametro.tipo === 'json') {
        try {
          valorConvertido = JSON.parse(valor);
        } catch {
          res.status(400).json({
            success: false,
            message: 'Valor JSON inválido'
          });
          return;
        }
      }

      const dadosAnteriores = parametro.toJSON();
      parametro = await ParametroService.update(chave, {
        valor: valorConvertido.toString(),
        ativo: ativo !== undefined ? ativo : parametro.ativo
      });

      await registrarAtualizacao(
        req as AuthenticatedRequest,
        'Parametro',
        parametro.id,
        dadosAnteriores as unknown as Record<string, unknown>,
        parametro.toJSON() as unknown as Record<string, unknown>
      );

      res.json({
        success: true,
        message: 'Parâmetro atualizado com sucesso',
        data: parametro
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Erro ao atualizar parâmetro', {
        context: 'ParametroController',
        action: 'update',
        error: errorMessage,
        stack: errorStack,
        chave: req.params.chave,
        body: req.body
      });
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: errorMessage
      });
    }
  }

  // Atualizar múltiplos parâmetros
  public async updateMultiple(req: Request, res: Response): Promise<void> {
    try {
      logger.info('Recebendo atualização de múltiplos parâmetros', {
        body: req.body,
        parametrosCount: Array.isArray(req.body.parametros) ? req.body.parametros.length : 0
      });

      const { parametros } = req.body;

      if (!Array.isArray(parametros)) {
        logger.error('Parâmetros não é um array', { body: req.body });
        res.status(400).json({
          success: false,
          message: 'Parâmetros devem ser um array'
        });
        return;
      }

      const results = [];

      for (const param of parametros) {
        const { chave, valor, ativo, tipo, descricao, categoria } = param;

        logger.info(`Processando parâmetro: ${chave}`, { chave, valor, tipo, descricao, categoria });

        let parametro = await ParametroService.getByChave(chave);

        // Se não existir, criar
        if (!parametro) {
          logger.info(`Criando novo parâmetro: ${chave}`);
          try {
            parametro = await ParametroService.create({
              chave,
              valor: valor?.toString() || '',
              tipo: tipo || 'string',
              descricao: descricao || `Parâmetro ${chave}`,
              categoria: categoria || 'geral',
              ativo: ativo !== undefined ? ativo : true
            });
            
            await parametro.reload(); // Garantir que os dados estão sincronizados

            // Registrar auditoria (não bloquear se falhar)
            try {
              await registrarCriacao(
                req as AuthenticatedRequest,
                'Parametro',
                parametro.id,
                parametro.toJSON() as unknown as Record<string, unknown>
              );
            } catch (auditError) {
              logger.warn(`Erro ao registrar auditoria para parâmetro ${chave}`, { error: auditError });
            }

            logger.info(`Parâmetro ${chave} criado com sucesso`, { id: parametro.id, valor: parametro.valor });
            results.push({
              chave,
              success: true
            });
          } catch (createError) {
            logger.error(`Erro ao criar parâmetro ${chave}`, { error: createError });
            results.push({
              chave,
              success: false,
              error: createError instanceof Error ? createError.message : 'Erro ao criar parâmetro'
            });
          }
          continue;
        }

        // Converter valor baseado no tipo
        let valorConvertido = valor;
        const tipoParametro = tipo || parametro.tipo;
        if (tipoParametro === 'boolean') {
          valorConvertido = valor === 'true' || valor === true;
        } else if (tipoParametro === 'number') {
          valorConvertido = parseFloat(valor?.toString() || '0');
        } else if (tipoParametro === 'json') {
          try {
            valorConvertido = JSON.parse(valor?.toString() || '{}');
          } catch {
            results.push({
              chave,
              success: false,
              error: 'Valor JSON inválido'
            });
            continue;
          }
        }

        const dadosAnteriores = parametro.toJSON();
        const updateData: any = {
          valor: valorConvertido.toString(),
          ativo: ativo !== undefined ? ativo : parametro.ativo
        };

        // Atualizar tipo, descricao e categoria se fornecidos
        if (tipo) updateData.tipo = tipo;
        if (descricao) updateData.descricao = descricao;
        if (categoria) updateData.categoria = categoria;

        logger.info(`Atualizando parâmetro existente: ${chave}`, { 
          valorAnterior: dadosAnteriores.valor, 
          valorNovo: valorConvertido.toString(),
          updateData 
        });

        try {
          parametro = await ParametroService.update(chave, updateData);

          logger.info(`Parâmetro ${chave} atualizado com sucesso`, { 
            id: parametro.id, 
            valor: parametro.valor,
            tipo: parametro.tipo,
            categoria: parametro.categoria
          });

          // Registrar auditoria (não bloquear se falhar)
          try {
            await registrarAtualizacao(
              req as AuthenticatedRequest,
              'Parametro',
              parametro.id,
              dadosAnteriores as unknown as Record<string, unknown>,
              parametro.toJSON() as unknown as Record<string, unknown>
            );
          } catch (auditError) {
            logger.warn(`Erro ao registrar auditoria para parâmetro ${chave}`, { error: auditError });
          }

          results.push({
            chave,
            success: true
          });
        } catch (updateError) {
          logger.error(`Erro ao atualizar parâmetro ${chave}`, { error: updateError });
          results.push({
            chave,
            success: false,
            error: updateError instanceof Error ? updateError.message : 'Erro ao atualizar parâmetro'
          });
        }
      }

      logger.info('Parâmetros atualizados com sucesso', {
        total: results.length,
        sucessos: results.filter(r => r.success).length,
        falhas: results.filter(r => !r.success).length,
        results
      });

      res.json({
        success: true,
        message: 'Parâmetros atualizados',
        data: results
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Erro ao atualizar múltiplos parâmetros', {
        context: 'ParametroController',
        action: 'updateMultiple',
        error: errorMessage,
        stack: errorStack,
        body: req.body
      });
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: errorMessage
      });
    }
  }

  // Obter parâmetros por categoria
  public async getByCategoria(req: Request, res: Response): Promise<void> {
    try {
      const { categoria } = req.params;

      const result = await ParametroService.getByCategoria(categoria);

      res.json(result);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Erro ao obter parâmetros por categoria', {
        context: 'ParametroController',
        action: 'getByCategoria',
        error: errorMessage,
        stack: errorStack,
        categoria: req.params.categoria
      });
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: errorMessage
      });
    }
  }

  // Resetar parâmetros para valores padrão
  public async resetDefaults(req: Request, res: Response): Promise<void> {
    try {
      const parametrosPadrao = [
        // Validação de documentos
        { chave: 'validar_cnpj', valor: 'true', tipo: 'boolean' as const, descricao: 'Validar CNPJ automaticamente', categoria: 'validacao', ativo: true },
        { chave: 'validar_cpf', valor: 'true', tipo: 'boolean' as const, descricao: 'Validar CPF automaticamente', categoria: 'validacao', ativo: true },
        
        // Geração automática de títulos
        { chave: 'geracao_automatica_titulos', valor: 'true', tipo: 'boolean' as const, descricao: 'Geração automática de títulos', categoria: 'titulos', ativo: true },
        { chave: 'vencimento_sabados_domingos', valor: 'false', tipo: 'boolean' as const, descricao: 'Permitir vencimento aos sábados, domingos e feriados', categoria: 'titulos', ativo: true },
        { chave: 'autolancamento_titulos', valor: 'true', tipo: 'boolean' as const, descricao: 'Autolançamento de títulos', categoria: 'titulos', ativo: true },
        { chave: 'manter_numero_minimo_titulos', valor: 'true', tipo: 'boolean' as const, descricao: 'Manter número mínimo de títulos', categoria: 'titulos', ativo: true },
        { chave: 'numero_minimo_titulos', valor: '3', tipo: 'number' as const, descricao: 'Número mínimo de títulos a manter', categoria: 'titulos', ativo: true },
        
        // Geração automática de carnê
        { chave: 'geracao_automatica_carne', valor: 'false', tipo: 'boolean' as const, descricao: 'Geração automática de carnê', categoria: 'carne', ativo: true },
        { chave: 'auto_parcelas_carne', valor: 'true', tipo: 'boolean' as const, descricao: 'Auto parcelas de carnê', categoria: 'carne', ativo: true },
        { chave: 'numero_parcelas_padrao', valor: '12', tipo: 'number' as const, descricao: 'Número padrão de parcelas para auto geração', categoria: 'carne', ativo: true },
        { chave: 'manter_carnes_cliente', valor: 'true', tipo: 'boolean' as const, descricao: 'Manter sempre um novo carnê para o cliente', categoria: 'carne', ativo: true }
      ];

      const results = [];

      for (const param of parametrosPadrao) {
        const [parametro, created] = await ParametroService.findOrCreate(param.chave, param);

        // Se já existia, atualizar com valores padrão
        if (!created && parametro.valor !== param.valor) {
          const dadosAnteriores = parametro.toJSON();
          await ParametroService.updateInstance(parametro, { valor: param.valor });
          
          await registrarAtualizacao(
            req as AuthenticatedRequest,
            'Parametro',
            parametro.id,
            dadosAnteriores as unknown as Record<string, unknown>,
            parametro.toJSON() as unknown as Record<string, unknown>
          );
        } else if (created) {
          await registrarCriacao(
            req as AuthenticatedRequest,
            'Parametro',
            parametro.id,
            parametro.toJSON() as unknown as Record<string, unknown>
          );
        }

        results.push(parametro);
      }

      res.json({
        success: true,
        message: 'Parâmetros resetados para valores padrão',
        data: results
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Erro ao resetar parâmetros', {
        context: 'ParametroController',
        action: 'resetDefaults',
        error: errorMessage,
        stack: errorStack
      });
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: errorMessage
      });
    }
  }
}

export default ParametroController;
