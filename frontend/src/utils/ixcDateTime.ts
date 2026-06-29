import { formatRpkiValidityDisplay } from './formatters';

/** IXC "AAAA-MM-DD HH:MM:SS" -> input datetime-local "AAAA-MM-DDTHH:MM". */
export function ixcToDatetimeLocal(value: string): string {
  const v = value.trim();
  if (!v || v.startsWith('0000')) return '';
  return v.replace(' ', 'T').slice(0, 16);
}

/** Input datetime-local "AAAA-MM-DDTHH:MM" -> IXC "AAAA-MM-DD HH:MM:SS". */
export function datetimeLocalToIxc(value: string): string {
  if (!value) return '';
  return `${value.replace('T', ' ')}:00`.slice(0, 19);
}

export function formatIxcData(value?: string): string {
  if (!value?.trim() || value.startsWith('0000-00-00')) return '-';
  return formatRpkiValidityDisplay(value);
}
