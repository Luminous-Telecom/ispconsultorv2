import { Cliente } from '../models/Cliente';
import { Contrato } from '../models/Contrato';
import { Titulo } from '../models/Titulo';
import { ClienteVariableHandler } from './variable-handlers/ClienteVariableHandler';
import { ContratoVariableHandler } from './variable-handlers/ContratoVariableHandler';
import { TituloVariableHandler } from './variable-handlers/TituloVariableHandler';
import { FinanceiroVariableHandler } from './variable-handlers/FinanceiroVariableHandler';
import { SistemaVariableHandler } from './variable-handlers/SistemaVariableHandler';
import { EmpresaVariableHandler } from './variable-handlers/EmpresaVariableHandler';
import { VariableContext, GrupoVariaveis } from './variable-handlers/types';

interface DadosVariaveis {
  cliente?: Cliente;
  contrato?: Contrato | (Partial<Contrato> & { id: number });
  titulo?: Titulo;
  dataReferencia?: Date;
}

export class VariaveisDocumentoService {
  // Handlers para processamento de variáveis
  private static readonly handlers = [
    new ClienteVariableHandler(),
    new ContratoVariableHandler(),
    new TituloVariableHandler(),
    new FinanceiroVariableHandler(),
    new SistemaVariableHandler(),
    new EmpresaVariableHandler()
  ];

  /**
   * Lista de todas as variáveis disponíveis
   * Agora gerada automaticamente a partir dos handlers
   */
  static getVariaveisDisponiveis() {
    const resultado: Record<string, GrupoVariaveis> = {};

    for (const handler of this.handlers) {
      const grupo = handler.getVariaveisDisponiveis();
      const chave = this.obterChaveDoGrupo(grupo.titulo);
      resultado[chave] = grupo;
    }

    return resultado;
  }

  /**
   * Obtém a chave do grupo baseado no título
   */
  private static obterChaveDoGrupo(titulo: string): string {
    const mapeamento: Record<string, string> = {
      'Dados do Cliente': 'cliente',
      'Dados do Contrato': 'contrato',
      'Dados do Título/Parcela': 'titulo',
      'Dados Financeiros': 'financeiro',
      'Dados do Sistema': 'sistema',
      'Dados da Empresa': 'empresa'
    };

    return mapeamento[titulo] || titulo.toLowerCase().replace(/\s+/g, '_');
  }

  /**
   * Processa variáveis em um texto
   */
  static async processarVariaveis(
    conteudo: string,
    dados: DadosVariaveis,
    baseUrl?: string
  ): Promise<string> {
    const context: VariableContext = {
      cliente: dados.cliente,
      contrato: dados.contrato,
      titulo: dados.titulo,
      dataReferencia: dados.dataReferencia || new Date(),
      baseUrl
    };

    let resultado = conteudo;

    // Processar variáveis usando handlers
    for (const handler of this.handlers) {
      if (!handler.canProcess(resultado)) {
        continue;
      }

      const processResult = handler.process(resultado, context);
      resultado = await Promise.resolve(processResult);
    }

    return resultado;
  }

}

