import { isUpdateStreamDisconnect } from './updateStreamDisconnect';

describe('isUpdateStreamDisconnect', () => {
  it('reconhece a queda de rede do stream', () => {
    expect(isUpdateStreamDisconnect(new TypeError('Failed to fetch'))).toBe(true);
    expect(isUpdateStreamDisconnect(new TypeError('NetworkError when attempting to fetch resource.'))).toBe(true);
    expect(isUpdateStreamDisconnect({ name: 'Error', message: 'Network Error' })).toBe(true);
  });

  it('não trata falha de permissão ou resposta HTTP como queda de rede', () => {
    expect(isUpdateStreamDisconnect(new Error('HTTP error! status: 403'))).toBe(false);
    expect(isUpdateStreamDisconnect(new Error('Acesso negado'))).toBe(false);
    expect(isUpdateStreamDisconnect(null)).toBe(false);
  });
});