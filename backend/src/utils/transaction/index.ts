import type { Prisma } from '@prisma/client';
import { prisma } from '../../db/prisma';
import { logger } from '../logger';

/**
 * Cliente da transação Prisma, com os campos que o ORM ainda lê (`.tx`)
 * enquanto os services não forem migrados.
 */
export type TransactionClient = Prisma.TransactionClient & {
  tx: Prisma.TransactionClient;
  commit: () => Promise<void>;
  rollback: () => Promise<void>;
};

const ROLLBACK = '__rollback__';

function asTransactionClient(tx: Prisma.TransactionClient): TransactionClient {
  return new Proxy(tx, {
    get(target, prop, receiver) {
      if (prop === 'tx') return target;
      if (prop === 'commit') return async () => undefined;
      if (prop === 'rollback') return async () => {
        throw new Error(ROLLBACK);
      };
      return Reflect.get(target, prop, receiver);
    },
  }) as TransactionClient;
}

/**
 * Executa o callback dentro de prisma.$transaction.
 * O callback recebe o transaction client do Prisma.
 */
export async function withTransaction<T>(
  callback: (transaction: TransactionClient) => Promise<T>
): Promise<T> {
  try {
    return await prisma.$transaction(async (tx) => callback(asTransactionClient(tx)));
  } catch (error) {
    if (error instanceof Error && error.message === ROLLBACK) {
      throw error;
    }
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    logger.error('Erro em transação - rollback executado', {
      context: 'transaction',
      error: errorMessage,
    });
    throw error;
  }
}

/**
 * Executa várias operações na mesma transação.
 */
export async function withTransactionBatch<T>(
  operations: Array<(transaction: TransactionClient) => Promise<T>>
): Promise<T[]> {
  return withTransaction(async (transaction) => {
    const results: T[] = [];
    for (const operation of operations) {
      results.push(await operation(transaction));
    }
    return results;
  });
}
