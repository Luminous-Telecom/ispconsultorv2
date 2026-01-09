import { Request, Response } from 'express';
import { Fornecedor } from '../../../models/financeiro/Fornecedor';
import { ContaPagar } from '../../../models/financeiro/ContaPagar';
import { FornecedorService } from '../../../services/financeiro/FornecedorService';
import { logger } from '../../../utils/logger';
import { fornecedorCreateSchema, fornecedorUpdateSchema } from '../../../validators/fornecedor.validator';
import { registrarCriacao, registrarAtualizacao, registrarExclusao } from '../../../services/sistema/AuditoriaService/index';
import { setAuditData } from '../../../middleware/auditMiddleware';
import { normalizeDateForDb, formatCEP } from '../../../utils/dateUtils';
import axios from 'axios';

export class FornecedorController {
  // Listar todos os fornecedores
  static async index(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 15;
      const search = req.query.search as string;
      const searchField = req.query.searchField as string;
      const tipoPessoa = req.query.tipo_pessoa as string;

      const result = await FornecedorService.list({
        page,
        limit,
        search,
        searchField,
        tipo_pessoa: tipoPessoa,
        ativo: req.query.ativo as string
      });

      res.json(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao listar fornecedores', {
        context: 'FornecedorController',
        action: 'index',
        error: errorMessage
      });
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: errorMessage
      });
    }
  }

  // Mostrar um fornecedor específico
  static async show(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          error: 'ID inválido'
        });
        return;
      }

      const fornecedor = await FornecedorService.getById(id, true);

      if (!fornecedor) {
        res.status(404).json({
          success: false,
          error: 'Fornecedor não encontrado'
        });
        return;
      }

      res.json({
        success: true,
        data: fornecedor
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao buscar fornecedor', {
        context: 'FornecedorController',
        action: 'show',
        error: errorMessage,
        fornecedorId: req.params.id
      });
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: errorMessage
      });
    }
  }

  // Criar novo fornecedor
  static async store(req: Request, res: Response): Promise<void> {
    try {
      const { error, value } = fornecedorCreateSchema.validate(req.body);
      
      if (error) {
        res.status(400).json({
          success: false,
          error: 'Dados inválidos',
          details: error.details.map(d => d.message)
        });
        return;
      }

      // Verificar se CPF/CNPJ já existe
      const fornecedorExistente = await FornecedorService.existsByCpfCnpj(value.cpf_cnpj);

      if (fornecedorExistente) {
        res.status(409).json({
          success: false,
          error: 'CPF/CNPJ já cadastrado',
          message: 'Já existe um fornecedor cadastrado com este CPF/CNPJ'
        });
        return;
      }

      const fornecedor = await FornecedorService.create(value);

      // Registrar auditoria
      try {
        await registrarCriacao(
          req,
          'Fornecedor',
          fornecedor.id,
          fornecedor.toJSON() as Record<string, unknown>
        );
        logger.info('Auditoria de criação registrada com sucesso', {
          context: 'FornecedorController',
          action: 'store',
          fornecedor_id: fornecedor.id
        });
      } catch (auditError) {
        logger.error('Erro ao registrar auditoria de criação', {
          context: 'FornecedorController',
          action: 'store',
          fornecedor_id: fornecedor.id,
          error: auditError instanceof Error ? auditError.message : 'Erro desconhecido',
          stack: auditError instanceof Error ? auditError.stack : undefined
        });
        // Não interromper o fluxo, mas logar o erro
      }

      res.status(201).json({
        success: true,
        message: 'Fornecedor criado com sucesso',
        data: fornecedor
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Erro ao criar fornecedor', {
        context: 'FornecedorController',
        action: 'store',
        error: errorMessage,
        stack: errorStack,
        body: req.body
      });
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: errorMessage
      });
    }
  }

  // Atualizar fornecedor
  static async update(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          error: 'ID inválido'
        });
        return;
      }

      const { error, value } = fornecedorUpdateSchema.validate(req.body);
      
      if (error) {
        res.status(400).json({
          success: false,
          error: 'Dados inválidos',
          details: error.details.map(d => d.message)
        });
        return;
      }

      const fornecedor = await FornecedorService.getById(id, false);

      if (!fornecedor) {
        res.status(404).json({
          success: false,
          error: 'Fornecedor não encontrado'
        });
        return;
      }

      // Se CPF/CNPJ está sendo alterado, verificar se já existe
      if (value.cpf_cnpj && value.cpf_cnpj !== fornecedor.cpf_cnpj) {
        const fornecedorExistente = await FornecedorService.existsByCpfCnpj(value.cpf_cnpj, fornecedor.id);

        if (fornecedorExistente) {
          res.status(409).json({
            success: false,
            error: 'CPF/CNPJ já cadastrado',
            message: 'Já existe um fornecedor cadastrado com este CPF/CNPJ'
          });
          return;
        }
      }

      // Capturar dados anteriores para auditoria
      const dadosAnteriores = fornecedor.toJSON() as Record<string, unknown>;
      
      const fornecedorAtualizado = await FornecedorService.update(id, value);
      
      // Registrar auditoria
      const dadosNovos = fornecedorAtualizado.toJSON() as Record<string, unknown>;
      
      logger.info('Tentando registrar auditoria de atualização', {
        context: 'FornecedorController',
        action: 'update',
        fornecedor_id: fornecedor.id,
        entidade_id: fornecedor.id,
        has_dados_anteriores: !!dadosAnteriores,
        has_dados_novos: !!dadosNovos,
        keys_anteriores: dadosAnteriores ? Object.keys(dadosAnteriores).length : 0,
        keys_novos: dadosNovos ? Object.keys(dadosNovos).length : 0
      });
      
      // Disponibilizar dados para o middleware
      setAuditData(req, dadosAnteriores, dadosNovos);
      
      try {
        await registrarAtualizacao(
          req,
          'Fornecedor',
          fornecedorAtualizado.id,
          dadosAnteriores,
          dadosNovos
        );
        logger.info('Auditoria de atualização registrada com sucesso', {
          context: 'FornecedorController',
          action: 'update',
          fornecedor_id: fornecedorAtualizado.id,
          entidade_id: fornecedorAtualizado.id
        });
      } catch (auditError) {
        logger.error('Erro ao registrar auditoria de atualização', {
          context: 'FornecedorController',
          action: 'update',
          fornecedor_id: fornecedor.id,
          error: auditError instanceof Error ? auditError.message : 'Erro desconhecido',
          stack: auditError instanceof Error ? auditError.stack : undefined
        });
        // Não interromper o fluxo, mas logar o erro
      }

      res.json({
        success: true,
        message: 'Fornecedor atualizado com sucesso',
        data: fornecedorAtualizado
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao atualizar fornecedor', {
        context: 'FornecedorController',
        action: 'update',
        error: errorMessage,
        fornecedorId: req.params.id
      });
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: errorMessage
      });
    }
  }

  // Deletar fornecedor
  static async destroy(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          error: 'ID inválido'
        });
        return;
      }

      const fornecedor = await FornecedorService.getById(id, false);

      if (!fornecedor) {
        res.status(404).json({
          success: false,
          error: 'Fornecedor não encontrado'
        });
        return;
      }

      // Verificar se há contas vinculadas
      const { ContaPagarService } = await import('../../../services/financeiro/ContaPagarService');
      const contasVinculadas = await ContaPagarService.count({ fornecedor_id: id });

      if (contasVinculadas > 0) {
        res.status(409).json({
          success: false,
          error: 'Não é possível excluir fornecedor com contas vinculadas',
          message: `Existem ${contasVinculadas} conta(s) vinculada(s) a este fornecedor`
        });
        return;
      }

      // Capturar dados anteriores para auditoria
      const dadosAnteriores = fornecedor.toJSON() as Record<string, unknown>;
      
      await FornecedorService.delete(id);

      // Registrar auditoria
      try {
        await registrarExclusao(
          req,
          'Fornecedor',
          id,
          dadosAnteriores
        );
        logger.info('Auditoria de exclusão registrada com sucesso', {
          context: 'FornecedorController',
          action: 'destroy',
          fornecedor_id: id
        });
      } catch (auditError) {
        logger.error('Erro ao registrar auditoria de exclusão', {
          context: 'FornecedorController',
          action: 'destroy',
          fornecedor_id: id,
          error: auditError instanceof Error ? auditError.message : 'Erro desconhecido',
          stack: auditError instanceof Error ? auditError.stack : undefined
        });
        // Não interromper o fluxo, mas logar o erro
      }

      res.json({
        success: true,
        message: 'Fornecedor excluído com sucesso'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao excluir fornecedor', {
        context: 'FornecedorController',
        action: 'destroy',
        error: errorMessage,
        fornecedorId: req.params.id
      });
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: errorMessage
      });
    }
  }

  // Consultar dados do CNPJ na ReceitaWS
  static async consultarCnpj(req: Request, res: Response): Promise<void> {
    try {
      const { cnpj } = req.params;
      
      // Remover formatação do CNPJ
      const cnpjLimpo = cnpj.replace(/\D/g, '');
      
      if (cnpjLimpo.length !== 14) {
        res.status(400).json({
          success: false,
          error: 'CNPJ inválido',
          message: 'CNPJ deve ter 14 dígitos'
        });
        return;
      }

      // Consultar na API ReceitaWS
      const response = await axios.get(`https://www.receitaws.com.br/v1/cnpj/${cnpjLimpo}`, {
        timeout: 10000
      });

      if (response.data.status === 'ERROR') {
        res.status(404).json({
          success: false,
          error: 'CNPJ não encontrado',
          message: response.data.message || 'CNPJ não encontrado na base da Receita Federal'
        });
        return;
      }

      // Mapear dados da API para o formato do sistema
      const dadosEmpresa = {
        nome_razao_social: response.data.nome || '',
        nome_fantasia: response.data.fantasia || '',
        cep: formatCEP(response.data.cep),
        logradouro: response.data.logradouro || '',
        numero: response.data.numero || '',
        complemento: response.data.complemento || '',
        bairro: response.data.bairro || '',
        cidade: response.data.municipio || '',
        estado: response.data.uf || '',
        situacao: response.data.situacao || '',
        abertura: response.data.abertura || '',
        natureza_juridica: response.data.natureza_juridica || '',
        capital_social: response.data.capital_social || ''
      };

      res.json({
        success: true,
        data: dadosEmpresa
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 429) {
          logger.warn('Limite de requisições excedido ao consultar CNPJ', {
            context: 'FornecedorController',
            action: 'consultarCnpj',
            cnpj: req.params.cnpj
          });
          res.status(429).json({
            success: false,
            error: 'Limite de requisições excedido',
            message: 'Muitas requisições. Tente novamente em alguns instantes.'
          });
          return;
        }
        
        if (error.response?.status === 404) {
          logger.warn('CNPJ não encontrado', {
            context: 'FornecedorController',
            action: 'consultarCnpj',
            cnpj: req.params.cnpj
          });
          res.status(404).json({
            success: false,
            error: 'CNPJ não encontrado',
            message: 'CNPJ não encontrado na base da Receita Federal'
          });
          return;
        }
      }

      logger.error('Erro ao consultar CNPJ', {
        context: 'FornecedorController',
        action: 'consultarCnpj',
        error: errorMessage,
        stack: errorStack,
        cnpj: req.params.cnpj
      });

      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: errorMessage
      });
    }
  }
}

