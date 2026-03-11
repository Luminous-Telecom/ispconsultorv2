import { Cliente } from '../../../models/clientes/Cliente';
import { Contrato } from '../../../models/contratos/Contrato';
import { Titulo } from '../../../models/financeiro/Titulo';
import {
  ClienteVariableHandler,
  ContratoVariableHandler,
  TituloVariableHandler,
  FinanceiroVariableHandler,
  SistemaVariableHandler,
  EmpresaVariableHandler,
  VariableContext,
  GrupoVariaveis,
  VariableHandler
} from '../../variable-handlers';

/**
 * Dados disponíveis para processamento de variáveis em documentos
 */
import type { TituloComRelacoes } from '../../../controllers/titulos/TituloHelpers/types';

export interface DadosVariaveis {
  cliente?: Cliente;
  contrato?: Contrato | (Partial<Contrato> & { id: number });
  titulo?: Titulo | TituloComRelacoes;
  dataReferencia?: Date;
  /** ID da empresa para multi-tenant (contratos, recibos, etc.) */
  empresaId?: number | null;
}

/**
 * Serviço responsável por processar variáveis em documentos.
 * 
 * Atua como orquestrador delegando o processamento para handlers específicos
 * seguindo o padrão Strategy para manter baixo acoplamento e alta coesão.
 * 
 * Cada handler é responsável por processar um grupo específico de variáveis:
 * - ClienteVariableHandler: Variáveis relacionadas ao cliente
 * - ContratoVariableHandler: Variáveis relacionadas ao contrato
 * - TituloVariableHandler: Variáveis relacionadas ao título/parcela
 * - FinanceiroVariableHandler: Variáveis financeiras calculadas
 * - SistemaVariableHandler: Variáveis do sistema (data, hora, etc.)
 * - EmpresaVariableHandler: Variáveis da empresa
 */
export class VariaveisDocumentoService {
  /**
   * Lista de handlers registrados para processamento de variáveis.
   * Ordem de processamento: Cliente -> Contrato -> Título -> Financeiro -> Sistema -> Empresa
   */
  private static readonly handlers: readonly VariableHandler[] = [
    new ClienteVariableHandler(),
    new ContratoVariableHandler(),
    new TituloVariableHandler(),
    new FinanceiroVariableHandler(),
    new SistemaVariableHandler(),
    new EmpresaVariableHandler()
  ];

  /**
   * Mapeamento de títulos de grupos para chaves de identificação
   */
  private static readonly grupoChaveMap: Readonly<Record<string, string>> = {
    'Dados do Cliente': 'cliente',
    'Dados do Contrato': 'contrato',
    'Dados do Título/Parcela': 'titulo',
    'Dados Financeiros': 'financeiro',
    'Dados do Sistema': 'sistema',
    'Dados da Empresa': 'empresa'
  };

  /**
   * Retorna todas as variáveis disponíveis agrupadas por categoria.
   * 
   * As variáveis são coletadas automaticamente de todos os handlers registrados,
   * garantindo que a lista sempre esteja sincronizada com os handlers disponíveis.
   * 
   * @returns Objeto com chaves sendo os grupos e valores sendo as informações das variáveis
   * 
   * @example
   * ```typescript
   * const variaveis = VariaveisDocumentoService.getVariaveisDisponiveis();
   * ```
   */
  static getVariaveisDisponiveis(): Record<string, GrupoVariaveis> {
    const resultado: Record<string, GrupoVariaveis> = {};

    for (const handler of this.handlers) {
      const grupo = handler.getVariaveisDisponiveis();
      const chave = this.obterChaveDoGrupo(grupo.titulo);
      resultado[chave] = grupo;
    }

    return resultado;
  }

  /**
   * Processa todas as variáveis presentes no conteúdo do documento.
   * 
   * O processamento é feito sequencialmente através dos handlers registrados.
   * Cada handler verifica se pode processar o conteúdo antes de executar,
   * otimizando a performance ao evitar processamento desnecessário.
   * 
   * @param conteudo - Texto contendo variáveis a serem processadas (ex: "#cliente.razao_social#")
   * @param dados - Dados disponíveis para substituição das variáveis
   * @param baseUrl - URL base para geração de links (opcional)
   * @returns Promise com o conteúdo processado e variáveis substituídas
   * 
   * @example
   * ```typescript
   * const conteudo = "Olá #cliente.razao_social#, seu contrato #contrato.id# vence em #titulo.vencimento#";
   * const resultado = await VariaveisDocumentoService.processarVariaveis(conteudo, {
   *   cliente: clienteInstance,
   *   contrato: contratoInstance,
   *   titulo: tituloInstance
   * });
   * ```
   */
  static async processarVariaveis(
    conteudo: string,
    dados: DadosVariaveis,
    baseUrl?: string
  ): Promise<string> {
    if (!conteudo || typeof conteudo !== 'string') {
      return conteudo;
    }

    const context = this.criarContexto(dados, baseUrl);
    let resultado = conteudo;

    for (const handler of this.handlers) {
      if (!handler.canProcess(resultado)) {
        continue;
      }

      try {
        const processResult = handler.process(resultado, context);
        resultado = await Promise.resolve(processResult);
      } catch (error) {
        // Erro silenciosamente tratado - handler específico já registrou o erro
        // Continua processamento mesmo em caso de erro em um handler
      }
    }

    return resultado;
  }

  /**
   * Cria o contexto de variáveis a partir dos dados fornecidos.
   * 
   * @param dados - Dados disponíveis para processamento
   * @param baseUrl - URL base para links (opcional)
   * @returns Contexto configurado para os handlers
   */
  private static criarContexto(dados: DadosVariaveis, baseUrl?: string): VariableContext {
    const empresaId = dados.empresaId ?? (dados.titulo as { empresa_id?: number | null })?.empresa_id ?? (dados.cliente as { empresa_id?: number | null })?.empresa_id ?? (dados.contrato as { empresa_id?: number | null })?.empresa_id;
    return {
      cliente: dados.cliente,
      contrato: dados.contrato,
      titulo: dados.titulo,
      dataReferencia: dados.dataReferencia || new Date(),
      baseUrl,
      empresaId
    };
  }

  /**
   * Obtém a chave de identificação do grupo baseado no título.
   * 
   * Utiliza mapeamento pré-definido para garantir consistência.
   * Se o título não estiver mapeado, gera uma chave baseada no título.
   * 
   * @param titulo - Título do grupo de variáveis
   * @returns Chave de identificação do grupo
   */
  private static obterChaveDoGrupo(titulo: string): string {
    if (titulo in this.grupoChaveMap) {
      return this.grupoChaveMap[titulo];
    }

    // Fallback: gera chave a partir do título
    return titulo.toLowerCase().replace(/\s+/g, '_');
  }
}
