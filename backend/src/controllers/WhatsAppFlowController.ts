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
  encrypted_aes_key: string;  // AES key encrypted with RSA (base64)
  encrypted_flow_data: string; // Flow data encrypted with AES (base64)
  initial_vector: string;      // IV for AES decryption (base64)
}

export class WhatsAppFlowController {
  /**
   * Load RSA private key from environment or file
   */
  private static getRSAPrivateKey(): string {
    let key = process.env.WHATSAPP_FLOW_RSA_PRIVATE_KEY;
    
    if (key) {
      // Replace \\n with actual newlines if in env var
      if (key.includes('\\n')) {
        key = key.replace(/\\n/g, '\n');
      }
      logger.info('RSA private key loaded from environment variable');
      return key;
    }
    
    // Try reading from file
    const keyPath = path.join(process.cwd(), '.rsa_private_key.pem');
    try {
      key = fs.readFileSync(keyPath, 'utf8');
      logger.info('RSA private key loaded from file');
      return key;
    } catch (error) {
      logger.error('RSA private key not found in env or file:', error);
      throw new Error('RSA private key configuration missing');
    }
  }

  /**
   * Decrypt AES key with RSA private key
   */
  private static decryptAESKey(encryptedKey: string, privateKey: string): Buffer {
    const encryptedBuffer = Buffer.from(encryptedKey, 'base64');
    return crypto.privateDecrypt(
      {
        key: privateKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256'
      },
      encryptedBuffer
    );
  }

  /**
   * Decrypt flow data with AES-128-CBC
   */
  private static decryptFlowData(encryptedData: string, key: Buffer, iv: Buffer): string {
    const encryptedBuffer = Buffer.from(encryptedData, 'base64');
    const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
    let decrypted = decipher.update(encryptedBuffer);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString('utf8');
  }

  /**
   * Encrypt flow response with AES-128-CBC
   */
  private static encryptFlowResponse(data: string, key: Buffer, iv: Buffer): string {
    const cipher = crypto.createCipheriv('aes-128-cbc', key, iv);
    let encrypted = cipher.update(data, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    return encrypted;
  }

  /**
   * Handle WhatsApp Flow webhook
   */
  static async handleFlow(req: Request, res: Response): Promise<void> {
    try {
      logger.info('WhatsApp Flow request received');
      
      const body = req.body as WhatsAppFlowRequest;
      
      // Validate required fields
      if (!body.encrypted_aes_key || !body.encrypted_flow_data || !body.initial_vector) {
        logger.error('Missing required fields in WhatsApp Flow request');
        res.status(400).send('Missing required fields');
        return;
      }

      // Get RSA private key
      const rsaPrivateKey = this.getRSAPrivateKey();
      
      // Decrypt AES key
      const aesKey = this.decryptAESKey(body.encrypted_aes_key, rsaPrivateKey);
      logger.info('AES key decrypted', { keyLength: aesKey.length });
      
      // Decode IV
      const iv = Buffer.from(body.initial_vector, 'base64');
      logger.info('IV decoded', { ivLength: iv.length });
      
      // Decrypt flow data
      const decryptedJson = this.decryptFlowData(body.encrypted_flow_data, aesKey, iv);
      const payload: FlowPayload = JSON.parse(decryptedJson);
      logger.info('Flow data decrypted', { screen: payload.screen });
      
      // Process flow
      const response = {
        screen: 'END',
        data: {
          message: 'Flow processed successfully'
        },
        error: null
      };
      
      // Encrypt response
      const jsonResponse = JSON.stringify(response);
      const encryptedResponse = this.encryptFlowResponse(jsonResponse, aesKey, iv);
      
      // Send encrypted response
      res.status(200).send(encryptedResponse);
      
    } catch (error) {
      logger.error('Error processing WhatsApp Flow:', error);
      res.status(500).send('Error processing flow');
    }
  }

  /**
   * Test endpoint
   */
  static async test(_req: Request, res: Response): Promise<void> {
    res.json({ message: 'WhatsApp Flow test endpoint working' });
  }
}
