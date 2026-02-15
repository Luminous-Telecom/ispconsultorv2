export interface PlanoForm {
  nome_plano: string;
  tipo_servico: 'infraestrutura' | 'consultoria' | 'blockdomi';
  descricao: string;
  valor_mensal: number;
  quantidade_usuarios: number;
  periodicidade: 'mensal' | 'trimestral' | 'semestral' | 'anual' | 'bimestral' | 'quinzenal' | 'semanal';
  servicos_inclusos: string[];
  renovacao_automatica: boolean;
  status: 'ativo' | 'inativo';
  data_inicio: string;
  data_fim: string;
  observacoes: string;
}

export interface PlanoTabProps {
  formData: PlanoForm;
  errors: Partial<PlanoForm>;
  handleInputChange: (field: keyof PlanoForm, value: string | number | boolean | string[]) => void;
  handleServiceToggle: (service: string) => void;
  servicosDisponiveis: string[];
  isSubmitting: boolean;
}

