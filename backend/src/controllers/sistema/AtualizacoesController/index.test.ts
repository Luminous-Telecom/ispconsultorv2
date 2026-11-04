import { startSseKeepAlive } from './index';

describe('startSseKeepAlive', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('envia um ping enquanto a atualização não manda progresso', () => {
    const write = jest.fn();
    const stop = startSseKeepAlive(write, 10_000);

    expect(write).not.toHaveBeenCalled();
    jest.advanceTimersByTime(10_000);
    expect(write).toHaveBeenCalledWith(': ping\n\n');

    stop();
    jest.advanceTimersByTime(20_000);
    expect(write).toHaveBeenCalledTimes(1);
  });
});