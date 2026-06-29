import { DadosEmpresaService } from '../../sistema/DadosEmpresaService';
import { converterLogoParaBase64 } from '../../../controllers/titulos/TituloHelpers';
import { FONT_FAMILY_BASE } from '../../../constants/typography';

export class AuditoriaPDFService {
  /**
   * Gera HTML do PDF de auditoria
   * @param empresaId - ID da empresa para buscar dados (multi-tenant)
   * @param showTenant - Exibir tenant no relatório (apenas para SaaS)
   */
  static async generateAuditPdfHtml(
    logs: any[],
    entidade: string,
    dadosEmpresa?: any,
    empresaId?: number | null,
    showTenant = false
  ): Promise<string> {
    const empresa = dadosEmpresa || await DadosEmpresaService.findOne(empresaId ?? undefined);
    
    const escapeHtml = (text: unknown): string => {
      if (text === null || text === undefined) {
        return '';
      }
      const str = String(text);
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    };

    const formatDateLocal = (date: string | Date): string => {
      try {
        return new Date(date).toLocaleString('pt-BR');
      } catch {
        return String(date);
      }
    };

    const formatAcao = (acao: string): string => {
      const acoes: Record<string, string> = {
        create: 'Criou',
        update: 'Editou',
        delete: 'Excluiu',
        login: 'Login',
        logout: 'Logout',
        CREATE: 'Criou',
        UPDATE: 'Editou',
        DELETE: 'Excluiu',
        LOGIN: 'Login',
        LOGOUT: 'Logout'
      };
      return acoes[acao] || acao;
    };

    const formatarValor = (valor: unknown): string => {
      if (valor === null || valor === undefined) {
        return '';
      }
      if (typeof valor === 'boolean') {
        return valor ? 'Sim' : 'Não';
      }
      if (typeof valor === 'object') {
        try {
          return JSON.stringify(valor, null, 2);
        } catch {
          return String(valor);
        }
      }
      return String(valor);
    };

    const gerarCamposHtml = (dadosAnt: any, dadosNov: any): string => {
      const camposExcluir = ['created_at', 'updated_at', 'deleted_at', 'password', 'senha', 'token', 'api_key', 'empresa_id'];
      const dadosParaExibir: Record<string, { anterior?: unknown; novo?: unknown }> = {};

      if (dadosAnt && dadosNov) {
        const todosCampos = new Set([
          ...Object.keys(dadosAnt || {}),
          ...Object.keys(dadosNov || {})
        ]);
        
        for (const campo of todosCampos) {
          if (camposExcluir.includes(campo)) continue;
          
          const valorAnterior = dadosAnt[campo];
          const valorNovo = dadosNov[campo];
          
          dadosParaExibir[campo] = { anterior: valorAnterior, novo: valorNovo };
        }
      } else {
        const dados = dadosNov || dadosAnt || {};
        if (dados && typeof dados === 'object' && Object.keys(dados).length > 0) {
          for (const [key, value] of Object.entries(dados)) {
            if (camposExcluir.includes(key)) continue;
            dadosParaExibir[key] = { anterior: undefined, novo: value };
          }
        }
      }
      
      if (Object.keys(dadosParaExibir).length === 0) return '';
      
      return Object.entries(dadosParaExibir)
        .map(([key, valores]) => {
          const valorAnterior = valores.anterior !== undefined ? formatarValor(valores.anterior) : '';
          const valorNovo = valores.novo !== undefined ? formatarValor(valores.novo) : '';
          
          if (valores.anterior !== undefined && valores.novo !== undefined) {
            if (JSON.stringify(valores.anterior) === JSON.stringify(valores.novo)) {
              return `
                <tr>
                  <td>${escapeHtml(key)}</td>
                  <td>${escapeHtml(valorNovo)}</td>
                </tr>
              `;
            } else {
              return `
                <tr>
                  <td>${escapeHtml(key)}</td>
                  <td>${escapeHtml(valorAnterior)} → ${escapeHtml(valorNovo)}</td>
                </tr>
              `;
            }
          } else {
            return `
              <tr>
                <td>${escapeHtml(key)}</td>
                <td>${escapeHtml(valorNovo || valorAnterior)}</td>
              </tr>
            `;
          }
        }).join('');
    };

    const empresaNome = escapeHtml(empresa?.razao_social || empresa?.nome_fantasia || 'Empresa');
    const empresaEmail = escapeHtml(empresa?.email || '');
    const empresaEndereco = empresa?.endereco ? 
      escapeHtml(`${empresa.endereco}${empresa.numero ? ', ' + empresa.numero : ''} - ${empresa.cidade || ''} - ${empresa.estado || ''} - ${empresa.cep || ''}`) : '';
    const empresaTelefone = escapeHtml(empresa?.telefone || '');
    const empresaLogo = empresa?.logo ? converterLogoParaBase64(empresa.logo) : null;
    const dataGeracao = new Date().toLocaleString('pt-BR');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Relatórios de logs</title>
  <style>
    body {
      font-family: ${FONT_FAMILY_BASE};
      font-size: 10pt !important;
      margin: 0;
      padding: 10px;
      text-size-adjust: none !important;
      -webkit-text-size-adjust: none !important;
      -moz-text-size-adjust: none !important;
    }
    .audit-item {
      margin-bottom: 10px;
    }
    .header {
      margin-bottom: 15px;
      border-bottom: 1px solid #333;
      padding-bottom: 8px;
      display: flex;
      align-items: flex-start;
      gap: 15px;
    }
    .header-logo {
      flex-shrink: 0;
      max-width: 120px;
      max-height: 80px;
    }
    .header-logo img {
      max-width: 100%;
      max-height: 80px;
      object-fit: contain;
    }
    .header-content {
      flex: 1;
    }
    .header h1 {
      margin: 0;
      font-size: 11pt;
      font-weight: bold;
    }
    .header-info {
      font-size: 8pt;
      margin-top: 3px;
    }
    .data-table {
      width: 100%;
      table-layout: auto;
      border-collapse: collapse;
      border: 1px solid #666;
      font-size: 8pt !important;
    }
    .data-table thead {
      display: table-row-group;
    }
    .data-table td {
      padding: 5px 8px;
      font-size: 8pt !important;
      text-size-adjust: none !important;
      -webkit-text-size-adjust: none !important;
      -moz-text-size-adjust: none !important;
    }
    .data-table thead td {
      border: 1px solid #666;
      background-color: #555;
      color: #fff;
      font-weight: bold;
    }
    .data-table tbody td {
      border: 1px solid #ddd;
      word-wrap: break-word;
      word-break: break-word;
      overflow-wrap: break-word;
      white-space: normal;
    }
    .data-table td:first-child {
      width: 1%;
      white-space: nowrap;
      font-weight: bold;
    }
    .data-table td:last-child {
      width: auto;
    }
    .data-table tbody td:first-child {
      background-color: #f9f9f9;
    }
    .data-table tbody td:last-child {
      word-wrap: break-word;
      word-break: break-word;
      overflow-wrap: break-word;
      white-space: normal;
    }
    h2 {
      font-size: 12pt;
      margin: 15px 0 10px 0;
    }
  </style>
</head>
<body>
  <div class="header">
    ${empresaLogo ? `
      <div class="header-logo">
        <img src="${empresaLogo}" alt="Logo" />
      </div>
    ` : ''}
    <div class="header-content">
      <h1>${empresaNome}</h1>
      <div class="header-info">
        ${empresaEmail ? `<div>Email: ${empresaEmail}</div>` : ''}
        ${empresaEndereco ? `<div>Endereço: ${empresaEndereco}</div>` : ''}
        ${empresaTelefone ? `<div>Telefone: ${empresaTelefone}</div>` : ''}
        <div>Data de geração: ${dataGeracao}</div>
      </div>
    </div>
  </div>

  <h2>Relatórios de logs</h2>

  ${logs.map((log, index) => {
    try {
      const acaoFormatada = formatAcao(log.acao);
      const dataFormatada = formatDateLocal(log.timestamp);
      const usuarioNome = log.usuario_nome || log.usuario_email || 'N/A';
      const ipAddress = log.ip_address || '-';
      const tenantPart = showTenant
        ? `<strong>Tenant:</strong> ${escapeHtml(log.empresa_nome || '-')} | `
        : '';
      const dadosHtml = gerarCamposHtml(log.dados_anteriores, log.dados_novos);
      const marginTop = index > 0 ? 'margin-top: 10px;' : '';

      return `
        <div class="audit-item" style="${marginTop}">
          <table class="data-table">
            <thead>
              <tr>
                <td colspan="2" style="font-weight: normal;">
                  ${tenantPart}<strong>Usuário:</strong> ${escapeHtml(usuarioNome)} | 
                  <strong>IP:</strong> ${escapeHtml(ipAddress)} | 
                  <strong>Operação:</strong> ${escapeHtml(acaoFormatada)} | 
                  <strong>Data:</strong> ${escapeHtml(dataFormatada)}
                </td>
              </tr>
              <tr>
                <td style="border-top: 1px solid #666;">Campo</td>
                <td style="border-top: 1px solid #666;">Valor</td>
              </tr>
            </thead>
            <tbody>
              ${dadosHtml || '<tr><td colspan="2">Sem dados disponíveis</td></tr>'}
            </tbody>
          </table>
        </div>
      `;
    } catch {
      return `<div>Erro ao processar log ${index + 1}</div>`;
    }
  }).join('')}
</body>
</html>
    `;
  }
}
