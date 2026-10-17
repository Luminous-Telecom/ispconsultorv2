import { subscribeSystemUpdateStatus, SystemUpdateProgressService } from './index';

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
    SystemUpdateProgressService.begin('system');
    SystemUpdateProgressService.report(140);
    expect(SystemUpdateProgressService.getSnapshot().progress).toBe(100);

    SystemUpdateProgressService.report(-8);
    expect(SystemUpdateProgressService.getSnapshot().progress).toBe(0);
  });

  it('marca falha e encerra a atualização', () => {
    SystemUpdateProgressService.begin('system');
    SystemUpdateProgressService.fail();
    expect(SystemUpdateProgressService.getSnapshot()).toMatchObject({
      active: false,
      phase: 'failed',
      kind: 'system',
    });

    SystemUpdateProgressService.begin('system');
    SystemUpdateProgressService.report(60);
    SystemUpdateProgressService.end();
    expect(SystemUpdateProgressService.getSnapshot()).toEqual({
      active: false,
      progress: 0,
      kind: null,
      phase: 'idle',
    });
  });

  it('avisa inscritos só enquanto a inscrição estiver ativa', () => {
    const received: number[] = [];
    const unsubscribe = subscribeSystemUpdateStatus((snapshot) => {
      received.push(snapshot.progress);
    });

    try {
      SystemUpdateProgressService.begin('system');
      SystemUpdateProgressService.report(40);
      unsubscribe();
      SystemUpdateProgressService.fail();
      expect(received).toEqual([0, 40]);
    } finally {
      unsubscribe();
    }
  });
});
