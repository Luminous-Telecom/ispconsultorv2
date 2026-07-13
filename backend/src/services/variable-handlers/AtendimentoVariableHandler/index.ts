import { VariableHandler, VariableContext, VariableSubstitutions, GrupoVariaveis } from '../types';
import { VariableReplacer } from '../utils/VariableReplacer';
import { formatDateTime } from '../../../utils/dateUtils';
import { buildAtendimentoInteracoesHtml } from '../../../constants/atendimentoPdfTemplate';

const STATUS_LABELS: Record<string, string> = {
  N: 'Novo',
  P: 'Pendente',
  EP: 'Em progresso',
  S: 'Solucionado',
  C: 'Cancelado',
};

const PRIORIDADE_LABELS: Record<string, string> = {
  B: 'Baixa',
  N: 'Normal',
  A: 'Alta',
  C: 'Crítica',
};

const HORARIO_LABELS: Record<string, string> = {
  Q: 'Qualquer horário',
  M: 'Manhã',
  T: 'Tarde',
  N: 'Noite',
};

type AtendimentoVars = NonNullable<VariableContext['atendimento']>;

export class AtendimentoVariableHandler implements VariableHandler {
  private static readonly VARIABLES = [
    '#atendimento.id#',
    '#atendimento.protocolo#',
    '#atendimento.status#',
    '#atendimento.prioridade#',
    '#atendimento.titulo#',
    '#atendimento.menssagem#',
    '#atendimento.data_reservada#',
    '#atendimento.melhor_horario_reserva#',
    '#atendimento.ultima_atualizacao#',
    '#atendimento.data_criacao#',
    '#atendimento.departamento#',
    '#atendimento.responsavel#',
    '#atendimento.filial#',
    '#atendimento.estrutura#',
    '#atendimento.assunto#',
    '#atendimento.interacoes#',
  ];

  canProcess(conteudo: string): boolean {
    return VariableReplacer.containsAny(conteudo, AtendimentoVariableHandler.VARIABLES);
  }

  getVariaveisDisponiveis(): GrupoVariaveis {
    return {
      titulo: 'Dados do Atendimento',
      variaveis: [
        { variavel: '#atendimento.id#', descricao: 'ID do atendimento' },
        { variavel: '#atendimento.protocolo#', descricao: 'Protocolo' },
        { variavel: '#atendimento.status#', descricao: 'Status' },
        { variavel: '#atendimento.prioridade#', descricao: 'Prioridade' },
        { variavel: '#atendimento.titulo#', descricao: 'Descrição do assunto' },
        { variavel: '#atendimento.menssagem#', descricao: 'Descrição / mensagem' },
        { variavel: '#atendimento.data_reservada#', descricao: 'Data reservada' },
        { variavel: '#atendimento.melhor_horario_reserva#', descricao: 'Melhor horário reserva' },
        { variavel: '#atendimento.ultima_atualizacao#', descricao: 'Última atualização' },
        { variavel: '#atendimento.data_criacao#', descricao: 'Data de criação' },
        { variavel: '#atendimento.departamento#', descricao: 'Departamento' },
        { variavel: '#atendimento.responsavel#', descricao: 'Colaborador responsável' },
        { variavel: '#atendimento.filial#', descricao: 'Filial' },
        { variavel: '#atendimento.estrutura#', descricao: 'Estrutura' },
        { variavel: '#atendimento.assunto#', descricao: 'Assunto' },
      ],
    };
  }

  process(conteudo: string, context: VariableContext): string {
    if (!context.atendimento && !context.atendimentoMensagens?.length) return conteudo;

    const substitutions = context.atendimento
      ? this.buildSubstitutions(context.atendimento)
      : ({} as VariableSubstitutions);

    if (VariableReplacer.containsAny(conteudo, ['#atendimento.interacoes#'])) {
      substitutions['#atendimento.interacoes#'] = buildAtendimentoInteracoesHtml(
        context.atendimentoMensagens ?? []
      );
    }

    return VariableReplacer.replace(conteudo, substitutions);
  }

  private buildSubstitutions(atendimento: AtendimentoVars): VariableSubstitutions {
    const statusKey = String(atendimento.su_status ?? '');
    const prioridadeKey = String(atendimento.prioridade ?? '');
    const horarioKey = String(atendimento.melhor_horario_reserve ?? '');

    return {
      '#atendimento.id#': String(atendimento.id ?? ''),
      '#atendimento.protocolo#': String(atendimento.protocolo ?? ''),
      '#atendimento.status#': STATUS_LABELS[statusKey] || statusKey,
      '#atendimento.prioridade#': PRIORIDADE_LABELS[prioridadeKey] || prioridadeKey,
      '#atendimento.titulo#': String(atendimento.titulo ?? ''),
      '#atendimento.menssagem#': String(atendimento.menssagem ?? ''),
      '#atendimento.data_reservada#': formatDateTime(String(atendimento.data_reservada ?? '')) || '',
      '#atendimento.melhor_horario_reserva#': HORARIO_LABELS[horarioKey] || horarioKey,
      '#atendimento.ultima_atualizacao#': formatDateTime(String(atendimento.ultima_atualizacao ?? '')) || '',
      '#atendimento.data_criacao#': formatDateTime(String(atendimento.data_criacao ?? '')) || '',
      '#atendimento.departamento#': String(atendimento.departamento_nome ?? ''),
      '#atendimento.responsavel#': String(atendimento.responsavel_nome ?? ''),
      '#atendimento.filial#': String(atendimento.filial_nome ?? ''),
      '#atendimento.estrutura#': String(atendimento.estrutura_nome ?? ''),
      '#atendimento.assunto#': String(atendimento.assunto_nome ?? ''),
    };
  }
}
