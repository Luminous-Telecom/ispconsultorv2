import { Request, Response } from 'express';
import { logger } from '../utils/logger';

interface FlowPayload {
  version: string;
  screen: string;
  data?: Record<string, any>;
  token?: string;
}

export class WhatsAppFlowController {
  /**
   * Endpoint para WhatsApp Flow que retorna JSON codificado em base64
   */
  static async handleFlow(req: Request, res: Response): Promise<void> {
    try {
      // Receber payload do WhatsApp Flow
      const payload: FlowPayload = req.body;
      
      logger.info('WhatsApp Flow request recebido:', { 
        version: payload.version,
        screen: payload.screen,
        data: payload.data ? 'present' : 'absent'
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

      // Converter para JSON e depois para base64
      const jsonResponse = JSON.stringify(flowResponse);
      const base64Response = Buffer.from(jsonResponse).toString('base64');

      // Log para debug
      logger.info('WhatsApp Flow response gerado:', {
        screen: flowResponse.screen,
        responseLength: base64Response.length
      });

      // Retornar em base64
      res.status(200).send(base64Response);

    } catch (error) {
      logger.error('Erro ao processar WhatsApp Flow:', error);
      
      // Retornar erro também em base64
      const errorResponse = {
        screen: 'ERROR_SCREEN',
        data: {},
        error: 'Erro ao processar flow'
      };
      
      const jsonResponse = JSON.stringify(errorResponse);
      const base64Response = Buffer.from(jsonResponse).toString('base64');
      
      res.status(500).send(base64Response);
    }
  }

  /**
   * Endpoint de teste para verificar funcionamento
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

      // Converter para base64
      const jsonResponse = JSON.stringify(testResponse);
      const base64Response = Buffer.from(jsonResponse).toString('base64');

      res.json({
        success: true,
        message: 'WhatsApp Flow endpoint funcionando',
        base64: base64Response,
        json: testResponse,
        timestamp: new Date().toISOString()
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

