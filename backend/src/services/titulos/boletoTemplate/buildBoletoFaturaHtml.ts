import type { BoletoRenderData } from './types';
import { escapeHtml } from './escapeHtml';

function infoItem(label: string, value: string, wide = false): string {
  return `<div class="info-item${wide ? ' info-item--wide' : ''}">
      <strong class="info-item__label">${escapeHtml(label)}</strong>
      <span class="info-item__value">${escapeHtml(value)}</span>
    </div>`;
}

function sectionTitle(texto: string): string {
  return `<div class="info-section__title">
    <span class="info-section__line"></span>
    <span>${escapeHtml(texto)}</span>
    <span class="info-section__line"></span>
  </div>`;
}

export function buildBoletoFaturaHtml(data: BoletoRenderData): string {
  const { empresa, sacado, plano } = data;

  const enderecoContratante = sacado.complemento
    ? `${sacado.endereco} — ${sacado.complemento}`
    : sacado.endereco;

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

  <div class="info-section">
    ${sectionTitle('Dados do contratante')}
    <div class="info-grid">
      ${infoItem('Nome', sacado.nome, true)}
      ${infoItem('Endereço', enderecoContratante, true)}
      ${infoItem('Bairro', sacado.bairro)}
      ${infoItem('CEP', sacado.cep)}
      ${infoItem('Município', sacado.cidade)}
      ${infoItem('Estado', sacado.estado)}
      ${infoItem('CPF/CNPJ', sacado.documento)}
      ${infoItem('Processamento', data.ficha.dataProcessamento)}
    </div>
  </div>

  <div class="info-section">
    ${sectionTitle('Dados do plano contratado')}
    <div class="info-grid">
      ${infoItem('Nome do plano', plano.nome, true)}
      ${infoItem('Descrição', plano.descricao, true)}
      ${infoItem('Tipo de serviço', plano.tipoServico)}
      ${infoItem('Usuários', plano.quantidadeUsuarios)}
      ${infoItem('Valor do plano', `R$ ${plano.valor}`)}
      ${infoItem('Periodicidade', plano.periodicidade)}
    </div>
  </div>
</div>

<hr class="boleto-divider" />
</div>`;
}
