import { buildPagination, StandardPagination } from '../../utils/pagination';
import { diferencaDias } from './datasCobranca';
import { CanalCobranca, dataEnvioDoPasso, PassoAtivo } from './passosCobranca';

export type SituacaoAgenda = 'vai_sair' | 'sai_hoje' | 'ja_passou';

export interface TituloAgenda {
  id: number;
  numeroTitulo: string;
  valor: number;
  clienteId: number;
  clienteNome: string;
  recebeEmail: boolean;
  recebeWhatsapp: boolean;
  dataVencimento: string;
}

export interface AgendaItem {
  id: string;
  titulo_id: number;
  cliente_id: number;
  cliente: string;
  numero_titulo: string;
  valor: number;
  data_vencimento: string;
  data_envio: string;
  tipo_mensagem: string;
  momento: PassoAtivo['momento'];
  dias: number;
  canal: CanalCobranca;
  situacao: SituacaoAgenda;
}

export interface AgendaMontada {
  itens: AgendaItem[];
  pagination: StandardPagination;
  passos: PassoAtivo[];
  sem_passos: boolean;
}

const COLUNAS = ['data_envio', 'cliente', 'numero_titulo', 'data_vencimento', 'canal', 'situacao', 'valor', 'dias'] as const;

export function montarAgendaCobranca(input: {
  titulos: TituloAgenda[];
  passos: PassoAtivo[];
  hoje: string;
  dataInicio: string;
  dataFim: string;
  search?: string;
  searchField?: string;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  page: number;
  limit: number;
}): AgendaMontada {
  if (input.passos.length === 0) {
    return {
      itens: [],
      pagination: buildPagination(input.page, input.limit, 0),
      passos: [],
      sem_passos: true,
    };
  }

  const busca = (input.search ?? '').trim().toLocaleLowerCase('pt-BR');
  const campo = input.searchField === 'numero_titulo' ? 'numero_titulo' : 'cliente';
  const itens = input.titulos
    .flatMap((titulo) => linhasDoTitulo(titulo, input.passos, input.hoje))
    .filter((item) => item.data_envio >= input.dataInicio && item.data_envio <= input.dataFim)
    .filter((item) => {
      if (!busca) return true;
      const texto = campo === 'numero_titulo' ? item.numero_titulo : item.cliente;
      return texto.toLocaleLowerCase('pt-BR').includes(busca);
    });

  const coluna = COLUNAS.includes(input.sortColumn as (typeof COLUNAS)[number]) ? input.sortColumn ?? 'data_envio' : 'data_envio';
  const direcao = input.sortDirection === 'desc' ? -1 : 1;
  itens.sort((a, b) => comparar(a, b, coluna) * direcao || a.id.localeCompare(b.id));

  const inicio = (Math.max(1, input.page) - 1) * input.limit;
  return {
    itens: itens.slice(inicio, inicio + input.limit),
    pagination: buildPagination(input.page, input.limit, itens.length),
    passos: input.passos,
    sem_passos: false,
  };
}

function linhasDoTitulo(titulo: TituloAgenda, passos: PassoAtivo[], hoje: string): AgendaItem[] {
  const linhas: AgendaItem[] = [];
  for (const passo of passos) {
    const dataEnvio = dataEnvioDoPasso(titulo.dataVencimento, passo);
    for (const canal of passo.canais) {
      if (canal === 'email' && !titulo.recebeEmail) continue;
      if (canal === 'whatsapp' && !titulo.recebeWhatsapp) continue;
      const delta = diferencaDias(hoje, dataEnvio);
      linhas.push({
        id: `${titulo.id}:${passo.tipoMensagem}:${canal}`,
        titulo_id: titulo.id,
        cliente_id: titulo.clienteId,
        cliente: titulo.clienteNome,
        numero_titulo: titulo.numeroTitulo,
        valor: titulo.valor,
        data_vencimento: titulo.dataVencimento,
        data_envio: dataEnvio,
        tipo_mensagem: passo.tipoMensagem,
        momento: passo.momento,
        dias: passo.dias,
        canal,
        situacao: delta > 0 ? 'vai_sair' : delta === 0 ? 'sai_hoje' : 'ja_passou',
      });
    }
  }
  return linhas;
}

function comparar(a: AgendaItem, b: AgendaItem, coluna: string): number {
  const esquerda = valorColuna(a, coluna);
  const direita = valorColuna(b, coluna);
  if (typeof esquerda === 'number' && typeof direita === 'number') return esquerda - direita;
  return String(esquerda).localeCompare(String(direita), 'pt-BR');
}

function valorColuna(item: AgendaItem, coluna: string): string | number {
  if (coluna === 'cliente') return item.cliente;
  if (coluna === 'numero_titulo') return item.numero_titulo;
  if (coluna === 'data_vencimento') return item.data_vencimento;
  if (coluna === 'canal') return item.canal;
  if (coluna === 'situacao') return item.situacao;
  if (coluna === 'valor') return item.valor;
  if (coluna === 'dias') return item.dias;
  return item.data_envio;
}
