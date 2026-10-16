import { clienteDisplayName } from './clienteDisplayName';
import { slugify } from './slugify';
import { isDevelopment, isProduction } from './envUtils';
import { formatCEP } from './dateUtils';
import { getClientIpFromSource } from './requestUtils';
import { pertenceComunicacaoEmpresa, whereComunicacaoEmpresaEstrito } from './comunicacaoEmpresaWhere';
import { normalizeSshPrivateKeyPem } from './sshPrivateKey';
import {
  appendLegacyModulosFromRecursos,
  parseLimiteRecursosNumber,
  readLimiteFromRecursos,
  stripLegacyLimiteKeys,
} from './saasPlanoLimiteRecursosUtils';
import { syntheticHoraExecucaoFromSaasBody } from './saasScheduledRoutineCronPayload';

describe('exibição e slug', () => {
  it('prioriza razão social e cai para o id', () => {
    expect(clienteDisplayName({ razao_social: ' ACME ', nome_fantasia: 'Fantasia' })).toBe('ACME');
    expect(clienteDisplayName({ razao_social: '  ', nome_fantasia: 'Fantasia' })).toBe('Fantasia');
    expect(clienteDisplayName({}, 9)).toBe('9');
  });

  it('gera slug sem acento', () => {
    expect(slugify('Minha Empresa ISP')).toBe('minha-empresa-isp');
    expect(slugify('São Paulo')).toBe('sao-paulo');
  });
});

describe('ambiente e CEP', () => {
  it('dev e produção são mutuamente exclusivos', () => {
    expect(isProduction()).toBe(!isDevelopment());
  });

  it('formata CEP de 8 dígitos e esvazia o inválido', () => {
    expect(formatCEP('01310100')).toBe('01310-100');
    expect(formatCEP('123')).toBe('');
    expect(formatCEP(null)).toBe('');
  });
});

describe('IP do cliente', () => {
  it('prefere o primeiro IP encaminhado e remove o prefixo IPv4 mapeado', () => {
    expect(getClientIpFromSource({
      headers: { 'x-forwarded-for': '203.0.113.5, 10.0.0.1' },
      socketRemoteAddress: '127.0.0.1',
    })).toBe('203.0.113.5');
    expect(getClientIpFromSource({
      socketRemoteAddress: '::ffff:192.168.1.10',
    })).toBe('192.168.1.10');
  });
});

describe('comunicação por tenant', () => {
  it('não inclui registro sem empresa e não aceita empresa de outro tenant', () => {
    expect(whereComunicacaoEmpresaEstrito(0)).toBeNull();
    expect(whereComunicacaoEmpresaEstrito(4, { ativo: true })).toEqual({ ativo: true, empresa_id: 4 });
    expect(pertenceComunicacaoEmpresa(null, 4)).toBe(false);
    expect(pertenceComunicacaoEmpresa(4, 4)).toBe(true);
    expect(pertenceComunicacaoEmpresa(9, 4)).toBe(false);
  });
});

describe('chave SSH', () => {
  it('recoloca quebras de linha num PEM colado numa linha só', () => {
    const body = 'A'.repeat(70);
    const colada = `-----BEGIN OPENSSH PRIVATE KEY----- ${body} -----END OPENSSH PRIVATE KEY-----`;
    const normalizada = normalizeSshPrivateKeyPem(colada);
    expect(normalizada.startsWith('-----BEGIN OPENSSH PRIVATE KEY-----\n')).toBe(true);
    expect(normalizada).toContain('\n-----END OPENSSH PRIVATE KEY-----');
  });
});

describe('limites do plano', () => {
  it('lê número, cai na chave legada e remove as chaves antigas', () => {
    expect(parseLimiteRecursosNumber('12')).toBe(12);
    expect(parseLimiteRecursosNumber(-1, 0)).toBe(0);
    expect(readLimiteFromRecursos({ cadastros_limite_ixc_provedor: 3 }, 'ixc_provedor_limite_integracoes')).toBe(3);
    const recursos: Record<string, unknown> = { cadastros_limite_ixc_provedor: 1, nome: 'Pro' };
    stripLegacyLimiteKeys(recursos);
    expect(recursos.cadastros_limite_ixc_provedor).toBeUndefined();
    expect(appendLegacyModulosFromRecursos([], { ixc_provedor_limite_integracoes: 1 })).toContain('ixc_provedor');
  });

  it('monta hora de execução a partir das colunas do SaaS', () => {
    expect(syntheticHoraExecucaoFromSaasBody({ hora: '8', minuto: '5' })).toBe('08:05');
    expect(syntheticHoraExecucaoFromSaasBody({ hora: '*', minuto: '5' })).toBe('00:00');
  });
});
