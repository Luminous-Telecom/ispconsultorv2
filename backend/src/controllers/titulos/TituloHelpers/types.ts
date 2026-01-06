import { Titulo } from '../../../models/Titulo';
import type { InferAttributes } from 'sequelize';
import { Cliente } from '../../../models/Cliente';
import { Banco } from '../../../models/Banco';
import { Contrato } from '../../../models/Contrato';
import { Plano } from '../../../models/Plano';

// Interface para Titulo com relações carregadas
// Usa InferAttributes para obter os atributos do modelo Sequelize
export type TituloComRelacoes = InferAttributes<Titulo> & {
  cliente?: Cliente & { nome?: string; cpf?: string; cnpj?: string };
  banco?: Banco;
  contrato?: Contrato;
  plano?: Plano;
  // Métodos do Sequelize quando necessário (para instâncias do modelo)
  update?: (values: Partial<InferAttributes<Titulo>>) => Promise<TituloComRelacoes>;
  reload?: () => Promise<TituloComRelacoes>;
  toJSON?: () => InferAttributes<Titulo>;
};

