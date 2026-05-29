import type { TranslationKeys } from 'contexts/I18nContext';
import type { BlockdomiIpVersion } from './blockdomiIpListVariants';
import { isValidIPv4, isValidIPv6 } from 'utils/validators';

export interface BlockdomiIpFormVariantConfig {
  version: BlockdomiIpVersion;
  ipLabel: string;
  ipPlaceholder: string;
  ipHelpText: string;
  invalidFormatKey: keyof TranslationKeys;
  createTitleKey: keyof TranslationKeys;
  editTitleKey: keyof TranslationKeys;
  ativoFieldName: string;
  validateIp: (value: string) => boolean;
}

export const BLOCKDOMI_IP_FORM_BY_VERSION: Record<
  BlockdomiIpVersion,
  BlockdomiIpFormVariantConfig
> = {
  4: {
    version: 4,
    ipLabel: 'IPv4',
    ipPlaceholder: '192.168.1.1',
    ipHelpText:
      '4 octetos separados por ponto (0-255). Ex: 192.168.1.1. Não use ponto no final.',
    invalidFormatKey: 'blockdomi.ipv4InvalidFormat',
    createTitleKey: 'blockdomi.createIPv4',
    editTitleKey: 'blockdomi.editIPv4',
    ativoFieldName: 'ipv4-ativo',
    validateIp: isValidIPv4,
  },
  6: {
    version: 6,
    ipLabel: 'IPv6',
    ipPlaceholder: '2001:db8::1',
    ipHelpText:
      '8 grupos hex (1-4 dígitos) separados por :. Ex: 2001:db8::1. Pode usar :: uma vez para comprimir zeros. Não use : no final.',
    invalidFormatKey: 'blockdomi.ipv6InvalidFormat',
    createTitleKey: 'blockdomi.createIPv6',
    editTitleKey: 'blockdomi.editIPv6',
    ativoFieldName: 'ipv6-ativo',
    validateIp: isValidIPv6,
  },
};
