import { Request, Response } from 'express';
import crypto from 'crypto';
import { logger } from '../utils/logger';

interface FlowPayload {
  version: string;
  screen: string;
  data?: Record<string, string | number | boolean | null>;
  token?: string;
}

export class WhatsAppFlowController {
  /**
   * Descriptografar payload recebido do WhatsApp Flow
   */
  private static decryptPayload(encryptedPayload: string, cryptoKey: string): string {
    try {
      // Decodificar base64
      const encryptedBuffer = Buffer.from(encryptedPayload, 'base64');
      
      // Primeiros 16 bytes são o IV
      const iv = encryptedBuffer.subarray(0, 16);
      
      // Resto é o texto criptografado
      const encryptedData = encryptedBuffer.subarray(16);
      
      // Criar hash SHA-256 da chave para garantir 32 bytes
      const key = crypto.createHash('sha256').update(cryptoKey).digest();
      
      // Criar decifrador
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      
      // Descriptografar
      let decrypted = decipher.update(encryptedData);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      
      return decrypted.toString('utf8');
    } catch (error) {
      logger.error('Erro ao descriptografar payload:', error);
      throw error;
    }
  }

  /**
   * Criptografar resposta do Flow
   */
  private static encryptResponse(response: string, cryptoKey: string): string {
    try {
      // Gerar IV aleatório de 16 bytes
      const iv = crypto.randomBytes(16);
      
      // Criar hash SHA-256 da chave para garantir 32 bytes
      const key = crypto.createHash('sha256').update(cryptoKey).digest();
      
      // Criar cifrador
      const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
      
      // Criptografar
      let encrypted = cipher.update(response, 'utf8', 'base64');
      encrypted += cipher.final('base64');
      
      // Concatenar IV e dados criptografados
      const ivAndEncrypted = Buffer.concat([
        iv,
        Buffer.from(encrypted, 'base64')
      ]);
      
      // Retornar em base64
      return ivAndEncrypted.toString('base64');
    } catch (error) {
      logger.error('Erro ao criptografar resposta:', error);
      throw error;
    }
  }

  /**
   * Endpoint para WhatsApp Flow que retorna JSON criptografado em base64
   */
  static async handleFlow(req: Request, res: Response): Promise<void> {
    try {
      // Buscar chave AES do header
      const cryptoKey = req.headers['crypto-key'] as string;
      
      if (!cryptoKey) {
        logger.warn('WhatsApp Flow request sem crypto-key header');
        res.status(400).send('crypto-key header ausente');
        return;
      }
      
      // Receber payload criptografado (string base64)
      const encryptedPayload: string = req.body;
      
      if (!encryptedPayload) {
        logger.warn('WhatsApp Flow request sem payload');
        res.status(400).send('Payload ausente');
        return;
      }

      logger.info('WhatsApp Flow request recebido:', { 
        hasCryptoKey: !!cryptoKey,
        payloadLength: encryptedPayload.length
      });

      // Descriptografar payload
      const decryptedJson = WhatsAppFlowController.decryptPayload(encryptedPayload, cryptoKey);
      const payload: FlowPayload = JSON.parse(decryptedJson);
      
      logger.info('WhatsApp Flow payload descriptografado:', { 
        version: payload.version,
        screen: payload.screen,
        hasData: !!payload.data
      });

      // Criar a resposta do Flow
      const flowResponse = {
        screen: 'SCREEN_NAME',
        data: {},
        error: null
      };

      // Processar baseado no screen atual
      if (payload.screen === 'SCREEN_NAME') {
        // Implementar lógica do flow aqui
        flowResponse.screen = 'END_SCREEN';
        flowResponse.data = {
          message: 'Flow processado com sucesso'
        };
      }

      // Converter para JSON
      const jsonResponse = JSON.stringify(flowResponse);
      
      // Criptografar resposta
      const encryptedResponse = WhatsAppFlowController.encryptResponse(jsonResponse, cryptoKey);

      // Log para debug
      logger.info('WhatsApp Flow response gerado:', {
        screen: flowResponse.screen,
        responseLength: encryptedResponse.length
      });

      // Retornar criptografado em base64
      res.status(200).send(encryptedResponse);

    } catch (error) {
      logger.error('Erro ao processar WhatsApp Flow:', error);
      
      // Tentar retornar erro criptografado se temos a chave
      try {
        const cryptoKey = req.headers['crypto-key'] as string;
        if (cryptoKey) {
          const errorResponse = {
            screen: 'ERROR_SCREEN',
            data: {},
            error: 'Erro ao processar flow'
          };
          
          const jsonResponse = JSON.stringify(errorResponse);
          const encryptedResponse = WhatsAppFlowController.encryptResponse(jsonResponse, cryptoKey);
          res.status(500).send(encryptedResponse);
          return;
        }
      } catch (encryptError) {
        logger.error('Erro ao criptografar resposta de erro:', encryptError);
      }
      
      res.status(500).send('Erro ao processar flow');
    }
  }

  /**
   * Endpoint de teste para verificar funcionamento com criptografia
   */
  static async test(_req: Request, res: Response): Promise<void> {
    try {
      // Criar resposta de teste
      const testResponse = {
        screen: 'TEST_SCREEN',
        data: {
          message: 'Endpoint funcionando corretamente',
          timestamp: new Date().toISOString(),
          test: true
        },
        error: null
      };

      // Converter para JSON
      const jsonResponse = JSON.stringify(testResponse);
      
      // Testar com chave de teste
      const testKey = 'test-key-for-encryption-32bytes';
      const encryptedResponse = WhatsAppFlowController.encryptResponse(jsonResponse, testKey);

      res.json({
        success: true,
        message: 'WhatsApp Flow endpoint funcionando',
        encryptedBase64: encryptedResponse,
        json: testResponse,
        timestamp: new Date().toISOString(),
        note: 'Resposta está criptografada com AES-256-CBC'
      });

    } catch (error) {
      logger.error('Erro ao testar WhatsApp Flow:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao processar teste'
      });
    }
  }
}

