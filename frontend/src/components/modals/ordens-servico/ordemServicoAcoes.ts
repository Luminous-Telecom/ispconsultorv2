export type OrdemServicoAcao =
  | 'agendar'
  | 'encaminhar'
  | 'executar'
  | 'finalizar'
  | 'reabrir'
  | 'registrar_mensagem';

export interface OrdemServicoAcaoConfig {
  key: OrdemServicoAcao;
  label: string;
}

export const ORDEM_SERVICO_ACOES: OrdemServicoAcaoConfig[] = [
  { key: 'agendar', label: 'Agendar' },
  { key: 'encaminhar', label: 'Encaminhar' },
  { key: 'executar', label: 'Executar' },
  { key: 'finalizar', label: 'Finalizar' },
  { key: 'reabrir', label: 'Reabrir' },
  { key: 'registrar_mensagem', label: 'Registrar mensagem' },
];

/** OS criada apenas no BackNet, sem vínculo IXC. */
export const isOrdemServicoLocal = (
  ordem?: { origem?: string; ixc_id?: string } | null
): boolean => ordem?.origem === 'backnet';

export const isOrdemServicoExcluivel = (ordem?: { status?: string } | null): boolean =>
  ordem != null && ordem.status !== 'F';

/** Limpa assunto e colaborador ao trocar o setor no formulário. */
export function clearDependentesAoMudarSetor(
  values: { id_assunto?: string; id_tecnico?: string },
  onFieldChange: (field: 'id_assunto' | 'id_tecnico', value: string) => void,
  clearNames: { assunto?: () => void; tecnico?: () => void }
): void {
  if (values.id_assunto) {
    onFieldChange('id_assunto', '');
    clearNames.assunto?.();
  }
  if (values.id_tecnico) {
    onFieldChange('id_tecnico', '');
    clearNames.tecnico?.();
  }
}
