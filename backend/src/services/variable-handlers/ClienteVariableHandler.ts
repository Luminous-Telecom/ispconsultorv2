import { IVariableHandler, VariableContext, VariableSubstitutions, GrupoVariaveis } from './types';
import { Cliente } from '../../models/Cliente';
import { Formatter } from './utils/Formatter';
import { VariableReplacer } from './utils/VariableReplacer';

/**
 * Handler para processamento de variáveis relacionadas ao Cliente
 */
export class ClienteVariableHandler implements IVariableHandler {
  private static readonly VARIABLES = [
    '#cliente.id#',
    '#cliente.razao_social#',
    '#cliente.nome_fantasia#',
    '#cliente.cpf_cnpj#',
    '#cliente.cnpj#',
    '#cliente.email#',
    '#cliente.telefone#',
    '#cliente.celular#',
    '#cliente.whatsapp#',
    '#cliente.endereco#',
    '#cliente.logradouro#',
    '#cliente.numero#',
    '#cliente.complemento#',
    '#cliente.bairro#',
    '#cliente.cidade#',
    '#cliente.estado#',
    '#cliente.uf#',
    '#cliente.cep#'
  ];

  getVariaveisDisponiveis(): GrupoVariaveis {
    return {
      titulo: 'Dados do Cliente',
      variaveis: [
        { variavel: '#cliente.id#', descricao: 'ID do cliente' },
        { variavel: '#cliente.razao_social#', descricao: 'Razão Social' },
        { variavel: '#cliente.nome_fantasia#', descricao: 'Nome Fantasia' },
        { variavel: '#cliente.cnpj#', descricao: 'CNPJ' },
        { variavel: '#cliente.cpf_cnpj#', descricao: 'CPF/CNPJ (legado)' },
        { variavel: '#cliente.email#', descricao: 'E-mail' },
        { variavel: '#cliente.telefone#', descricao: 'Telefone' },
        { variavel: '#cliente.whatsapp#', descricao: 'WhatsApp' },
        { variavel: '#cliente.celular#', descricao: 'Celular (legado)' },
        { variavel: '#cliente.endereco#', descricao: 'Endereço completo' },
        { variavel: '#cliente.logradouro#', descricao: 'Logradouro' },
        { variavel: '#cliente.numero#', descricao: 'Número' },
        { variavel: '#cliente.complemento#', descricao: 'Complemento' },
        { variavel: '#cliente.bairro#', descricao: 'Bairro' },
        { variavel: '#cliente.cidade#', descricao: 'Cidade' },
        { variavel: '#cliente.estado#', descricao: 'Estado (nome completo)' },
        { variavel: '#cliente.uf#', descricao: 'UF (sigla do estado)' },
        { variavel: '#cliente.cep#', descricao: 'CEP' }
      ]
    };
  }

  canProcess(conteudo: string): boolean {
    return VariableReplacer.containsAny(conteudo, ClienteVariableHandler.VARIABLES);
  }

  process(conteudo: string, context: VariableContext): string {
    if (!context.cliente) {
      return conteudo;
    }

    const cliente = context.cliente;
    const substitutions = this.buildSubstitutions(cliente);
    
    return VariableReplacer.replace(conteudo, substitutions);
  }

  /**
   * Constrói o mapa de substituições para variáveis de cliente
   */
  private buildSubstitutions(cliente: Cliente): VariableSubstitutions {
    const enderecoCompleto = Formatter.montarEnderecoCompleto([
      cliente.endereco,
      cliente.numero,
      cliente.complemento,
      cliente.bairro,
      cliente.cidade,
      cliente.estado
    ]);

    return {
      '#cliente.id#': String(cliente.id),
      '#cliente.razao_social#': cliente.razao_social || '',
      '#cliente.nome_fantasia#': cliente.nome_fantasia || '',
      '#cliente.cpf_cnpj#': cliente.cnpj || '',
      '#cliente.cnpj#': cliente.cnpj || '',
      '#cliente.email#': cliente.email || '',
      '#cliente.telefone#': cliente.telefone || '',
      '#cliente.celular#': cliente.whatsapp || '',
      '#cliente.whatsapp#': cliente.whatsapp || '',
      '#cliente.endereco#': enderecoCompleto,
      '#cliente.logradouro#': cliente.endereco || '',
      '#cliente.numero#': cliente.numero || '',
      '#cliente.complemento#': cliente.complemento || '',
      '#cliente.bairro#': cliente.bairro || '',
      '#cliente.cidade#': cliente.cidade || '',
      '#cliente.estado#': cliente.estado ? Formatter.obterNomeEstado(cliente.estado) : '',
      '#cliente.uf#': cliente.estado || '',
      '#cliente.cep#': cliente.cep || ''
    };
  }
}

