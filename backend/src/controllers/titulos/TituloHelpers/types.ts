import { Titulo } from '../../../models/financeiro/Titulo';
import type { InferAttributes } from 'sequelize';
import { Cliente } from '../../../models/clientes/Cliente';
import { Banco } from '../../../models/cadastros/Banco';
import { Contrato } from '../../../models/contratos/Contrato';
import { Plano } from '../../../models/cadastros/Plano';

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

