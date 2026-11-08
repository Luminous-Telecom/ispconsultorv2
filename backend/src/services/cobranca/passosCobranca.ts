import { adicionarDias } from './datasCobranca';

export const configPadraoEnvioBoletos = {
  antesVencimento: [10, 5, 2],
  mesmoDia: true,
  depoisVencimento: [1, 5, 10, 15],
};

export type MomentoCobranca = 'antes' | 'mesmo' | 'depois';
export type CanalCobranca = 'email' | 'whatsapp';

export interface PassoCobranca {
  dias: number;
  momento: MomentoCobranca;
  tipoMensagem: string;
}

export interface PassoAtivo extends PassoCobranca {
  canais: CanalCobranca[];
}

export interface ConfigEnvioBoletos {
  antesVencimento?: number[];
  mesmoDia?: boolean;
  depoisVencimento?: number[];
}

export function tipoMensagemDoPasso(momento: MomentoCobranca, dias: number): string {
  if (momento === 'mesmo') return 'mesmo_dia_vencimento';
  const prefixo = String(dias).padStart(2, '0');
  return momento === 'antes'
    ? `${prefixo}_dias_antes_vencimento`
    : `${prefixo}_dias_depois_vencimento`;
}

export function configEnvioDeJson(valor: unknown): ConfigEnvioBoletos {
  let bruto = valor;
  if (typeof bruto === 'string') {
    try {
      bruto = JSON.parse(bruto) as unknown;
    } catch {
      return {};
    }
  }
  if (!bruto || typeof bruto !== 'object') return {};
  const obj = bruto as Record<string, unknown>;
  return {
    antesVencimento: Array.isArray(obj.antesVencimento) ? obj.antesVencimento.map(Number) : undefined,
    depoisVencimento: Array.isArray(obj.depoisVencimento) ? obj.depoisVencimento.map(Number) : undefined,
    mesmoDia: typeof obj.mesmoDia === 'boolean' ? obj.mesmoDia : undefined,
  };
}

export function passosDaConfig(config: ConfigEnvioBoletos = {}): PassoCobranca[] {
  const antes = diasValidos(config.antesVencimento, configPadraoEnvioBoletos.antesVencimento);
  const depois = diasValidos(config.depoisVencimento, configPadraoEnvioBoletos.depoisVencimento);
  const mesmoDia = config.mesmoDia ?? configPadraoEnvioBoletos.mesmoDia;
  const passos: PassoCobranca[] = antes.map((dias) => ({
    dias,
    momento: 'antes',
    tipoMensagem: tipoMensagemDoPasso('antes', dias),
  }));
  if (mesmoDia) {
    passos.push({ dias: 0, momento: 'mesmo', tipoMensagem: tipoMensagemDoPasso('mesmo', 0) });
  }
  for (const dias of depois) {
    passos.push({ dias, momento: 'depois', tipoMensagem: tipoMensagemDoPasso('depois', dias) });
  }
  return passos;
}

export function passosAtivos(
  config: unknown,
  mensagens: Array<{ tipo: string; canal: CanalCobranca }>
): PassoAtivo[] {
  return passosDaConfig(configEnvioDeJson(config))
    .map((passo) => ({
      ...passo,
      canais: mensagens
        .filter((mensagem) => mensagem.tipo === passo.tipoMensagem)
        .map((mensagem) => mensagem.canal)
        .filter((canal, index, lista) => lista.indexOf(canal) === index),
    }))
    .filter((passo) => passo.canais.length > 0);
}

export function dataEnvioDoPasso(dataVencimento: string, passo: PassoCobranca): string {
  if (passo.momento === 'antes') return adicionarDias(dataVencimento, -passo.dias);
  if (passo.momento === 'depois') return adicionarDias(dataVencimento, passo.dias);
  return dataVencimento.slice(0, 10);
}

function diasValidos(dias: number[] | undefined, padrao: number[]): number[] {
  const fonte = dias && dias.length > 0 ? dias : padrao;
  const vistos = new Set<number>();
  const saida: number[] = [];
  for (const item of fonte) {
    const numero = Number(item);
    if (!Number.isInteger(numero) || numero <= 0 || numero > 90 || vistos.has(numero)) continue;
    vistos.add(numero);
    saida.push(numero);
  }
  return saida.length > 0 ? saida : padrao;
}
