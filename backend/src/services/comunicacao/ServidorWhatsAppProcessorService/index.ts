import { ServidorWhatsApp } from '../../../models/comunicacao/ServidorWhatsApp';
import { ServidorWhatsAppService } from '../ServidorWhatsAppService';
import { ServidorWhatsAppValidatorService } from '../ServidorWhatsAppValidatorService';
import { logger } from '../../../utils/logger';
import type { AuthenticatedRequest } from '../../../types/auth';
import { registrarCriacao, registrarAtualizacao } from '../../sistema/AuditoriaService';

export interface ServidorWhatsAppData {
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
  ): Promise<{ servidor: ServidorWhatsApp; isNew: boolean }> {
    // Buscar servidor existente
    const servidor = await ServidorWhatsAppService.findOne({ ativo: true });

    if (servidor) {
      return await this.processUpdate(servidor, servidorData, req);
    }

    return await this.processCreate(servidorData, req);
  }

  /**
   * Processa atualização de servidor existente
   */
  private static async processUpdate(
    servidor: ServidorWhatsApp,
    servidorData: ServidorWhatsAppData,
    req: AuthenticatedRequest
  ): Promise<{ servidor: ServidorWhatsApp; isNew: boolean }> {
    const tipoApi = servidorData.tipo_api || servidor.tipo_api || 'evolution';
    
    // Remover campos que não devem ser atualizados
    delete servidorData.ativo;
    
    // Validar e limpar dados baseado no tipo de API
    this.validateAndCleanData(servidorData, tipoApi, true);
    
    // Tratar webhook_url vazio como null
    if (servidorData.webhook_url && servidorData.webhook_url.trim() === '') {
      servidorData.webhook_url = null;
    }

    const dadosAnteriores = servidor.toJSON();
    await ServidorWhatsAppService.updateInstance(servidor, servidorData as Partial<ServidorWhatsApp>);
    
    try {
      await registrarAtualizacao(
        req,
        'ServidorWhatsApp',
        servidor.id,
        dadosAnteriores as unknown as Record<string, unknown>,
        servidor.toJSON() as unknown as Record<string, unknown>
      );
    } catch (auditError) {
      logger.warn('Erro ao registrar auditoria', { error: auditError });
    }
    
    return { servidor, isNew: false };
  }

  /**
   * Processa criação de novo servidor
   */
  private static async processCreate(
    servidorData: ServidorWhatsAppData,
    req: AuthenticatedRequest
  ): Promise<{ servidor: ServidorWhatsApp; isNew: boolean }> {
    const tipoApi = servidorData.tipo_api || 'evolution';
    
    // Validar dados
    const validation = ServidorWhatsAppValidatorService.validateServidorData(servidorData);
    if (!validation.valid) {
      throw new Error(validation.error || 'Dados inválidos');
    }

    // Garantir que nenhum outro servidor esteja ativo
    const servidorAtivoExistente = await ServidorWhatsAppService.findOne({ ativo: true });
    
    if (servidorAtivoExistente) {
      // Se encontrou um servidor ativo, atualizar ao invés de criar
      return await this.processUpdate(servidorAtivoExistente, servidorData, req);
    }

    // Desativar todos os outros servidores antes de criar um novo com ativo=true
    await ServidorWhatsAppService.updateBulk(
      { ativo: true },
      { ativo: false }
    );
    
    // Verificar novamente se ainda há algum servidor ativo (race condition)
    const servidorAindaAtivo = await ServidorWhatsAppService.findOne({ ativo: true });
    if (servidorAindaAtivo) {
      await servidorAindaAtivo.update({ ativo: false });
    }
    
    servidorData.ativo = true;
    servidorData.status_conexao = 'disconnected';
    
    // Tratar webhook_url vazio como null
    if (servidorData.webhook_url && servidorData.webhook_url.trim() === '') {
      servidorData.webhook_url = null;
    }
    
    const novoServidor = await ServidorWhatsAppService.create(servidorData as Partial<ServidorWhatsApp>);
    
    // Recarregar sem os tokens
    await novoServidor.reload({
      attributes: {
        exclude: ['evolution_api_key', 'whatsapp_cloud_token'],
      },
    });
    
    try {
      await registrarCriacao(
        req,
        'ServidorWhatsApp',
        novoServidor.id,
        novoServidor.toJSON() as unknown as Record<string, unknown>
      );
    } catch (auditError) {
      logger.warn('Erro ao registrar auditoria', { error: auditError });
    }
    
    return { servidor: novoServidor, isNew: true };
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
