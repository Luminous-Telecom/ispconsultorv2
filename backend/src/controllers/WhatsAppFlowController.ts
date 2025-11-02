import { Request, Response } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';

interface FlowPayload {
  version: string;
  screen: string;
  data?: Record<string, string | number | boolean | null>;
  action?: string;
  flow_token?: string;
}

interface WhatsAppFlowRequest {
  encrypted_aes_key: string;
  encrypted_flow_data: string;
  initial_vector: string;
}

interface FlowResponse {
  screen: string;
  data: Record<string, unknown>;
}

export class WhatsAppFlowController {
  private static readonly NONCE_SIZE = 16; // 128 bits
  private static readonly TAG_LENGTH = 16; // 128 bits

  /**
   * Load RSA private key from environment or file
   */
  private static getRSAPrivateKey(): string {
    let key = process.env.WHATSAPP_FLOW_RSA_PRIVATE_KEY;
    
    if (key) {
      if (key.includes('\\n')) {
        key = key.replace(/\\n/g, '\n');
      }
      logger.info('RSA private key loaded from environment variable');
      return key;
    }
    
    const keyPath = path.join(process.cwd(), '.rsa_private_key.pem');
    try {
      key = fs.readFileSync(keyPath, 'utf8');
      logger.info('RSA private key loaded from file');
      return key;
    } catch (error) {
      logger.error('RSA private key not found:', error);
      throw new Error('RSA private key configuration missing');
    }
  }

  /**
   * Decrypt AES key using RSA-OAEP with SHA-256
   */
  private static decryptAESKey(encryptedKey: string, privateKey: string): Buffer {
    const encryptedBuffer = Buffer.from(encryptedKey, 'base64');
    
    logger.info('Attempting RSA decryption', {
      encryptedKeyLength: encryptedBuffer.length,
      expectedKeySize: 256 // 2048 bits = 256 bytes
    });
    
    try {
      return crypto.privateDecrypt(
        {
          key: privateKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256'
        },
        encryptedBuffer
      );
    } catch (error) {
      logger.error('RSA decryption failed - likely using wrong public key on WhatsApp', {
        error: error instanceof Error ? error.message : error,
        encryptedKeyLength: encryptedBuffer.length
      });
      throw new Error('decrypt: RSA decryption failed - please update public key on WhatsApp Business Platform');
    }
  }

  /**
   * Decrypt flow data using AES-128-GCM (WhatsApp uses GCM, not CBC!)
   */
  private static decryptFlowData(encryptedData: string, aesKey: Buffer, iv: Buffer): string {
    const encryptedBuffer = Buffer.from(encryptedData, 'base64');
    
    logger.info('Decrypting with AES-GCM', {
      encryptedLength: encryptedBuffer.length,
      aesKeyLength: aesKey.length,
      ivLength: iv.length
    });

    // Split encrypted data and auth tag
    const authTag = encryptedBuffer.slice(encryptedBuffer.length - WhatsAppFlowController.TAG_LENGTH);
    const ciphertext = encryptedBuffer.slice(0, encryptedBuffer.length - WhatsAppFlowController.TAG_LENGTH);

    const decipher = crypto.createDecipheriv('aes-128-gcm', aesKey, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(ciphertext);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString('utf8');
  }

  /**
   * Encrypt response using AES-128-GCM with flipped IV
   */
  private static encryptFlowResponse(data: string, aesKey: Buffer, iv: Buffer): string {
    // Flip the IV for response (WhatsApp requirement)
    const flippedIV = Buffer.from(iv.map(byte => ~byte));
    
    logger.info('Encrypting response with AES-GCM', {
      dataLength: data.length,
      flippedIVLength: flippedIV.length
    });

    const cipher = crypto.createCipheriv('aes-128-gcm', aesKey, flippedIV);
    
    let encrypted = cipher.update(data, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    
    // Get auth tag and append it
    const authTag = cipher.getAuthTag();
    const result = Buffer.concat([encrypted, authTag]);
    
    return result.toString('base64');
  }

  /**
   * Handle WhatsApp Flow webhook
   */
  static async handleFlow(req: Request, res: Response): Promise<void> {
    try {
      logger.info('WhatsApp Flow request received', {
        hasBody: !!req.body,
        bodyKeys: Object.keys(req.body || {})
      });
      
      const body = req.body as WhatsAppFlowRequest;
      
      // Validate required fields
      if (!body.encrypted_aes_key || !body.encrypted_flow_data || !body.initial_vector) {
        logger.error('Missing required fields', {
          hasAESKey: !!body.encrypted_aes_key,
          hasFlowData: !!body.encrypted_flow_data,
          hasIV: !!body.initial_vector
        });
        res.status(400).send('Missing required fields');
        return;
      }

      // Get RSA private key
      const rsaPrivateKey = WhatsAppFlowController.getRSAPrivateKey();
      
      // Decrypt AES key
      const aesKey = WhatsAppFlowController.decryptAESKey(body.encrypted_aes_key, rsaPrivateKey);
      logger.info('AES key decrypted successfully', { keyLength: aesKey.length });
      
      // Decode IV
      const iv = Buffer.from(body.initial_vector, 'base64');
      logger.info('IV decoded successfully', { ivLength: iv.length });
      
      // Decrypt flow data
      const decryptedJson = WhatsAppFlowController.decryptFlowData(body.encrypted_flow_data, aesKey, iv);
      const payload: FlowPayload = JSON.parse(decryptedJson);
      
      logger.info('Flow payload decrypted', {
        version: payload.version,
        screen: payload.screen,
        action: payload.action,
        hasData: !!payload.data
      });
      
      // Build response based on flow action
      const response: FlowResponse = {
        screen: 'SUCCESS',
        data: {
          extension_message_response: {
            params: {
              flow_token: payload.flow_token || '',
            }
          }
        }
      };
      
      // Encrypt response
      const jsonResponse = JSON.stringify(response);
      const encryptedResponse = WhatsAppFlowController.encryptFlowResponse(jsonResponse, aesKey, iv);
      
      logger.info('Response encrypted successfully', {
        responseLength: encryptedResponse.length
      });
      
      // Send encrypted response as plain text
      res.setHeader('Content-Type', 'text/plain');
      res.status(200).send(encryptedResponse);
      
    } catch (error) {
      logger.error('Error processing WhatsApp Flow:', error);
      
      // Return 421 for decryption errors (as per WhatsApp docs)
      if (error instanceof Error && error.message.includes('decrypt')) {
        res.status(421).send('Decryption failed');
      } else {
        res.status(500).send('Error processing flow');
      }
    }
  }

  /**
   * Test endpoint
   */
  static async test(_req: Request, res: Response): Promise<void> {
    try {
      const testKey = crypto.randomBytes(16);
      const testIV = crypto.randomBytes(16);
      
      const testResponse = {
        screen: 'TEST_SUCCESS',
        data: {
          message: 'Endpoint working correctly',
          timestamp: new Date().toISOString()
        }
      };
      
      const encrypted = WhatsAppFlowController.encryptFlowResponse(
        JSON.stringify(testResponse),
        testKey,
        testIV
      );
      
      res.json({
        success: true,
        message: 'WhatsApp Flow endpoint is working',
        encrypted_sample: encrypted,
        note: 'Encrypted with AES-128-GCM as per WhatsApp specification'
      });
    } catch (error) {
      logger.error('Test endpoint error:', error);
      res.status(500).json({ success: false, error: 'Test failed' });
    }
  }
}
