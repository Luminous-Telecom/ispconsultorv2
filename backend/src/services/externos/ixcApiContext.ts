import { AsyncLocalStorage } from 'async_hooks';
import { IntegracaoIxcProvedorService } from '../integracao/IntegracaoIxcProvedorService';
import type { IxcApiCredentials } from '../integracao/IntegracaoIxcProvedorService';

const ixcCredentialsStorage = new AsyncLocalStorage<IxcApiCredentials>();

export function getIxcApiCredentials(): IxcApiCredentials {
  const credentials = ixcCredentialsStorage.getStore();
  if (!credentials) {
    throw new Error('Contexto IXC não inicializado');
  }
  return credentials;
}

export async function runWithIxcCredentials<T>(
  empresaId: number | null,
  fn: () => Promise<T>
): Promise<T> {
  const credentials = await IntegracaoIxcProvedorService.resolveCredentials(empresaId);
  return ixcCredentialsStorage.run(credentials, fn);
}

export type { IxcApiCredentials };
