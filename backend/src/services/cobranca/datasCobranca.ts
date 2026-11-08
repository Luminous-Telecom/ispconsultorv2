import { formatDateOnly } from '../../utils/timezoneUtils';

export function hojeIso(agora: Date = new Date()): string {
  return formatDateOnly(agora) ?? '1970-01-01';
}

export function adicionarDias(iso: string, dias: number): string {
  const [ano, mes, dia] = iso.slice(0, 10).split('-').map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  data.setUTCDate(data.getUTCDate() + dias);
  return formatarUtc(data);
}

export function adicionarMeses(iso: string, meses: number): string {
  const [ano, mes, dia] = iso.slice(0, 10).split('-').map(Number);
  const data = new Date(Date.UTC(ano, mes - 1 + meses, dia));
  return formatarUtc(data);
}

export function diferencaDias(de: string, ate: string): number {
  const inicio = Date.parse(`${de.slice(0, 10)}T00:00:00Z`);
  const fim = Date.parse(`${ate.slice(0, 10)}T00:00:00Z`);
  return Math.round((fim - inicio) / 86400000);
}

export function diaDoMes(iso: string): number {
  return Number(iso.slice(8, 10));
}

export function dataLocal(iso: string): Date {
  const [ano, mes, dia] = iso.slice(0, 10).split('-').map(Number);
  return new Date(ano, mes - 1, dia, 0, 0, 0, 0);
}

export function ehIsoData(valor: string | undefined): valor is string {
  return !!valor && /^\d{4}-\d{2}-\d{2}$/.test(valor);
}

export function ehIsoMes(valor: string | undefined): valor is string {
  return !!valor && /^\d{4}-\d{2}$/.test(valor);
}

export function limitesDoMes(mes: string): { inicio: string; fimExclusivo: string } {
  const inicio = `${mes}-01`;
  return { inicio, fimExclusivo: adicionarMeses(inicio, 1) };
}

function formatarUtc(data: Date): string {
  const ano = data.getUTCFullYear();
  const mes = String(data.getUTCMonth() + 1).padStart(2, '0');
  const dia = String(data.getUTCDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}
