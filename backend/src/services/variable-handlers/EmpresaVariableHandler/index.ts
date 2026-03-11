import { VariableHandler, VariableContext, VariableSubstitutions, GrupoVariaveis } from '../types';
import { DadosEmpresaService } from '../../sistema/DadosEmpresaService';
import type { DadosEmpresa } from '../../../models/sistema/DadosEmpresa';
import { Formatter } from '../utils/Formatter';
import { VariableReplacer } from '../utils/VariableReplacer';
import { ImageConverter } from '../utils/ImageConverter';

/**
 * Handler para processamento de variáveis da empresa
 */
export class EmpresaVariableHandler implements VariableHandler {
  private static readonly VARIABLES = [
    '#empresa.razao_social#',
    '#empresa.nome_fantasia#',
    '#empresa.cnpj#',
    '#empresa.ie#',
    '#empresa.im#',
    '#empresa.logo#',
    '#empresa.endereco#',
    '#empresa.logradouro#',
    '#empresa.numero#',
    '#empresa.complemento#',
    '#empresa.bairro#',
    '#empresa.cidade#',
    '#empresa.estado#',
    '#empresa.uf#',
    '#empresa.cep#',
    '#empresa.telefone#',
    '#empresa.email#',
    '#empresa.responsavel#'
  ];

  canProcess(conteudo: string): boolean {
    return VariableReplacer.containsAny(conteudo, EmpresaVariableHandler.VARIABLES);
  }

  getVariaveisDisponiveis(): GrupoVariaveis {
    return {
      titulo: 'Dados da Empresa',
      variaveis: [
        { variavel: '#empresa.razao_social#', descricao: 'Razão Social da empresa' },
        { variavel: '#empresa.nome_fantasia#', descricao: 'Nome Fantasia da empresa' },
        { variavel: '#empresa.cnpj#', descricao: 'CNPJ da empresa' },
        { variavel: '#empresa.ie#', descricao: 'Inscrição Estadual' },
        { variavel: '#empresa.im#', descricao: 'Inscrição Municipal' },
        { variavel: '#empresa.logo#', descricao: 'Logo da empresa (URL ou caminho)' },
        { variavel: '#empresa.endereco#', descricao: 'Endereço completo da empresa' },
        { variavel: '#empresa.logradouro#', descricao: 'Logradouro da empresa' },
        { variavel: '#empresa.numero#', descricao: 'Número da empresa' },
        { variavel: '#empresa.complemento#', descricao: 'Complemento da empresa' },
        { variavel: '#empresa.bairro#', descricao: 'Bairro da empresa' },
        { variavel: '#empresa.cidade#', descricao: 'Cidade da empresa' },
        { variavel: '#empresa.estado#', descricao: 'Estado (nome completo) da empresa' },
        { variavel: '#empresa.uf#', descricao: 'UF (sigla) da empresa' },
        { variavel: '#empresa.cep#', descricao: 'CEP da empresa' },
        { variavel: '#empresa.telefone#', descricao: 'Telefone da empresa' },
        { variavel: '#empresa.email#', descricao: 'E-mail da empresa' },
        { variavel: '#empresa.responsavel#', descricao: 'Responsável pela empresa' }
      ]
    };
  }

  async process(conteudo: string, context: VariableContext): Promise<string> {
    const empresa = await this.buscarDadosEmpresa(context.empresaId);
    
    if (!empresa) {
      return conteudo;
    }

    const logoHtml = await this.processarLogo(empresa.logo, conteudo);
    const substitutions = this.buildSubstitutions(empresa, logoHtml);
    
    return VariableReplacer.replace(conteudo, substitutions);
  }

  /**
   * Busca dados da empresa no banco de dados (multi-tenant)
   */
  private async buscarDadosEmpresa(empresaId?: number | null): Promise<DadosEmpresa | null> {
    return DadosEmpresaService.findOne(empresaId ?? undefined);
  }

  /**
   * Processa logo da empresa convertendo para base64 se necessário
   */
  private async processarLogo(logoUrl: string | null, conteudo: string): Promise<string> {
    if (!logoUrl || !conteudo.includes('#empresa.logo#')) {
      return '';
    }

    const logoBase64 = await ImageConverter.converterParaBase64(logoUrl);
    
    if (!logoBase64) {
      return '';
    }

    return `<img src="${logoBase64}" alt="Logo da Empresa" style="max-width: 200px; height: auto;" />`;
  }

  /**
   * Constrói o mapa de substituições para variáveis da empresa
   */
  private buildSubstitutions(
    empresa: DadosEmpresa,
    logoHtml: string
  ): VariableSubstitutions {
    const enderecoCompleto = Formatter.montarEnderecoCompleto([
      empresa.endereco,
      empresa.numero,
      empresa.complemento,
      empresa.bairro,
      empresa.cidade,
      empresa.estado,
      empresa.cep
    ]);

    return {
      '#empresa.razao_social#': empresa.razao_social || '',
      '#empresa.nome_fantasia#': empresa.nome_fantasia || '',
      '#empresa.cnpj#': empresa.cnpj || '',
      '#empresa.ie#': empresa.inscricao_estadual || '',
      '#empresa.im#': empresa.inscricao_municipal || '',
      '#empresa.logo#': logoHtml,
      '#empresa.endereco#': enderecoCompleto,
      '#empresa.logradouro#': empresa.endereco || '',
      '#empresa.numero#': empresa.numero || '',
      '#empresa.complemento#': empresa.complemento || '',
      '#empresa.bairro#': empresa.bairro || '',
      '#empresa.cidade#': empresa.cidade || '',
      '#empresa.estado#': empresa.estado 
        ? Formatter.obterNomeEstado(empresa.estado) 
        : '',
      '#empresa.uf#': empresa.estado || '',
      '#empresa.cep#': empresa.cep || '',
      '#empresa.telefone#': empresa.telefone || '',
      '#empresa.email#': empresa.email || '',
      '#empresa.responsavel#': empresa.responsavel_nome || ''
    };
  }
}

