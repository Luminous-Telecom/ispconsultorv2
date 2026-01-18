import type { DadosEmpresa } from '../../../models/sistema/DadosEmpresa';

export interface HotsiteVariable {
  key: string;
  descricao: string;
  example?: string;
}

export class HotsiteTemplateService {
  static buildVariablesMap(empresa: DadosEmpresa | null, baseUrl: string): Record<string, string> {
    const razaoSocial = empresa?.razao_social || '';
    const nomeFantasia = empresa?.nome_fantasia || '';
    const cnpj = empresa?.cnpj || '';
    const inscricaoEstadual = empresa?.inscricao_estadual || '';
    const inscricaoMunicipal = empresa?.inscricao_municipal || '';
    const cep = empresa?.cep || '';
    const endereco = empresa?.endereco || '';
    const numero = empresa?.numero || '';
    const complemento = empresa?.complemento || '';
    const bairro = empresa?.bairro || '';
    const cidade = empresa?.cidade || '';
    const estado = empresa?.estado || '';
    const telefone = empresa?.telefone || '';
    const celular = empresa?.celular || '';
    const email = empresa?.email || '';
    const site = empresa?.site || '';
    const anoAtual = String(new Date().getFullYear());

    const partsEndereco = [
      endereco,
      numero ? `nº ${numero}` : '',
      complemento,
      bairro,
      cidade && estado ? `${cidade}/${estado}` : cidade || estado,
      cep ? `CEP ${cep}` : ''
    ].filter(Boolean);
    const enderecoCompleto = partsEndereco.join(', ');

    return {
      'empresa.razao_social': razaoSocial,
      'empresa.nome_fantasia': nomeFantasia,
      'empresa.cnpj': cnpj,
      'empresa.inscricao_estadual': inscricaoEstadual,
      'empresa.inscricao_municipal': inscricaoMunicipal,
      'empresa.cep': cep,
      'empresa.endereco': endereco,
      'empresa.numero': numero,
      'empresa.complemento': complemento,
      'empresa.bairro': bairro,
      'empresa.cidade': cidade,
      'empresa.estado': estado,
      'empresa.telefone': telefone,
      'empresa.celular': celular,
      'empresa.email': email,
      'empresa.site': site,
      'empresa.endereco_completo': enderecoCompleto,
      'empresa.logo_url': `${baseUrl}/api/dados-empresa/logo`,
      'sistema.ano_atual': anoAtual,
      'sistema.base_url': baseUrl
    };
  }

  static listVariables(): HotsiteVariable[] {
    return [
      { key: 'empresa.razao_social', descricao: 'Razão social da empresa', example: 'Minha Empresa LTDA' },
      { key: 'empresa.nome_fantasia', descricao: 'Nome fantasia da empresa', example: 'Minha Empresa' },
      { key: 'empresa.cnpj', descricao: 'CNPJ da empresa', example: '00.000.000/0000-00' },
      { key: 'empresa.inscricao_estadual', descricao: 'Inscrição estadual', example: 'ISENTO' },
      { key: 'empresa.inscricao_municipal', descricao: 'Inscrição municipal', example: '12345' },
      { key: 'empresa.cep', descricao: 'CEP', example: '00000-000' },
      { key: 'empresa.endereco', descricao: 'Endereço (logradouro)', example: 'Rua Exemplo' },
      { key: 'empresa.numero', descricao: 'Número', example: '123' },
      { key: 'empresa.complemento', descricao: 'Complemento', example: 'Sala 5' },
      { key: 'empresa.bairro', descricao: 'Bairro', example: 'Centro' },
      { key: 'empresa.cidade', descricao: 'Cidade', example: 'São Paulo' },
      { key: 'empresa.estado', descricao: 'Estado (UF)', example: 'SP' },
      { key: 'empresa.telefone', descricao: 'Telefone', example: '(00) 0000-0000' },
      { key: 'empresa.celular', descricao: 'Celular/WhatsApp', example: '(00) 00000-0000' },
      { key: 'empresa.email', descricao: 'E-mail', example: 'contato@empresa.com.br' },
      { key: 'empresa.site', descricao: 'Site', example: 'www.empresa.com.br' },
      { key: 'empresa.endereco_completo', descricao: 'Endereço completo formatado', example: 'Rua X, nº 123, Centro, Cidade/UF, CEP 00000-000' },
      { key: 'empresa.logo_url', descricao: 'URL pública da logo da empresa', example: '/api/dados-empresa/logo' },
      { key: 'sistema.ano_atual', descricao: 'Ano atual', example: '2026' },
      { key: 'sistema.base_url', descricao: 'Base URL do sistema (detectada na requisição)', example: 'https://dominio.com' }
    ];
  }

  static render(html: string, variables: Record<string, string>): string {
    if (!html) return '';

    return html.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_match: string, key: string) => {
      const value = variables[key];
      return value !== undefined ? value : '';
    });
  }
}

