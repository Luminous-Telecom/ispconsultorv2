import type { BoletoRenderData } from './types';
import { escapeHtml } from './escapeHtml';

function fieldRow(
  label: string,
  value: string,
  label2?: string,
  value2?: string,
): string {
  if (label2 !== undefined && value2 !== undefined) {
    return `<tr>
      <td class="field-label">${escapeHtml(label)}</td>
      <td class="field-value">${escapeHtml(value)}</td>
      <td class="field-label">${escapeHtml(label2)}</td>
      <td class="field-value">${escapeHtml(value2)}</td>
    </tr>`;
  }

  return `<tr>
    <td class="field-label">${escapeHtml(label)}</td>
    <td class="field-value" colspan="3">${escapeHtml(value)}</td>
  </tr>`;
}

export function buildBoletoFaturaHtml(data: BoletoRenderData): string {
  const { empresa, sacado, plano } = data;

  return `<div class="custom">
<div class="boleto-fatura">
  <table class="boleto-fatura__header" border="0" cellspacing="0" cellpadding="0">
    <tr>
      <td class="boleto-fatura__header-logo">
        <img src="${empresa.logo}" alt="" />
      </td>
      <td class="boleto-fatura__header-company">
        <span class="boleto-fatura__company-name">${escapeHtml(empresa.cedente)}</span>
        <span class="boleto-fatura__company-line">CNPJ ${escapeHtml(empresa.cnpj)}</span>
        <span class="boleto-fatura__company-line">
          ${escapeHtml(empresa.endereco)} &mdash; ${escapeHtml(empresa.bairro)}<br />
          CEP ${escapeHtml(empresa.cep)} &mdash; ${escapeHtml(empresa.cidade)} / ${escapeHtml(empresa.estado)}
        </span>
      </td>
    </tr>
  </table>

  <div class="section-title">Dados do contratante</div>
  <table class="field-grid" border="0" cellspacing="0" cellpadding="0">
    ${fieldRow('Nome', sacado.nome)}
    ${fieldRow('Endereço', sacado.endereco, 'Compl.', sacado.complemento)}
    ${fieldRow('Bairro', sacado.bairro, 'CEP', sacado.cep)}
    ${fieldRow('Município', sacado.cidade, 'Estado', sacado.estado)}
    ${fieldRow('CPF/CNPJ', sacado.documento, 'Processamento', data.ficha.dataProcessamento)}
  </table>

  <div class="section-title">Dados do plano contratado</div>
  <table class="field-grid plan-grid" border="0" cellspacing="0" cellpadding="0">
    ${fieldRow('Nome do plano', plano.nome)}
    ${fieldRow('Descrição', plano.descricao)}
    ${fieldRow('Tipo de serviço', plano.tipoServico, 'Usuários', plano.quantidadeUsuarios)}
    ${fieldRow('Valor do plano', `R$ ${plano.valor}`, 'Periodicidade', plano.periodicidade)}
  </table>
</div>

<hr class="boleto-divider" />
</div>`;
}
