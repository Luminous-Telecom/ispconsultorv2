/**
 * Testes básicos para BancoApiService
 */
import { BancoApiService } from '../../services/BancoApiService';
import { Banco } from '../../models/Banco';

// Mock do modelo Banco
jest.mock('../../models/Banco');

describe('BancoApiService', () => {
  describe('getBancoConfig', () => {
    it('deve retornar configuração do banco EFI', () => {
      const config = BancoApiService['getBancoConfig']('efi');
      expect(config).toBeDefined();
      expect(config?.nome).toBeDefined();
      expect(config?.auth_type).toBe('basic');
    });

    it('deve retornar configuração do banco Asaas', () => {
      const config = BancoApiService['getBancoConfig']('asaas');
      expect(config).toBeDefined();
      expect(config?.nome).toBeDefined();
      expect(config?.auth_type).toBe('bearer');
    });

    it('deve retornar null para tipo de banco inválido', () => {
      const config = BancoApiService['getBancoConfig']('invalid' as 'efi' | 'asaas' | 'bancario' | 'outros');
      expect(config).toBeNull();
    });
  });

  describe('verificarCredenciais', () => {
    it('deve retornar true quando credenciais estão configuradas', () => {
      const banco = {
        client_id_producao: 'test-client-id',
        client_secret_producao: 'test-client-secret',
        tipo_banco: 'efi' as const
      } as Banco;

      const config = BancoApiService['getBancoConfig']('efi');
      if (!config) {
        throw new Error('Config não encontrado');
      }
      const result = BancoApiService['verificarCredenciais'](banco, config);
      expect(result).toBe(true);
    });

    it('deve retornar false quando credenciais não estão configuradas', () => {
      const banco = {
        client_id_producao: null,
        client_secret_producao: null,
        tipo_banco: 'efi' as const
      } as Banco;

      const config = BancoApiService['getBancoConfig']('efi');
      if (!config) {
        throw new Error('Config não encontrado');
      }
      const result = BancoApiService['verificarCredenciais'](banco, config);
      expect(result).toBe(false);
    });
  });
});

