jest.mock('axios', () => require('../test/httpMock').createAxiosMockModule());

import { BackupService, consumeBackupSseBuffer } from './backupService';
import { entityId, getHttp, ok, okPage, resetHttp, rowsOf } from '../test/httpMock';

describe('BackupService', () => {
  beforeEach(() => {
    resetHttp();
  });

  it('lista vazia não quebra e não envia empresa_id', async () => {
    getHttp().get.mockResolvedValue(okPage([]));
    const result = await BackupService.list();
    expect(rowsOf(result)).toEqual([]);
    expect(String(getHttp().get.mock.calls[0][0])).not.toContain('empresa_id');
  });

  it('lê o progresso do stream e guarda o restante incompleto', () => {
    const chunk = [
      ': connected',
      '',
      'data: {"step":"inicio","progress":1,"message":"Iniciando backup...","logs":["Iniciando backup..."]}',
      '',
      'data: {"step":"database","progress":40,"message":"Exportando tabela clientes","logs":["clientes"]}',
      '',
      'data: {"step":"fina',
    ].join('\n\n').replace(': connected\n\n', ': connected\n\n');
    const parsed = consumeBackupSseBuffer(`${chunk}`);
    expect(parsed.events.map((event) => event.progress)).toEqual([1, 40]);
    expect(parsed.events[1]?.logs).toEqual(['clientes']);
    expect(parsed.rest.startsWith('data: {"step":"fina')).toBe(true);
  });

  it('ignora bloco sem data e aceita o evento de falha', () => {
    const parsed = consumeBackupSseBuffer(': ping\n\n\ndata: {"error":"falhou","message":"falhou","progress":20}\n\n');
    expect(parsed.events).toEqual([{ error: 'falhou', message: 'falhou', progress: 20 }]);
    expect(parsed.rest).toBe('');
  });
});
