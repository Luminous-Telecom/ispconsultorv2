import { Request, Response } from 'express';
import { Fornecedor } from '../../../models/financeiro/Fornecedor';
import { FornecedorService } from '../../../services/financeiro/FornecedorService';
import { logger } from '../../../utils/logger';
import { fornecedorCreateSchema, fornecedorUpdateSchema } from '../../../validators/fornecedor.validator';
import { registrarCriacao, registrarAtualizacao, registrarExclusao } from '../../../services/sistema/AuditoriaService/index';
import { setAuditData } from '../../../middleware/auditMiddleware';
import { formatCEP } from '../../../utils/dateUtils';
import axios from 'axios';
import { sendSuccess, sendError, sendNotFound, sendValidationError, sendForbidden } from '../../../utils/responseUtils';
import { getEmpresaIdOrNull } from '../../../utils/tenantUtils';

export class FornecedorController {
  // Listar todos os fornecedores
  static async index(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 15;
      const search = req.query.search as string;
      const searchField = req.query.searchField as string;
      const tipoPessoa = req.query.tipo_pessoa as string;
      const sortColumn = req.query.sortColumn as string;
      const sortDirection = req.query.sortDirection as string;

      const empresaId = getEmpresaIdOrNull(req);

      const result = await FornecedorService.list({
        page,
        limit,
        search,
        searchField,
        tipo_pessoa: tipoPessoa,
        ativo: req.query.ativo as string,
        sortColumn,
        sortDirection,
        empresa_id: empresaId ?? undefined,
      });

      sendSuccess(res, result);
    } catch (error) {
      sendError(res, error, 'Erro ao listar fornecedores', 500, true, {
        context: 'FornecedorController',
        action: 'index'
      });
    }
  }

  // Mostrar um fornecedor específico
  static async show(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        sendValidationError(res, 'ID inválido');
        return;
      }

      const fornecedor = await FornecedorService.getById(id, true);

      if (!fornecedor) {
        sendNotFound(res, 'Fornecedor não encontrado');
        return;
      }

      sendSuccess(res, fornecedor);
    } catch (error) {
      sendError(res, error, 'Erro ao buscar fornecedor', 500, true, {
        context: 'FornecedorController',
        action: 'show',
        fornecedorId: req.params.id
      });
    }
  }

  // Criar novo fornecedor
  static async store(req: Request, res: Response): Promise<void> {
    try {
      const { error, value } = fornecedorCreateSchema.validate(req.body);
      
      if (error) {
        const errors: Record<string, string[]> = {};
        error.details.forEach(detail => {
          const path = detail.path.join('.');
          if (!errors[path]) {
            errors[path] = [];
          }
          errors[path].push(detail.message);
        });
        sendValidationError(res, 'Dados inválidos', errors);
        return;
      }

      // Verificar se CPF/CNPJ já existe
      const fornecedorExistente = await FornecedorService.existsByCpfCnpj(value.cpf_cnpj);

      if (fornecedorExistente) {
        sendForbidden(res, 'Já existe um fornecedor cadastrado com este CPF/CNPJ');
        return;
      }

      const empresaId = getEmpresaIdOrNull(req);
      const fornecedor = await FornecedorService.create({ ...value, empresa_id: empresaId ?? null });

      // Registrar auditoria
      try {
        const empresaIdAudit = getEmpresaIdOrNull(req) ?? fornecedor.empresa_id ?? null;
        await registrarCriacao(
          req,
          'Fornecedor',
          fornecedor.id,
          fornecedor.toJSON() as Record<string, unknown>,
          undefined,
          empresaIdAudit
        );
      } catch (auditError) {
        // Não interromper o fluxo, mas logar o erro
      }

      sendSuccess(res, fornecedor, 'Fornecedor criado com sucesso', 201);
    } catch (error) {
      sendError(res, error, 'Erro ao criar fornecedor', 500, true, {
        context: 'FornecedorController',
        action: 'store',
        body: req.body
      });
    }
  }

  // Atualizar fornecedor
  static async update(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        sendValidationError(res, 'ID inválido');
        return;
      }

      const { error, value } = fornecedorUpdateSchema.validate(req.body);
      
      if (error) {
        const errors: Record<string, string[]> = {};
        error.details.forEach(detail => {
          const path = detail.path.join('.');
          if (!errors[path]) {
            errors[path] = [];
          }
          errors[path].push(detail.message);
        });
        sendValidationError(res, 'Dados inválidos', errors);
        return;
      }

      const fornecedor = await FornecedorService.getById(id, false);

      if (!fornecedor) {
        sendNotFound(res, 'Fornecedor não encontrado');
        return;
      }

      // Se CPF/CNPJ está sendo alterado, verificar se já existe
      if (value.cpf_cnpj && value.cpf_cnpj !== fornecedor.cpf_cnpj) {
        const fornecedorExistente = await FornecedorService.existsByCpfCnpj(value.cpf_cnpj, fornecedor.id);

        if (fornecedorExistente) {
          sendForbidden(res, 'Já existe um fornecedor cadastrado com este CPF/CNPJ');
          return;
        }
      }

      // Capturar dados anteriores para auditoria
      const dadosAnteriores = fornecedor.toJSON() as Record<string, unknown>;
      
      const fornecedorAtualizado = await FornecedorService.update(id, value);
      
      // Registrar auditoria
      const dadosNovos = fornecedorAtualizado.toJSON() as Record<string, unknown>;
      setAuditData(req, dadosAnteriores, dadosNovos);
      
      try {
        const empresaIdAudit = getEmpresaIdOrNull(req) ?? fornecedorAtualizado.empresa_id ?? null;
        await registrarAtualizacao(
          req,
          'Fornecedor',
          fornecedorAtualizado.id,
          dadosAnteriores,
          dadosNovos,
          undefined,
          empresaIdAudit
        );
      } catch (auditError) {
        // Não interromper o fluxo, mas logar o erro
      }

      sendSuccess(res, fornecedorAtualizado, 'Fornecedor atualizado com sucesso');
    } catch (error) {
      sendError(res, error, 'Erro ao atualizar fornecedor', 500, true, {
        context: 'FornecedorController',
        action: 'update',
        fornecedorId: req.params.id
      });
    }
  }

  // Deletar fornecedor
  static async destroy(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        sendValidationError(res, 'ID inválido');
        return;
      }

      const fornecedor = await FornecedorService.getById(id, false);

      if (!fornecedor) {
        sendNotFound(res, 'Fornecedor não encontrado');
        return;
      }

      // Verificar se há contas vinculadas
      const { ContaPagarService } = await import('../../../services/financeiro/ContaPagarService');
      const contasVinculadas = await ContaPagarService.count({ fornecedor_id: id });

      if (contasVinculadas > 0) {
        sendForbidden(res, `Existem ${contasVinculadas} conta(s) vinculada(s) a este fornecedor`);
        return;
      }

      // Capturar dados anteriores para auditoria
      const dadosAnteriores = fornecedor.toJSON() as Record<string, unknown>;
      
      await FornecedorService.delete(id);

      // Registrar auditoria
      try {
        const empresaIdAudit = getEmpresaIdOrNull(req) ?? fornecedor.empresa_id ?? null;
        await registrarExclusao(
          req,
          'Fornecedor',
          id,
          dadosAnteriores,
          undefined,
          empresaIdAudit
        );
      } catch (auditError) {
        // Não interromper o fluxo, mas logar o erro
      }

      sendSuccess(res, undefined, 'Fornecedor excluído com sucesso');
    } catch (error) {
      sendError(res, error, 'Erro ao excluir fornecedor', 500, true, {
        context: 'FornecedorController',
        action: 'destroy',
        fornecedorId: req.params.id
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
        sendValidationError(res, 'CNPJ deve ter 14 dígitos');
        return;
      }

      // Consultar na API ReceitaWS
      const response = await axios.get(`https://www.receitaws.com.br/v1/cnpj/${cnpjLimpo}`, {
        timeout: 10000
      });

      if (response.data.status === 'ERROR') {
        sendNotFound(res, response.data.message || 'CNPJ não encontrado na base da Receita Federal');
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

      sendSuccess(res, dadosEmpresa);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 429) {
          sendError(res, error, 'Muitas requisições. Tente novamente em alguns instantes.', 429, true, {
            context: 'FornecedorController',
            action: 'consultarCnpj',
            cnpj: req.params.cnpj
          });
          return;
        }
        
        if (error.response?.status === 404) {
          sendNotFound(res, 'CNPJ não encontrado na base da Receita Federal');
          return;
        }
      }

      sendError(res, error, 'Erro ao consultar CNPJ', 500, true, {
        context: 'FornecedorController',
        action: 'consultarCnpj',
        cnpj: req.params.cnpj
      });
    }
  }
}

