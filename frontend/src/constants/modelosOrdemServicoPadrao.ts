export interface ModeloOrdemServicoPadrao {
  id: string;
  nome: string;
  conteudo: string;
}

/** Modelos HTML embutidos — espelham backend/src/constants/modelosOrdemServicoPadrao.ts */
const MODELO_ORDEM_SERVICO_PADRAO_CONTEUDO = `<div style="font-family: Arial, sans-serif; color: #333; max-width: 800px; margin: 0 auto; padding: 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 11px;">
<table style="width: 100%; border-collapse: collapse; margin-bottom: 10px;" border="0">
<tbody>
<tr>
<td style="width: 55%; vertical-align: middle; text-align: center;"><span style="font-size: 15pt; font-weight: bold; color: #0056b3; letter-spacing: 0.5px;">ORDEM DE SERVIÇO</span></td>
<td style="width: 45%; text-align: right; vertical-align: middle; font-size: 8.5pt; line-height: 1.5; color: #555;"><strong>OS Nº:</strong> #ordem.id#<br><strong>Protocolo:</strong> #ordem.protocolo#<br><strong>Abertura:</strong> #ordem.data_abertura#<br><strong>Status:</strong> #ordem.status#</td>
</tr>
</tbody>
</table>
<div style="height: 3px; background: linear-gradient(90deg, #0056b3, #4d9de0); border-radius: 2px; margin-bottom: 12px;">&nbsp;</div>
<div style="border: 1px solid #e3e6ea; border-radius: 5px; padding: 8px 12px; margin-bottom: 10px;">
<div style="font-weight: bold; color: #0056b3; font-size: 9pt; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.3px;">Dados do Cliente</div>
<table style="width: 100%; border-collapse: collapse; font-size: 8.5pt; line-height: 1.5;">
<tbody>
<tr>
<td style="width: 15%; font-weight: 600; padding: 2px 0;">Cliente:</td>
<td style="width: 85%; padding: 2px 0;">#cliente.razao_social#</td>
</tr>
<tr>
<td style="font-weight: 600; padding: 2px 0;">CPF/CNPJ:</td>
<td style="padding: 2px 0;">#cliente.cnpj#</td>
</tr>
<tr>
<td style="font-weight: 600; padding: 2px 0;">Contato:</td>
<td style="padding: 2px 0;">#cliente.whatsapp# | #cliente.email#</td>
</tr>
<tr>
<td style="font-weight: 600; padding: 2px 0;">Endereço:</td>
<td style="padding: 2px 0;">#cliente.endereco#</td>
</tr>
</tbody>
</table>
</div>
<div style="border: 1px solid #e3e6ea; border-radius: 5px; padding: 8px 12px; margin-bottom: 10px;">
<div style="font-weight: bold; color: #0056b3; font-size: 9pt; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.3px;">Detalhes do Atendimento</div>
<table style="width: 100%; border-collapse: collapse; font-size: 8.5pt; margin-bottom: 8px;">
<tbody>
<tr>
<td style="width: 20%; font-weight: 600; padding: 2px 0;">Tipo de Serviço:</td>
<td style="width: 30%; padding: 2px 0;">#ordem.assunto#</td>
<td style="width: 15%; font-weight: 600; padding: 2px 0;">Prioridade:</td>
<td style="width: 35%; padding: 2px 0;">#ordem.prioridade#</td>
</tr>
</tbody>
</table>
<div style="font-size: 8.5pt; font-weight: 600; margin-bottom: 3px;">Defeito Relatado / Solicitação:</div>
<div style="background-color: #f8f9fa; padding: 7px 9px; border-radius: 4px; min-height: 30px; border: 1px solid #eee; font-size: 8.5pt;">#ordem.mensagem#</div>
</div>
<div style="border: 1px solid #e3e6ea; border-radius: 5px; padding: 8px 12px; margin-bottom: 10px;">
<div style="font-weight: bold; color: #0056b3; font-size: 9pt; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.3px;">Laudo Técnico e Resolução</div>
<div style="font-size: 8.5pt; font-weight: 600; margin-bottom: 3px;">Serviços Executados / Diagnóstico:</div>
<div style="background-color: #f8f9fa; padding: 7px 9px; border-radius: 4px; min-height: 45px; border: 1px solid #eee; margin-bottom: 6px; font-size: 8.5pt;">#ordem.mensagem_resposta#</div>
<div style="font-size: 8.5pt;"><strong>Técnico Responsável:</strong> #ordem.tecnico#</div>
</div>
<div style="text-align: center; margin-top: 18px;">
<p style="font-size: 8pt; color: #777; margin: 0 0 22px 0;">Ciente do atendimento e dos serviços descritos acima.</p>
<p style="font-size: 8.5pt; color: #444; border-top: 1px solid #999; width: 60%; margin: 0 auto; padding-top: 4px;">Assinatura do Cliente / Responsável</p>
</div>
</div>`;

export const MODELOS_ORDEM_SERVICO_PADRAO: ModeloOrdemServicoPadrao[] = [
  {
    id: 'padrao',
    nome: 'Padrão',
    conteudo: MODELO_ORDEM_SERVICO_PADRAO_CONTEUDO,
  },
];

export function getModeloOrdemServicoPadraoById(id: string): ModeloOrdemServicoPadrao | null {
  const key = id.trim();
  if (!key) return null;
  return MODELOS_ORDEM_SERVICO_PADRAO.find((item) => item.id === key) ?? null;
}
