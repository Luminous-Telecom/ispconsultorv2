#!/usr/bin/env python3
"""
Extrai o número SEI do ofício da Anatel a partir do PDF assinado.

O código verificador (o mesmo do cabeçalho "SEI/ANATEL - NNNNN") pode estar
nas primeiras páginas. Ofícios de bloqueio trazem a lista de domínios no
mesmo arquivo, então o fim do PDF é a planilha, não a página de autenticidade.

Prioridade:
1. "código verificador NNN" (também com ligadura ﬁ e com ":" ou "nº")
2. Cabeçalho "SEI/ANATEL - NNN" no título do PDF ou no texto
3. "SEI nº NNN" nas primeiras páginas (referência do próprio ofício)
4. "SEI nº NNN" nas últimas páginas, quando o PDF é só o ofício

Uso: python extrair-sei-anatel.py <caminho_pdf>
Saída: JSON {"success": true, "sei": "15497675"} ou {"success": false, "message": "..."}
"""
import json
import re
import sys
import os
import unicodedata

_orig_out, _orig_err = sys.stdout, sys.stderr

class _Null:
    def write(self, _): pass
    def flush(self): pass

sys.stdout = sys.stderr = _Null()
import warnings
warnings.filterwarnings('ignore')
os.environ.update({'PYTHONWARNINGS': 'ignore', 'PYTHONDONTWRITEBYTECODE': '1'})

try:
    import fitz  # pymupdf < 1.25
except ModuleNotFoundError:
    import pymupdf as fitz  # type: ignore[no-redef]

sys.stdout, sys.stderr = _orig_out, _orig_err

# Código verificador na página de autenticidade (número SEI deste documento)
_RE_VERIFICADOR = re.compile(
    r'verificador\s*[:\-]?\s*(?:n[º°o.]{0,2}\s*)?(\d{6,12})',
    re.IGNORECASE,
)
# Cabeçalho de cada página / título do PDF: SEI/ANATEL - 12345678
_RE_SEI_HEADER = re.compile(
    r'SEI\s*/\s*ANATEL\s*[-–—:]\s*(\d{6,12})',
    re.IGNORECASE,
)
# Rodapé / referência: SEI nº 12345678
_RE_SEI_NO = re.compile(
    r'SEI\s+n[º°o.]?\s*[:\-]?\s*(\d{6,12})',
    re.IGNORECASE,
)

_PAGINAS_INICIO = 12
_PAGINAS_FIM = 4


def _normalizar(texto: str) -> str:
    # NFKC desfaz a ligadura ﬁ de "veriﬁcador" (PDF do macOS/Quartz).
    # Marcas combinantes sobram quando a fonte mapeia "fi" para i + anel.
    base = unicodedata.normalize('NFKC', texto or '')
    return ''.join(ch for ch in base if unicodedata.category(ch) != 'Mn')


def _texto_pagina(page) -> str:
    partes = [page.get_text() or '']
    try:
        for annot in page.annots() or []:
            content = ((annot.info or {}).get('content') or '').strip()
            if content:
                partes.append(content)
    except Exception:
        pass
    return _normalizar('\n'.join(partes))


def _primeiro(rx: re.Pattern, texto: str):
    match = rx.search(texto)
    return match.group(1) if match else None


def _ultimo_sei_no(texto: str):
    matches = list(_RE_SEI_NO.finditer(texto))
    return matches[-1].group(1) if matches else None


def _sei_metadados(doc) -> str | None:
    meta = doc.metadata or {}
    blob = _normalizar(' '.join((meta.get(chave) or '') for chave in ('title', 'subject', 'keywords')))
    return _primeiro(_RE_SEI_HEADER, blob) or _primeiro(_RE_VERIFICADOR, blob) or _ultimo_sei_no(blob)


def extrair_sei(pdf_path: str) -> dict:
    if not pdf_path or not os.path.isfile(pdf_path):
        return {'success': False, 'message': 'Arquivo PDF não encontrado'}
    try:
        doc = fitz.open(pdf_path)
    except Exception as e:
        return {'success': False, 'message': f'Não foi possível abrir o PDF: {e}'}

    try:
        total = len(doc)
        if total == 0:
            return {'success': False, 'message': 'Nenhum texto extraído do PDF'}

        meta_sei = _sei_metadados(doc)
        verificador = None
        header = None
        sei_no_inicio = None
        sei_no_fim = None
        teve_texto = bool(meta_sei)

        inicio = set(range(min(_PAGINAS_INICIO, total)))
        fim = set(range(max(0, total - _PAGINAS_FIM), total))
        ordem = sorted(inicio | fim) + [i for i in range(total) if i not in inicio and i not in fim]

        for indice in ordem:
            texto = _texto_pagina(doc.load_page(indice))
            if texto.strip():
                teve_texto = True
            if verificador is None:
                verificador = _primeiro(_RE_VERIFICADOR, texto)
            if header is None:
                header = _primeiro(_RE_SEI_HEADER, texto)
            if indice in inicio:
                achado = _ultimo_sei_no(texto)
                if achado:
                    sei_no_inicio = achado
            elif indice in fim:
                achado = _ultimo_sei_no(texto)
                if achado:
                    sei_no_fim = achado
            if verificador and indice >= min(_PAGINAS_INICIO, total) - 1:
                break
    finally:
        doc.close()

    sei = verificador or header or meta_sei or sei_no_inicio or sei_no_fim
    if sei:
        return {'success': True, 'sei': sei}
    if not teve_texto:
        return {'success': False, 'message': 'Nenhum texto extraído do PDF'}
    return {'success': False, 'message': 'Não foi encontrado número SEI no texto do PDF'}


def main():
    if len(sys.argv) < 2:
        print(json.dumps({'success': False, 'message': 'Uso: extrair-sei-anatel.py <caminho_pdf>'}))
        sys.exit(1)
    out = extrair_sei(sys.argv[1])
    print(json.dumps(out, ensure_ascii=False))


if __name__ == '__main__':
    main()
