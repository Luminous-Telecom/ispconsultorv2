import { Request, Response } from 'express';
import { Banco } from '../../../models/cadastros/Banco';
import { BancoApiService } from '../../../services/bancos/BancoApiService';
import { BancoService } from '../../../services/cadastros/BancoService';
import { logger } from '../../../utils/logger';
import { ValidationError } from 'sequelize';
import { randomBytes } from 'crypto';
import { registrarCriacao, registrarAtualizacao, registrarExclusao } from '../../../services/sistema/AuditoriaService/index';
import { setAuditData } from '../../../middleware/auditMiddleware';
import { sendSuccess, sendError, sendNotFound, sendValidationError, sendForbidden } from '../../../utils/responseUtils';
import { getEmpresaIdOrNull } from '../../../utils/tenantUtils';

export class BancoController {
  /**
   * Listar bancos com filtros
   */
  /** Remove campos sensíveis de um objeto banco antes de enviá-lo ao frontend */
  private static maskSensitiveFields(banco: Record<string, unknown>): Record<string, unknown> {
    const masked = { ...banco };
    masked.has_api_key = !!masked.api_key;
    delete masked.api_key;
    masked.has_api_secret = !!masked.api_secret;
    delete masked.api_secret;
    return masked;
  }

  static async findAtivos(req: Request, res: Response): Promise<void> {
    try {
      const empresaId = getEmpresaIdOrNull(req);
      const result = await BancoService.findAtivos(empresaId ?? undefined);
      const maskedData = result.data.map(b => BancoController.maskSensitiveFields(b.toJSON() as Record<string, unknown>));
      sendSuccess(res, { ...result, data: maskedData });
    } catch (error: unknown) {
      sendError(res, error, 'Erro ao buscar bancos ativos', 500, true);
    }
  }

  static async list(req: Request, res: Response): Promise<void> {
    try {
      const { search, status, tipo_banco, page = 1, limit = 15, sortColumn, sortDirection } = req.query;
      
      const empresaId = getEmpresaIdOrNull(req);

      const result = await BancoService.list({
        search: search as string | undefined,
        status: status as string | undefined,
        tipo_banco: tipo_banco as string | undefined,
        page: Number(page),
        limit: Number(limit),
        sortColumn: sortColumn as string | undefined,
        sortDirection: sortDirection as string | undefined,
        empresa_id: empresaId ?? undefined,
      });
      
      const maskedData = result.data.map(b => BancoController.maskSensitiveFields(b.toJSON ? (b.toJSON() as Record<string, unknown>) : (b as unknown as Record<string, unknown>)));
      sendSuccess(res, { ...result, data: maskedData });
    } catch (error: unknown) {
      sendError(res, error, 'Erro ao listar bancos', 500, true);
    }
  }

  /**
   * Buscar banco por ID
   */
  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const banco = await BancoService.getById(id);
      
      if (!banco) {
        sendNotFound(res, 'Banco não encontrado');
        return;
      }
      
      sendSuccess(res, BancoController.maskSensitiveFields(banco.toJSON() as Record<string, unknown>));
    } catch (error: unknown) {
      sendError(res, error, 'Erro ao buscar banco', 500, true, {
        banco_id: req.params.id
      });
    }
  }

  /**
   * Criar novo banco
   */
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const dadosBanco = req.body;
      
      // Validações básicas
      if (!dadosBanco.nome) {
        sendValidationError(res, 'Nome do banco é obrigatório');
        return;
      }
      
      if (!dadosBanco.tipo_banco) {
        sendValidationError(res, 'Tipo do banco é obrigatório');
        return;
      }
      
      // Verificar se já existe banco com mesmo nome
      const bancoExistente = await BancoService.existsByName(dadosBanco.nome);
      
      if (bancoExistente) {
        sendValidationError(res, 'Já existe um banco com este nome');
        return;
      }
      
      const empresaId = getEmpresaIdOrNull(req);
      const banco = await BancoService.create({ ...dadosBanco, empresa_id: empresaId ?? null });
      
      // Registrar auditoria
      try {
        const empresaIdAudit = getEmpresaIdOrNull(req) ?? banco.empresa_id ?? null;
        await registrarCriacao(
          req,
          'Banco',
          banco.id,
          banco.toJSON() as Record<string, unknown>,
          undefined,
          empresaIdAudit
        );
      } catch (auditError) {
        // Não interromper o fluxo
      }
      
      logger.info('Banco criado com sucesso', {
        banco_id: banco.id,
        nome: banco.nome,
        tipo_banco: banco.tipo_banco
      });
      
      sendSuccess(res, banco, 'Banco cadastrado com sucesso!', 201);
    } catch (error: unknown) {
      // Capturar erros de validação do Sequelize
      if (error instanceof ValidationError) {
        const errorMessages = error.errors.map(err => err.message);
        sendValidationError(res, errorMessages.join(', '));
        return;
      }
      
      sendError(res, error, 'Erro ao criar banco', 500, true, {
        body: req.body
      });
    }
  }

  /**
   * Atualizar banco
   */
  static async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const dadosBanco = req.body;
      
      logger.info('Atualizando banco - dados recebidos', {
        banco_id: id,
        has_client_id_producao: !!dadosBanco.client_id_producao,
        has_client_secret_producao: !!dadosBanco.client_secret_producao,
        client_id_length: dadosBanco.client_id_producao?.length || 0,
        client_secret_length: dadosBanco.client_secret_producao?.length || 0
      });
      
      const banco = await BancoService.getById(id);
      
      if (!banco) {
        sendNotFound(res, 'Banco não encontrado');
        return;
      }
      
      // Capturar dados anteriores para auditoria
      const dadosAnteriores = banco.toJSON() as Record<string, unknown>;
      
      // Verificar se já existe outro banco com mesmo nome
      if (dadosBanco.nome && dadosBanco.nome !== banco.nome) {
        const bancoExistente = await BancoService.existsByName(dadosBanco.nome, banco.id);
        
        if (bancoExistente) {
          sendValidationError(res, 'Já existe um banco com este nome');
          return;
        }
      }
      
      // Preparar dados para atualização
      // Remover campos sensíveis que não foram enviados para não sobrescrever valores existentes
      const dadosParaAtualizar: Record<string, unknown> = { ...dadosBanco };
      
      // Campos sensíveis que devem ser preservados se não enviados
      const camposSensiveis = [
        'api_key',
        'api_secret',
        'client_id_producao',
        'client_secret_producao',
        'webhook_secret'
      ];
      
      // Preservar também identificador_conta que pode ser sensível
      if (!('identificador_conta' in dadosBanco) || dadosBanco.identificador_conta === null || dadosBanco.identificador_conta === '') {
        delete dadosParaAtualizar.identificador_conta;
      }
      
      // Se um campo sensível não foi enviado no body, manter o valor atual
      for (const campo of camposSensiveis) {
        // Se o campo não está presente no body (undefined), não incluir na atualização
        // Isso preserva o valor existente no banco
        if (!(campo in dadosBanco)) {
          delete dadosParaAtualizar[campo];
        } else if (dadosBanco[campo] === null || dadosBanco[campo] === '') {
          // Se o campo foi enviado como null ou string vazia, também remover para preservar
          delete dadosParaAtualizar[campo];
        }
      }
      
      // Remover campos auxiliares que não devem ser salvos
      delete dadosParaAtualizar.has_api_key;
      delete dadosParaAtualizar.has_api_secret;
      delete dadosParaAtualizar.has_client_secret_producao;
      
      const bancoAtualizado = await BancoService.update(id, dadosParaAtualizar);
      
      // Registrar auditoria
      const dadosNovos = bancoAtualizado.toJSON() as Record<string, unknown>;
      
      // Disponibilizar dados para o middleware
      setAuditData(req, dadosAnteriores, dadosNovos);
      
      try {
        const empresaIdAudit = getEmpresaIdOrNull(req) ?? bancoAtualizado.empresa_id ?? null;
        await registrarAtualizacao(
          req,
          'Banco',
          bancoAtualizado.id,
          dadosAnteriores,
          dadosNovos,
          undefined,
          empresaIdAudit
        );
      } catch (auditError) {
        // Não interromper o fluxo
      }
      
      logger.info('Banco atualizado com sucesso', {
        banco_id: bancoAtualizado.id,
        nome: bancoAtualizado.nome,
        tipo_banco: bancoAtualizado.tipo_banco,
        has_client_id_after: !!bancoAtualizado.client_id_producao,
        has_client_secret_after: !!bancoAtualizado.client_secret_producao
      });
      
      sendSuccess(res, bancoAtualizado, 'Banco atualizado com sucesso!');
    } catch (error: unknown) {
      // Capturar erros de validação do Sequelize
      if (error instanceof ValidationError) {
        const errorMessages = error.errors.map(err => err.message);
        sendValidationError(res, errorMessages.join(', '));
        return;
      }
      
      sendError(res, error, 'Erro ao atualizar banco', 500, true, {
        banco_id: req.params.id,
        body: req.body
      });
    }
  }

  /**
   * Deletar banco
   */
  static async destroy(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      // Buscar banco antes de deletar para auditoria
      const banco = await BancoService.getById(id);
      
      if (!banco) {
        sendNotFound(res, 'Banco não encontrado');
        return;
      }
      
      // Capturar dados anteriores para auditoria
      const dadosAnteriores = banco.toJSON() as Record<string, unknown>;
      
      try {
        await BancoService.delete(id);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        if (errorMessage.includes('títulos associados')) {
          sendForbidden(res, 'Não é possível excluir banco com títulos associados.');
          return;
        }
        throw error;
      }
      
      // Registrar auditoria
      try {
        const empresaIdAudit = getEmpresaIdOrNull(req) ?? banco.empresa_id ?? null;
        await registrarExclusao(
          req,
          'Banco',
          banco.id,
          dadosAnteriores,
          undefined,
          empresaIdAudit
        );
      } catch (auditError) {
        // Não interromper o fluxo
      }
      
      logger.info('Banco excluído com sucesso', {
        banco_id: id,
        nome: banco.nome
      });
      
      sendSuccess(res, undefined, 'Banco excluído com sucesso!');
    } catch (error: unknown) {
      sendError(res, error, 'Erro ao deletar banco', 500, true, {
        banco_id: req.params.id
      });
    }
  }

  /**
   * Testar conexão com a API do banco
   */
  static async testarConexao(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const banco = await BancoService.getById(id);
      
      if (!banco) {
        sendNotFound(res, 'Banco não encontrado');
        return;
      }
      
      logger.info('Testando conexão com banco', {
        banco_id: banco.id,
        nome: banco.nome,
        tipo_banco: banco.tipo_banco,
        has_client_id: !!banco.client_id_producao,
        has_client_secret: !!banco.client_secret_producao
      });
      
      const resultado = await BancoApiService.testarAutenticacao(banco);
      
      if (resultado.success) {
        sendSuccess(res, undefined, resultado.message || 'Conexão com a API do banco realizada com sucesso!');
      } else {
        sendError(res, new Error(resultado.message || 'Falha na conexão'), resultado.message || 'Falha na conexão', 400, false);
      }
    } catch (error: unknown) {
      sendError(res, error, 'Erro ao testar conexão', 500, true, {
        banco_id: req.params.id
      });
    }
  }

  /**
   * Buscar dados da conta via API
   */
  static async buscarDadosApi(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const banco = await BancoService.getById(id);
      
      if (!banco) {
        sendNotFound(res, 'Banco não encontrado');
        return;
      }
      
      // EFI Bank não fornece dados da conta via API pública
      // Retornar mensagem explicativa
      sendSuccess(res, null, 'Busca automática de dados não disponível para este banco. Configure manualmente.', 200);
    } catch (error: unknown) {
      sendError(res, error, 'Erro ao buscar dados da API', 500, true, {
        banco_id: req.params.id
      });
    }
  }

  static async gerarWebhookSecret(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const banco = await BancoService.getById(id);

      if (!banco) {
        sendNotFound(res, 'Banco não encontrado');
        return;
      }

      if (banco.tipo_banco !== 'asaas') {
        sendValidationError(res, 'Webhook secret disponível apenas para bancos do tipo Asaas');
        return;
      }

      const dadosAnteriores = banco.toJSON() as Record<string, unknown>;
      const novoSecret = randomBytes(32).toString('hex');
      const bancoAtualizado = await BancoService.update(id, { webhook_secret: novoSecret });

      try {
        const empresaIdAudit = getEmpresaIdOrNull(req) ?? bancoAtualizado.empresa_id ?? null;
        await registrarAtualizacao(
          req,
          'Banco',
          banco.id,
          { ...dadosAnteriores, webhook_secret: '[REDACTED]' },
          { ...bancoAtualizado.toJSON(), webhook_secret: '[REDACTED]' } as Record<string, unknown>,
          'Webhook secret regenerado',
          empresaIdAudit
        );
      } catch (auditError) {
        // Não interromper o fluxo
      }

      logger.info('Webhook secret Asaas gerado manualmente', {
        banco_id: banco.id
      });

      sendSuccess(res, {
        webhook_secret: novoSecret
      }, 'Webhook secret gerado com sucesso');
    } catch (error: unknown) {
      sendError(res, error, 'Erro ao gerar webhook secret', 500, true, {
        banco_id: req.params.id
      });
    }
  }

  /**
   * Buscar URL padrão para tipo de banco
   */
  static async urlPadrao(req: Request, res: Response): Promise<void> {
    try {
      const { tipoBanco } = req.params;
      
      // Importar configuração do banco
      const configPath = `../config/bancos/${tipoBanco}`;
      
      try {
        const config = await import(configPath);
        
        if (!config || !config.default) {
          sendNotFound(res, 'Configurações do banco não encontradas');
          return;
        }
        
        const bancoConfig = config.default;
        const url = bancoConfig.api_url || null;
        
        sendSuccess(res, { url });
      } catch {
        sendNotFound(res, 'Configurações do banco não encontradas');
      }
    } catch (error: unknown) {
      sendError(res, error, 'Erro ao buscar URL padrão', 500, true, {
        tipo_banco: req.params.tipoBanco
      });
    }
  }
}