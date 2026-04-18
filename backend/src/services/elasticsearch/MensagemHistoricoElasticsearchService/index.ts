/**
 * Serviço de Auditoria para Histórico de Mensagens no Elasticsearch
 * Registra histórico de mensagens enviadas (email/WhatsApp)
 *
 * @module services/elasticsearch/MensagemHistoricoElasticsearchService
 */
import { Request } from 'express';
import { JwtPayload } from 'jsonwebtoken';
import { AuthenticatedRequest } from '../../../types/auth';
import { getElasticsearchService } from '../ElasticsearchService';
import { ES_DATA_STREAM } from '../dataStreams';
import { elasticsearchEventTimestamps } from '../elasticsearchTimestamps';
import { logger } from '../../../utils/logger';

interface DadosMensagemElasticsearch {
  tipo: 'email' | 'whatsapp';
  destinatario: string;
  titulo?: string;
  mensagem: string;
  status: 'enviada' | 'erro';
  erro_mensagem?: string;
  entidade_tipo?: string;
  entidade_id?: number;
  servidor_id?: number;
}

/**
 * Obter IP do cliente da requisição
 */
function getClientIp(req: Request | null): string | null {
  if (!req || !req.headers) return null;
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    (req.headers['x-real-ip'] as string) ||
    req.socket?.remoteAddress ||
    null
  );
}

/**
 * Obter User Agent da requisição
 */
function getUserAgent(req: Request | null): string | null {
  if (!req || !req.headers) return null;
  return req.headers['user-agent'] || null;
}

/**
 * Obter dados do usuário autenticado
 */
function getUserData(req: Request | AuthenticatedRequest | null): {
  id: number | null;
  nome: string | null;
  email: string | null;
} {
  if (!req) {
    return { id: null, nome: null, email: null };
  }

  // Verificar se é AuthenticatedRequest e tem user
  const authenticatedReq = req as AuthenticatedRequest;
  const userPayload = authenticatedReq.user as JwtPayload | undefined;

  if (!userPayload) {
    return { id: null, nome: null, email: null };
  }

  // O payload JWT contém sub (userId), email e role
  const userId = userPayload.sub ? parseInt(userPayload.sub, 10) : null;
  const email = typeof userPayload.email === 'string' ? userPayload.email : null;
  const nome = typeof userPayload.nome === 'string' ? userPayload.nome : null;

  return {
    id: userId,
    nome,
    email
  };
}

/**
 * Registrar mensagem enviada no Elasticsearch
 * Não lança erro se falhar para não interromper o fluxo principal
 */
export async function registrarMensagemElasticsearch(
  req: Request | AuthenticatedRequest | null,
  dados: DadosMensagemElasticsearch
): Promise<void> {
  // Executar de forma assíncrona sem bloquear
  setImmediate(async () => {
    try {
      const elasticsearchService = getElasticsearchService();
      const client = elasticsearchService.getClient();

      if (!client) {
        // Cliente Elasticsearch não disponível
        logger.warn('Cliente Elasticsearch não disponível para registro de mensagem', {
          context: 'MensagemHistoricoElasticsearchService',
          action: 'registrarMensagemElasticsearch',
          tipo: dados.tipo,
          destinatario: dados.destinatario,
          status: dados.status
        });
        return;
      }

      // Verificar conexão
      const isConnected = await elasticsearchService.checkConnection();

      if (!isConnected) {
        // Elasticsearch não disponível
        logger.warn('Elasticsearch não disponível para registro de mensagem', {
          context: 'MensagemHistoricoElasticsearchService',
          action: 'registrarMensagemElasticsearch',
          tipo: dados.tipo,
          destinatario: dados.destinatario,
          status: dados.status
        });
        return;
      }

      // Obter dados do usuário
      const userData = getUserData(req || null);

      const document = {
        log_tipo: 'mensagem',
        tipo_mensagem: dados.tipo,
        destinatario: dados.destinatario,
        titulo: dados.titulo || null,
        mensagem: dados.mensagem,
        status: dados.status,
        erro_mensagem: dados.erro_mensagem || null,
        entidade_tipo: dados.entidade_tipo || null,
        entidade_id: dados.entidade_id || null,
        servidor_id: dados.servidor_id || null,
        usuario_id: userData.id,
        usuario_nome: userData.nome,
        usuario_email: userData.email,
        ip_address: getClientIp(req || null),
        user_agent: getUserAgent(req || null),
        ...elasticsearchEventTimestamps(new Date())
      };

      // Validar se o documento pode ser serializado antes de enviar
      try {
        const documentString = JSON.stringify(document);
      } catch (serializeError) {
        logger.warn('Documento de mensagem não pode ser serializado para Elasticsearch', {
          context: 'MensagemHistoricoElasticsearchService',
          tipo: dados.tipo,
          destinatario: dados.destinatario,
          status: dados.status,
          error: serializeError instanceof Error ? serializeError.message : 'Erro desconhecido',
          stack: serializeError instanceof Error ? serializeError.stack : undefined
        });
        return;
      }

      // Indexar documento no Elasticsearch
      const result = await client.index({
        index: ES_DATA_STREAM.MENSAGENS,
        document
      });

      logger.info('Mensagem registrada no Elasticsearch', {
        context: 'MensagemHistoricoElasticsearchService',
        tipo: dados.tipo,
        destinatario: dados.destinatario,
        status: dados.status,
        entidade_tipo: dados.entidade_tipo,
        entidade_id: dados.entidade_id,
        document_id: result._id,
        index: ES_DATA_STREAM.MENSAGENS
      });
    } catch (error) {
      // Não lançar erro para não interromper o fluxo principal
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;

      console.error('=== ERRO AO REGISTRAR MENSAGEM NO ELASTICSEARCH ===');
      console.error('Tipo:', dados.tipo);
      console.error('Destinatário:', dados.destinatario);
      console.error('Status:', dados.status);
      console.error('Mensagem do erro:', errorMessage);
      console.error('Nome do erro:', error instanceof Error ? error.name : 'Unknown');
      console.error('Stack:', errorStack);

      // Log como warning em vez de error, já que não é crítico
      logger.warn('Falha ao registrar mensagem no Elasticsearch (não crítico)', {
        context: 'MensagemHistoricoElasticsearchService',
        action: 'registrarMensagemElasticsearch',
        error: errorMessage,
        stack: errorStack,
        dados: {
          tipo: dados.tipo,
          destinatario: dados.destinatario,
          status: dados.status,
          entidade_tipo: dados.entidade_tipo,
          entidade_id: dados.entidade_id
        }
      });
    }
  });
}