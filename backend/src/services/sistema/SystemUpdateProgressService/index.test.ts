import { SystemUpdateProgressService } from './index';

describe('SystemUpdateProgressService', () => {
  beforeEach(() => {
    SystemUpdateProgressService.reset();
  });

  it('inicia a atualização em andamento com progresso zero', () => {
    SystemUpdateProgressService.begin('system');

    expect(SystemUpdateProgressService.getSnapshot()).toEqual({
      active: true,
      progress: 0,
      kind: 'system',
      phase: 'running',
    });
  });

  it('limita a porcentagem entre 0 e 100', () => {
    SystemUpdateProgressService.begin('doc');
    SystemUpdateProgressService.report(140);
    expect(SystemUpdateProgressService.getSnapshot().progress).toBe(100);

    SystemUpdateProgressService.report(-8);
    expect(SystemUpdateProgressService.getSnapshot().progress).toBe(0);
  });

  it('marca falha e encerra a atualização da wiki', () => {
    SystemUpdateProgressService.begin('system');
    SystemUpdateProgressService.fail();
    expect(SystemUpdateProgressService.getSnapshot()).toMatchObject({
      active: false,
      phase: 'failed',
      kind: 'system',
    });

    SystemUpdateProgressService.begin('doc');
    SystemUpdateProgressService.report(60);
    SystemUpdateProgressService.end();
    expect(SystemUpdateProgressService.getSnapshot()).toEqual({
      active: false,
      progress: 0,
      kind: null,
      phase: 'idle',
    });
  });
});
