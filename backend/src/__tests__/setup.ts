/**
 * Configuração global para testes
 * Este arquivo é executado antes de todos os testes
 */

// Configurar variáveis de ambiente para testes
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'sqlite::memory:';

// Silenciar logs durante testes (opcional)
// Se quiser ver os logs, comente as linhas abaixo
const originalConsole = console;
global.console = {
  ...originalConsole,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
} as unknown as Console;

