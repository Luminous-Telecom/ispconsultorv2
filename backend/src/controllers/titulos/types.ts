import { Titulo } from '../../models/Titulo';
import { Cliente } from '../../models/Cliente';
import { Banco } from '../../models/Banco';
import { Contrato } from '../../models/Contrato';
import { Plano } from '../../models/Plano';

// Interface para Titulo com relações carregadas
export interface TituloComRelacoes extends Titulo {
  cliente?: Cliente & { nome?: string; cpf?: string; cnpj?: string };
  banco?: Banco;
  contrato?: Contrato;
  plano?: Plano;
}

