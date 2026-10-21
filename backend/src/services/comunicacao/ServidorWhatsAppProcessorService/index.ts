import type { comunicacao_servidores_whatsapp } from '@prisma/client';
import { ServidorWhatsAppService } from '../ServidorWhatsAppService';
import { ServidorWhatsAppValidatorService } from '../ServidorWhatsAppValidatorService';
import { logger } from '../../../utils/logger';
import type { AuthenticatedRequest } from '../../../types/auth';
import { registrarCriacao, registrarAtualizacao } from '../../sistema/AuditoriaService';
import { getEmpresaIdOrNull } from '../../../utils/tenantUtils';
import { pertenceComunicacaoEmpresa } from '../../../utils/comunicacaoEmpresaWhere';
import { aplicarFlagPadrao } from '../resolverServidorCobranca';

export interface ServidorWhatsAppData {
  descricao?: string | null;
  tipo_api?: 'evolution' | 'whatsapp_cloud';
  evolution_api_url?: string;
  evolution_api_key?: string;
  instance_name?: string;
  whatsapp_cloud_phone_number_id?: string;
  whatsapp_cloud_token?: string;
  webhook_url?: string | null;
  ativo?: boolean;
  [key: string]: unknown;
}

export class ServidorWhatsAppProcessorService {
  /**
   * Processa criação ou atualização de servidor
   */
  static async processCreateOrUpdate(
    servidorData: ServidorWhatsAppData,
    req: AuthenticatedRequest
  ): Promise<{ servidor: comunicacao_servidores_whatsapp; isNew: boolean }> {
    const empresaId = getEmpresaIdOrNull(req);
    const servidorId = Number(servidorData.id);
    if (Number.isFinite(servidorId) && servidorId > 0) {
      const servidor = await ServidorWhatsAppService.getById(servidorId);
      if (!servidor || !pertenceComunicacaoEmpresa(servidor.empresa_id, empresaId)) {
        throw new Error('Servidor de WhatsApp não encontrado');
      }
      return await this.processUpdate(servidor, servidorData, req);
    }

    return await this.processCreate(servidorData, req);
  }

  /**
   * Processa atualização de servidor existente
   */
  private static async processUpdate(
    servidor: comunicacao_servidores_whatsapp,
    servidorData: ServidorWhatsAppData,
    req: AuthenticatedRequest
  ): Promise<{ servidor: comunicacao_servidores_whatsapp; isNew: boolean }> {
    const tipoApi = servidorData.tipo_api || servidor.tipo_api || 'evolution';
    
    // Remover campos que não devem ser atualizados
    delete servidorData.ativo;
    
    // Validar e limpar dados baseado no tipo de API
    this.validateAndCleanData(servidorData, tipoApi, true);
    
    // Tratar webhook_url vazio como null
    if (servidorData.webhook_url && servidorData.webhook_url.trim() === '') {
      servidorData.webhook_url = null;
    }
    if (typeof servidorData.descricao === 'string' && servidorData.descricao.trim() === '') {
      servidorData.descricao = null;
    }

    const dadosAnteriores = { ...servidor };
    const servidorAtualizado = await ServidorWhatsAppService.updateInstance(
      servidor,
      servidorData as Partial<comunicacao_servidores_whatsapp>
    );
    
    try {
      const empresaIdAudit = getEmpresaIdOrNull(req) ?? (servidor as { empresa_id?: number | null }).empresa_id ?? null;
      await registrarAtualizacao(
        req,
        'ServidorWhatsApp',
        servidor.id,
        dadosAnteriores as unknown as Record<string, unknown>,
        { ...servidorAtualizado } as unknown as Record<string, unknown>,
        undefined,
        empresaIdAudit
      );
    } catch (auditError) {
      logger.warn('Erro ao registrar auditoria', { error: auditError });
    }
    
    return { servidor: servidorAtualizado, isNew: false };
  }

  /**
   * Processa criação de novo servidor
   */
  private static async processCreate(
    servidorData: ServidorWhatsAppData,
    req: AuthenticatedRequest
  ): Promise<{ servidor: comunicacao_servidores_whatsapp; isNew: boolean }> {
    const empresaId = getEmpresaIdOrNull(req);
    if (empresaId == null || empresaId <= 0) {
      throw new Error('Empresa não identificada para configurar servidor de WhatsApp');
    }

    const tipoApi = servidorData.tipo_api || 'evolution';
    
    // Validar dados
    const validation = ServidorWhatsAppValidatorService.validateServidorData(servidorData);
    if (!validation.valid) {
      throw new Error(validation.error || 'Dados inválidos');
    }

    servidorData.ativo = servidorData.ativo !== false;
    servidorData.padrao = await aplicarFlagPadrao(
      'comunicacao_servidores_whatsapp',
      empresaId,
      null,
      typeof servidorData.padrao === 'boolean' ? servidorData.padrao : undefined
    );
    servidorData.status_conexao = 'disconnected';
    servidorData.empresa_id = empresaId;
    
    // Tratar webhook_url vazio como null
    if (servidorData.webhook_url && servidorData.webhook_url.trim() === '') {
      servidorData.webhook_url = null;
    }
    if (typeof servidorData.descricao === 'string' && servidorData.descricao.trim() === '') {
      servidorData.descricao = null;
    }
    
    const criado = await ServidorWhatsAppService.create(servidorData as Partial<comunicacao_servidores_whatsapp>);
    const { evolution_api_key: _apiKey, whatsapp_cloud_token: _token, ...novoServidor } = criado;
    
    try {
      const empresaIdAudit = getEmpresaIdOrNull(req) ?? (novoServidor as { empresa_id?: number | null }).empresa_id ?? null;
      await registrarCriacao(
        req,
        'ServidorWhatsApp',
        novoServidor.id,
        { ...novoServidor } as unknown as Record<string, unknown>,
        undefined,
        empresaIdAudit
      );
    } catch (auditError) {
      logger.warn('Erro ao registrar auditoria', { error: auditError });
    }
    
    return { servidor: novoServidor as comunicacao_servidores_whatsapp, isNew: true };
  }

  /**
   * Valida e limpa dados baseado no tipo de API
   */
  private static validateAndCleanData(
    servidorData: ServidorWhatsAppData,
    tipoApi: string,
    isUpdate: boolean
  ): void {
    if (tipoApi === 'evolution') {
      if (!isUpdate && (!servidorData.evolution_api_url || !servidorData.instance_name)) {
        throw new Error('Para Evolution API: URL da Evolution API e nome da instância são obrigatórios');
      }
      if (isUpdate && servidorData.evolution_api_url && !servidorData.instance_name && !servidorData.evolution_api_key) {
        throw new Error('Para Evolution API: é necessário informar URL e nome da instância ou chave da API');
      }
      if (!servidorData.evolution_api_key || servidorData.evolution_api_key.trim() === '') {
        delete servidorData.evolution_api_key;
      }
    } else if (tipoApi === 'whatsapp_cloud') {
      if (!isUpdate && !servidorData.whatsapp_cloud_phone_number_id) {
        throw new Error('Para WhatsApp Cloud API: Phone Number ID é obrigatório');
      }
      if (!servidorData.whatsapp_cloud_token || servidorData.whatsapp_cloud_token.trim() === '') {
        delete servidorData.whatsapp_cloud_token;
      }
    }
  }
}
