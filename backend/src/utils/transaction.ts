import { Transaction } from 'sequelize';
import { sequelize } from '../config/database';
import { logger } from './logger';

/**
 * Helper para executar operações dentro de uma transação Sequelize
 * Garante rollback automático em caso de erro
 * 
 * @param callback Função que recebe a transação e retorna o resultado
 * @returns Resultado da operação
 */
export async function withTransaction<T>(
  callback: (transaction: Transaction) => Promise<T>
): Promise<T> {
  const transaction = await sequelize.transaction();
  
  try {
    const result = await callback(transaction);
    await transaction.commit();
    return result;
  } catch (error) {
    await transaction.rollback();
    
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    logger.error('Erro em transação - rollback executado', {
      context: 'transaction',
      error: errorMessage,
      stack: errorStack
    });
    
    throw error;
  }
}

/**
 * Helper para executar múltiplas operações em uma transação
 * Útil para operações em lote que precisam ser atômicas
 * 
 * @param operations Array de funções que recebem a transação
 * @returns Array com os resultados de cada operação
 */
export async function withTransactionBatch<T>(
  operations: Array<(transaction: Transaction) => Promise<T>>
): Promise<T[]> {
  return withTransaction(async (transaction) => {
    const results: T[] = [];
    
    for (const operation of operations) {
      const result = await operation(transaction);
      results.push(result);
    }
    
    return results;
  });
}

