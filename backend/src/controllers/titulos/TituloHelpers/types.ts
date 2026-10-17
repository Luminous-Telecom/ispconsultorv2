import { Titulo } from '../../../models/financeiro/Titulo';
import { Cliente } from '../../../models/clientes/Cliente';
import { Banco } from '../../../models/cadastros/Banco';
import { Contrato } from '../../../models/contratos/Contrato';
import { Plano } from '../../../models/cadastros/Plano';

export type TituloComRelacoes = Titulo & {
  cliente?: Cliente & { nome?: string; cpf?: string; cnpj?: string };
  banco?: Banco;
  contrato?: Contrato;
  plano?: Plano;
};

