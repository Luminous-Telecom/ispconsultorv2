import { safeFormatDateISOLocal } from '../../utils/timezoneUtils';

/**
 * Data streams exigem @timestamp (ISO-8601). Mantemos também `timestamp` para
 * compatibilidade com código e exportações que já leem esse campo.
 */
export function elasticsearchEventTimestamps(date: Date = new Date()): {
  '@timestamp': string;
  timestamp: string;
} {
  const iso = safeFormatDateISOLocal(date) || date.toISOString();
  return {
    '@timestamp': iso,
    timestamp: iso
  };
}
