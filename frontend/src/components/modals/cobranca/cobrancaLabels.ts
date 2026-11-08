import type { TranslationKeys } from 'contexts/I18nContext';
import { AgendaCobrancaItem, FaixaAtrasoIndicador } from 'services/cobrancaPainelService';

type Translate = (key: keyof TranslationKeys, params?: Record<string, unknown>) => string;

const FAIXA_KEY: Record<FaixaAtrasoIndicador['faixa'], keyof TranslationKeys> = {
  '1_15': 'cobranca.faixa.1_15',
  '16_30': 'cobranca.faixa.16_30',
  '31_60': 'cobranca.faixa.31_60',
  '61_90': 'cobranca.faixa.61_90',
  '91_mais': 'cobranca.faixa.91_mais',
};

const SITUACAO_KEY: Record<AgendaCobrancaItem['situacao'], keyof TranslationKeys> = {
  vai_sair: 'cobranca.willSend',
  sai_hoje: 'cobranca.sendsToday',
  ja_passou: 'cobranca.alreadyPassed',
};

const CANAL_KEY: Record<AgendaCobrancaItem['canal'], keyof TranslationKeys> = {
  email: 'cobranca.channelEmail',
  whatsapp: 'cobranca.channelWhatsapp',
};

export function rotuloFaixa(t: Translate, faixa: FaixaAtrasoIndicador['faixa']): string {
  return t(FAIXA_KEY[faixa]);
}

export function rotuloSituacao(t: Translate, situacao: AgendaCobrancaItem['situacao']): string {
  return t(SITUACAO_KEY[situacao]);
}

export function rotuloCanal(t: Translate, canal: AgendaCobrancaItem['canal']): string {
  return t(CANAL_KEY[canal]);
}

export function rotuloPasso(t: Translate, momento: AgendaCobrancaItem['momento'], dias: number): string {
  if (momento === 'mesmo') return t('cobranca.stepSame');
  if (momento === 'antes') return t('cobranca.stepBefore', { days: dias });
  return t('cobranca.stepAfter', { days: dias });
}

export function formatarPercentual(valor: number, language: string): string {
  return `${valor.toLocaleString(language, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

export function mesAtual(): string {
  const agora = new Date();
  return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`;
}

export function dataIso(data: Date): string {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
}

export function somarDiasIso(iso: string, dias: number): string {
  const [ano, mes, dia] = iso.split('-').map(Number);
  const data = new Date(ano, mes - 1, dia);
  data.setDate(data.getDate() + dias);
  return dataIso(data);
}
