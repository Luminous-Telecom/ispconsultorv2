import { isValidIPv4, isValidIPv6 } from 'utils/validators';
import { sanitizeDominio } from 'utils/stringUtils';
import type { ClassifiedList, PendingPdfFiles } from './importarListaBlockdomiTypes';

export function classifyLine(line: string): { type: 'dominio' | 'ipv4' | 'ipv6' | 'invalido'; value: string } {
  const trimmed = line.trim();
  if (!trimmed) return { type: 'invalido', value: trimmed };

  if (isValidIPv4(trimmed)) return { type: 'ipv4', value: trimmed };
  if (isValidIPv6(trimmed)) return { type: 'ipv6', value: trimmed };

  const dominioLimpo = sanitizeDominio(trimmed);
  if (dominioLimpo) return { type: 'dominio', value: dominioLimpo };

  return { type: 'invalido', value: trimmed };
}

/**
 * Extrai itens da lista: divide por quebra de linha E por espaços na mesma linha.
 * Ex: "a.com b.com c.com" vira ["a.com", "b.com", "c.com"]
 */
export function parseListItems(text: string): string[] {
  return text
    .split(/\r?\n/)
    .flatMap((line) => line.split(/\s+/).map((t) => t.trim()).filter(Boolean));
}

export function classifyLines(text: string): ClassifiedList {
  const items = parseListItems(text);
  const dominios: string[] = [];
  const ipv4: string[] = [];
  const ipv6: string[] = [];
  const invalidos: string[] = [];
  const duplicados: string[] = [];
  const seenDominios = new Set<string>();
  const seenIPv4 = new Set<string>();
  const seenIPv6 = new Set<string>();
  const seenInvalidos = new Set<string>();
  const seenDuplicados = new Set<string>();

  for (const item of items) {
    const { type, value } = classifyLine(item);
    if (type === 'dominio') {
      if (!seenDominios.has(value)) {
        seenDominios.add(value);
        dominios.push(value);
      } else if (!seenDuplicados.has(value)) {
        seenDuplicados.add(value);
        duplicados.push(value);
      }
    } else if (type === 'ipv4') {
      if (!seenIPv4.has(value)) {
        seenIPv4.add(value);
        ipv4.push(value);
      } else if (!seenDuplicados.has(value)) {
        seenDuplicados.add(value);
        duplicados.push(value);
      }
    } else if (type === 'ipv6') {
      if (!seenIPv6.has(value)) {
        seenIPv6.add(value);
        ipv6.push(value);
      } else if (!seenDuplicados.has(value)) {
        seenDuplicados.add(value);
        duplicados.push(value);
      }
    } else {
      if (!seenInvalidos.has(value)) {
        seenInvalidos.add(value);
        invalidos.push(value);
      }
    }
  }

  return { dominios, ipv4, ipv6, invalidos, duplicados, jaCadastrados: [], seraoCadastrados: [] };
}

export function emptyPendingPdfFiles(): PendingPdfFiles {
  return { main: null, anatel: null, justica: null };
}

export function buildTextFromColunas(colunas: Record<string, string[]>, selecionadas: Set<string>): string {
  const merged = new Set<string>();
  Array.from(selecionadas).forEach((key) => {
    (colunas[key] ?? []).forEach((item) => merged.add(item));
  });
  return Array.from(merged).join('\n');
}
