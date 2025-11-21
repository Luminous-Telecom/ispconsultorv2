/**
 * Testes para middleware de tratamento de erros
 */
import { Request, Response, NextFunction } from 'express';
import { errorHandlerMiddleware } from '../../middleware/errorHandlerMiddleware';
import { ValidationError as JoiValidationError } from 'joi';
import { ValidationError as SequelizeValidationError, UniqueConstraintError } from 'sequelize';

describe('errorHandlerMiddleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    
    mockRequest = {
      path: '/api/test',
      method: 'GET',
      ip: '127.0.0.1'
    };
    
    mockResponse = {
      status: statusMock,
      json: jsonMock
    };
    
    mockNext = jest.fn();
  });

  it('deve tratar erro de validação Joi', () => {
    const error = new JoiValidationError('Erro de validação', [], {});
    (error as unknown as { isJoi: boolean }).isJoi = true;
    error.details = [{ 
      path: ['campo'], 
      message: 'Campo obrigatório',
      type: 'any.required'
    }];

    errorHandlerMiddleware(
      error as unknown as Error,
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Dados inválidos'
      })
    );
  });

  it('deve tratar erro de validação Sequelize', () => {
    // Criar um erro de validação Sequelize simulado
    const error = Object.assign(new Error('Erro de validação'), {
      name: 'SequelizeValidationError',
      errors: [
        {
          path: 'email' as string,
          message: 'Email inválido',
          value: 'invalid-email'
        }
      ]
    }) as unknown as Error & {
      name: string;
      errors?: Array<{ message: string; path?: string }>;
    };

    errorHandlerMiddleware(
      error as unknown as Error,
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Dados inválidos'
      })
    );
  });

  it('deve tratar erro de constraint de unicidade', () => {
    // Criar erro simulado de constraint de unicidade
    // O middleware verifica por nome, então não precisa ser instância real
    const error = Object.assign(new Error('Registro já existe'), {
      name: 'SequelizeUniqueConstraintError',
      errors: [
        {
          message: 'Registro já existe',
          path: 'email' as string
        }
      ]
    }) as unknown as Error & {
      name: string;
      errors?: Array<{ message: string; path?: string }>;
    };

    errorHandlerMiddleware(
      error as unknown as Error,
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    expect(statusMock).toHaveBeenCalledWith(409);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Registro já existe'
      })
    );
  });

  it('deve tratar erro genérico com status 500', () => {
    const error = new Error('Erro genérico');

    errorHandlerMiddleware(
      error,
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    expect(statusMock).toHaveBeenCalledWith(500);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: 'INTERNAL_SERVER_ERROR'
      })
    );
  });

  it('deve tratar erro com status code customizado', () => {
    const error = new Error('Erro customizado') as Error & { statusCode?: number; code?: string };
    error.statusCode = 404;
    error.code = 'NOT_FOUND';

    errorHandlerMiddleware(
      error,
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    expect(statusMock).toHaveBeenCalledWith(404);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Erro customizado',
        error: 'NOT_FOUND'
      })
    );
  });
});

