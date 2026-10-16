import {
  cidrOverlapsTransit,
  interfaceNameForAgent,
  parseLanCidrs,
  transitForAgent,
} from '../wireguardTransit';

describe('transitForAgent', () => {
  it('reserva um /30 por agente', () => {
    expect(transitForAgent(1)).toEqual({
      network: '10.200.0.0',
      peerAddress: '10.200.0.1',
      ourAddress: '10.200.0.2',
      prefix: 30,
    });
    expect(transitForAgent(65)).toMatchObject({
      peerAddress: '10.200.1.1',
      ourAddress: '10.200.1.2',
    });
  });

  it('recusa identificador fora da faixa', () => {
    expect(() => transitForAgent(0)).toThrow(/faixa/);
    expect(() => transitForAgent(16384)).toThrow(/faixa/);
  });
});

describe('parseLanCidrs', () => {
  it('aceita redes separadas por vírgula', () => {
    expect(parseLanCidrs('192.168.88.0/24, 10.10.0.0/16')).toEqual(['192.168.88.0/24', '10.10.0.0/16']);
  });

  it('recusa a faixa de trânsito e prefixo zero', () => {
    expect(cidrOverlapsTransit('10.200.1.0/24')).toBe(true);
    expect(() => parseLanCidrs('10.200.1.0/24')).toThrow(/trânsito/);
    expect(() => parseLanCidrs('0.0.0.0/0')).toThrow(/Prefixo/);
    expect(() => parseLanCidrs('nao-e-rede')).toThrow(/inválida/);
  });
});

describe('interfaceNameForAgent', () => {
  it('cabe no limite de 15 caracteres', () => {
    expect(interfaceNameForAgent(12)).toBe('ispwg12');
  });
});
