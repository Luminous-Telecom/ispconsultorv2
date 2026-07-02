export function getBoletoStyles(): string {
  return `<style type="text/css">
:root {
  --b-text: #1f2937;
  --b-text-muted: #6b7280;
  --b-border: #d1d5db;
  --b-border-light: #e5e7eb;
  --b-bg: #ffffff;
  --b-bg-section: #f3f4f6;
  --b-bg-row-alt: #f9fafb;
}

html, body {
  width: 100% !important;
  margin: 0 !important;
  padding: 0 !important;
}

body {
  background: var(--b-bg);
  font: 8px/1.35 Verdana, Arial, Helvetica, sans-serif;
  color: var(--b-text);
}

* { box-sizing: border-box; margin: 0; }

table {
  width: 100% !important;
  max-width: 100% !important;
  border-collapse: collapse;
}

.boleto-fatura {
  width: 100% !important;
  max-width: 100% !important;
  border: 1px solid var(--b-border);
  background: var(--b-bg);
  margin-bottom: 6px;
  overflow: hidden;
}

.boleto-fatura__header {
  width: 100%;
  border-bottom: 1px solid var(--b-border-light);
}

.boleto-fatura__header td {
  vertical-align: middle;
  padding: 7px 14px;
}

.boleto-fatura__header-logo {
  width: 118px;
  text-align: center;
  border-right: 1px solid var(--b-border-light);
  padding-left: 12px;
}

.boleto-fatura__header-company {
  padding-right: 14px;
}

.boleto-fatura__header-logo img {
  width: 84px;
  height: 46px;
  object-fit: contain;
}

.boleto-fatura__company-name {
  display: block;
  font-size: 9pt;
  font-weight: 700;
  color: var(--b-text);
  margin-bottom: 3px;
}

.boleto-fatura__company-line {
  display: block;
  font-size: 7pt;
  color: var(--b-text-muted);
  line-height: 1.4;
}

.section-title {
  padding: 3px 14px;
  font-size: 7pt;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--b-text);
  background: var(--b-bg-section);
  border-top: 1px solid var(--b-border-light);
  border-bottom: 1px solid var(--b-border-light);
}

.field-grid {
  width: 100%;
  padding: 0;
}

.field-grid tr td {
  padding: 2.5px 14px;
  vertical-align: top;
  font-size: 7pt;
}

.field-grid tr td:first-child {
  padding-left: 14px;
}

.field-grid tr td:last-child {
  padding-right: 14px;
}

.field-label {
  color: var(--b-text-muted);
  white-space: nowrap;
  width: 1%;
  padding-right: 8px !important;
}

.field-value {
  color: var(--b-text);
  font-weight: 600;
}

.field-grid tr:nth-child(even) td {
  background: var(--b-bg-row-alt);
}

.field-grid tr:nth-child(even) td:first-child {
  padding-left: 14px;
}

.field-grid tr:nth-child(even) td:last-child {
  padding-right: 14px;
}

.field-grid tr:last-child td {
  padding-bottom: 5px;
}

.plan-grid .field-label {
  width: 22%;
}

.boleto-divider {
  border: 0;
  border-top: 1px dashed var(--b-border);
  margin: 8px 0 4px;
}

.boleto-print-page {
  page-break-after: always;
  break-after: page;
}

.boleto-print-page:last-child {
  page-break-after: auto;
  break-after: auto;
}

.boleto-print-unit > .custom > .boleto-fatura,
.boleto-print-unit > .custom > .boleto-ficha {
  margin-bottom: 0;
}

.boleto-print-unit > .custom > .boleto-divider {
  display: none;
}

.boleto-corte {
  height: 0;
  margin: 1mm 0;
  padding: 0;
  border: 0;
  border-top: 1px dashed var(--b-border);
  box-sizing: border-box;
}

.boleto-ficha {
  width: 100% !important;
  max-width: 100% !important;
}

.boleto-ficha__bank-header td {
  vertical-align: bottom;
  padding: 1px 0;
}

.boleto-ficha__bank-logo img {
  width: 72px;
  height: 30px;
  object-fit: contain;
}

.boleto-ficha__bank-code {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.boleto-ficha__linha-digitavel {
  font-size: 8px;
  font-weight: 700;
  float: right;
  letter-spacing: 0.03em;
}

table.tab {
  border: 1px solid #000;
}

table.tab td {
  border: 1px solid #000;
  text-align: left;
  vertical-align: top;
  padding: 1.5px 2px;
  font-size: 6.8pt !important;
  line-height: 1.1;
}

table.tab td span {
  display: block;
  font-size: 6.8pt !important;
  line-height: 1.1;
  padding: 1px 0 0;
}

table.tab td span.vV {
  text-align: center;
  font-weight: bold;
}

table.infRec td { border: 0 !important; vertical-align: top; }

.lD { text-align: right !important; }

.sacAv {
  font-size: 6.5pt;
  font-weight: 700;
  white-space: nowrap;
  padding-right: 4px !important;
}

.boleto-pix {
  text-align: center;
  padding: 1px;
}

.boleto-pix img {
  width: 105px;
  height: 105px;
  max-width: 105px;
  max-height: 105px;
}

.boleto-pix__hint {
  display: block;
  margin-top: 2px;
  font-size: 6.5pt;
  font-weight: 600;
  color: #4b5563;
}

.barcode-container {
  display: block;
}

.barcode-container--erro {
  color: #a00;
  font-size: 7pt;
  padding: 4px;
}

.barcode-img {
  height: 12mm;
  width: auto;
  max-width: 103mm;
  display: block;
}

.boleto-ficha__barcode {
  vertical-align: bottom;
  padding: 0;
}

.boleto-ficha__footer {
  font-size: 6.5pt !important;
  line-height: 1.1 !important;
  text-align: center;
}

.boleto-ficha__footer strong {
  font-size: 6.5pt !important;
  font-weight: bold !important;
}

@media print {
  @page {
    size: A4;
    margin: 0.35cm;
  }

  body { page-break-inside: avoid !important; width: 100% !important; }
  table { page-break-inside: avoid !important; width: 100% !important; }
  .boleto-print-unit {
    page-break-inside: avoid;
    break-inside: avoid;
  }
}
</style>`;
}
