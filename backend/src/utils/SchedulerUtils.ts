import * as cron from 'node-cron';
import { ScheduledRoutine } from '../models';
import { ajustarDataVencimento } from './dateUtils';
import type { CreateRoutineData, UpdateRoutineData } from '../types/scheduler';

/**
 * Constrói uma expressão CRON a partir dos dados de uma rotina
 * @param routine - Rotina agendada
 * @returns Expressão CRON válida
 */
export function buildCronExpression(routine: ScheduledRoutine): string {
  const [hours, minutes] = routine.hora_execucao.split(':');

  switch (routine.frequencia) {
    case 'diaria':
      return `${minutes} ${hours} * * *`;
    
    case 'semanal':
      const dayOfWeek = routine.dia_semana || 0;
      return `${minutes} ${hours} * * ${dayOfWeek}`;
    
    case 'mensal':
      const dayOfMonth = routine.dia_execucao || 1;
      return `${minutes} ${hours} ${dayOfMonth} * *`;
    
    case 'anual':
      const day = routine.dia_execucao || 1;
      return `${minutes} ${hours} ${day} 1 *`;
    
    case 'personalizada':
      return routine.cron_expression || `${minutes} ${hours} * * *`;
    
    default:
      return `${minutes} ${hours} * * *`;
  }
}

/**
 * Valida se uma expressão CRON é válida
 * @param expression - Expressão CRON a validar
 * @returns true se válida, false caso contrário
 */
export function validateCronExpression(expression: string): boolean {
  return cron.validate(expression);
}

/**
 * Calcula a próxima data de execução baseada na frequência e hora
 * @param routine - Rotina com hora_execucao e frequencia
 * @returns Data da próxima execução
 */
export function calculateNextExecution(
  routine: Pick<ScheduledRoutine, 'hora_execucao' | 'frequencia'>
): Date {
  const now = new Date();
  const [hours, minutes] = routine.hora_execucao.split(':');
  
  const nextExecution = new Date();
  nextExecution.setHours(parseInt(hours), parseInt(minutes), 0, 0);

  // Se já passou hoje, agendar para o próximo período baseado na frequência
  if (nextExecution <= now) {
    switch (routine.frequencia) {
      case 'diaria':
        nextExecution.setDate(nextExecution.getDate() + 1);
        break;
      case 'semanal':
        nextExecution.setDate(nextExecution.getDate() + 7);
        break;
      case 'mensal':
        nextExecution.setMonth(nextExecution.getMonth() + 1);
        break;
      case 'anual':
        nextExecution.setFullYear(nextExecution.getFullYear() + 1);
        break;
      default:
        nextExecution.setDate(nextExecution.getDate() + 1);
    }
  }

  return nextExecution;
}

/**
 * Normaliza uma data para o início do dia e a formata como string 'YYYY-MM-DD 00:00:00'.
 * Aplica regras de ajuste de vencimento (sábado/domingo).
 * @param date - A data a ser normalizada
 * @returns A data formatada como string
 */
export async function normalizeDateToString(date: Date): Promise<string> {
  // 1. Aplica regra de ajuste de vencimento (sábado/domingo)
  const dataAjustada = await ajustarDataVencimento(date);

  // 2. Formata para string YYYY-MM-DD HH:mm:ss
  const year = dataAjustada.getFullYear();
  const month = String(dataAjustada.getMonth() + 1).padStart(2, '0');
  const day = String(dataAjustada.getDate()).padStart(2, '0');

  return `${year}-${month}-${day} 00:00:00`;
}

/**
 * Valida dados para criar uma rotina
 * @param data - Dados da rotina
 * @returns Objeto com isValid e errors
 */
export function validateRoutineData(data: CreateRoutineData): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!data.nome || data.nome.trim().length === 0) {
    errors.push('Nome da rotina é obrigatório');
  }

  if (!data.tipo) {
    errors.push('Tipo da rotina é obrigatório');
  }

  if (!data.frequencia) {
    errors.push('Frequência é obrigatória');
  }

  if (!data.hora_execucao) {
    errors.push('Hora de execução é obrigatória');
  } else {
    // Validar formato HH:mm
    const horaRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    if (!horaRegex.test(data.hora_execucao)) {
      errors.push('Hora de execução deve estar no formato HH:mm');
    }
  }

  if (data.frequencia === 'semanal' && (data.dia_semana === undefined || data.dia_semana < 0 || data.dia_semana > 6)) {
    errors.push('Dia da semana deve estar entre 0 (domingo) e 6 (sábado)');
  }

  if (data.frequencia === 'mensal' && (data.dia_execucao === undefined || data.dia_execucao < 1 || data.dia_execucao > 31)) {
    errors.push('Dia de execução deve estar entre 1 e 31');
  }

  if (data.frequencia === 'anual' && (data.dia_execucao === undefined || data.dia_execucao < 1 || data.dia_execucao > 31)) {
    errors.push('Dia de execução deve estar entre 1 e 31');
  }

  if (data.frequencia === 'personalizada') {
    if (!data.cron_expression) {
      errors.push('Expressão CRON é obrigatória para frequência personalizada');
    } else if (!validateCronExpression(data.cron_expression)) {
      errors.push('Expressão CRON inválida');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Valida dados para atualizar uma rotina
 * @param data - Dados da rotina
 * @returns Objeto com isValid e errors
 */
export function validateRoutineUpdate(data: UpdateRoutineData): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (data.hora_execucao !== undefined) {
    const horaRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    if (!horaRegex.test(data.hora_execucao)) {
      errors.push('Hora de execução deve estar no formato HH:mm');
    }
  }

  if (data.dia_semana !== undefined && (data.dia_semana < 0 || data.dia_semana > 6)) {
    errors.push('Dia da semana deve estar entre 0 (domingo) e 6 (sábado)');
  }

  if (data.dia_execucao !== undefined && (data.dia_execucao < 1 || data.dia_execucao > 31)) {
    errors.push('Dia de execução deve estar entre 1 e 31');
  }

  if (data.frequencia === 'personalizada' && data.cron_expression !== undefined) {
    if (!validateCronExpression(data.cron_expression)) {
      errors.push('Expressão CRON inválida');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Formata duração em milissegundos para string legível
 * @param ms - Duração em milissegundos
 * @returns String formatada (ex: "1h 23m 45s" ou "45s")
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    const remainingSeconds = seconds % 60;
    return `${hours}h ${remainingMinutes}m ${remainingSeconds}s`;
  }

  if (minutes > 0) {
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }

  return `${seconds}s`;
}

/**
 * Formata resultado de execução para exibição
 * @param result - Resultado da execução
 * @returns String formatada
 */
export function formatExecutionResult(result: { success?: boolean; message?: string; [key: string]: unknown }): string {
  if (result.message) {
    return result.message;
  }

  if (result.success === false) {
    return 'Execução falhou';
  }

  if (result.success === true) {
    return 'Execução concluída com sucesso';
  }

  return 'Execução concluída';
}

