import fs from 'fs';
import path from 'path';
import { VariableHandler, VariableContext, VariableSubstitutions, GrupoVariaveis } from '../types';
import { Formatter } from '../utils/Formatter';
import { VariableReplacer } from '../utils/VariableReplacer';
import { DadosEmpresaService } from '../../sistema/DadosEmpresaService';
import { prisma } from '../../../db/prisma';

/**
 * Handler para processamento de variáveis do sistema
 */
export class SistemaVariableHandler implements VariableHandler {
  private static readonly VARIABLES = [
    '#sistema.data_atual#',
    '#sistema.hora_atual#',
    '#sistema.data_hora_atual#',
    '#sistema.ano_atual#',
    '#sistema.mes_atual#',
    '#assinatura_consultor#',
    '#assinatura_cliente#'
  ];

  canProcess(conteudo: string): boolean {
    return VariableReplacer.containsAny(conteudo, SistemaVariableHandler.VARIABLES);
  }

  getVariaveisDisponiveis(): GrupoVariaveis {
    return {
      titulo: 'Dados do Sistema',
      variaveis: [
        { variavel: '#sistema.data_atual#', descricao: 'Data atual' },
        { variavel: '#sistema.hora_atual#', descricao: 'Hora atual' },
        { variavel: '#sistema.data_hora_atual#', descricao: 'Data e hora atual' },
        { variavel: '#sistema.ano_atual#', descricao: 'Ano atual' },
        { variavel: '#sistema.mes_atual#', descricao: 'Mês atual' },
        { variavel: '#assinatura_consultor#', descricao: 'Assinatura do responsável da empresa' },
        { variavel: '#assinatura_cliente#', descricao: 'Assinatura do cliente (se disponível)' }
      ]
    };
  }

  async process(conteudo: string, context: VariableContext): Promise<string> {
    const dataRef = context.dataReferencia || new Date();
    const assinaturaConsultorHtml = await this.processarAssinaturaConsultor(conteudo, context);
    const assinaturaClienteHtml = await this.processarAssinaturaCliente(conteudo, context);
    const substitutions = this.buildSubstitutions(dataRef, assinaturaConsultorHtml, assinaturaClienteHtml);
    
    return VariableReplacer.replace(conteudo, substitutions);
  }

  /**
   * Processa assinatura do responsável (consultor)
   */
  private async processarAssinaturaConsultor(conteudo: string, context: VariableContext): Promise<string> {
    if (!conteudo.includes('#assinatura_consultor#')) {
      return '';
    }

    const empresa = await DadosEmpresaService.findOne(context.empresaId ?? undefined);

    if (!empresa || !empresa.responsavel_assinatura) {
      return '';
    }

    const assinaturaUrl = this.resolverUrlOuVazio(empresa.responsavel_assinatura, context.baseUrl);
    if (!assinaturaUrl) {
      return '';
    }

    return `<img src="${assinaturaUrl}" />`;
  }

  /**
   * Processa assinatura do cliente
   */
  private async processarAssinaturaCliente(conteudo: string, context: VariableContext): Promise<string> {
    if (!conteudo.includes('#assinatura_cliente#') || !context.cliente) {
      return '';
    }

    const assinaturaCliente = await prisma.clientes_arquivos.findFirst({
      where: {
        cliente_id: context.cliente.id,
        tipo: 'assinatura',
      },
      orderBy: { created_at: 'desc' },
    });

    if (!assinaturaCliente) {
      return '';
    }

    const assinaturaUrl = this.resolverUrlOuVazio(assinaturaCliente.caminho, context.baseUrl);
    if (!assinaturaUrl) {
      return '';
    }

    return `<img src="${assinaturaUrl}" />`;
  }

  /**
   * Constrói o mapa de substituições para variáveis do sistema
   */
  private buildSubstitutions(dataRef: Date, assinaturaConsultorHtml: string, assinaturaClienteHtml: string): VariableSubstitutions {
    return {
      '#sistema.data_atual#': Formatter.formatarData(dataRef),
      '#sistema.hora_atual#': Formatter.formatarHora(dataRef),
      '#sistema.data_hora_atual#': Formatter.formatarDataHora(dataRef),
      '#sistema.ano_atual#': String(dataRef.getFullYear()),
      '#sistema.mes_atual#': String(dataRef.getMonth() + 1).padStart(2, '0'),
      '#assinatura_consultor#': assinaturaConsultorHtml,
      '#assinatura_cliente#': assinaturaClienteHtml
    };
  }

  /**
   * Retorna o caminho informado apenas se houver algo válido; evita quebrar o PDF
   * quando a assinatura não existe (não gera <img> vazio).
   */
  private resolverUrlOuVazio(assinaturaPath: string, _baseUrl?: string): string {
    if (!assinaturaPath) {
      return '';
    }

    const caminho = assinaturaPath.trim();
    if (!caminho) {
      return '';
    }

    // URLs externas permanecem como estão; se estiverem inválidas, o PDF pode quebrar a imagem,
    // mas assumimos que quem preencheu forneceu um link válido.
    if (caminho.includes('://')) {
      return caminho;
    }

    // Para caminhos locais, só renderiza se o arquivo existir.
    const localPath = caminho.startsWith('/') ? caminho.slice(1) : caminho;
    const absolutePath = path.resolve(process.cwd(), localPath);
    if (!fs.existsSync(absolutePath)) {
      return '';
    }

    return caminho;
  }
}

