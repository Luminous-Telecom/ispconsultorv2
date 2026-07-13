import { formatDateTime } from '../utils/dateUtils';

export interface AtendimentoMensagemPdf {
  data: string;
  operador?: string;
  mensagem: string;
}

export const ATENDIMENTO_PDF_TEMPLATE = `
<div style="font-family: Arial, sans-serif; font-size: 11px; color: #222; padding: 8px;">
  <table style="width:100%; border-bottom: 2px solid #333; margin-bottom: 16px;">
    <tr>
      <td style="vertical-align: middle;">
        <strong style="font-size: 16px;">#empresa.razao_social#</strong><br/>
        <span style="font-size: 10px; color:#555;">#empresa.endereco# · #empresa.cidade#/#empresa.uf#</span>
      </td>
      <td style="text-align: right; vertical-align: middle;">
        <span style="font-size: 14px; font-weight: bold;">Atendimento</span><br/>
        <span>Protocolo: <strong>#atendimento.protocolo#</strong></span>
      </td>
    </tr>
  </table>

  <h3 style="font-size: 12px; margin: 12px 0 6px; border-bottom: 1px solid #ccc;">Cliente</h3>
  <table style="width:100%; font-size: 11px; margin-bottom: 12px;">
    <tr><td width="120"><strong>Cliente:</strong></td><td>#cliente.razao_social#</td></tr>
    <tr><td><strong>CPF/CNPJ:</strong></td><td>#cliente.cpf_cnpj#</td></tr>
    <tr><td><strong>Telefone:</strong></td><td>#cliente.telefone#</td></tr>
    <tr><td><strong>E-mail:</strong></td><td>#cliente.email#</td></tr>
  </table>

  <h3 style="font-size: 12px; margin: 12px 0 6px; border-bottom: 1px solid #ccc;">Dados do atendimento</h3>
  <table style="width:100%; font-size: 11px; margin-bottom: 12px;">
    <tr>
      <td width="140"><strong>Status:</strong></td><td>#atendimento.status#</td>
      <td width="140"><strong>Prioridade:</strong></td><td>#atendimento.prioridade#</td>
    </tr>
    <tr><td><strong>Assunto:</strong></td><td colspan="3">#atendimento.titulo#</td></tr>
    <tr>
      <td><strong>Departamento:</strong></td><td>#atendimento.departamento#</td>
      <td><strong>Responsável:</strong></td><td>#atendimento.responsavel#</td>
    </tr>
    <tr>
      <td><strong>Abertura:</strong></td><td>#atendimento.data_criacao#</td>
      <td><strong>Última atual.:</strong></td><td>#atendimento.ultima_atualizacao#</td>
    </tr>
    <tr><td><strong>Descrição inicial:</strong></td><td colspan="3">#atendimento.menssagem#</td></tr>
  </table>

  <h3 style="font-size: 12px; margin: 16px 0 8px; border-bottom: 1px solid #ccc;">Histórico de interações</h3>
  #atendimento.interacoes#
</div>`.trim();

export function buildAtendimentoInteracoesHtml(mensagens: AtendimentoMensagemPdf[]): string {
  if (!mensagens.length) {
    return '<p style="color:#666; font-style: italic; margin: 0;">Nenhuma interação registrada.</p>';
  }

  const sorted = [...mensagens].sort((a, b) => {
    const da = new Date(a.data).getTime();
    const db = new Date(b.data).getTime();
    if (Number.isNaN(da) && Number.isNaN(db)) return 0;
    if (Number.isNaN(da)) return 1;
    if (Number.isNaN(db)) return -1;
    return da - db;
  });

  const rows = sorted
    .map((item) => {
      const dataFmt = formatDateTime(item.data) || item.data || '-';
      const operador = escapeHtml(item.operador?.trim() || '-');
      const texto = escapeHtml(item.mensagem?.trim() || '-').replace(/\n/g, '<br/>');
      return `<tr>
        <td style="padding:6px 8px; border:1px solid #ddd; white-space:nowrap; vertical-align:top;">${dataFmt}</td>
        <td style="padding:6px 8px; border:1px solid #ddd; vertical-align:top;">${operador}</td>
        <td style="padding:6px 8px; border:1px solid #ddd; vertical-align:top;">${texto}</td>
      </tr>`;
    })
    .join('');

  return `<table style="width:100%; border-collapse:collapse; font-size: 11px;">
    <thead>
      <tr style="background:#f5f5f5;">
        <th style="padding:6px 8px; border:1px solid #ddd; text-align:left; width:130px;">Data</th>
        <th style="padding:6px 8px; border:1px solid #ddd; text-align:left; width:150px;">Operador</th>
        <th style="padding:6px 8px; border:1px solid #ddd; text-align:left;">Mensagem</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
