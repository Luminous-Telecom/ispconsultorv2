import { diaDoMes, diferencaDias, limitesDoMes } from './datasCobranca';

export const VOLUME_MINIMO_DIA = 10;

export type FaixaAtraso = '1_15' | '16_30' | '31_60' | '61_90' | '91_mais';

export interface TituloCalculo {
  clienteId: number;
  status: string;
  pago: boolean;
  valor: number;
  valorAberto: number | null;
  dataVencimento: string;
  dataPagamento?: string | null;
}

export interface FaixaIndicador {
  faixa: FaixaAtraso;
  titulos: number;
  clientes: number;
  valor: number;
}

export interface DiaPagamentoIndicador {
  dia: number;
  titulos: number;
  percentual_no_prazo: number;
  percentual_ate_5_dias: number;
  atraso_medio_dias: number;
  abaixo_do_minimo: boolean;
}

export interface IndicadoresCobranca {
  mes: string;
  inadimplencia_mes: { percentual: number; valor_aberto: number; valor_base: number };
  inadimplencia_estoque: { percentual: number; valor_aberto: number; valor_base: number };
  clientes: { inadimplentes: number; com_contrato_ativo: number; percentual: number };
  atraso_medio_dias: number;
  valor_em_atraso: number;
  faixas: FaixaIndicador[];
  melhores_datas: DiaPagamentoIndicador[];
  melhor_dia: number | null;
  volume_minimo: number;
}

const FAIXAS: FaixaAtraso[] = ['1_15', '16_30', '31_60', '61_90', '91_mais'];

export function calcularIndicadoresCobranca(input: {
  mes: string;
  hoje: string;
  doMes: TituloCalculo[];
  emAtraso: TituloCalculo[];
  valorBaseVencido: number;
  pagos: TituloCalculo[];
  clientesComContratoAtivo: number;
}): IndicadoresCobranca {
  const { inicio, fimExclusivo } = limitesDoMes(input.mes);
  const doMes = input.doMes.filter(
    (titulo) =>
      titulo.status !== 'cancelado' &&
      titulo.dataVencimento >= inicio &&
      titulo.dataVencimento < fimExclusivo
  );
  const abertoMes = somarCentavos(doMes.map(centavosEmAberto));
  const baseMes = somarCentavos(doMes.map((titulo) => paraCentavos(titulo.valor)));

  const emAtraso = input.emAtraso.filter(
    (titulo) => titulo.status !== 'cancelado' && titulo.dataVencimento < input.hoje && centavosEmAberto(titulo) > 0
  );
  const abertoEstoque = somarCentavos(emAtraso.map(centavosEmAberto));
  const baseEstoque = paraCentavos(Math.max(0, input.valorBaseVencido));

  const faixas = montarFaixas(emAtraso, input.hoje);
  const diasAtraso = emAtraso.map((titulo) => diferencaDias(titulo.dataVencimento, input.hoje));
  const clientesInadimplentes = new Set(emAtraso.map((titulo) => titulo.clienteId)).size;

  const melhores = melhoresDatas(input.pagos);
  const elegiveis = melhores.filter((dia) => !dia.abaixo_do_minimo);
  const melhor = [...elegiveis].sort(
    (a, b) => b.percentual_no_prazo - a.percentual_no_prazo || b.titulos - a.titulos || a.dia - b.dia
  )[0];

  return {
    mes: input.mes,
    inadimplencia_mes: {
      percentual: percentual(abertoMes, baseMes),
      valor_aberto: deCentavos(abertoMes),
      valor_base: deCentavos(baseMes),
    },
    inadimplencia_estoque: {
      percentual: percentual(abertoEstoque, baseEstoque),
      valor_aberto: deCentavos(abertoEstoque),
      valor_base: deCentavos(baseEstoque),
    },
    clientes: {
      inadimplentes: clientesInadimplentes,
      com_contrato_ativo: input.clientesComContratoAtivo,
      percentual: percentual(clientesInadimplentes, input.clientesComContratoAtivo),
    },
    atraso_medio_dias: media(diasAtraso),
    valor_em_atraso: deCentavos(abertoEstoque),
    faixas,
    melhores_datas: melhores,
    melhor_dia: melhor?.dia ?? null,
    volume_minimo: VOLUME_MINIMO_DIA,
  };
}

function montarFaixas(titulos: TituloCalculo[], hoje: string): FaixaIndicador[] {
  const grupos = new Map<FaixaAtraso, TituloCalculo[]>();
  for (const faixa of FAIXAS) grupos.set(faixa, []);
  for (const titulo of titulos) {
    const dias = diferencaDias(titulo.dataVencimento, hoje);
    if (dias < 1) continue;
    grupos.get(faixaDe(dias))?.push(titulo);
  }
  return FAIXAS.map((faixa) => {
    const itens = grupos.get(faixa) ?? [];
    return {
      faixa,
      titulos: itens.length,
      clientes: new Set(itens.map((titulo) => titulo.clienteId)).size,
      valor: deCentavos(somarCentavos(itens.map(centavosEmAberto))),
    };
  });
}

function melhoresDatas(pagos: TituloCalculo[]): DiaPagamentoIndicador[] {
  const porDia = new Map<number, TituloCalculo[]>();
  for (const titulo of pagos) {
    if (!titulo.dataPagamento) continue;
    if (titulo.status !== 'pago' && titulo.status !== 'pago_atraso' && !titulo.pago) continue;
    const dia = diaDoMes(titulo.dataVencimento);
    const lista = porDia.get(dia) ?? [];
    lista.push(titulo);
    porDia.set(dia, lista);
  }
  return [...porDia.entries()]
    .map(([dia, itens]) => {
      const noPrazo = itens.filter((titulo) => (titulo.dataPagamento ?? '') <= titulo.dataVencimento).length;
      const ate5 = itens.filter(
        (titulo) => diferencaDias(titulo.dataVencimento, titulo.dataPagamento ?? titulo.dataVencimento) <= 5
      ).length;
      const atrasos = itens.map((titulo) =>
        diferencaDias(titulo.dataVencimento, titulo.dataPagamento ?? titulo.dataVencimento)
      );
      return {
        dia,
        titulos: itens.length,
        percentual_no_prazo: percentual(noPrazo, itens.length),
        percentual_ate_5_dias: percentual(ate5, itens.length),
        atraso_medio_dias: media(atrasos),
        abaixo_do_minimo: itens.length < VOLUME_MINIMO_DIA,
      };
    })
    .sort(
      (a, b) =>
        Number(a.abaixo_do_minimo) - Number(b.abaixo_do_minimo) ||
        b.percentual_no_prazo - a.percentual_no_prazo ||
        b.titulos - a.titulos ||
        a.dia - b.dia
    );
}

function faixaDe(dias: number): FaixaAtraso {
  if (dias <= 15) return '1_15';
  if (dias <= 30) return '16_30';
  if (dias <= 60) return '31_60';
  if (dias <= 90) return '61_90';
  return '91_mais';
}

function centavosEmAberto(titulo: TituloCalculo): number {
  if (titulo.status === 'cancelado' || titulo.pago || titulo.status === 'pago' || titulo.status === 'pago_atraso') {
    return 0;
  }
  const valor = titulo.valorAberto != null ? titulo.valorAberto : titulo.valor;
  return paraCentavos(valor);
}

function paraCentavos(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100);
}

function deCentavos(centavos: number): number {
  return centavos / 100;
}

function somarCentavos(valores: number[]): number {
  return valores.reduce((total, valor) => total + valor, 0);
}

function percentual(numerador: number, denominador: number): number {
  if (denominador <= 0) return 0;
  return Math.round((numerador / denominador) * 1000) / 10;
}

function media(valores: number[]): number {
  if (valores.length === 0) return 0;
  const soma = valores.reduce((total, valor) => total + valor, 0);
  return Math.round((soma / valores.length) * 10) / 10;
}
