import type { BoletoRenderData } from './types';
import { escapeHtml } from './escapeHtml';

function buildInstrucoesHtml(ficha: BoletoRenderData['ficha']): string {
  const linhas: string[] = [];

  if (ficha.textoMultaMora.trim()) {
    linhas.push(escapeHtml(ficha.textoMultaMora));
  }

  ficha.instrucoes.forEach((instrucao) => {
    if (instrucao.trim()) {
      linhas.push(escapeHtml(instrucao));
    }
  });

  return linhas.join('<br />');
}

function buildPixHtml(qrcodeImage: string): string {
  if (!qrcodeImage.trim()) {
    return `<div class="boleto-pix">
      <span class="boleto-pix__hint">QR Code PIX indisponível</span>
    </div>`;
  }

  return `<div class="boleto-pix">
    <img src="${qrcodeImage}" alt="" width="120" height="120" />
    <span class="boleto-pix__hint">Pague no Pix e tenha baixa imediata</span>
  </div>`;
}

export function buildBoletoFichaHtml(data: BoletoRenderData): string {
  const { empresa, sacado, ficha } = data;

  return `<div class="custom">
<div class="boleto-ficha">

  <table class="boleto-ficha__bank-header" border="0" cellpadding="0" cellspacing="0">
    <tr>
      <td width="150" class="boleto-ficha__bank-logo">
        <img src="${ficha.logoBanco}" alt="" />
      </td>
      <td valign="bottom">
        <span class="boleto-ficha__bank-code">| ${escapeHtml(ficha.codigoBancoComDv)} |</span>
        <span class="boleto-ficha__linha-digitavel">${escapeHtml(ficha.linhaDigitavel)}</span>
      </td>
    </tr>
  </table>

  <table class="tab ficha">
    <tr>
      <td colspan="6">Local de Pagamento<br />
        <span>${escapeHtml(ficha.localPagamento)}</span></td>
      <td>Vencimento<br />
        <span class="vV lD">${escapeHtml(ficha.dataVencimento)}</span></td>
    </tr>
    <tr>
      <td colspan="6">Beneficiário<br />
        <span>${escapeHtml(empresa.cedente)}</span></td>
      <td>Agência/Código do Beneficiário<br />
        <span class="lD">${escapeHtml(ficha.agenciaCodigo)}</span></td>
    </tr>
    <tr>
      <td>Data<br />
        <span>${escapeHtml(ficha.dataDocumento)}</span></td>
      <td colspan="2">N<u>o</u> documento<br />
        <span>${escapeHtml(ficha.numeroDocumento)}</span></td>
      <td>Tipo DOC<br />
        <span>${escapeHtml(ficha.especieDoc)}</span></td>
      <td>Aceite<br />
        <span>N</span></td>
      <td>Processamento<br />
        <span>${escapeHtml(ficha.dataProcessamento)}</span></td>
      <td>Nosso Número<br />
        <span class="lD">${escapeHtml(ficha.nossoNumero)}</span></td>
    </tr>
    <tr>
      <td>Uso do Banco<br />
        <span>&nbsp;</span></td>
      <td>CIP<br />
        <span>&nbsp;</span></td>
      <td>Carteira<br />
        <span>${escapeHtml(ficha.carteira)} ${escapeHtml(ficha.varCarteira)}</span></td>
      <td>Espécie<br />
        <span>${escapeHtml(ficha.especie)}</span></td>
      <td>Quantidade<br />
        <span>&nbsp;</span></td>
      <td>(x) Valor<br />
        <span>&nbsp;</span></td>
      <td>(=) Valor<br />
        <span class="vV lD">${escapeHtml(ficha.valorBoleto)}</span></td>
    </tr>
    <tr>
      <td rowspan="5" colspan="4">
        Instruções de responsabilidade do Beneficiário.<br />
        Qualquer dúvida contate o beneficiário.<br />
        <span>${buildInstrucoesHtml(ficha)}</span>
      </td>
      <td rowspan="5" colspan="2">${buildPixHtml(ficha.qrcodeImage)}</td>
      <td>(-) Desconto / Abatimentos<br />
        <span class="lD">&nbsp;</span></td>
    </tr>
    <tr>
      <td>(-) Outras Deduções<br />
        <span class="lD">&nbsp;</span></td>
    </tr>
    <tr>
      <td>(+) Mora/Multa<br />
        <span class="lD">&nbsp;</span></td>
    </tr>
    <tr>
      <td>(+) Outros Acréscimos<br />
        <span class="lD">&nbsp;</span></td>
    </tr>
    <tr>
      <td>(=) Valor Cobrado<br />
        <span class="vV lD">&nbsp;</span></td>
    </tr>
    <tr>
      <td colspan="7">
        <table class="infRec">
          <tr>
            <td class="sacAv">Pagador</td>
            <td>
              <span>${escapeHtml(sacado.nome)} &mdash; ${escapeHtml(sacado.tipoDocumento)} ${escapeHtml(sacado.documento)}<br />
              ${escapeHtml(sacado.endereco)} &mdash; ${escapeHtml(sacado.bairro)} &mdash; ${escapeHtml(sacado.complemento)}<br />
              ${escapeHtml(sacado.cidade)} &mdash; ${escapeHtml(sacado.estado)} &mdash; CEP: ${escapeHtml(sacado.cep)}</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>

  <table class="boleto-ficha__barcode-row" border="0" cellpadding="0" cellspacing="0">
    <tr><td colspan="2" height="2"></td></tr>
    <tr>
      <td class="boleto-ficha__barcode" valign="bottom">${ficha.barcodeHtml}</td>
      <td class="boleto-ficha__footer" valign="bottom">
        Autenticação mecânica<br />
        <strong>Ficha de Compensação</strong>
      </td>
    </tr>
  </table>

</div>
</div>`;
}
