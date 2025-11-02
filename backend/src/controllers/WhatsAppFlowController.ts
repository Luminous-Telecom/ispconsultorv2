import { Request, Response } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';

interface FlowPayload {
  version: string;
  screen: string;
  data?: Record<string, string | number | boolean | null>;
  token?: string;
}

interface WhatsAppFlowRequest {
  encrypted_aes_key: string;  // Chave AES criptografada com RSA (base64)
  encrypted_flow_data: string; // Dados do flow criptografados (base64)
  initial_vector: string;      // IV para descriptografia AES (base64)
}

export class WhatsAppFlowController {
  /**
   * Descriptografar chave AES usando chave privada RSA
   */
  private static decryptAESKeyWithRSA(encryptedAESKey: string, privateKey: string): Buffer {
    try {
      const encryptedBuffer = Buffer.from(encryptedAESKey, 'base64');
      const decrypted = crypto.privateDecrypt(
        {
          key: privateKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256'
        },
        encryptedBuffer
      );
      return decrypted;
    } catch (error) {
      logger.error('Erro ao descriptografar chave AES com RSA:', error);
      throw error;
    }
  }

  /**
   * Criptografar resposta com AES usando chave e IV fornecidos
   */
  private static encryptWithAES(data: string, aesKey: Buffer, iv: Buffer): string {
    try {
      const cipher = crypto.createCipheriv('aes-128-cbc', aesKey, iv);
      let encrypted = cipher.update(data, 'utf8', 'base64');
      encrypted += cipher.final('base64');
      return encrypted;
    } catch (error) {
      logger.error('Erro ao criptografar com AES:', error);
      throw error;
    }
  }

  /**
   * Descriptografar dados com AES usando chave e IV fornecidos
   */
  private static decryptWithAES(encryptedData: string, aesKey: Buffer, iv: Buffer): string {
    try {
      const encryptedBuffer = Buffer.from(encryptedData, 'base64');
      const decipher = crypto.createDecipheriv('aes-128-cbc', aesKey, iv);
      let decrypted = decipher.update(encryptedBuffer);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      return decrypted.toString('utf8');
    } catch (error) {
      logger.error('Erro ao descriptografar com AES:', error);
      throw error;
    }
  }

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
      // Log todos os headers recebidos para debug
      logger.info('WhatsApp Flow headers recebidos:', req.headers);
      
      // Log do body completo para debug
      logger.info('WhatsApp Flow body recebido:', { 
        type: typeof req.body,
        body: req.body
      });
      
      // Verificar se é formato WhatsApp Flow (RSA + AES)
      const whatsappPayload = req.body as WhatsAppFlowRequest;
      if (whatsappPayload?.encrypted_aes_key && whatsappPayload?.encrypted_flow_data && whatsappPayload?.initial_vector) {
        logger.info('Detectado formato WhatsApp Flow com RSA + AES');
        
        // Buscar chave privada RSA das variáveis de ambiente ou arquivo
        let rsaPrivateKey = process.env.WHATSAPP_FLOW_RSA_PRIVATE_KEY;
        if (!rsaPrivateKey) {
          // Tentar ler de arquivo
          const keyPath = path.join(process.cwd(), '.rsa_private_key.pem');
          try {
            rsaPrivateKey = fs.readFileSync(keyPath, 'utf8');
            logger.info('Chave RSA carregada de arquivo:', keyPath);
          } catch (error) {
            logger.error('WHATSAPP_FLOW_RSA_PRIVATE_KEY não configurada nem encontrada em arquivo:', error);
            logger.error('Tentativa de ler arquivo de:', keyPath);
            res.status(500).send('Configuração de criptografia ausente');
            return;
          }
        } else if (rsaPrivateKey.includes('\\n')) {
          // Converter \n para quebras de linha reais
          rsaPrivateKey = rsaPrivateKey.replace(/\\n/g, '\n');
          logger.info('Chave RSA carregada de variável de ambiente (com conversão de \\n)');
        } else {
          logger.info('Chave RSA carregada de variável de ambiente');
        }

        // Descriptografar chave AES com RSA
        const aesKey = WhatsAppFlowController.decryptAESKeyWithRSA(
          whatsappPayload.encrypted_aes_key,
          rsaPrivateKey
        );
        
        logger.info('Chave AES descriptografada:', {
          length: aesKey.length,
          firstBytes: aesKey.subarray(0, 8).toString('hex')
        });
        
        // Decodificar IV
        const iv = Buffer.from(whatsappPayload.initial_vector, 'base64');
        
        logger.info('IV decodificado:', {
          length: iv.length,
          firstBytes: iv.subarray(0, 8).toString('hex')
        });
        
        // Descriptografar dados do flow
        const decryptedData = WhatsAppFlowController.decryptWithAES(
          whatsappPayload.encrypted_flow_data,
          aesKey,
          iv
        );
        
        const payload: FlowPayload = JSON.parse(decryptedData);
        
        logger.info('WhatsApp Flow payload descriptografado:', { 
          version: payload.version,
          screen: payload.screen,
          hasData: !!payload.data
        });

        // Processar o flow
        const flowResponse = {
          screen: 'SCREEN_NAME',
          data: {},
          error: null
        };

        if (payload.screen === 'SCREEN_NAME') {
          flowResponse.screen = 'END_SCREEN';
          flowResponse.data = {
            message: 'Flow processado com sucesso'
          };
        }

        // Converter para JSON
        const jsonResponse = JSON.stringify(flowResponse);
        
        // Criptografar resposta usando a mesma chave AES
        const encryptedResponse = WhatsAppFlowController.encryptWithAES(jsonResponse, aesKey, iv);

        logger.info('WhatsApp Flow response criptografado gerado:', {
          screen: flowResponse.screen,
          responseLength: encryptedResponse.length
        });

        // Retornar resposta criptografada
        res.status(200).send(encryptedResponse);
        return;
      }
      
      // Fallback: formato antigo (sem RSA)
      logger.info('Usando formato legado (sem RSA)');
      
      // Buscar chave AES do header (tentar múltiplas variações)
      const cryptoKey = (req.headers['crypto-key'] || 
                        req.headers['cryptokey'] || 
                        req.headers['Crypto-Key'] ||
                        req.headers['CryptoKey']) as string;
      
      // Receber payload (pode ser string base64 ou objeto JSON)
      let encryptedPayload = '';
      let payload: FlowPayload | undefined = undefined;
      
      if (typeof req.body === 'string') {
        encryptedPayload = req.body;
      } else if (typeof req.body === 'object' && req.body !== null) {
        // Se recebeu objeto JSON direto, não precisa descriptografar
        payload = req.body as FlowPayload;
      } else {
        logger.warn('WhatsApp Flow request com payload inválido');
        res.status(400).send('Payload inválido');
        return;
      }

      logger.info('WhatsApp Flow request processado:', { 
        hasCryptoKey: !!cryptoKey,
        payloadType: typeof req.body,
        payloadLength: encryptedPayload?.length || 0
      });

      // Se temos chave criptográfica e payload criptografado, descriptografar
      if (cryptoKey && encryptedPayload) {
        try {
          const decryptedJson = WhatsAppFlowController.decryptPayload(encryptedPayload, cryptoKey);
          const decryptedPayload: FlowPayload = JSON.parse(decryptedJson);
          payload = decryptedPayload;
          
          logger.info('WhatsApp Flow payload descriptografado:', { 
            version: decryptedPayload.version,
            screen: decryptedPayload.screen,
            hasData: !!decryptedPayload.data
          });
        } catch (decryptError) {
          logger.error('Erro ao descriptografar payload:', decryptError);
          res.status(400).send('Falha ao descriptografar payload');
          return;
        }
      } else if (!payload) {
        logger.warn('WhatsApp Flow request sem criptografia e sem payload JSON válido');
        res.status(400).send('Payload ausente ou inválido');
        return;
      }

      // Validar que temos o payload
      if (!payload) {
        logger.warn('WhatsApp Flow payload não foi processado corretamente');
        res.status(400).send('Payload não processado');
        return;
      }

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
      
      // Se temos chave criptográfica, criptografar resposta
      let finalResponse: string;
      if (cryptoKey) {
        finalResponse = WhatsAppFlowController.encryptResponse(jsonResponse, cryptoKey);
        logger.info('WhatsApp Flow response criptografado gerado:', {
          screen: flowResponse.screen,
          responseLength: finalResponse.length
        });
      } else {
        // Sem criptografia, retornar apenas base64
        finalResponse = Buffer.from(jsonResponse).toString('base64');
        logger.info('WhatsApp Flow response base64 gerado:', {
          screen: flowResponse.screen,
          responseLength: finalResponse.length
        });
      }

      // Retornar resposta
      res.status(200).send(finalResponse);

    } catch (error) {
      logger.error('Erro ao processar WhatsApp Flow:', error);
      
      // Tentar retornar erro criptografado se temos a chave
      try {
        const cryptoKey = (req.headers['crypto-key'] || 
                          req.headers['cryptokey'] || 
                          req.headers['Crypto-Key'] ||
                          req.headers['CryptoKey']) as string;
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

