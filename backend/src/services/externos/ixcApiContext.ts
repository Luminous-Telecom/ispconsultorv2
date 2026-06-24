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
  fn: () => Promise<T>,
  clienteId?: number | null
): Promise<T> {
  const credentials =
    clienteId != null && clienteId > 0
      ? await IntegracaoIxcProvedorService.resolveCredentialsForCliente(clienteId, empresaId)
      : await IntegracaoIxcProvedorService.resolveCredentials(empresaId);
  return ixcCredentialsStorage.run(credentials, fn);
}

export async function runWithIntegracaoCredentials<T>(
  credentials: IxcApiCredentials,
  fn: () => Promise<T>
): Promise<T> {
  return ixcCredentialsStorage.run(credentials, fn);
}

export type { IxcApiCredentials };
