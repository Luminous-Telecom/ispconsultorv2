export interface PlanoForm {
  nome_plano: string;
  tipo_servico: 'internet' | 'telefonia' | 'tv' | 'suporte' | 'infraestrutura' | 'consultoria' | 'outros';
  descricao: string;
  valor_mensal: number;
  desconto_percentual: number;
  desconto_valor: number;
  desconto_ativo: boolean;
  quantidade_usuarios: number;
  periodicidade: 'mensal' | 'trimestral' | 'semestral' | 'anual' | 'bimestral' | 'quinzenal' | 'semanal';
  servicos_inclusos: string[];
  renovacao_automatica: boolean;
  status: 'ativo' | 'inativo' | 'cancelado';
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

