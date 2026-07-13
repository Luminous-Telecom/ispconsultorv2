import { VariableHandler, VariableContext, VariableSubstitutions, GrupoVariaveis } from '../types';
import { VariableReplacer } from '../utils/VariableReplacer';
import { formatDateTime } from '../../../utils/dateUtils';

const STATUS_LABELS: Record<string, string> = {
  A: 'Aberta',
  AG: 'Agendada',
  EN: 'Encaminhada',
  AS: 'Assumida',
  F: 'Finalizada',
  AN: 'Análise',
  DS: 'Deslocamento',
  EX: 'Execução',
  RAG: 'Reagendar',
};

const PRIORIDADE_LABELS: Record<string, string> = {
  B: 'Baixa',
  N: 'Normal',
  A: 'Alta',
  C: 'Crítica',
};

type OrdemServicoVars = NonNullable<VariableContext['ordemServico']>;

export class OrdemServicoVariableHandler implements VariableHandler {
  private static readonly VARIABLES = [
    '#ordem.id#',
    '#ordem.protocolo#',
    '#ordem.status#',
    '#ordem.prioridade#',
    '#ordem.mensagem#',
    '#ordem.mensagem_resposta#',
    '#ordem.data_abertura#',
    '#ordem.data_agenda#',
    '#ordem.data_final#',
    '#ordem.data_fechamento#',
    '#ordem.endereco#',
    '#ordem.bairro#',
    '#ordem.complemento#',
    '#ordem.referencia#',
    '#ordem.tecnico#',
    '#ordem.assunto#',
    '#ordem.setor#',
    '#ordem.filial#',
    '#ordem.estrutura#',
    '#ordem.cidade#',
  ];

  canProcess(conteudo: string): boolean {
    return VariableReplacer.containsAny(conteudo, OrdemServicoVariableHandler.VARIABLES);
  }

  getVariaveisDisponiveis(): GrupoVariaveis {
    return {
      titulo: 'Dados da Ordem de Serviço',
      variaveis: [
        { variavel: '#ordem.id#', descricao: 'ID da ordem de serviço' },
        { variavel: '#ordem.protocolo#', descricao: 'Protocolo' },
        { variavel: '#ordem.status#', descricao: 'Status' },
        { variavel: '#ordem.prioridade#', descricao: 'Prioridade' },
        { variavel: '#ordem.mensagem#', descricao: 'Descrição / mensagem' },
        { variavel: '#ordem.mensagem_resposta#', descricao: 'Mensagem de resposta' },
        { variavel: '#ordem.data_abertura#', descricao: 'Data de abertura' },
        { variavel: '#ordem.data_agenda#', descricao: 'Data agendada' },
        { variavel: '#ordem.data_final#', descricao: 'Data final' },
        { variavel: '#ordem.data_fechamento#', descricao: 'Data de fechamento' },
        { variavel: '#ordem.endereco#', descricao: 'Endereço' },
        { variavel: '#ordem.bairro#', descricao: 'Bairro' },
        { variavel: '#ordem.complemento#', descricao: 'Complemento' },
        { variavel: '#ordem.referencia#', descricao: 'Referência' },
        { variavel: '#ordem.tecnico#', descricao: 'Técnico' },
        { variavel: '#ordem.assunto#', descricao: 'Assunto' },
        { variavel: '#ordem.setor#', descricao: 'Setor' },
        { variavel: '#ordem.filial#', descricao: 'Filial' },
        { variavel: '#ordem.estrutura#', descricao: 'Estrutura' },
        { variavel: '#ordem.cidade#', descricao: 'Cidade' },
      ],
    };
  }

  process(conteudo: string, context: VariableContext): string {
    if (!context.ordemServico) return conteudo;
    return VariableReplacer.replace(conteudo, this.buildSubstitutions(context.ordemServico));
  }

  private buildSubstitutions(ordem: OrdemServicoVars): VariableSubstitutions {
    const statusKey = String(ordem.status ?? '');
    const prioridadeKey = String(ordem.prioridade ?? '');

    return {
      '#ordem.id#': String(ordem.id ?? ''),
      '#ordem.protocolo#': String(ordem.protocolo ?? ''),
      '#ordem.status#': STATUS_LABELS[statusKey] || statusKey,
      '#ordem.prioridade#': PRIORIDADE_LABELS[prioridadeKey] || prioridadeKey,
      '#ordem.mensagem#': String(ordem.mensagem ?? ''),
      '#ordem.mensagem_resposta#': String(ordem.mensagem_resposta ?? ''),
      '#ordem.data_abertura#': formatDateTime(String(ordem.data_abertura ?? '')) || '',
      '#ordem.data_agenda#': formatDateTime(String(ordem.data_agenda ?? '')) || '',
      '#ordem.data_final#': formatDateTime(String(ordem.data_final ?? '')) || '',
      '#ordem.data_fechamento#': formatDateTime(String(ordem.data_fechamento ?? '')) || '',
      '#ordem.endereco#': String(ordem.endereco ?? ''),
      '#ordem.bairro#': String(ordem.bairro ?? ''),
      '#ordem.complemento#': String(ordem.complemento ?? ''),
      '#ordem.referencia#': String(ordem.referencia ?? ''),
      '#ordem.tecnico#': String(ordem.tecnico_nome ?? ''),
      '#ordem.assunto#': String(ordem.assunto_nome ?? ''),
      '#ordem.setor#': String(ordem.setor_nome ?? ''),
      '#ordem.filial#': String(ordem.filial_nome ?? ''),
      '#ordem.estrutura#': String(ordem.estrutura_nome ?? ''),
      '#ordem.cidade#': String(ordem.cidade_nome ?? ''),
    };
  }
}
