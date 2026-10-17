jest.mock('fs/promises', () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  readdir: jest.fn(),
  stat: jest.fn(),
  unlink: jest.fn(),
}));

jest.mock('../../../utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

import fs from 'fs/promises';
import { BackupService } from './index';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('BackupService', () => {
  it('aceita pasta vazia', async () => {
    (fs.readdir as jest.Mock).mockResolvedValue([]);
    await expect(BackupService.list()).resolves.toEqual([]);
  });

  it('não apaga nome de arquivo inválido', async () => {
    await expect(BackupService.delete('../segredo.sql')).rejects.toThrow('inválido');
    expect(fs.unlink).not.toHaveBeenCalled();
  });
});
