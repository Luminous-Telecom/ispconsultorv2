jest.mock('axios', () => require('../test/httpMock').createAxiosMockModule());

import { SshDeviceBackupService } from './sshDeviceBackupService';
import { getHttp, ok, resetHttp } from '../test/httpMock';

describe('SshDeviceBackupService', () => {
  beforeEach(() => {
    resetHttp();
  });

  it('equipamento sem backup devolve lista vazia', async () => {
    getHttp().get.mockResolvedValue(ok(null));
    await expect(SshDeviceBackupService.listByDevice('olt-1')).resolves.toEqual([]);
    expect(String(getHttp().get.mock.calls[0][0])).toContain('/ssh-manager/devices/olt-1/backups');
  });

  it('exclusão codifica nome que tenta sair da pasta', async () => {
    getHttp().delete.mockResolvedValue(ok(null));
    await SshDeviceBackupService.delete('olt-1', '../segredo.sql');
    const url = String(getHttp().delete.mock.calls[0][0]);
    expect(url).toContain(encodeURIComponent('../segredo.sql'));
    expect(url).not.toContain('/backups/../');
  });
});
